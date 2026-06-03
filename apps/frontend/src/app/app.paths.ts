/**
 * Segmentos y plantillas de URL de la app.
 * En navegación usar siempre arrays: `['/u', userNumber, 'map']`.
 * Las claves con `:param` son documentación, no válidas en `router.navigate([PATHS.MAP])`.
 */
export const PATHS = {
  AUTH: 'auth',
  AUTH_ONBOARDING: 'auth/onboarding',
  AUTH_SELECT_PROFILE: 'auth/select-profile',
  USER_SHELL: 'u/:userNumber',
  MAP: 'map',
  MAP_EVENTS: 'map/events',
  EVENT_NEW: 'events/new',
  PROFILE: 'profile',
  PROFILE_VIEW: 'profile/:viewUserNumber',
  ACCOUNT: 'account',
} as const;
