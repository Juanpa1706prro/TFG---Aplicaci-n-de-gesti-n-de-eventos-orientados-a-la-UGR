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

// -------------------------------------------------------------------
// Admin Events Controller
// Event management for operators. Base route: /admin/events
// Requires JWT + SystemRole.ADMIN (@Roles + RolesGuard).
// -------------------------------------------------------------------
@Controller('admin/events')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class AdminEventsController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    private readonly adminEventsService: AdminEventsService,
    private readonly eventsService: EventsService,
  ) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Returns a paginated, filterable and searchable list of events.
   * @param {ListAdminEventsQueryDto} query - Page, sort, status, includeDeleted and search.
   * @returns {Promise<object>} List items and pagination metadata.
   */
  @Get()
  listEvents(@Query() query: ListAdminEventsQueryDto) {
    return this.adminEventsService.listEvents(query);
  }

  /**
   * Streams the event photo stored in the database.
   * @param {number} id - Event id.
   * @param {Response} res - Express response for binary image output.
   * @returns {Promise<void>}
   */
  @Get(':id/photo')
  async getEventPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const photo = await this.eventsService.getEventPhotoAsAdmin(id);
    sendStoredImage(res, photo);
  }

  /**
   * Uploads or replaces an event photo (multipart field: file).
   * @param {number} id - Event id.
   * @param {UploadedImageFile} [file] - Image file from multer memory storage.
   * @returns {Promise<object>} Success message from EventsService.
   * @throws {BadRequestException} If no file was sent.
   */
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

  /**
   * Removes the stored photo for an event.
   * @param {number} id - Event id.
   * @returns {Promise<object>} Success message from EventsService.
   */
  @Delete(':id/photo')
  async deleteEventPhoto(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.clearEventPhotoAsAdmin(id);
  }

  /**
   * Returns full admin detail for a single event (includes soft-deleted).
   * @param {number} id - Event id.
   * @returns {Promise<AdminEventDetail>} Event data with counts.
   */
  @Get(':id')
  getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.adminEventsService.getEventDetail(id);
  }

  /**
   * Updates event fields and optionally restores a soft-deleted event.
   * @param {number} id - Event id.
   * @param {AdminUpdateEventDto} body - Partial event update payload.
   * @returns {Promise<{ message: string; event: AdminEventDetail }>}
   */
  @Patch(':id')
  updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminUpdateEventDto,
  ) {
    return this.adminEventsService.updateEvent(id, body);
  }

  /**
   * Soft-deletes an event, or hard-deletes if already soft-deleted.
   * @param {number} id - Event id.
   * @returns {Promise<{ message: string }>}
   */
  @Delete(':id')
  deleteEvent(@Param('id', ParseIntPipe) id: number) {
    return this.adminEventsService.deleteEvent(id);
  }
}
