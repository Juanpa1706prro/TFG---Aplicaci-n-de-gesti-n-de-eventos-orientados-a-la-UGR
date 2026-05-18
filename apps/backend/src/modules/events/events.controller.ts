import { Body, Controller, Post, Get, Request } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('map-markers')
  mapMarkers(@Request() req: { user: { sub: number } }) {
    return this.eventsService.findMapMarkersForUser(req.user.sub);
  }

  @Post()
  async create(
    @Request() req: { user: { sub: number } },
    @Body() body: CreateEventDto,
  ) {
    return this.eventsService.create(req.user.sub, body);
  }
}
