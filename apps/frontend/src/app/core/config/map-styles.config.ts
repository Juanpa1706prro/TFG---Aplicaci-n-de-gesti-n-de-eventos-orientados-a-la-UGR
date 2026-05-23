/**
 * Estilos MapLibre vía OpenFreeMap (sin API key).
 * @see https://openfreemap.org/quick_start/
 */
export type MapVisualTheme = 'dawn' | 'day' | 'sunset' | 'night' | 'neutro';

/** Preferencia del usuario (persistida en localStorage). */
export type MapThemePreference = 'auto' | 'day' | 'night' | 'neutro';

export const MAP_THEME_STORAGE_KEY = 'ugr-map-theme-preference';

const OPENFREEMAP = 'https://tiles.openfreemap.org/styles';

export const MAP_STYLE_URLS: Record<MapVisualTheme, string> = {
  dawn: `${OPENFREEMAP}/bright`,
  day: `${OPENFREEMAP}/liberty`,
  sunset: `${OPENFREEMAP}/bright`,
  /** Noche = Fiord (antes “anochecer”; ya no se usa Dark). */
  night: `${OPENFREEMAP}/fiord`,
  neutro: `${OPENFREEMAP}/positron`,
};

export const MAP_THEME_PREFERENCE_OPTIONS: {
  value: MapThemePreference;
  label: string;
}[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Dia' },
  { value: 'night', label: 'Noche' },
  { value: 'neutro', label: 'Neutro' },
];

/** Panel demo temporal, ordenado de amanecer a noche. */
export const MAP_DEMO_STYLES: {
  id: string;
  label: string;
  url: string;
  visualTheme: MapVisualTheme;
}[] = [
  {
    id: 'dawn',
    label: 'Amanecer',
    url: `${OPENFREEMAP}/bright`,
    visualTheme: 'dawn',
  },
  {
    id: 'liberty',
    label: 'Día',
    url: `${OPENFREEMAP}/liberty`,
    visualTheme: 'day',
  },
  {
    id: 'positron',
    label: 'Neutro',
    url: `${OPENFREEMAP}/positron`,
    visualTheme: 'neutro',
  },
  {
    id: 'bright',
    label: 'Atardecer',
    url: `${OPENFREEMAP}/bright`,
    visualTheme: 'sunset',
  },
  {
    id: 'fiord',
    label: 'Noche',
    url: `${OPENFREEMAP}/fiord`,
    visualTheme: 'night',
  },
];
