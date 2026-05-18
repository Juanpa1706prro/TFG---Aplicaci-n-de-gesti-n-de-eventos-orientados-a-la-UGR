import {
  Controller,
  Get,
  Request,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard-jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { SetSessionPersonaDto } from './dto/set-session-persona.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req: { user: { sub: number } }) {
    if (!req.user?.sub) {
      throw new UnauthorizedException('No se pudo identificar al usuario');
    }

    const user = await this.userService.findByID(req.user.sub);

    if (!user) {
      throw new NotFoundException('El usuario no existe en la base de datos');
    }

    return {
      message: 'Full profile retrieved',
      user: {
        ...this.userService.toPublicSession(user),
        profile: {
          userName: user.profile.userName,
          userNumber: user.profile.userNumber,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          birthDate: user.profile.birthDate,
          gender: user.profile.gender,
          phoneNumber: user.profile.phoneNumber,
          bio: user.profile.bio,
          profilePicture: user.profile.profilePicture,
          department: user.staffProfile?.department ?? null,
        },
        studentProfile: user.studentProfile
          ? {
              faculty: user.studentProfile.faculty,
              campus: user.studentProfile.campus,
              degree: user.studentProfile.degree,
            }
          : null,
      },
    };
  }

  /** Perfil visible para cualquier usuario autenticado (email solo si es el propio). */
  @Get('public/:userNumber')
  async getPublicProfile(
    @Request() req: { user: { sub: number } },
    @Param('userNumber', ParseIntPipe) userNumber: number,
  ) {
    if (!req.user?.sub) {
      throw new UnauthorizedException('No se pudo identificar al usuario');
    }
    const profile = await this.userService.getPublicProfileByUserNumber(
      userNumber,
      req.user.sub,
    );
    return { message: 'Perfil público', profile };
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: { user: { sub: number } },
    @Body() body: UpdateProfileDto,
  ) {
    const userId = req.user.sub;
    return this.userService.updateProfile(userId, body);
  }

  @Patch('onboarding')
  async completeOnboarding(
    @Request() req: { user: { sub: number } },
    @Body() body: CompleteOnboardingDto,
  ) {
    return this.userService.completeOnboarding(req.user.sub, body);
  }

  @Patch('session-persona')
  async setSessionPersona(
    @Request() req: { user: { sub: number } },
    @Body() body: SetSessionPersonaDto,
  ) {
    return this.userService.setSessionPersona(req.user.sub, body.staffFunction);
  }
}
