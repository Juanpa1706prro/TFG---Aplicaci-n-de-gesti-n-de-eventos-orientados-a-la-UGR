import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { sendStoredImage } from '../../common/image/image-response.util';
import type { UploadedImageFile } from '../../common/image/uploaded-file.type';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('map-markers')
  mapMarkers(@Request() req: { user: { sub: number } }) {
    return this.eventsService.findMapMarkersForUser(req.user.sub);
  }

  @Get('my-lists')
  myLists(@Request() req: { user: { sub: number } }) {
    return this.eventsService.findMyEventListsForUser(req.user.sub);
  }

  @Get(':id/photo')
  async getPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Res() res: Response,
  ) {
    const photo = await this.eventsService.getEventPhoto(id, req.user.sub);
    sendStoredImage(res, photo);
  }

  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    return this.eventsService.setEventPhoto(
      id,
      req.user.sub,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete(':id/photo')
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.clearEventPhoto(id, req.user.sub);
  }

  @Get(':id')
  getDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.findEventDetailForUser(id, req.user.sub);
  }

  @Post(':id/attendance')
  attend(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.attendEvent(id, req.user.sub);
  }

  @Delete(':id/attendance')
  unattend(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.unattendEvent(id, req.user.sub);
  }

  @Post()
  async create(
    @Request() req: { user: { sub: number } },
    @Body() body: CreateEventDto,
  ) {
    return this.eventsService.create(req.user.sub, body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: UpdateEventDto,
  ) {
    return this.eventsService.updateEventByCreator(id, req.user.sub, body);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.deleteEventByCreator(id, req.user.sub);
  }
}
