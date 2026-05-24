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
import { AdminEventsService } from './admin-events.service';
import { ListAdminEventsQueryDto } from './dto/list-admin-events.query.dto';
import { AdminUpdateEventDto } from './dto/admin-update-event.dto';
import { EventsService } from '../events/events.service';
import { sendStoredImage } from '../../common/image/image-response.util';
import type { UploadedImageFile } from '../../common/image/uploaded-file.type';

@Controller('admin/events')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class AdminEventsController {
  constructor(
    private readonly adminEventsService: AdminEventsService,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  listEvents(@Query() query: ListAdminEventsQueryDto) {
    return this.adminEventsService.listEvents(query);
  }

  @Get(':id/photo')
  async getEventPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const photo = await this.eventsService.getEventPhotoAsAdmin(id);
    sendStoredImage(res, photo);
  }

  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEventPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    return this.eventsService.setEventPhotoAsAdmin(id, file.buffer, file.mimetype);
  }

  @Delete(':id/photo')
  async deleteEventPhoto(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.clearEventPhotoAsAdmin(id);
  }

  @Get(':id')
  getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.adminEventsService.getEventDetail(id);
  }

  @Patch(':id')
  updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminUpdateEventDto,
  ) {
    return this.adminEventsService.updateEvent(id, body);
  }

  @Delete(':id')
  deleteEvent(@Param('id', ParseIntPipe) id: number) {
    return this.adminEventsService.deleteEvent(id);
  }
}
