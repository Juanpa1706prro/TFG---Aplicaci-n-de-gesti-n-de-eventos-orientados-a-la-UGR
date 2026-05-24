import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { UsersService } from '../user/user.service';
import { SystemRole } from '../user/user-enums';
import { ListAdminUsersQueryDto } from './dto/list-admin-users.query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UpdateProfileDto } from '../user/dto/update-profile.dto';
import { hasStoredImage } from '../../common/image/image-validation.util';

export type AdminUserListItem = {
  userId: number;
  userNumber: number;
  email: string;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  role: SystemRole;
  createdAt: string;
  hasProfilePicture: boolean;
};

export type AdminUserDetail = AdminUserListItem & {
  bio: string | null;
  gender: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  profileComplete: boolean;
};

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
  ) {}

  async listUsers(query: ListAdminUsersQueryDto): Promise<{
    items: AdminUserListItem[];
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const page = query.page ?? 0;
    const limit = Math.min(query.limit ?? 25, 50);
    const sort = query.sort ?? 'createdAt';
    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const q = query.q?.trim();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.profile', 'profile');

    if (q) {
      const like = `%${this.escapeLike(q)}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('user.email ILIKE :like', { like });
          sub.orWhere('profile.userName ILIKE :like', { like });
          sub.orWhere('profile.firstName ILIKE :like', { like });
          sub.orWhere('profile.lastName ILIKE :like', { like });
          if (/^\d+$/.test(q)) {
            sub.orWhere('CAST(profile.userNumber AS TEXT) LIKE :numLike', {
              numLike: `${q}%`,
            });
          }
        }),
      );
    }

    if (sort === 'name') {
      qb.orderBy('profile.lastName', order, 'NULLS LAST')
        .addOrderBy('profile.firstName', order, 'NULLS LAST')
        .addOrderBy('user.id', order);
    } else {
      qb.orderBy('user.createdAt', order).addOrderBy('user.id', order);
    }

    qb.skip(page * limit).take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: slice.map((user) => this.toListItem(user)),
      page,
      limit,
      hasMore,
    };
  }

  async getUserDetail(userNumber: number): Promise<AdminUserDetail> {
    const user = await this.usersService.findByProfileUserNumber(userNumber);
    if (!user?.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toDetail(user);
  }

  async updateUser(
    userNumber: number,
    dto: AdminUpdateUserDto,
  ): Promise<{ message: string; user: AdminUserDetail }> {
    const user = await this.usersService.findByProfileUserNumber(userNumber);
    if (!user?.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { role, ...profilePatch } = dto;
    const profileDto = profilePatch as UpdateProfileDto;
    const hasProfileFields = Object.keys(profileDto).length > 0;
    if (hasProfileFields) {
      await this.usersService.updateProfile(user.id, profileDto);
    }

    if (role != null && role !== user.role) {
      await this.userRepository.update(user.id, { role });
    }

    const fresh = await this.usersService.findByProfileUserNumber(userNumber);
    if (!fresh?.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      message: 'Usuario actualizado',
      user: this.toDetail(fresh),
    };
  }

  async deleteUser(
    actorUserId: number,
    userNumber: number,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByProfileUserNumber(userNumber);
    if (!user?.profile) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.id === actorUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    await this.userRepository.remove(user);
    return { message: 'Usuario eliminado' };
  }

  private toListItem(user: User): AdminUserListItem {
    const profile = user.profile;
    return {
      userId: user.id,
      userNumber: profile.userNumber,
      email: user.email,
      userName: profile.userName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: user.role,
      createdAt: this.formatDateTimeIso(user.createdAt),
      hasProfilePicture: hasStoredImage(profile.profilePictureData),
    };
  }

  private toDetail(user: User): AdminUserDetail {
    const profile = user.profile;
    return {
      ...this.toListItem(user),
      bio: profile.bio,
      gender: profile.gender,
      phoneNumber: profile.phoneNumber,
      birthDate: this.formatDateOnly(profile.birthDate),
      profileComplete: this.usersService.computeProfileComplete(user),
    };
  }

  private escapeLike(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  /** TypeORM puede devolver `date` como string (`YYYY-MM-DD`). */
  private formatDateOnly(value: Date | string | null | undefined): string | null {
    if (value == null) {
      return null;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    const s = String(value).trim();
    const isoDay = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    if (isoDay) {
      return isoDay[1];
    }
    const parsed = new Date(s);
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toISOString().slice(0, 10);
  }

  private formatDateTimeIso(value: Date | string): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toISOString();
  }
}
