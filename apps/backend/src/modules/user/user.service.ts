import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserProfile } from './user-profile.entity';
import { StudentProfile } from './student-profile.entity';
import { StaffProfile } from './staff-profile.entity';
import { UserStaffFunction } from './user-staff-function.entity';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  GlobalCapability,
  StaffFunction,
  SystemRole,
} from './user-enums';
import { CapabilityService } from './capability.service';
import {
  buildPublicProfileRoleSections,
  filterImplementedStaffFunctions,
  ProfileRoleSectionView,
} from './profile-role-display.util';
import { AllowedImageMimeType } from '../../common/image/image.constants';
import {
  hasStoredImage,
  parseUploadedImage,
} from '../../common/image/image-validation.util';

// -------------------------------------------------------------------
// Users Service
// User CRUD, onboarding, session persona, profile photos and public views.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

/** Session payload returned after login and persona changes. */
export type PublicSessionUser = {
  id: number;
  email: string;
  userNumber: number;
  profileComplete: boolean;
  /** True when user must pick activeStaffFunction (multiple roles; cleared on login). */
  needsPersonaSelection: boolean;
  role: SystemRole;
  staffFunctions: StaffFunction[];
  activeStaffFunction: StaffFunction | null;
  globalCapabilities: GlobalCapability[];
};

/** Public profile for GET /user/public/:userNumber. */
export type PublicProfileView = {
  /** users.id; used for direct actions (e.g. friend request from profile). */
  userId: number;
  userNumber: number;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  hasProfilePicture: boolean;
  email?: string;
  viewerIsOwner: boolean;
  /** Staff functions with implemented profile UI (student, professor). */
  staffFunctions: StaffFunction[];
  studentProfile: {
    faculty: string;
    campus: string;
    degree: string;
  } | null;
  department: string | null;
  roleSections: ProfileRoleSectionView[];
};

