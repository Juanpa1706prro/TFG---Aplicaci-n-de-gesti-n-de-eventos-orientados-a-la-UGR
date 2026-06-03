import { EventVisibility } from '@core/constants/event-enums';

export enum NotificationType {
  MEETING_INVITATION = 'MEETING_INVITATION',
  EVENT_INVITATION = 'EVENT_INVITATION',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
}

export interface NotificationActorDto {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
}

export interface NotificationEventDto {
  id: number;
  title: string;
  visibility: EventVisibility;
}

export interface NotificationItemDto {
  id: number;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActorDto;
  event: NotificationEventDto | null;
  friendRequestId: number | null;
}

export interface NotificationListDto {
  items: NotificationItemDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationUnreadCountDto {
  count: number;
}
