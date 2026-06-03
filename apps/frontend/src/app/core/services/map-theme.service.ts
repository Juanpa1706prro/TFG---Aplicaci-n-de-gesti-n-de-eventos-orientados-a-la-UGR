import { Injectable, signal } from '@angular/core';
import {
  MAP_THEME_PREFERENCE_OPTIONS,
  MapThemePreference,
  MapVisualTheme,
} from '@core/config/map-styles.config';
import {
  readStoredMapThemePreference,
  resolveVisualTheme,
  storeMapThemePreference,
} from '@core/utils/map-theme.utils';

@Injectable({ providedIn: 'root' })
export class MapThemeService {
  readonly themePreference = signal<MapThemePreference>(
    readStoredMapThemePreference(),
  );

  /** Incrementa al cambiar preferencia (para effects en el mapa). */
  private readonly preferenceChangeToken = signal(0);

  readonly themeOptions = MAP_THEME_PREFERENCE_OPTIONS;

  preferenceChange(): number {
    return this.preferenceChangeToken();
  }

  setThemePreference(preference: MapThemePreference): void {
    if (this.themePreference() === preference) {
      return;
    }
    this.themePreference.set(preference);
    storeMapThemePreference(preference);
    this.preferenceChangeToken.update((value) => value + 1);
  }

  themeLabel(preference?: MapThemePreference): string {
    const value = preference ?? this.themePreference();
    return (
      MAP_THEME_PREFERENCE_OPTIONS.find((option) => option.value === value)
        ?.label ?? 'Auto'
    );
  }

  resolveTheme(preference?: MapThemePreference, date = new Date()): MapVisualTheme {
    return resolveVisualTheme(preference ?? this.themePreference(), date);
  }
}
