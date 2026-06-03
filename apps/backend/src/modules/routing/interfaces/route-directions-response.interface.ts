// -------------------------------------------------------------------
// Route directions response types
// Normalized payload returned to the Angular map (MapLibre layer).
// -------------------------------------------------------------------

/**
 * GeoJSON Feature with a single LineString geometry (WGS84, [lng, lat]).
 */
export interface GeoJsonLineStringFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

/**
 * Successful computeDirections response for the map detail panel and route layer.
 */
export interface RouteDirectionsResponse {
  /** Route length in metres. */
  distanceMeters: number;
  /** Estimated travel time in seconds (fastest alternative selected). */
  durationSeconds: number;
  /** Raw encoded polyline from Google (for debugging or reuse). */
  encodedPolyline: string;
  /** Decoded path for MapLibre `geojson` source. */
  geoJson: GeoJsonLineStringFeature;
  /** Travel mode sent to Google (e.g. WALK, DRIVE). */
  travelMode: string;
  /** Number of route variants returned before picking the fastest. */
  routesReturned: number;
}
