import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';

// -------------------------------------------------------------------
// Notifications Controller
// Inbox API: list, unread count, mark read. Base route: /notifications
// -------------------------------------------------------------------
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Returns unread notification count for the authenticated user (campana badge).
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<{ count: number }>}
   */
  @Get('unread-count')
  unreadCount(@Request() req: { user: { sub: number } }) {
    return this.notificationsService.getUnreadCountForUser(req.user.sub);
  }

  /**
   * Lists notifications for the authenticated user (newest first).
   * @param {object} req - Request with authenticated user id (sub).
   * @param {ListNotificationsQueryDto} query - Pagination and unread filter.
   * @returns {Promise<NotificationListView>}
   */
  @Get()
  list(
    @Request() req: { user: { sub: number } },
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listForUser(req.user.sub, query);
  }

  /**
   * Marks all unread event-related notifications for an event as read.
   * @param {number} eventId - Event id opened from the map.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<{ updated: number }>}
   */
  @Patch('read-by-event/:eventId')
  markReadByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notificationsService.markAsReadByEventId(eventId, req.user.sub);
  }

  /**
   * Marks a single notification as read.
   * @param {number} id - Notification id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<{ message: string }>}
   */
  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }
}
