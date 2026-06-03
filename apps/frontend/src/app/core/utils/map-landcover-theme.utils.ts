import maplibregl from 'maplibre-gl';
import { MapVisualTheme } from '@core/config/map-styles.config';

export type LandcoverPaint = {
  color: string;
  opacity?: number;
};

export type LandcoverPalette = Record<string, LandcoverPaint>;

/** Noche (Fiord): parques, agua y zonas con matices reconocibles. */
const NIGHT_LANDCOVER: LandcoverPalette = {
  water: { color: '#2a4460', opacity: 0.9 },
  wood: { color: '#243a30', opacity: 0.82 },
  grass: { color: '#2a4034', opacity: 0.8 },
  park: { color: '#2a4538', opacity: 0.86 },
  scrub: { color: '#2f4236', opacity: 0.76 },
  sand: { color: '#454035', opacity: 0.7 },
  wetland: { color: '#243840', opacity: 0.76 },
  ice: { color: '#354558', opacity: 0.7 },
  residential: { color: '#363430', opacity: 0.48 },
  commercial: { color: '#403438', opacity: 0.46 },
  industrial: { color: '#3c3a34', opacity: 0.48 },
  hospital: { color: '#453238', opacity: 0.55 },
  school: { color: '#3e4034', opacity: 0.55 },
  cemetery: { color: '#323a30', opacity: 0.6 },
  railway: { color: '#363432', opacity: 0.4 },
};

/**
 * Atardecer (Bright): realza agua, parques y zonas con matices cálidos de golden hour.
 */
const SUNSET_LANDCOVER: LandcoverPalette = {
  water: { color: '#88b4c8', opacity: 0.92 },
  wood: { color: '#c8d0a8', opacity: 0.86 },
  grass: { color: '#d0d4b0', opacity: 0.84 },
  park: { color: '#d4d8b8', opacity: 0.88 },
  scrub: { color: '#ccc8a8', opacity: 0.8 },
  sand: { color: '#e4d8b8', opacity: 0.82 },
  wetland: { color: '#98b8b0', opacity: 0.82 },
  ice: { color: '#e8eef0', opacity: 0.8 },
  residential: { color: '#e8e0d4', opacity: 0.55 },
  commercial: { color: '#f0e4dc', opacity: 0.5 },
  industrial: { color: '#e8e4d8', opacity: 0.5 },
  hospital: { color: '#f5ebe4', opacity: 0.55 },
  school: { color: '#ece8d4', opacity: 0.55 },
  cemetery: { color: '#dcd8c8', opacity: 0.6 },
  railway: { color: '#e0dcd4', opacity: 0.45 },
};

const SKIP_LAYER_IDS =
  /^(building|road_|aeroway|background|tunnel|bridge|ferry|cablecar)/;

/** En noche (Fiord) y atardecer recupera matices de parques, agua, etc. */
export function applyMapLandcoverTheme(
  map: maplibregl.Map,
  theme: MapVisualTheme,
): void {
  if (theme === 'sunset') {
    applyLandcoverPalette(map, SUNSET_LANDCOVER);
    return;
  }

  if (theme === 'night') {
    applyLandcoverPalette(map, NIGHT_LANDCOVER);
  }
}

export function applyLandcoverPalette(
  map: maplibregl.Map,
  palette: LandcoverPalette,
): void {
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (layer.type !== 'fill' || !map.getLayer(layer.id)) {
      continue;
    }
    if (SKIP_LAYER_IDS.test(layer.id)) {
      continue;
    }

    const category = landcoverCategory(layer.id);
    if (!category) {
      continue;
    }

    const paint = palette[category];
    if (!paint) {
      continue;
    }

    try {
      map.setPaintProperty(layer.id, 'fill-color', paint.color);
      if (paint.opacity !== undefined) {
        map.setPaintProperty(layer.id, 'fill-opacity', paint.opacity);
      }
      if (
        (category === 'wood' || category === 'park' || category === 'grass') &&
        map.getPaintProperty(layer.id, 'fill-pattern')
      ) {
        map.setPaintProperty(layer.id, 'fill-pattern', undefined);
      }
    } catch (err) {
      console.warn(`No se pudo teñir la capa ${layer.id}:`, err);
    }
  }
}

function landcoverCategory(layerId: string): string | null {
  const id = layerId.toLowerCase().replace(/-/g, '_');

  if (id.includes('water')) {
    return 'water';
  }
  if (id.includes('wood') || id.includes('forest')) {
    return 'wood';
  }
  if (id.includes('grass')) {
    return 'grass';
  }
  if (
    id.includes('park') ||
    id.includes('playground') ||
    id.includes('garden') ||
    id.includes('pitch') ||
    (id.includes('track') && id.includes('landuse'))
  ) {
    return 'park';
  }
  if (id.includes('sand')) {
    return 'sand';
  }
  if (id.includes('wetland')) {
    return 'wetland';
  }
  if (id.includes('ice') || id.includes('glacier') || id.includes('snow')) {
    return 'ice';
  }
  if (id.includes('hospital')) {
    return 'hospital';
  }
  if (id.includes('school') || id.includes('university') || id.includes('college')) {
    return 'school';
  }
  if (id.includes('cemetery')) {
    return 'cemetery';
  }
  if (id.includes('commercial') || id.includes('retail')) {
    return 'commercial';
  }
  if (id.includes('industrial')) {
    return 'industrial';
  }
  if (id.includes('residential') || id.includes('suburb')) {
    return 'residential';
  }
  if (id.includes('railway') && id.includes('landuse')) {
    return 'railway';
  }
  if (id.includes('scrub') || id.includes('heath')) {
    return 'scrub';
  }

  return null;
}