@Injectable()
export class UsersService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserStaffFunction)
    private readonly staffFunctionRepository: Repository<UserStaffFunction>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(StaffProfile)
    private readonly staffProfileRepository: Repository<StaffProfile>,
    private readonly capabilityService: CapabilityService,
  ) {}

  // ------------------------------------------------------------
  // Public methods — lookups and persistence
  // ------------------------------------------------------------

  /**
   * @param {string} email - User email address.
   * @returns {boolean} True for @correo.ugr.es student accounts.
   */
  isCorreoStudentEmail(email: string): boolean {
    return email.trim().toLowerCase().endsWith('@correo.ugr.es');
  }

  /**
   * @param {string} email - User email address.
   * @returns {boolean} True for @ugr.es staff accounts.
   */
  isUgrStaffEmail(email: string): boolean {
    return email.trim().toLowerCase().endsWith('@ugr.es');
  }

  /**
   * @param {User} user - User with staffFunctionLinks loaded.
   * @returns {StaffFunction[]} Unique staff functions for the user.
   */
  staffFunctionList(user: User): StaffFunction[] {
    return [...new Set((user.staffFunctionLinks ?? []).map((l) => l.function))];
  }

  /**
   * Whether the user must choose a session persona before full capabilities apply.
   * @param {User} user - User with relations loaded.
   * @returns {boolean}
   */
  computeNeedsPersonaSelection(user: User): boolean {
    if (!this.computeProfileComplete(user)) {
      return false;
    }
    const fns = this.staffFunctionList(user);
    if (fns.length <= 1) {
      return false;
    }
    if (user.activeStaffFunction == null) {
      return true;
    }
    return !fns.includes(user.activeStaffFunction);
  }

  /**
   * Whether required profile data is filled (onboarding no longer required).
   * @param {User} user - User with profile and role-specific relations.
   * @returns {boolean}
   */
  computeProfileComplete(user: User): boolean {
    if (!user.profile) {
      return false;
    }
    const p = user.profile;
    if (!this.hasText(p.firstName) || !this.hasText(p.lastName)) {
      return false;
    }

    const email = user.email.toLowerCase();

    if (this.isCorreoStudentEmail(email)) {
      const sp = user.studentProfile;
      return !!(sp?.faculty && sp?.campus && sp?.degree);
    }

    if (this.isUgrStaffEmail(email)) {
      const fns = this.staffFunctionList(user);
      if (fns.length === 0) {
        return false;
      }
      if (
        this.needsTeachingDepartment(fns) &&
        !this.hasText(this.staffDepartment(user))
      ) {
        return false;
      }
      if (fns.includes(StaffFunction.ESTUDIANTE)) {
        const sp = user.studentProfile;
        return !!(sp?.faculty && sp?.campus && sp?.degree);
      }
      return true;
    }

    return this.hasText(p.firstName) && this.hasText(p.lastName);
  }

  /**
   * @param {Partial<User>} data - User entity fields to persist.
   * @returns {Promise<User>} Saved user.
   */
  async create(data: Partial<User>) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  /**
   * @param {number} id - User id.
   * @param {Partial<User>} data - Fields to update.
   * @returns {Promise<import('typeorm').UpdateResult>}
   */
  async update(id: number, data: Partial<User>) {
    return this.userRepository.update(id, data);
  }

  /**
   * After explicit login: clears activeStaffFunction when profile is complete and multiple roles exist.
   * @param {number} userId - User id.
   * @returns {Promise<void>}
   */
  async resetActivePersonaAfterLoginIfMultipleStaffFunctions(
    userId: number,
  ): Promise<void> {
    const user = await this.findByID(userId);
    if (!user) {
      return;
    }
    if (!this.computeProfileComplete(user)) {
      return;
    }
    const fns = this.staffFunctionList(user);
    if (fns.length <= 1) {
      return;
    }
    await this.userRepository.update(userId, { activeStaffFunction: null });
  }

  /**
   * Sets activeStaffFunction when exactly one staff function exists (legacy accounts).
   * @param {number} userId - User id.
   * @returns {Promise<void>}
   */
  async ensureDefaultActivePersonaIfMissing(userId: number): Promise<void> {
    const user = await this.findByID(userId);
    if (!user?.staffFunctionLinks?.length) {
      return;
    }
    const fns = this.staffFunctionList(user);
    if (fns.length !== 1) {
      return;
    }
    const only = fns[0]!;
    if (user.activeStaffFunction !== only) {
      await this.userRepository.update(userId, { activeStaffFunction: only });
    }
  }

  /**
   * @param {number} userId - User id.
   * @param {StaffFunction} staffFunction - Function to activate for the session.
   * @returns {Promise<{ message: string; user: PublicSessionUser }>}
   */
  async setSessionPersona(
    userId: number,
    staffFunction: StaffFunction,
  ): Promise<{ message: string; user: PublicSessionUser }> {
    const user = await this.findByID(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const allowed = new Set(this.staffFunctionList(user));
    if (!allowed.has(staffFunction)) {
      throw new BadRequestException(
        'Esa función no está asociada a tu cuenta. Completa el onboarding o elige otra opción.',
      );
    }
    await this.userRepository.update(userId, {
      activeStaffFunction: staffFunction,
    });
    const fresh = await this.findByID(userId);
    return {
      message: 'Perfil de sesión actualizado',
      user: this.toPublicSession(fresh ?? user),
    };
  }

  /**
   * @param {number} userId - User id.
   * @param {UpdateProfileDto} updateData - Partial profile fields.
   * @returns {Promise<object>} Message and updated profile.
   */
  async updateProfile(userId: number, updateData: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'staffProfile'],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }

    const patch: Record<string, unknown> = { ...updateData };
    if (typeof patch['birthDate'] === 'string') {
      patch['birthDate'] = new Date(patch['birthDate'] as string);
    }
    delete patch['department'];

    Object.assign(user.profile, patch);

    await this.userRepository.save(user);
    await this.syncPersistedProfileFlag(userId);

    return {
      message: 'Perfil actualizado correctamente',
      profile: user.profile,
    };
  }

  /**
   * First-time onboarding for @correo.ugr.es and @ugr.es accounts.
   * @param {number} userId - User id.
   * @param {CompleteOnboardingDto} dto - Onboarding payload.
   * @returns {Promise<{ message: string; user: PublicSessionUser }>}
   */
  async completeOnboarding(
    userId: number,
    dto: CompleteOnboardingDto,
  ): Promise<{ message: string; user: PublicSessionUser }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'profile',
        'studentProfile',
        'staffProfile',
        'staffFunctionLinks',
      ],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }

    if (this.computeProfileComplete(user)) {
      return {
        message: 'Perfil ya estaba completo',
        user: this.toPublicSession(user),
      };
    }

    const email = user.email.toLowerCase();
    const isCorreo = this.isCorreoStudentEmail(email);
    const isUgr = this.isUgrStaffEmail(email);

    if (!isCorreo && !isUgr) {
      throw new BadRequestException('Tipo de cuenta no soportado para onboarding');
    }

    if (dto.firstName !== undefined && dto.firstName !== '') {
      user.profile.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined && dto.lastName !== '') {
      user.profile.lastName = dto.lastName;
    }
    if (dto.gender !== undefined) {
      user.profile.gender = dto.gender;
    }
    if (dto.birthDate) {
      user.profile.birthDate = new Date(dto.birthDate);
    }
    if (dto.phoneNumber !== undefined && dto.phoneNumber !== '') {
      user.profile.phoneNumber = dto.phoneNumber;
    }

    if (!this.hasText(user.profile.firstName) || !this.hasText(user.profile.lastName)) {
      throw new BadRequestException('Nombre y apellidos son obligatorios');
    }

    if (isCorreo) {
      if (!dto.faculty || !dto.campus || !dto.degree) {
        throw new BadRequestException(
          'Facultad, campus y titulación son obligatorios para cuenta de estudiante',
        );
      }

      await this.staffFunctionRepository.delete({ user: { id: user.id } });
      const link = this.staffFunctionRepository.create({
        user,
        function: StaffFunction.ESTUDIANTE,
      });
      await this.staffFunctionRepository.save(link);
      user.staffFunctionLinks = [link];

      if (!user.studentProfile) {
        user.studentProfile = this.studentProfileRepository.create({
          user,
          faculty: dto.faculty,
          campus: dto.campus,
          degree: dto.degree,
        });
      } else {
        user.studentProfile.faculty = dto.faculty;
        user.studentProfile.campus = dto.campus;
        user.studentProfile.degree = dto.degree;
      }

      if (user.staffProfile) {
        await this.staffProfileRepository.remove(user.staffProfile);
        user.staffProfile = null;
      }
      user.activeStaffFunction = StaffFunction.ESTUDIANTE;
    } else {
      const fns = dto.staffFunctions ?? [];
      if (fns.length === 0) {
        throw new BadRequestException(
          'Selecciona al menos una función en la universidad',
        );
      }

      if (this.needsTeachingDepartment(fns)) {
        if (!this.hasText(dto.department)) {
          throw new BadRequestException(
            'Indica departamento o instituto (obligatorio para profesorado o PDI/investigación)',
          );
        }
      }

      await this.staffFunctionRepository.delete({ user: { id: user.id } });
      const links = fns.map((fn) =>
        this.staffFunctionRepository.create({ user, function: fn }),
      );
      await this.staffFunctionRepository.save(links);
      user.staffFunctionLinks = links;

      const needsStudent = fns.includes(StaffFunction.ESTUDIANTE);
      if (needsStudent) {
        if (!dto.faculty || !dto.campus || !dto.degree) {
          throw new BadRequestException(
            'Si marcas Estudiante, indica facultad, campus y titulación',
          );
        }
        if (!user.studentProfile) {
          user.studentProfile = this.studentProfileRepository.create({
            user,
            faculty: dto.faculty,
            campus: dto.campus,
            degree: dto.degree,
          });
        } else {
          user.studentProfile.faculty = dto.faculty;
          user.studentProfile.campus = dto.campus;
          user.studentProfile.degree = dto.degree;
        }
      } else if (user.studentProfile) {
        await this.studentProfileRepository.remove(user.studentProfile);
        user.studentProfile = null;
      }

      if (this.needsTeachingDepartment(fns)) {
        if (!user.staffProfile) {
          user.staffProfile = this.staffProfileRepository.create({
            user,
            department: dto.department!.trim(),
          });
        } else {
          user.staffProfile.department = dto.department!.trim();
        }
      } else if (user.staffProfile) {
        await this.staffProfileRepository.remove(user.staffProfile);
        user.staffProfile = null;
      }

      user.activeStaffFunction = this.resolveInitialActiveStaffFunction(fns);
    }

    await this.userRepository.save(user);
    await this.syncPersistedProfileFlag(user.id);

    const fresh = await this.findByID(user.id);
    return {
      message: 'Perfil actualizado',
      user: this.toPublicSession(fresh ?? user),
    };
  }

  /**
   * Maps a User entity to the session DTO used by auth and the frontend shell.
   * @param {User} user - User with profile and staff links loaded.
   * @returns {PublicSessionUser}
   */
  toPublicSession(user: User): PublicSessionUser {
    const staffFunctions = this.staffFunctionList(user);
    const needsPersonaSelection = this.computeNeedsPersonaSelection(user);
    const active = user.activeStaffFunction;
    const globalCapabilities = this.capabilityService.resolveGlobalCapabilities(
      staffFunctions,
      active,
    );
    return {
      id: user.id,
      email: user.email,
      userNumber: user.profile.userNumber,
      profileComplete: this.computeProfileComplete(user),
      needsPersonaSelection,
      role: user.role,
      staffFunctions,
      activeStaffFunction: active,
      globalCapabilities,
    };
  }

  /**
   * @param {number} userNumber - Public 6-digit profile number.
   * @param {number} requesterUserId - Viewer's user id.
   * @returns {Promise<PublicProfileView>}
   */
  async getPublicProfileByUserNumber(
    userNumber: number,
    requesterUserId: number,
  ): Promise<PublicProfileView> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('user.staffProfile', 'staffProfile')
      .leftJoinAndSelect('user.staffFunctionLinks', 'staffFunctionLinks')
      .where('profile.userNumber = :userNumber', { userNumber })
      .getOne();

    if (!user?.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const viewerIsOwner = user.id === requesterUserId;
    const allStaffFunctions = this.staffFunctionList(user);
    const studentProfile = user.studentProfile
      ? {
          faculty: user.studentProfile.faculty,
          campus: user.studentProfile.campus,
          degree: user.studentProfile.degree,
        }
      : null;
    const department = this.staffDepartment(user);

    const base: PublicProfileView = {
      userId: user.id,
      userNumber: user.profile.userNumber,
      userName: user.profile.userName,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      bio: user.profile.bio,
      hasProfilePicture: hasStoredImage(user.profile.profilePictureData),
      viewerIsOwner,
      staffFunctions: filterImplementedStaffFunctions(allStaffFunctions),
      studentProfile,
      department,
      roleSections: buildPublicProfileRoleSections(
        allStaffFunctions,
        studentProfile,
        department,
      ),
    };

    if (viewerIsOwner) {
      base.email = user.email;
    }

    return base;
  }

  /**
   * Generates a unique 6-digit public user number for new registrations.
   * @returns {Promise<number>}
   */
  async generateUniqueUserNumber(): Promise<number> {
    let exists = true;
    let randomNumber: number = 0;

    while (exists) {
      randomNumber = Math.floor(100000 + Math.random() * 900000);

      const user = await this.userRepository.findOne({
        where: {
          profile: {
            userNumber: randomNumber,
          },
        },
      });

      if (!user) exists = false;
    }
    return randomNumber;
  }

  /**
   * @param {string} email - User email.
   * @returns {Promise<User | null>}
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: [
        'profile',
        'studentProfile',
        'staffProfile',
        'staffFunctionLinks',
      ],
    });
  }

  /**
   * @param {number} id - User primary key.
   * @returns {Promise<User | null>}
   */
  async findByID(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: [
        'profile',
        'studentProfile',
        'staffProfile',
        'staffFunctionLinks',
      ],
    });
  }

  /**
   * Lookup by public profile user number (e.g. event manager invites, admin).
   * @param {number} userNumber - 6-digit profile number.
   * @returns {Promise<User | null>}
   */
  async findByProfileUserNumber(userNumber: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { profile: { userNumber } },
      relations: [
        'profile',
        'studentProfile',
        'staffProfile',
        'staffFunctionLinks',
      ],
    });
  }

  // ------------------------------------------------------------
  // Public methods — profile photos
  // ------------------------------------------------------------

  /**
   * @param {number} userNumber - Public profile user number.
   * @returns {Promise<{ data: Buffer; mimeType: AllowedImageMimeType }>}
   */
  async getProfilePhotoByUserNumber(
    userNumber: number,
  ): Promise<{ data: Buffer; mimeType: AllowedImageMimeType }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.profile', 'profile')
      .where('profile.userNumber = :userNumber', { userNumber })
      .getOne();

    const profile = user?.profile;
    if (
      !profile ||
      !hasStoredImage(profile.profilePictureData) ||
      !profile.profilePictureMimeType
    ) {
      throw new NotFoundException('Imagen no encontrada.');
    }

    return {
      data: profile.profilePictureData as Buffer,
      mimeType: profile.profilePictureMimeType as AllowedImageMimeType,
    };
  }

  /**
   * @param {number} userId - User id.
   * @param {Buffer} buffer - Raw image bytes.
   * @param {string} mimeType - Declared MIME type (validated).
   * @returns {Promise<{ message: string }>}
   */
  async setProfilePhoto(
    userId: number,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ message: string }> {
    const user = await this.findByID(userId);
    if (!user?.profile) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }
    const parsed = parseUploadedImage(buffer, mimeType);
    user.profile.profilePictureData = parsed.data;
    user.profile.profilePictureMimeType = parsed.mimeType;
    await this.userRepository.save(user);
    return { message: 'Foto de perfil actualizada' };
  }

  /**
   * @param {number} userId - User id.
   * @returns {Promise<{ message: string }>}
   */
  async clearProfilePhoto(userId: number): Promise<{ message: string }> {
    const user = await this.findByID(userId);
    if (!user?.profile) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }
    user.profile.profilePictureData = null;
    user.profile.profilePictureMimeType = null;
    await this.userRepository.save(user);
    return { message: 'Foto de perfil eliminada' };
  }

  /**
   * Admin upload of profile photo by public user number.
   * @param {number} userNumber - Target 6-digit profile number.
   * @param {Buffer} buffer - Raw image bytes.
   * @param {string} mimeType - Declared MIME type (validated).
   * @returns {Promise<{ message: string }>}
   */
  async setProfilePhotoByUserNumberAsAdmin(
    userNumber: number,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ message: string }> {
    const user = await this.findByProfileUserNumber(userNumber);
    if (!user?.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const parsed = parseUploadedImage(buffer, mimeType);
    user.profile.profilePictureData = parsed.data;
    user.profile.profilePictureMimeType = parsed.mimeType;
    await this.userRepository.save(user);
    return { message: 'Foto de perfil actualizada' };
  }

  // ------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------

  private hasText(v: string | null | undefined): boolean {
    return !!v && v.trim().length > 0;
  }

  private needsTeachingDepartment(functions: StaffFunction[]): boolean {
    return (
      functions.includes(StaffFunction.PROFESOR) ||
      functions.includes(StaffFunction.PDI_INVESTIGACION)
    );
  }

  private staffDepartment(user: User): string | null {
    return user.staffProfile?.department ?? null;
  }

  private resolveInitialActiveStaffFunction(
    functions: StaffFunction[],
  ): StaffFunction | null {
    const unique = [...new Set(functions)];
    if (unique.length === 1) {
      return unique[0]!;
    }
    return null;
  }

  private async syncPersistedProfileFlag(userId: number): Promise<void> {
    const u = await this.findByID(userId);
    if (!u) {
      return;
    }
    const complete = this.computeProfileComplete(u);
    if (u.onboardingCompleted !== complete) {
      await this.userRepository.update(userId, { onboardingCompleted: complete });
    }
  }
}
