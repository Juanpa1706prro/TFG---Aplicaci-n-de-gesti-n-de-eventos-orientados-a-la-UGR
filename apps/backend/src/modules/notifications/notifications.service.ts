import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { EventParticipant } from '../events/event-participant.entity';
import { EventVisibility } from '../events/event-visibility.enum';
import { UserProfile } from '../user/user-profile.entity';
import { hasStoredImage } from '../../common/image/image-validation.util';
import { Notification } from './notification.entity';
import { EventInvitation } from './event-invitation.entity';
import { NotificationType } from './notification-type.enum';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';

// -------------------------------------------------------------------
// Notifications Service
// Inbox persistence and read state.
// -------------------------------------------------------------------

export type NotificationActorView = {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
};

export type NotificationEventView = {
  id: number;
  title: string;
  visibility: EventVisibility;
};

export type NotificationItemView = {
  id: number;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actor: NotificationActorView;
  event: NotificationEventView | null;
  friendRequestId: number | null;
};

export type NotificationListView = {
  items: NotificationItemView[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(EventInvitation)
    private readonly eventInvitationRepository: Repository<EventInvitation>,
  ) {}

  /**
   * Lists notifications for the authenticated user.
   * @param {number} userId - Recipient user id.
   * @param {ListNotificationsQueryDto} query - Pagination and filters.
   * @returns {Promise<NotificationListView>}
   */
  async listForUser(
    userId: number,
    query: ListNotificationsQueryDto,
  ): Promise<NotificationListView> {
    const limit = Math.min(query.limit ?? 25, 50);
    const offset = query.offset ?? 0;
    const unreadOnly = query.unreadOnly ?? false;

    const where = {
      recipientId: userId,
      ...(unreadOnly ? { readAt: IsNull() } : {}),
    };

    const [rows, total] = await this.notificationRepository.findAndCount({
      where,
      relations: {
        actor: { profile: true },
        event: true,
      },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      items: rows.map((row) => this.toItemView(row)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Returns unread notification count for the campana badge.
   * @param {number} userId - Recipient user id.
   * @returns {Promise<{ count: number }>}
   */
  async getUnreadCountForUser(userId: number): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: {
        recipientId: userId,
        readAt: IsNull(),
      },
    });
    return { count };
  }

  /**
   * Marks one notification as read (recipient only).
   * @param {number} notificationId - Notification id.
   * @param {number} userId - Authenticated recipient user id.
   * @returns {Promise<{ message: string }>}
   * @throws {NotFoundException} If the notification does not belong to the user.
   */
  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const row = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId },
    });
    if (!row) {
      throw new NotFoundException('Notificación no encontrada.');
    }

    if (!row.readAt) {
      row.readAt = new Date();
      await this.notificationRepository.save(row);
    }

    return { message: 'Notificación marcada como leída' };
  }

  /**
   * Marks unread notifications tied to an event when the user opens it on the map.
   * @param {number} eventId - Event id from deep link.
   * @param {number} userId - Authenticated recipient user id.
   * @returns {Promise<{ updated: number }>}
   */
  async markAsReadByEventId(
    eventId: number,
    userId: number,
  ): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      {
        recipientId: userId,
        eventId,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );

    return { updated: result.affected ?? 0 };
  }

  /**
   * Notifies each meeting invitee after a reunión is created.
   * @param {number} actorId - Meeting creator user id.
   * @param {number} eventId - Saved event id.
   * @param {EventParticipant[]} participants - Saved participant rows (with ids).
   * @returns {Promise<void>}
   */
  async createMeetingInvitationNotifications(
    actorId: number,
    eventId: number,
    participants: EventParticipant[],
  ): Promise<void> {
    if (participants.length === 0) {
      return;
    }

    const rows = participants.map((participant) =>
      this.notificationRepository.create({
        recipientId: participant.userId,
        actorId,
        type: NotificationType.MEETING_INVITATION,
        eventId,
        eventParticipantId: participant.id,
        friendRequestId: null,
        eventInvitationId: null,
        readAt: null,
      }),
    );

    await this.notificationRepository.save(rows);
  }

  /**
   * Records a public event recommendation and notifies the invitee.
   * @param {number} actorId - User recommending the event.
   * @param {number} eventId - Public event id.
   * @param {number} inviteeId - Friend user id.
   * @returns {Promise<{ invitationId: number; notificationId: number }>}
   * @throws {BadRequestException} If this user already recommended the event to that friend.
   */
  async createPublicEventRecommendation(
    actorId: number,
    eventId: number,
    inviteeId: number,
  ): Promise<{ invitationId: number; notificationId: number }> {
    try {
      const invitation = await this.eventInvitationRepository.save(
        this.eventInvitationRepository.create({
          eventId,
          inviterId: actorId,
          inviteeId,
        }),
      );

      const notification = await this.notificationRepository.save(
        this.notificationRepository.create({
          recipientId: inviteeId,
          actorId,
          type: NotificationType.EVENT_INVITATION,
          eventId,
          eventParticipantId: null,
          friendRequestId: null,
          eventInvitationId: invitation.id,
          readAt: null,
        }),
      );

      return {
        invitationId: invitation.id,
        notificationId: notification.id,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          'Ya has recomendado este evento a este amigo.',
        );
      }
      throw error;
    }
  }

  /**
   * Notifies the recipient of a new friend request.
   * @param {number} actorId - Sender user id.
   * @param {number} recipientId - Target user id.
   * @param {number} friendRequestId - Saved friend request id.
   * @returns {Promise<void>}
   */
  async createFriendRequestNotification(
    actorId: number,
    recipientId: number,
    friendRequestId: number,
  ): Promise<void> {
    await this.notificationRepository.save(
      this.notificationRepository.create({
        recipientId,
        actorId,
        type: NotificationType.FRIEND_REQUEST,
        eventId: null,
        eventParticipantId: null,
        friendRequestId,
        eventInvitationId: null,
        readAt: null,
      }),
    );
  }

  private toItemView(row: Notification): NotificationItemView {
    const profile = row.actor?.profile;
    if (!profile) {
      throw new Error(`Notification ${row.id} is missing actor profile`);
    }

    return {
      id: row.id,
      type: row.type,
      readAt: row.readAt,
      createdAt: row.createdAt,
      actor: this.toActorView(profile),
      event: row.event
        ? {
            id: row.event.id,
            title: row.event.title,
            visibility: row.event.visibility,
          }
        : null,
      friendRequestId: row.friendRequestId,
    };
  }

  private toActorView(profile: UserProfile): NotificationActorView {
    return {
      userNumber: profile.userNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      hasProfilePicture: hasStoredImage(profile.profilePictureData),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }
}
