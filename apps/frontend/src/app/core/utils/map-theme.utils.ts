import {
  MAP_STYLE_URLS,
  MAP_THEME_STORAGE_KEY,
  MapThemePreference,
  MapVisualTheme,
} from '@core/config/map-styles.config';

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const DAWN_START_HOUR = 5.5;
const DAWN_END_HOUR = 7;
const SUNSET_EVENING_START = 19;
const SUNSET_EVENING_END = 21;

/** Horas locales en las que cambia el tema en modo Auto. */
const AUTO_THEME_BOUNDARY_HOURS = [
  DAWN_START_HOUR,
  DAWN_END_HOUR,
  DAY_END_HOUR,
  SUNSET_EVENING_END,
] as const;

/**
 * Milisegundos hasta el próximo cambio de franja en Auto (programar un solo timer).
 */
export function msUntilNextAutoThemeBoundary(now = new Date()): number {
  const nowMs = now.getTime();
  let nextMs = Number.POSITIVE_INFINITY;

  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + dayOffset);

    for (const hour of AUTO_THEME_BOUNDARY_HOURS) {
      const boundary = new Date(base);
      const wholeHours = Math.floor(hour);
      const minutes = Math.round((hour - wholeHours) * 60);
      boundary.setHours(wholeHours, minutes, 0, 0);
      const t = boundary.getTime();
      if (t > nowMs) {
        nextMs = Math.min(nextMs, t);
      }
    }
  }

  if (!Number.isFinite(nextMs)) {
    return 60_000;
  }

  return Math.max(nextMs - nowMs + 50, 50);
}

export function resolveAutoVisualTheme(date = new Date()): MapVisualTheme {
  const hour = date.getHours() + date.getMinutes() / 60;

  if (hour >= DAWN_START_HOUR && hour < DAWN_END_HOUR) {
    return 'dawn';
  }

  if (hour >= DAY_START_HOUR && hour < DAY_END_HOUR) {
    return 'day';
  }

  if (hour >= SUNSET_EVENING_START && hour < SUNSET_EVENING_END) {
    return 'sunset';
  }

  return 'night';
}

export function resolveVisualTheme(
  preference: MapThemePreference,
  date = new Date(),
): MapVisualTheme {
  switch (preference) {
    case 'day':
      return 'day';
    case 'night':
      return 'night';
    case 'auto':
    default:
      return resolveAutoVisualTheme(date);
  }
}

export function mapStyleUrlForTheme(theme: MapVisualTheme): string {
  return MAP_STYLE_URLS[theme];
}

export function mapStyleUrlForPreference(
  preference: MapThemePreference,
  date = new Date(),
): string {
  return mapStyleUrlForTheme(resolveVisualTheme(preference, date));
}

export function visualThemeFromStyleUrl(styleUrl: string): MapVisualTheme {
  if (styleUrl.includes('/fiord')) {
    return 'night';
  }
  if (styleUrl.includes('/bright')) {
    return 'sunset';
  }
  return 'day';
}

export function readStoredMapThemePreference(): MapThemePreference {
  if (typeof localStorage === 'undefined') {
    return 'auto';
  }
  const raw = localStorage.getItem(MAP_THEME_STORAGE_KEY);
  if (raw === 'day' || raw === 'night' || raw === 'auto') {
    return raw;
  }
  if (raw === 'neutro') {
    return 'auto';
  }
  return 'auto';
}

export function storeMapThemePreference(preference: MapThemePreference): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(MAP_THEME_STORAGE_KEY, preference);
}
