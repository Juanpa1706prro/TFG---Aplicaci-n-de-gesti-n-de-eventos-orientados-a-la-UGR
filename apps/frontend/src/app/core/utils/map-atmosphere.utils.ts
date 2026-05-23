import maplibregl from 'maplibre-gl';
import { MapVisualTheme } from '@core/config/map-styles.config';

/** Configuración de cielo/horizonte (MapLibre `setSky`). Luz ambiental, no tinte de edificios. */
export type MapSkyConfig = {
  'sky-color': string;
  'horizon-color': string;
  'sky-horizon-blend'?: number;
  'atmosphere-blend'?: number;
};

const DEFAULT_SKY: MapSkyConfig = {
  'sky-color': '#88C6FC',
  'horizon-color': '#ffffff',
  'sky-horizon-blend': 0.8,
  'atmosphere-blend': 0.8,
};

/**
 * Amanecer: cielo frío arriba y franja cálida fina en el horizonte (sol bajo),
 * similar a mapas con hora del día (p. ej. Pokémon GO).
 */
const DAWN_SKY: MapSkyConfig = {
  'sky-color': '#9eb8d4',
  'horizon-color': '#ffe8c4',
  'sky-horizon-blend': 0.28,
  'atmosphere-blend': 0.95,
};

/**
 * Atardecer: entre amanecer sutil y golden hour; naranja notable pero contenido.
 */
const SUNSET_SKY: MapSkyConfig = {
  'sky-color': '#a0aec4',
  'horizon-color': '#eca060',
  'sky-horizon-blend': 0.24,
  'atmosphere-blend': 0.92,
};

/** Noche (Fiord): cielo azulado suave, legible y con parques verdes. */
const NIGHT_SKY: MapSkyConfig = {
  'sky-color': '#4a5a72',
  'horizon-color': '#c8b8a8',
  'sky-horizon-blend': 0.4,
  'atmosphere-blend': 0.88,
};

/** Neutro: cielo perla suave, coherente con fondo papel. */
const NEUTRO_SKY: MapSkyConfig = {
  'sky-color': '#d4dce4',
  'horizon-color': '#f5f4f0',
  'sky-horizon-blend': 0.48,
  'atmosphere-blend': 0.62,
};

function skyForTheme(theme: MapVisualTheme): MapSkyConfig | null {
  switch (theme) {
    case 'dawn':
      return DAWN_SKY;
    case 'sunset':
      return SUNSET_SKY;
    case 'night':
      return NIGHT_SKY;
    case 'neutro':
      return NEUTRO_SKY;
    case 'day':
    default:
      return null;
  }
}

/**
 * Aplica cielo/atmosfera 3D según la hora visual. Los edificios mantienen su color base.
 */
export function applyMapAtmosphere(
  map: maplibregl.Map,
  theme: MapVisualTheme,
): void {
  const setSky = (map as maplibregl.Map & { setSky?: (sky?: MapSkyConfig) => void })
    .setSky;
  if (typeof setSky !== 'function') {
    return;
  }

  const config = skyForTheme(theme);
  try {
    if (config) {
      setSky.call(map, config);
    } else {
      setSky.call(map, DEFAULT_SKY);
    }
  } catch (err) {
    console.warn('No se pudo aplicar el cielo del mapa:', err);
  }
}
