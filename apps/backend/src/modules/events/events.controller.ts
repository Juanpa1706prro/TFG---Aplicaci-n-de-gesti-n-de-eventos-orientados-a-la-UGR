import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

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
}
