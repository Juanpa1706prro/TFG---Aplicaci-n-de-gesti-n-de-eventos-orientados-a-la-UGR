// -------------------------------------------------------------------
// Route directions API types (frontend)
// Mirrors backend POST /routing/directions and GET /routing/status.
// -------------------------------------------------------------------

/** Travel modes accepted by the routing API. */
export type RouteTravelMode = 'WALK' | 'DRIVE' | 'BICYCLE' | 'TRANSIT';

/** Modes exposed in the map detail UI (walk / drive). */
export type MapDirectionsTravelMode = 'WALK' | 'DRIVE';

/**
 * GeoJSON Feature with LineString geometry for MapLibre route layer.
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
 * Response from POST /routing/directions.
 */
export interface RouteDirectionsResponse {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  geoJson: GeoJsonLineStringFeature;
  travelMode: MapDirectionsTravelMode;
  routesReturned: number;
}

/**
 * Request body for POST /routing/directions.
 */
export interface ComputeDirectionsRequest {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  travelMode?: RouteTravelMode;
}

/**
 * Response from GET /routing/status.
 */
export interface RoutingStatusResponse {
  configured: boolean;
}
