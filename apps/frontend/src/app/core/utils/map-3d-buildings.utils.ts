import maplibregl from 'maplibre-gl';
import { MapVisualTheme } from '@core/config/map-styles.config';

export const BUILDINGS_3D_LAYER_ID = 'ugr-3d-buildings';
const NATIVE_3D_LAYER_ID = 'building-3d';

/** Extrusión activa solo con zoom y pitch suficientes (ahorra GPU). */
export const MAP_3D_BUILDINGS_MIN_ZOOM = 15;
export const MAP_3D_BUILDINGS_MIN_PITCH = 40;

type Buildings3DSetup = {
  customExtrusionAdded: boolean;
  hiddenFillLayerIds: string[];
};

const setupByMap = new WeakMap<maplibregl.Map, Buildings3DSetup>();

export function isMap3DBuildingsActive(map: maplibregl.Map): boolean {
  return (
    map.getZoom() >= MAP_3D_BUILDINGS_MIN_ZOOM &&
    map.getPitch() >= MAP_3D_BUILDINGS_MIN_PITCH
  );
}

/**
 * Prepara capa 3D (custom o nativa) y aplica visibilidad según zoom/pitch actuales.
 */
export function syncMap3DBuildings(
  map: maplibregl.Map,
  theme: MapVisualTheme,
): void {
  ensureMap3DBuildingsInfrastructure(map, theme);
  applyMap3DBuildingsVisibility(map, isMap3DBuildingsActive(map));
}

/** @deprecated Usar syncMap3DBuildings; se mantiene por compatibilidad. */
export function ensureMap3DBuildings(
  map: maplibregl.Map,
  theme: MapVisualTheme,
): void {
  syncMap3DBuildings(map, theme);
}

export function bindMap3DBuildingsSync(
  map: maplibregl.Map,
  getTheme: () => MapVisualTheme,
): () => void {
  const sync = () => syncMap3DBuildings(map, getTheme());
  const events = ['moveend', 'zoomend', 'pitchend', 'rotateend'] as const;

  for (const event of events) {
    map.on(event, sync);
  }
  sync();

  return () => {
    for (const event of events) {
      map.off(event, sync);
    }
  };
}

function applyMap3DBuildingsVisibility(
  map: maplibregl.Map,
  active: boolean,
): void {
  const visibility = active ? 'visible' : 'none';

  if (map.getLayer(NATIVE_3D_LAYER_ID)) {
    map.setLayoutProperty(NATIVE_3D_LAYER_ID, 'visibility', visibility);
  }

  const setup = setupByMap.get(map);
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, 'visibility', visibility);
  }

  if (setup?.customExtrusionAdded) {
    setBuildingFillsVisible(map, setup, !active);
  }
}

function setBuildingFillsVisible(
  map: maplibregl.Map,
  setup: Buildings3DSetup,
  visible: boolean,
): void {
  const styleLayers = map.getStyle()?.layers ?? [];

  for (const layerId of setup.hiddenFillLayerIds) {
    if (!map.getLayer(layerId)) {
      continue;
    }

    if (visible) {
      const spec = styleLayers.find((layer) => layer.id === layerId) as
        | maplibregl.FillLayerSpecification
        | undefined;
      const opacity = spec?.paint?.['fill-opacity'] ?? 1;
      const outline =
        spec?.paint?.['fill-outline-color'] ?? 'rgba(0,0,0,0.08)';
      map.setPaintProperty(layerId, 'fill-opacity', opacity);
      map.setPaintProperty(layerId, 'fill-outline-color', outline);
    } else {
      map.setPaintProperty(layerId, 'fill-opacity', 0);
      map.setPaintProperty(layerId, 'fill-outline-color', 'rgba(0,0,0,0)');
    }
  }
}

function ensureMap3DBuildingsInfrastructure(
  map: maplibregl.Map,
  theme: MapVisualTheme,
): void {
  const style = map.getStyle();
  const layers = style?.layers ?? [];
  if (!layers.length) {
    return;
  }

  const hasNative3D = layers.some((layer) => layer.id === NATIVE_3D_LAYER_ID);
  if (hasNative3D) {
    setupByMap.set(map, { customExtrusionAdded: false, hiddenFillLayerIds: [] });
    return;
  }

  const buildingFills = layers.filter(
    (layer): layer is maplibregl.FillLayerSpecification =>
      layer.type === 'fill' &&
      layer['source-layer'] === 'building' &&
      typeof layer.source === 'string',
  );

  if (!buildingFills.length) {
    return;
  }

  const hiddenFillLayerIds = buildingFills.map((layer) => layer.id);
  let setup = setupByMap.get(map);

  if (!map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    addCustomExtrusionLayer(map, theme, buildingFills, layers);
    setup = { customExtrusionAdded: true, hiddenFillLayerIds };
    setupByMap.set(map, setup);
    return;
  }

  if (!setup) {
    setupByMap.set(map, {
      customExtrusionAdded: true,
      hiddenFillLayerIds,
    });
  }
}

