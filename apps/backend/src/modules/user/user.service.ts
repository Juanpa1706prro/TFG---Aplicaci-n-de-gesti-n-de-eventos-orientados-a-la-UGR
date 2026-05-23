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

export type PublicSessionUser = {
  id: number;
  email: string;
  userNumber: number;
  profileComplete: boolean;
  /** true si debe elegir con qué función actuar (varias funciones y sin activeStaffFunction; tras cada login se limpia la función activa). */
  needsPersonaSelection: boolean;
  role: SystemRole;
  staffFunctions: StaffFunction[];
  activeStaffFunction: StaffFunction | null;
  globalCapabilities: GlobalCapability[];
};

export type PublicProfileView = {
  /** PK en users; para acciones directas (p. ej. solicitud de amistad desde perfil). */
  userId: number;
  userNumber: number;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profilePicture: string | null;
  email?: string;
  viewerIsOwner: boolean;
  /** Funciones con perfil implementado (estudiante, profesor). */
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

  isCorreoStudentEmail(email: string): boolean {
    return email.trim().toLowerCase().endsWith('@correo.ugr.es');
  }

  isUgrStaffEmail(email: string): boolean {
    return email.trim().toLowerCase().endsWith('@ugr.es');
  }

  private hasText(v: string | null | undefined): boolean {
    return !!v && v.trim().length > 0;
  }

  staffFunctionList(user: User): StaffFunction[] {
    return [...new Set((user.staffFunctionLinks ?? []).map((l) => l.function))];
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

  /** Datos obligatorios cumplidos → no hace falta onboarding de datos. */
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

  async create(data: Partial<User>) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: number, data: Partial<User>) {
    return this.userRepository.update(id, data);
  }

  /**
   * Tras un login explícito: si el perfil está completo y hay más de una función UGR,
   * se olvida la función de sesión guardada para obligar a elegir perfil otra vez.
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
   * Si solo hay una función de personal, fija activeStaffFunction para cuentas antiguas o incoherentes.
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
      profilePicture: user.profile.profilePicture,
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

  /** Usuario por su número público de perfil (p. ej. invitaciones a coeditar un evento). */
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
}
