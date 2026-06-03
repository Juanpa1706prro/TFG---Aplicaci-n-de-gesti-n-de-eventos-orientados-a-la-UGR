import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SystemRole } from '../user/user-enums';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { ListAdminUsersQueryDto } from './dto/list-admin-users.query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UsersService } from '../user/user.service';
import { sendStoredImage } from '../../common/image/image-response.util';
import type { UploadedImageFile } from '../../common/image/uploaded-file.type';

// -------------------------------------------------------------------
// Admin Users Controller
// User management for operators. Base route: /admin/users
// Requires JWT + SystemRole.ADMIN (@Roles + RolesGuard).
// -------------------------------------------------------------------
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class AdminUsersController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly usersService: UsersService,
  ) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Returns a paginated, sortable and searchable list of users.
   * @param {ListAdminUsersQueryDto} query - Page, limit, sort, order and search term.
   * @returns {Promise<object>} List items and pagination metadata.
   */
  @Get()
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  /**
   * Streams the profile photo stored in the database for a user.
   * @param {number} userNumber - Public 6-digit user number.
   * @param {Response} res - Express response for binary image output.
   * @returns {Promise<void>}
   */
  @Get(':userNumber/photo')
  async getUserPhoto(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Res() res: Response,
  ) {
    const photo = await this.usersService.getProfilePhotoByUserNumber(userNumber);
    sendStoredImage(res, photo);
  }

  /**
   * Uploads or replaces a user's profile photo (multipart field: file).
   * @param {number} userNumber - Public 6-digit user number.
   * @param {UploadedImageFile} [file] - Image file from multer memory storage.
   * @returns {Promise<object>} Success message from UsersService.
   * @throws {BadRequestException} If no file was sent.
   */
  @Put(':userNumber/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUserPhoto(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    return this.usersService.setProfilePhotoByUserNumberAsAdmin(
      userNumber,
      file.buffer,
      file.mimetype,
    );
  }

  /**
   * Returns full admin detail for a single user.
   * @param {number} userNumber - Public 6-digit user number.
   * @returns {Promise<AdminUserDetail>} User profile and role data.
   */
  @Get(':userNumber')
  getUser(@Param('userNumber', ParseIntPipe) userNumber: number) {
    return this.adminUsersService.getUserDetail(userNumber);
  }

  /**
   * Updates profile fields and/or system role for a user.
   * @param {number} userNumber - Public 6-digit user number.
   * @param {AdminUpdateUserDto} body - Partial profile and optional role.
   * @returns {Promise<{ message: string; user: AdminUserDetail }>}
   */
  @Patch(':userNumber')
  updateUser(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Body() body: AdminUpdateUserDto,
  ) {
    return this.adminUsersService.updateUser(userNumber, body);
  }

  /**
   * Permanently deletes a user account (not allowed on self).
   * @param {object} req - Request with authenticated admin user id (sub).
   * @param {number} userNumber - Public 6-digit user number to delete.
   * @returns {Promise<{ message: string }>}
   */
  @Delete(':userNumber')
  deleteUser(
    @Request() req: { user: { sub: number } },
    @Param('userNumber', ParseIntPipe) userNumber: number,
  ) {
    return this.adminUsersService.deleteUser(req.user.sub, userNumber);
  }
}
