// -------------------------------------------------------------------
// Event visibility enum
// Controls who can see an event on the map and in listings.
// -------------------------------------------------------------------

/**
 * PUBLIC: visible to the community on map and lists.
 * PRIVATE: e.g. tutorials; only creator and assigned managers on the map.
 */
export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
