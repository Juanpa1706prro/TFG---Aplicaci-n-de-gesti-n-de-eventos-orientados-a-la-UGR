import type maplibregl from 'maplibre-gl';

/** Cámara del mapa en el último sync de marcadores. */
export type MarkerSyncCameraSnapshot = {
  zoom: number;
  west: number;
  south: number;
  east: number;
  north: number;
  pitch: number;
  bearing: number;
};

export type MarkerSyncThresholdConfig = {
  minZoomDelta: number;
  /** Desplazamiento del centro respecto al ancho/alto visible (0.12 = 12%). */
  minBoundsShiftRatio: number;
  /** Cambio del tamaño del rectángulo visible (zoom sin cambiar nivel numérico). */
  minSpanChangeRatio: number;
  minPitchDelta: number;
  minBearingDelta: number;
};

export const DEFAULT_MARKER_SYNC_THRESHOLD: MarkerSyncThresholdConfig = {
  minZoomDelta: 0.1,
  minBoundsShiftRatio: 0.12,
  minSpanChangeRatio: 0.08,
  minPitchDelta: 2.5,
  minBearingDelta: 2.5,
};

export function captureMarkerSyncCamera(
  map: maplibregl.Map,
): MarkerSyncCameraSnapshot {
  const bounds = map.getBounds();
  return {
    zoom: map.getZoom(),
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  };
}

/**
 * true si conviene recalcular clusters (cambio de zoom, bounds, pitch o bearing).
 */
export function shouldRunMarkerSync(
  map: maplibregl.Map,
  previous: MarkerSyncCameraSnapshot | null,
  config: MarkerSyncThresholdConfig = DEFAULT_MARKER_SYNC_THRESHOLD,
): boolean {
  if (!previous) {
    return true;
  }

  const zoom = map.getZoom();
  if (Math.abs(zoom - previous.zoom) >= config.minZoomDelta) {
    return true;
  }

  const pitch = map.getPitch();
  const bearing = map.getBearing();
  if (Math.abs(pitch - previous.pitch) >= config.minPitchDelta) {
    return true;
  }
  if (Math.abs(bearing - previous.bearing) >= config.minBearingDelta) {
    return true;
  }

  const bounds = map.getBounds();
  const west = bounds.getWest();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const north = bounds.getNorth();

  const lngSpan = Math.max(Math.abs(east - west), 1e-9);
  const latSpan = Math.max(Math.abs(north - south), 1e-9);
  const prevLngSpan = Math.max(Math.abs(previous.east - previous.west), 1e-9);
  const prevLatSpan = Math.max(Math.abs(previous.north - previous.south), 1e-9);

  const centerLng = (west + east) / 2;
  const centerLat = (south + north) / 2;
  const prevCenterLng = (previous.west + previous.east) / 2;
  const prevCenterLat = (previous.south + previous.north) / 2;

  if (
    Math.abs(centerLng - prevCenterLng) / lngSpan >=
    config.minBoundsShiftRatio
  ) {
    return true;
  }
  if (
    Math.abs(centerLat - prevCenterLat) / latSpan >=
    config.minBoundsShiftRatio
  ) {
    return true;
  }

  if (
    Math.abs(lngSpan - prevLngSpan) / prevLngSpan >= config.minSpanChangeRatio
  ) {
    return true;
  }
  if (
    Math.abs(latSpan - prevLatSpan) / prevLatSpan >= config.minSpanChangeRatio
  ) {
    return true;
  }

  return false;
}
