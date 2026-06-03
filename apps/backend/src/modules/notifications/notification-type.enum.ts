// -------------------------------------------------------------------
// Notification type enum
// In-app notification categories for the user inbox.
// -------------------------------------------------------------------

/**
 * MEETING_INVITATION — private meeting invite (event_participants).
 * EVENT_INVITATION — public event recommendation from a friend.
 * FRIEND_REQUEST — incoming friend request.
 */
export enum NotificationType {
  MEETING_INVITATION = 'MEETING_INVITATION',
  EVENT_INVITATION = 'EVENT_INVITATION',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
}
