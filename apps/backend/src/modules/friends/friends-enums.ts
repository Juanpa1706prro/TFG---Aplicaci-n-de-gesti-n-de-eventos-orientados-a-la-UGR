// -------------------------------------------------------------------
// Friends list sort enum
// Query values for GET /friends?sort=
// -------------------------------------------------------------------

/**
 * Sort order for the authenticated user's friends list.
 */
export enum FriendsListSort {
  FRIENDS_NEWEST = 'friends_newest',
  FRIENDS_OLDEST = 'friends_oldest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}
