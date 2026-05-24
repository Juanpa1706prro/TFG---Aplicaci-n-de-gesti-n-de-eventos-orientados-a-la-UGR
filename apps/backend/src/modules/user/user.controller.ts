import {
  Controller,
  Delete,
  Get,
  Request,
  Patch,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard-jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { SetSessionPersonaDto } from './dto/set-session-persona.dto';
import { sendStoredImage } from '../../common/image/image-response.util';
import type { UploadedImageFile } from '../../common/image/uploaded-file.type';
import { hasStoredImage } from '../../common/image/image-validation.util';

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
          hasProfilePicture: hasStoredImage(user.profile.profilePictureData),
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

  @Get('profile/photo')
  async getOwnProfilePhoto(
    @Request() req: { user: { sub: number } },
    @Res() res: Response,
  ) {
    const user = await this.userService.findByID(req.user.sub);
    if (!user?.profile?.userNumber) {
      throw new NotFoundException('Imagen no encontrada.');
    }
    const photo = await this.userService.getProfilePhotoByUserNumber(
      user.profile.userNumber,
    );
    sendStoredImage(res, photo);
  }

  @Put('profile/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadOwnProfilePhoto(
    @Request() req: { user: { sub: number } },
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    return this.userService.setProfilePhoto(req.user.sub, file.buffer, file.mimetype);
  }

  @Delete('profile/photo')
  async deleteOwnProfilePhoto(@Request() req: { user: { sub: number } }) {
    return this.userService.clearProfilePhoto(req.user.sub);
  }

  @Get('public/:userNumber/photo')
  async getPublicProfilePhoto(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Res() res: Response,
  ) {
    const photo = await this.userService.getProfilePhotoByUserNumber(userNumber);
    sendStoredImage(res, photo);
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
