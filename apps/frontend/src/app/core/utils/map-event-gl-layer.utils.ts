import type maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapMarkerDto } from '@core/interfaces/event-interface';
import { eventMapMarkerPhase } from '@core/utils/event-time.utils';
import { DEFAULT_SCREEN_CLUSTER_CONFIG } from '@core/utils/map-event-cluster.utils';

export const UGR_EVENTS_GL_SOURCE_ID = 'ugr-events-gl';
export const UGR_EVENTS_GL_LAYER_ID = 'ugr-events-gl-dots';

/** Neutral highlight when a GL dot is selected. */
export const EVENT_GL_DOT_SELECTED_COLOR = '#94a3b8';
export const EVENT_GL_DOT_SELECTED_STROKE = '#e2e8f0';

type EventGlFeatureProps = {
  id: number;
  visibility: string;
  phase: string;
};

export function usesGlDotLayer(
  zoom: number,
  maxZoom = DEFAULT_SCREEN_CLUSTER_CONFIG.minZoomToCluster,
): boolean {
  return zoom < maxZoom;
}

export function buildEventMarkersGeoJson(
  markers: MapMarkerDto[],
  nowMs = Date.now(),
): FeatureCollection<Point, EventGlFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: markers.map((marker) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [marker.longitude, marker.latitude],
      },
      properties: {
        id: marker.id,
        visibility: marker.visibility ?? 'public',
        phase: eventMapMarkerPhase(marker.startsAt, marker.endsAt, nowMs),
      },
    })),
  };
}

function circleColorExpression(
  selectedId: number | null,
): maplibregl.ExpressionSpecification {
  const phaseColor: maplibregl.ExpressionSpecification = [
    'match',
    ['get', 'phase'],
    'live',
    '#16a34a',
    'ending',
    '#dc2626',
    'ended',
    '#64748b',
    '#475569',
  ];

  if (selectedId == null) {
    return phaseColor;
  }

  return [
    'case',
    ['==', ['get', 'id'], selectedId],
    EVENT_GL_DOT_SELECTED_COLOR,
    phaseColor,
  ];
}

function circleStrokeWidthExpression(
  selectedId: number | null,
): maplibregl.DataDrivenPropertyValueSpecification<number> {
  if (selectedId == null) {
    return 2;
  }
  return ['case', ['==', ['get', 'id'], selectedId], 3, 2];
}

function circleStrokeColorExpression(
  selectedId: number | null,
): maplibregl.DataDrivenPropertyValueSpecification<string> {
  if (selectedId == null) {
    return '#ffffff';
  }
  return [
    'case',
    ['==', ['get', 'id'], selectedId],
    EVENT_GL_DOT_SELECTED_STROKE,
    '#ffffff',
  ];
}

export function applyEventGlDotPaint(
  map: maplibregl.Map,
  selectedId: number | null,
): void {
  if (!map.getLayer(UGR_EVENTS_GL_LAYER_ID)) {
    return;
  }
  map.setPaintProperty(
    UGR_EVENTS_GL_LAYER_ID,
    'circle-color',
    circleColorExpression(selectedId),
  );
  map.setPaintProperty(
    UGR_EVENTS_GL_LAYER_ID,
    'circle-stroke-width',
    circleStrokeWidthExpression(selectedId),
  );
  map.setPaintProperty(
    UGR_EVENTS_GL_LAYER_ID,
    'circle-stroke-color',
    circleStrokeColorExpression(selectedId),
  );
}

export function ensureEventGlDotLayer(
  map: maplibregl.Map,
  maxZoom = DEFAULT_SCREEN_CLUSTER_CONFIG.minZoomToCluster,
): void {
  if (!map.getStyle()) {
    return;
  }

  if (!map.getSource(UGR_EVENTS_GL_SOURCE_ID)) {
    map.addSource(UGR_EVENTS_GL_SOURCE_ID, {
      type: 'geojson',
      data: buildEventMarkersGeoJson([]),
    });
  }

  if (!map.getLayer(UGR_EVENTS_GL_LAYER_ID)) {
    map.addLayer({
      id: UGR_EVENTS_GL_LAYER_ID,
      type: 'circle',
      source: UGR_EVENTS_GL_SOURCE_ID,
      maxzoom: maxZoom,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          4,
          13,
          6,
          maxZoom - 0.25,
          8,
        ],
        'circle-color': circleColorExpression(null),
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });
  }
}

export function updateEventGlDotSource(
  map: maplibregl.Map,
  markers: MapMarkerDto[],
  nowMs = Date.now(),
): void {
  const source = map.getSource(UGR_EVENTS_GL_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (!source) {
    return;
  }
  source.setData(buildEventMarkersGeoJson(markers, nowMs));
}

export function updateEventGlDotSelection(
  map: maplibregl.Map,
  selectedId: number | null,
): void {
  applyEventGlDotPaint(map, selectedId);
}

export function clearEventGlDotSource(map: maplibregl.Map): void {
  updateEventGlDotSource(map, []);
}

export type EventGlDotLayerHandlers = {
  onClick: (eventId: number) => void;
};

export function bindEventGlDotLayerInteractions(
  map: maplibregl.Map,
  handlers: EventGlDotLayerHandlers,
): () => void {
  const onLayerClick = (e: maplibregl.MapLayerMouseEvent): void => {
    const rawId = e.features?.[0]?.properties?.['id'];
    const id = typeof rawId === 'number' ? rawId : Number(rawId);
    if (!Number.isFinite(id)) {
      return;
    }
    e.originalEvent.stopPropagation();
    handlers.onClick(id);
  };

  const onEnter = (): void => {
    map.getCanvas().style.cursor = 'pointer';
  };

  const onLeave = (): void => {
    map.getCanvas().style.cursor = '';
  };

  map.on('click', UGR_EVENTS_GL_LAYER_ID, onLayerClick);
  map.on('mouseenter', UGR_EVENTS_GL_LAYER_ID, onEnter);
  map.on('mouseleave', UGR_EVENTS_GL_LAYER_ID, onLeave);

  return () => {
    map.off('click', UGR_EVENTS_GL_LAYER_ID, onLayerClick);
    map.off('mouseenter', UGR_EVENTS_GL_LAYER_ID, onEnter);
    map.off('mouseleave', UGR_EVENTS_GL_LAYER_ID, onLeave);
    map.getCanvas().style.cursor = '';
  };
}
