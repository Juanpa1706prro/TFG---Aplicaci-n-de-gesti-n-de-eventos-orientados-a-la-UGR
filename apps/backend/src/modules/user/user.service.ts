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
import { UserStaffFunction } from './user-staff-function.entity';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StaffFunction, UserRole } from './user-enums';

export type PublicSessionUser = {
  id: number;
  email: string;
  userNumber: number;
  profileComplete: boolean;
  role: UserRole;
};

export type PublicProfileView = {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  viewerIsOwner: boolean;
  staffFunctions: StaffFunction[];
  studentProfile: {
    faculty: string;
    campus: string;
    degree: string;
  } | null;
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

  /** Datos obligatorios cumplidos → no hace falta onboarding. */
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
      const fns = (user.staffFunctionLinks ?? []).map((l) => l.function);
      if (fns.length === 0) {
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

  async updateProfile(userId: number, updateData: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }

    const patch: Record<string, unknown> = { ...updateData };
    if (typeof patch['birthDate'] === 'string') {
      patch['birthDate'] = new Date(patch['birthDate'] as string);
    }

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
      relations: ['profile', 'studentProfile', 'staffFunctionLinks'],
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

      user.role = UserRole.STUDENT;
    } else {
      const fns = dto.staffFunctions ?? [];
      if (fns.length === 0) {
        throw new BadRequestException(
          'Selecciona al menos una función en la universidad',
        );
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

      user.role = this.deriveRoleFromStaffFunctions(fns);
    }

    await this.userRepository.save(user);
    await this.syncPersistedProfileFlag(user.id);

    const fresh = await this.findByID(user.id);
    return {
      message: 'Perfil actualizado',
      user: this.toPublicSession(fresh ?? user),
    };
  }

  private deriveRoleFromStaffFunctions(functions: StaffFunction[]): UserRole {
    if (
      functions.includes(StaffFunction.PROFESOR) ||
      functions.includes(StaffFunction.PDI_INVESTIGACION)
    ) {
      return UserRole.PROFESSOR;
    }
    if (functions.includes(StaffFunction.ESTUDIANTE)) {
      return UserRole.STUDENT;
    }
    return UserRole.USER;
  }

  toPublicSession(user: User): PublicSessionUser {
    return {
      id: user.id,
      email: user.email,
      userNumber: user.profile.userNumber,
      profileComplete: this.computeProfileComplete(user),
      role: user.role,
    };
  }

  async getPublicProfileByUserNumber(
    userNumber: number,
    requesterUserId: number,
  ): Promise<PublicProfileView> {
    const user = await this.userRepository.findOne({
      where: { profile: { userNumber } },
      relations: ['profile', 'studentProfile', 'staffFunctionLinks'],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const viewerIsOwner = user.id === requesterUserId;
    const base: PublicProfileView = {
      userNumber: user.profile.userNumber,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      viewerIsOwner,
      staffFunctions: (user.staffFunctionLinks ?? []).map((l) => l.function),
      studentProfile: user.studentProfile
        ? {
            faculty: user.studentProfile.faculty,
            campus: user.studentProfile.campus,
            degree: user.studentProfile.degree,
          }
        : null,
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
      relations: ['profile', 'studentProfile', 'staffFunctionLinks'],
    });
  }

  async findByID(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['profile', 'studentProfile', 'staffFunctionLinks'],
    });
  }
}
