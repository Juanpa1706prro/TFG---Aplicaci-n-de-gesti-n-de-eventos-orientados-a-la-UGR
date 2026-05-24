import { EventManagerAssignmentRole, EventVisibility } from '@core/constants/event-enums';

export interface EventManagerInvitePayload {
  userNumber: number;
  role: EventManagerAssignmentRole;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  visibility?: EventVisibility;
  maxAttendees?: number | null;
  managers?: EventManagerInvitePayload[];
}

export interface CreatedEventDto {
  id: number;
  title: string;
  description: string;
  hasPhoto: boolean;
  location: string;
  latitude: number | null;
  longitude: number | null;
  visibility: EventVisibility;
  maxAttendees: number | null;
  creatorId: number;
  createdAt: string;
  startsAt: string;
  endsAt: string;
}

export interface MapMarkerDto {
  id: number;
  title: string;
  description: string;
  hasPhoto: boolean;
  location: string;
  latitude: number;
  longitude: number;
  visibility: EventVisibility;
  maxAttendees: number | null;
  createdAt: string;
  updatedAt: string;
  startsAt: string;
  endsAt: string;
}

export interface EventParticipantDto {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
}

export type EventManagementRole = 'creator' | 'editor' | 'moderator';

export interface EventListItemDto {
  id: number;
  title: string;
  description: string;
  hasPhoto: boolean;
  location: string;
  visibility: EventVisibility;
  maxAttendees: number | null;
  startsAt: string;
  endsAt: string;
  managementRoles: EventManagementRole[];
}

export interface MyEventListsDto {
  active: EventListItemDto[];
  attended: EventListItemDto[];
  managed: EventListItemDto[];
}

export interface EventDetailDto extends MapMarkerDto {
  creator: EventParticipantDto;
  managers: EventParticipantDto[];
  attendees: EventParticipantDto[];
  attendeeCount: number;
  isAttending: boolean;
  viewerIsCreator: boolean;
}

export type UpdateEventPayload = Omit<CreateEventPayload, 'managers'>;
