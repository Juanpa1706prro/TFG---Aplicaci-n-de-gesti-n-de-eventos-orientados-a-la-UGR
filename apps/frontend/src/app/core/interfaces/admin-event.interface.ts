import { EventVisibility } from '@core/constants/event-enums';

export type AdminEventListItem = {
  id: number;
  title: string;
  location: string;
  visibility: EventVisibility;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  deletedAt: string | null;
  finished: boolean;
  creatorId: number;
  creatorUserNumber: number | null;
  creatorLabel: string | null;
};

export type AdminEventDetail = AdminEventListItem & {
  description: string;
  hasPhoto: boolean;
  latitude: number | null;
  longitude: number | null;
  maxAttendees: number | null;
  updatedAt: string;
  attendeeCount: number;
  managerCount: number;
};

export type AdminEventsListResponse = {
  items: AdminEventListItem[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type AdminEventsSortField = 'createdAt' | 'title';
export type AdminEventsSortOrder = 'asc' | 'desc';
export type AdminEventsStatusFilter = 'all' | 'active' | 'finished';

export type AdminEventsListParams = {
  page: number;
  limit: number;
  sort: AdminEventsSortField;
  order: AdminEventsSortOrder;
  status: AdminEventsStatusFilter;
  includeDeleted?: boolean;
  q?: string;
};

export type AdminUpdateEventPayload = {
  title?: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  startsAt?: string;
  endsAt?: string;
  visibility?: EventVisibility;
  maxAttendees?: number | null;
  restore?: boolean;
};