function addCustomExtrusionLayer(
  map: maplibregl.Map,
  theme: MapVisualTheme,
  buildingFills: maplibregl.FillLayerSpecification[],
  layers: maplibregl.LayerSpecification[],
): void {
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    map.removeLayer(BUILDINGS_3D_LAYER_ID);
  }

  const reference = buildingFills[0];
  const beforeLayerId = findExtrusionInsertBeforeLayerId(layers);
  const extrusionColor = resolveExtrusionColor(theme, buildingFills);

  const spec: maplibregl.FillExtrusionLayerSpecification = {
    id: BUILDINGS_3D_LAYER_ID,
    type: 'fill-extrusion',
    source: reference.source as string,
    'source-layer': 'building',
    minzoom: MAP_3D_BUILDINGS_MIN_ZOOM,
    layout: {
      visibility: 'none',
    },
    paint: {
      'fill-extrusion-color': extrusionColor,
      'fill-extrusion-base': [
        'coalesce',
        ['to-number', ['get', 'render_min_height']],
        ['to-number', ['get', 'min_height']],
        0,
      ],
      'fill-extrusion-height': [
        'max',
        4,
        [
          'coalesce',
          ['to-number', ['get', 'render_height']],
          ['to-number', ['get', 'height']],
          12,
        ],
      ],
      'fill-extrusion-opacity': theme === 'neutro' ? 0.94 : 0.97,
      'fill-extrusion-vertical-gradient':
        theme === 'neutro' || theme === 'sunset',
    },
  };

  if (reference.filter !== undefined) {
    spec.filter = reference.filter;
  }

  try {
    map.addLayer(spec, beforeLayerId);
  } catch (err) {
    console.warn('No se pudo añadir la capa 3D de edificios:', err);
  }
}

function findExtrusionInsertBeforeLayerId(
  layers: maplibregl.LayerSpecification[],
): string | undefined {
  let lastTransportIndex = -1;

  for (let i = 0; i < layers.length; i++) {
    if (isTransportRoadLayer(layers[i])) {
      lastTransportIndex = i;
    }
  }

  if (lastTransportIndex >= 0 && lastTransportIndex < layers.length - 1) {
    return layers[lastTransportIndex + 1].id;
  }

  const placeLabel = layers.find(
    (layer) => layer.type === 'symbol' && layer.id.startsWith('place_'),
  );
  return placeLabel?.id;
}

function isTransportRoadLayer(layer: maplibregl.LayerSpecification): boolean {
  const id = layer.id.toLowerCase();

  if (layer.type === 'fill') {
    const sl = (layer as maplibregl.FillLayerSpecification)['source-layer'];
    if (sl === 'transportation' || sl === 'aeroway') {
      return true;
    }
    return /road|aeroway|pier|runway|taxiway/.test(id);
  }

  if (layer.type === 'line') {
    const sl = (layer as maplibregl.LineLayerSpecification)['source-layer'];
    if (sl === 'transportation' || sl === 'aeroway') {
      return true;
    }
    return (
      /^(highway|road|tunnel|bridge|railway|ferry|cablecar|aeroway)[_-]/.test(id) ||
      id.startsWith('highway_') ||
      /^road_/.test(id) ||
      id.includes('motorway') ||
      id.includes('railway')
    );
  }

  if (layer.type === 'symbol') {
    if (id.startsWith('place_')) {
      return false;
    }
    return /road|highway|oneway|shield|housenumber|motorway/.test(id);
  }

  return false;
}

function extractBuildingFillColor(
  buildingFills: maplibregl.FillLayerSpecification[],
): string | maplibregl.ExpressionSpecification | null {
  for (let i = buildingFills.length - 1; i >= 0; i--) {
    const raw = buildingFills[i].paint?.['fill-color'];
    if (typeof raw === 'string') {
      return raw;
    }
    if (Array.isArray(raw)) {
      const hex = lastColorStopInExpression(raw);
      if (hex) {
        return hex;
      }
    }
  }
  return null;
}

function lastColorStopInExpression(expr: unknown[]): string | null {
  for (let i = expr.length - 1; i >= 0; i--) {
    const part = expr[i];
    if (typeof part === 'string' && (part.startsWith('#') || part.startsWith('rgb'))) {
      return part;
    }
  }
  return null;
}

function resolveExtrusionColor(
  theme: MapVisualTheme,
  buildingFills: maplibregl.FillLayerSpecification[],
): string | maplibregl.ExpressionSpecification {
  if (theme === 'dawn' || theme === 'day') {
    return extractBuildingFillColor(buildingFills) ?? paintFor3DTheme('day').color;
  }

  if (theme === 'sunset') {
    return [
      'interpolate',
      ['linear'],
      ['zoom'],
      14,
      '#9e9688',
      16,
      '#ddd4c4',
    ];
  }

  if (theme === 'night') {
    return [
      'interpolate',
      ['linear'],
      ['zoom'],
      14,
      '#8a96a8',
      16,
      '#a3b0c2',
    ];
  }

  if (theme === 'neutro') {
    return [
      'interpolate',
      ['linear'],
      ['zoom'],
      14,
      '#eceae4',
      16,
      '#ddd9d2',
    ];
  }

  return paintFor3DTheme(theme).color;
}

function paintFor3DTheme(theme: MapVisualTheme): { color: string } {
  switch (theme) {
    case 'dawn':
      return { color: '#d9d5cd' };
    case 'night':
      return { color: '#95a3b3' };
    case 'sunset':
      return { color: '#d9d5cd' };
    case 'neutro':
      return { color: '#eaeae5' };
    case 'day':
    default:
      return { color: '#d9d5cd' };
  }
}
