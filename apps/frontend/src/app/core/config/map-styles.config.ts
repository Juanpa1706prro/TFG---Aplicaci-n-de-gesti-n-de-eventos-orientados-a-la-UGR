/**
 * Estilos MapLibre vía OpenFreeMap (sin API key).
 * @see https://openfreemap.org/quick_start/
 */
export type MapVisualTheme = 'dawn' | 'day' | 'sunset' | 'night';

/** Preferencia del usuario (persistida en localStorage). */
export type MapThemePreference = 'auto' | 'day' | 'night';

export const MAP_THEME_STORAGE_KEY = 'ugr-map-theme-preference';

const OPENFREEMAP = 'https://tiles.openfreemap.org/styles';

export const MAP_STYLE_URLS: Record<MapVisualTheme, string> = {
  dawn: `${OPENFREEMAP}/bright`,
  day: `${OPENFREEMAP}/liberty`,
  sunset: `${OPENFREEMAP}/bright`,
  /** Noche = Fiord. */
  night: `${OPENFREEMAP}/fiord`,
};

export const MAP_THEME_PREFERENCE_OPTIONS: {
  value: MapThemePreference;
  label: string;
}[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Día' },
  { value: 'night', label: 'Noche' },
];
