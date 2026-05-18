import { EventManagerAssignmentRole, EventVisibility } from '@core/constants/event-enums';

export interface EventManagerInvitePayload {
  userNumber: number;
  role: EventManagerAssignmentRole;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  photoUrl?: string;
  location: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  durationMinutes: number;
  visibility?: EventVisibility;
  maxAttendees?: number | null;
  managers?: EventManagerInvitePayload[];
}

export interface CreatedEventDto {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  visibility: EventVisibility;
  maxAttendees: number | null;
  creatorId: number;
  createdAt: string;
  startsAt: string;
  durationMinutes: number;
}

export interface MapMarkerDto {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  visibility: EventVisibility;
  createdAt: string;
  startsAt: string;
  durationMinutes: number;
}
