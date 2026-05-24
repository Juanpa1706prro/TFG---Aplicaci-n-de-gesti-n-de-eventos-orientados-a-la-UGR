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

@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':userNumber/photo')
  async getUserPhoto(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Res() res: Response,
  ) {
    const photo = await this.usersService.getProfilePhotoByUserNumber(userNumber);
    sendStoredImage(res, photo);
  }

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

  @Get(':userNumber')
  getUser(@Param('userNumber', ParseIntPipe) userNumber: number) {
    return this.adminUsersService.getUserDetail(userNumber);
  }

  @Patch(':userNumber')
  updateUser(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Body() body: AdminUpdateUserDto,
  ) {
    return this.adminUsersService.updateUser(userNumber, body);
  }

  @Delete(':userNumber')
  deleteUser(
    @Request() req: { user: { sub: number } },
    @Param('userNumber', ParseIntPipe) userNumber: number,
  ) {
    return this.adminUsersService.deleteUser(req.user.sub, userNumber);
  }
}
