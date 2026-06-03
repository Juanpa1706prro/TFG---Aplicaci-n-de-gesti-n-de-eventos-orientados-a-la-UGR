// -------------------------------------------------------------------
// Event participant status enum
// RSVP state for meeting (private event) invitees.
// -------------------------------------------------------------------

/**
 * PENDING: invited, visible on map, awaiting accept/reject.
 * ACCEPTED: confirmed attendance.
 * REJECTED: declined; no map access.
 */
export enum EventParticipantStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
