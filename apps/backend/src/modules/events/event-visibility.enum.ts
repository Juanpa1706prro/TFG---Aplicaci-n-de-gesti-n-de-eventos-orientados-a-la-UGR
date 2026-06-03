// -------------------------------------------------------------------
// Event visibility enum
// Controls who can see an event on the map and in listings.
// -------------------------------------------------------------------

/**
 * PUBLIC: open community event on map and lists.
 * PRIVATE: meeting (reunión); only creator and invited participants.
 */
export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
