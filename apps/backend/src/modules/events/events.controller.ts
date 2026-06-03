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
import { InviteEventFriendDto } from './dto/invite-event-friend.dto';
import { sendStoredImage } from '../../common/image/image-response.util';
import type { UploadedImageFile } from '../../common/image/uploaded-file.type';

// -------------------------------------------------------------------
// Events Controller
// Event lifecycle, map data, attendance and photos. Base route: /events
// -------------------------------------------------------------------
@Controller('events')
export class EventsController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(private readonly eventsService: EventsService) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Returns map markers visible to the authenticated user (active events with coordinates).
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<MapMarkerView[]>}
   */
  @Get('map-markers')
  mapMarkers(@Request() req: { user: { sub: number } }) {
    return this.eventsService.findMapMarkersForUser(req.user.sub);
  }

  /**
   * Returns the user's event lists: active, attended and managed.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<MyEventListsView>}
   */
  @Get('my-lists')
  myLists(@Request() req: { user: { sub: number } }) {
    return this.eventsService.findMyEventListsForUser(req.user.sub);
  }

  /**
   * Streams the event photo if the user may view the event.
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {Response} res - Express response for binary image output.
   * @returns {Promise<void>}
   */
  @Get(':id/photo')
  async getPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Res() res: Response,
  ) {
    const photo = await this.eventsService.getEventPhoto(id, req.user.sub);
    sendStoredImage(res, photo);
  }

  /**
   * Uploads or replaces the event photo (creator only, multipart field: file).
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {UploadedImageFile} [file] - Image file from multer memory storage.
   * @returns {Promise<object>} Success message.
   * @throws {BadRequestException} If no file was sent.
   */
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

  /**
   * Removes the stored photo for an event (creator only).
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<object>} Success message.
   */
  @Delete(':id/photo')
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.clearEventPhoto(id, req.user.sub);
  }

  /**
   * Returns full event detail including people lists and attendance state.
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<EventDetailView>}
   */
  @Get(':id')
  getDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.findEventDetailForUser(id, req.user.sub);
  }

  /**
   * Registers the authenticated user as attending the event.
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<EventDetailView>} Updated event detail.
   */
  @Post(':id/attendance')
  attend(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.attendEvent(id, req.user.sub);
  }

  /**
   * Removes the authenticated user's attendance registration.
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<EventDetailView>} Updated event detail.
   */
  @Delete(':id/attendance')
  unattend(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.unattendEvent(id, req.user.sub);
  }

  /**
   * Confirms attendance to a meeting invitation (reunión).
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<EventDetailView>}
   */
  @Post(':id/participants/me/accept')
  acceptMeetingInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.acceptMeetingInvitation(id, req.user.sub);
  }

  /**
   * Rejects a meeting invitation (reunión).
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<{ message: string }>}
   */
  @Post(':id/participants/me/reject')
  rejectMeetingInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.rejectMeetingInvitation(id, req.user.sub);
  }

  /**
   * Recommends a public event to a friend (creates notification).
   * @param {number} id - Public event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {InviteEventFriendDto} body - Friend user number.
   * @returns {Promise<{ message: string; invitationId: number }>}
   */
  @Post(':id/invitations')
  inviteFriendToPublicEvent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: InviteEventFriendDto,
  ) {
    return this.eventsService.inviteFriendToPublicEvent(
      id,
      req.user.sub,
      body.userNumber,
    );
  }

  /**
   * Creates a new event (requires CREATE_AND_MANAGE_OWN_EVENTS capability).
   * @param {object} req - Request with authenticated user id (sub).
   * @param {CreateEventDto} body - Event data and optional manager invites.
   * @returns {Promise<{ message: string; event: CreatedEventView }>}
   */
  @Post()
  async create(
    @Request() req: { user: { sub: number } },
    @Body() body: CreateEventDto,
  ) {
    return this.eventsService.create(req.user.sub, body);
  }

  /**
   * Updates an event (creator only).
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {UpdateEventDto} body - Partial event fields.
   * @returns {Promise<{ message: string; event: CreatedEventView }>}
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: UpdateEventDto,
  ) {
    return this.eventsService.updateEventByCreator(id, req.user.sub, body);
  }

  /**
   * Soft-deletes an event (creator only).
   * @param {number} id - Event id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<{ message: string }>}
   */
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.eventsService.deleteEventByCreator(id, req.user.sub);
  }
}
