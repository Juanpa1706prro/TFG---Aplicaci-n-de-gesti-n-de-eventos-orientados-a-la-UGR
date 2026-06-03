import maplibregl from 'maplibre-gl';
import type {
  GeoJsonLineStringFeature,
  MapDirectionsTravelMode,
} from '@core/interfaces/route-directions.interface';

// -------------------------------------------------------------------
// MapLibre route line layer
// Renders Google Routes GeoJSON on the existing OpenFreeMap base map.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Layer identifiers (must be unique on the map instance)
// ------------------------------------------------------------

/** GeoJSON source id for the active directions path. */
export const UGR_ROUTE_SOURCE_ID = 'ugr-route';

/** Soft glow under the route (drawn first). */
export const UGR_ROUTE_GLOW_LAYER_ID = 'ugr-route-line-glow';

/** Main route line layer id. */
export const UGR_ROUTE_LAYER_ID = 'ugr-route-line';

// ------------------------------------------------------------
// Style
// ------------------------------------------------------------

/**
 * Walking dash pattern (lengths × line-width).
 * Longer dashes with moderate gaps: reads as a path, not dots or a solid line.
 */
const ROUTE_WALK_DASH: [number, number] = [3, 2];

const ROUTE_GLOW_DRIVE_PAINT: maplibregl.LineLayerSpecification['paint'] = {
  'line-color': '#93c5fd',
  'line-width': 14,
  'line-opacity': 0.5,
  'line-blur': 5,
};

/** Same dash as the main line so glow does not fill the gaps. */
const ROUTE_GLOW_WALK_PAINT: maplibregl.LineLayerSpecification['paint'] = {
  'line-color': '#93c5fd',
  'line-width': 9,
  'line-opacity': 0.38,
  'line-blur': 2,
  'line-dasharray': ROUTE_WALK_DASH,
};

const ROUTE_LINE_DRIVE_PAINT: maplibregl.LineLayerSpecification['paint'] = {
  'line-color': '#3b82f6',
  'line-width': 5,
  'line-opacity': 0.98,
};

const ROUTE_LINE_WALK_PAINT: maplibregl.LineLayerSpecification['paint'] = {
  'line-color': '#3b82f6',
  'line-width': 5,
  'line-opacity': 0.98,
  'line-dasharray': ROUTE_WALK_DASH,
};

const ROUTE_LINE_LAYOUT: maplibregl.LineLayerSpecification['layout'] = {
  'line-join': 'round',
  'line-cap': 'round',
};

const ROUTE_LINE_WALK_LAYOUT: maplibregl.LineLayerSpecification['layout'] =
  ROUTE_LINE_LAYOUT;

function routeLayerStyle(travelMode: MapDirectionsTravelMode): {
  glowPaint: maplibregl.LineLayerSpecification['paint'];
  mainPaint: maplibregl.LineLayerSpecification['paint'];
  layout: maplibregl.LineLayerSpecification['layout'];
} {
  if (travelMode === 'WALK') {
    return {
      glowPaint: ROUTE_GLOW_WALK_PAINT,
      mainPaint: ROUTE_LINE_WALK_PAINT,
      layout: ROUTE_LINE_WALK_LAYOUT,
    };
  }
  return {
    glowPaint: ROUTE_GLOW_DRIVE_PAINT,
    mainPaint: ROUTE_LINE_DRIVE_PAINT,
    layout: ROUTE_LINE_LAYOUT,
  };
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Removes the in-map route line layers and source, if present.
 * @param {maplibregl.Map | null | undefined} map - MapLibre map instance.
 * @returns {void}
 */
export function clearRouteFromMap(map: maplibregl.Map | null | undefined): void {
  if (!map) {
    return;
  }
  if (map.getLayer(UGR_ROUTE_LAYER_ID)) {
    map.removeLayer(UGR_ROUTE_LAYER_ID);
  }
  if (map.getLayer(UGR_ROUTE_GLOW_LAYER_ID)) {
    map.removeLayer(UGR_ROUTE_GLOW_LAYER_ID);
  }
  if (map.getSource(UGR_ROUTE_SOURCE_ID)) {
    map.removeSource(UGR_ROUTE_SOURCE_ID);
  }
}

export type ShowRouteOnMapOptions = {
  origin?: [number, number];
  destination?: [number, number];
  /** Top-down view (pitch 0) after fitting the route bounds. */
  overviewFromAbove?: boolean;
  /** WALK renders a dashed line; DRIVE stays solid. */
  travelMode?: MapDirectionsTravelMode;
};

/**
 * Draws a GeoJSON route line on the map and fits the viewport to the path.
 * @param {maplibregl.Map} map - MapLibre map instance.
 * @param {GeoJsonLineStringFeature} geoJson - LineString from backend /routing/directions.
 * @param {ShowRouteOnMapOptions} [options] - Endpoints, camera and line style.
 * @returns {void}
 */
export function showRouteOnMap(
  map: maplibregl.Map,
  geoJson: GeoJsonLineStringFeature,
  options?: ShowRouteOnMapOptions,
): void {
  clearRouteFromMap(map);

  const travelMode = options?.travelMode ?? 'DRIVE';
  const { glowPaint, mainPaint, layout } = routeLayerStyle(travelMode);

  map.addSource(UGR_ROUTE_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [geoJson],
    },
  });

  map.addLayer({
    id: UGR_ROUTE_GLOW_LAYER_ID,
    type: 'line',
    source: UGR_ROUTE_SOURCE_ID,
    layout,
    paint: glowPaint,
  });

  map.addLayer({
    id: UGR_ROUTE_LAYER_ID,
    type: 'line',
    source: UGR_ROUTE_SOURCE_ID,
    layout,
    paint: mainPaint,
  });

  const bounds = new maplibregl.LngLatBounds();
  for (const [lng, lat] of geoJson.geometry.coordinates) {
    bounds.extend([lng, lat]);
  }
  if (options?.origin) {
    bounds.extend(options.origin);
  }
  if (options?.destination) {
    bounds.extend(options.destination);
  }
  if (bounds.isEmpty()) {
    return;
  }

  const padding = options?.overviewFromAbove
    ? { top: 96, bottom: 56, left: 48, right: 48 }
    : 72;

  map.fitBounds(bounds, {
    padding,
    maxZoom: options?.overviewFromAbove ? 16 : 17,
    duration: 800,
  });

  if (options?.overviewFromAbove) {
    const flattenCamera = (): void => {
      map.easeTo({ pitch: 0, bearing: 0, duration: 500 });
    };
    map.once('moveend', flattenCamera);
  }
}
