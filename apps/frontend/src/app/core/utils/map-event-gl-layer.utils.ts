import type maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapMarkerDto } from '@core/interfaces/event-interface';
import { DEFAULT_SCREEN_CLUSTER_CONFIG } from '@core/utils/map-event-cluster.utils';

export const UGR_EVENTS_GL_SOURCE_ID = 'ugr-events-gl';
export const UGR_EVENTS_GL_LAYER_ID = 'ugr-events-gl-dots';

type EventGlFeatureProps = {
  id: number;
  visibility: string;
};

export function usesGlDotLayer(
  zoom: number,
  maxZoom = DEFAULT_SCREEN_CLUSTER_CONFIG.minZoomToCluster,
): boolean {
  return zoom < maxZoom;
}

export function buildEventMarkersGeoJson(
  markers: MapMarkerDto[],
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
      },
    })),
  };
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
        'circle-color': [
          'match',
          ['get', 'visibility'],
          'private',
          '#7c3aed',
          '#dc2626',
        ],
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
): void {
  const source = map.getSource(UGR_EVENTS_GL_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (!source) {
    return;
  }
  source.setData(buildEventMarkersGeoJson(markers));
}

export function updateEventGlDotSelection(
  map: maplibregl.Map,
  selectedId: number | null,
): void {
  if (!map.getLayer(UGR_EVENTS_GL_LAYER_ID)) {
    return;
  }

  const strokeWidth = (
    selectedId
      ? ['case', ['==', ['get', 'id'], selectedId], 3, 2]
      : 2
  ) as maplibregl.ExpressionSpecification;

  const strokeColor = (
    selectedId
      ? ['case', ['==', ['get', 'id'], selectedId], '#fbbf24', '#ffffff']
      : '#ffffff'
  ) as maplibregl.ExpressionSpecification;

  map.setPaintProperty(UGR_EVENTS_GL_LAYER_ID, 'circle-stroke-width', strokeWidth);
  map.setPaintProperty(UGR_EVENTS_GL_LAYER_ID, 'circle-stroke-color', strokeColor);
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
