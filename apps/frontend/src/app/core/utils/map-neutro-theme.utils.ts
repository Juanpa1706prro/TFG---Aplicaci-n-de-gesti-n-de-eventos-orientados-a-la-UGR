import maplibregl from 'maplibre-gl';
import { MapVisualTheme } from '@core/config/map-styles.config';
import {
  applyLandcoverPalette,
  type LandcoverPalette,
} from '@core/utils/map-landcover-theme.utils';

/**
 * Positron refinado: papel cálido, agua y parques con identidad, vías discretas.
 * Inspiración: Carto Positron, mapas editoriales minimalistas.
 */
const NEUTRO_LANDCOVER: LandcoverPalette = {
  water: { color: '#b4c9d4', opacity: 0.94 },
  wood: { color: '#d0ddd2', opacity: 0.9 },
  grass: { color: '#dce6d4', opacity: 0.88 },
  park: { color: '#d6e4d0', opacity: 0.92 },
  scrub: { color: '#dde4d6', opacity: 0.82 },
  sand: { color: '#ebe4d6', opacity: 0.82 },
  wetland: { color: '#c8d8dc', opacity: 0.85 },
  ice: { color: '#f2f6f8', opacity: 0.85 },
  residential: { color: '#efede8', opacity: 0.7 },
  commercial: { color: '#f2eaee', opacity: 0.55 },
  industrial: { color: '#ebeae6', opacity: 0.55 },
  hospital: { color: '#f6f0f2', opacity: 0.6 },
  school: { color: '#f2f2ea', opacity: 0.6 },
  cemetery: { color: '#e8ece6', opacity: 0.65 },
  railway: { color: '#e6e4e2', opacity: 0.5 },
};

const NEUTRO_BACKGROUND = '#f5f4f0';
const NEUTRO_BUILDING_FILL = '#ebe9e4';

const ROAD_LAYER =
  /^(highway|road_|tunnel|bridge|railway|ferry|cablecar|aeroway)/;

/**
 * Estilo Neutro (Positron): minimalista con jerarquía visual clara.
 */
export function applyMapNeutroTheme(
  map: maplibregl.Map,
  theme: MapVisualTheme,
): void {
  if (theme !== 'neutro') {
    return;
  }

  applyLandcoverPalette(map, NEUTRO_LANDCOVER);
  softenNeutroRoads(map);
  applyNeutroBaseAndBuildings(map);
}

function softenNeutroRoads(map: maplibregl.Map): void {
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (layer.type !== 'line' || !map.getLayer(layer.id)) {
      continue;
    }
    if (!ROAD_LAYER.test(layer.id)) {
      continue;
    }

    const id = layer.id.toLowerCase();

    try {
      if (id.includes('casing') || id.includes('bridge')) {
        map.setPaintProperty(layer.id, 'line-opacity', 0.32);
        map.setPaintProperty(layer.id, 'line-color', '#e0e0de');
      } else if (id.includes('motorway') || id.includes('major')) {
        map.setPaintProperty(layer.id, 'line-color', '#d8d8d6');
        map.setPaintProperty(layer.id, 'line-opacity', 0.72);
      } else if (id.includes('path') || id.includes('minor')) {
        map.setPaintProperty(layer.id, 'line-color', '#e6e6e4');
        map.setPaintProperty(layer.id, 'line-opacity', 0.5);
      } else {
        map.setPaintProperty(layer.id, 'line-color', '#dededc');
        map.setPaintProperty(layer.id, 'line-opacity', 0.58);
      }
    } catch (err) {
      console.warn(`No se pudo suavizar la vía ${layer.id}:`, err);
    }
  }
}

function applyNeutroBaseAndBuildings(map: maplibregl.Map): void {
  if (map.getLayer('background')) {
    try {
      map.setPaintProperty('background', 'background-color', NEUTRO_BACKGROUND);
    } catch {
      /* ignore */
    }
  }

  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'building' &&
      map.getLayer(layer.id)
    ) {
      try {
        map.setPaintProperty(layer.id, 'fill-color', NEUTRO_BUILDING_FILL);
      } catch {
        /* ignore */
      }
    }
  }
}
