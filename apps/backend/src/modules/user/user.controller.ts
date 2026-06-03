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
import { JwtAuthGuard } from '../auth/guards/auth.guard-jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { SetSessionPersonaDto } from './dto/set-session-persona.dto';
import { sendStoredImage } from '../../common/image/image-response.util';
import type { UploadedImageFile } from '../../common/image/uploaded-file.type';
import { hasStoredImage } from '../../common/image/image-validation.util';

// -------------------------------------------------------------------
// Users Controller
// Profile, onboarding, session persona and photos. Base route: /user
// -------------------------------------------------------------------
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(private readonly userService: UsersService) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Returns the authenticated user's full profile and session payload.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<object>} Message and user with profile, student and staff data.
   */
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

  /**
   * Streams the authenticated user's profile photo from the database.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {Response} res - Express response for binary image output.
   * @returns {Promise<void>}
   */
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

  /**
   * Uploads or replaces the authenticated user's profile photo.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {UploadedImageFile} [file] - Image file (multipart field: file).
   * @returns {Promise<object>} Success message.
   * @throws {BadRequestException} If no file was sent.
   */
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

  /**
   * Removes the authenticated user's stored profile photo.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<object>} Success message.
   */
  @Delete('profile/photo')
  async deleteOwnProfilePhoto(@Request() req: { user: { sub: number } }) {
    return this.userService.clearProfilePhoto(req.user.sub);
  }

  /**
   * Streams any user's profile photo by public user number (authenticated).
   * @param {number} userNumber - 6-digit profile user number.
   * @param {Response} res - Express response for binary image output.
   * @returns {Promise<void>}
   */
  @Get('public/:userNumber/photo')
  async getPublicProfilePhoto(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Res() res: Response,
  ) {
    const photo = await this.userService.getProfilePhotoByUserNumber(userNumber);
    sendStoredImage(res, photo);
  }

  /**
   * Public profile for any authenticated user (email only when viewer is owner).
   * @param {object} req - Request with authenticated user id (sub).
   * @param {number} userNumber - Target 6-digit profile user number.
   * @returns {Promise<object>} Message and PublicProfileView.
   */
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

  /**
   * Partial update of profile fields (post-onboarding).
   * @param {object} req - Request with authenticated user id (sub).
   * @param {UpdateProfileDto} body - Optional profile fields.
   * @returns {Promise<object>} Updated profile message and data.
   */
  @Patch('profile')
  async updateProfile(
    @Request() req: { user: { sub: number } },
    @Body() body: UpdateProfileDto,
  ) {
    const userId = req.user.sub;
    return this.userService.updateProfile(userId, body);
  }

  /**
   * Completes first-time onboarding based on email domain (@correo.ugr.es / @ugr.es).
   * @param {object} req - Request with authenticated user id (sub).
   * @param {CompleteOnboardingDto} body - Onboarding payload.
   * @returns {Promise<object>} Session user after onboarding.
   */
  @Patch('onboarding')
  async completeOnboarding(
    @Request() req: { user: { sub: number } },
    @Body() body: CompleteOnboardingDto,
  ) {
    return this.userService.completeOnboarding(req.user.sub, body);
  }

  /**
   * Sets activeStaffFunction when the user has multiple staff roles.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {SetSessionPersonaDto} body - Chosen staff function.
   * @returns {Promise<object>} Updated session user payload.
   */
  @Patch('session-persona')
  async setSessionPersona(
    @Request() req: { user: { sub: number } },
    @Body() body: SetSessionPersonaDto,
  ) {
    return this.userService.setSessionPersona(req.user.sub, body.staffFunction);
  }
}
