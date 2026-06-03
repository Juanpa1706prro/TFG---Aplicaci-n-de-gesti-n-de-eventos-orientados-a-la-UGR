export enum EventManagerAssignmentRole {
  EDITOR = 'EDITOR',
  MODERATOR = 'MODERATOR',
}

/** Coincide con el backend: mapa y listados para todos vs. reunión restringida. */
export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/** RSVP de un invitado a una reunión (backend EventParticipantStatus). */
export enum EventParticipantStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
