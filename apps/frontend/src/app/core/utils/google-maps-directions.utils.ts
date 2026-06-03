// -------------------------------------------------------------------
// External Google Maps directions (URL scheme)
// Fallback when in-map routing is blocked or unavailable.
// @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
// -------------------------------------------------------------------

/** WGS84 point in degrees. */
export type LngLat = { lat: number; lng: number };

/** travelmode query param for Google Maps URLs. */
export type GoogleMapsTravelMode = 'walking' | 'driving';

// ------------------------------------------------------------
// URL builders
// ------------------------------------------------------------

/**
 * Builds the official Google Maps directions URL (opens app or web).
 * If origin is omitted, Google uses the device location when possible.
 * @param {LngLat} destination - Event or target coordinates.
 * @param {LngLat | null} [origin] - Optional start coordinates.
 * @param {GoogleMapsTravelMode} [travelMode] - Optional walking / driving mode.
 * @returns {string} Full https://www.google.com/maps/dir/... URL.
 */
export function buildGoogleMapsDirectionsUrl(
  destination: LngLat,
  origin?: LngLat | null,
  travelMode?: GoogleMapsTravelMode,
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
  });

  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }

  if (travelMode) {
    params.set('travelmode', travelMode);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Maps in-app travel mode to Google Maps URL travelmode value.
 * @param {'WALK' | 'DRIVE'} mode - Mode from map detail selector.
 * @returns {GoogleMapsTravelMode}
 */
export function mapTravelModeToGoogleUrl(
  mode: 'WALK' | 'DRIVE',
): GoogleMapsTravelMode {
  return mode === 'DRIVE' ? 'driving' : 'walking';
}

// ------------------------------------------------------------
// Browser actions
// ------------------------------------------------------------

/**
 * Opens Google Maps directions in a new tab.
 * @param {LngLat} destination - Target coordinates.
 * @param {LngLat | null} [origin] - Optional origin.
 * @param {GoogleMapsTravelMode} [travelMode] - Optional mode.
 * @returns {void}
 */
export function openGoogleMapsDirections(
  destination: LngLat,
  origin?: LngLat | null,
  travelMode?: GoogleMapsTravelMode,
): void {
  const url = buildGoogleMapsDirectionsUrl(destination, origin, travelMode);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ------------------------------------------------------------
// Geolocation (shared with in-map routing)
// ------------------------------------------------------------

/**
 * Resolves the device position for route origin or external directions.
 * @returns {Promise<LngLat>} Current latitude/longitude.
 * @throws {Error} If geolocation is unavailable or denied (Spanish message).
 */
export function getCurrentLngLat(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => reject(new Error('No se pudo obtener tu ubicación')),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  });
}

/**
 * Opens Google Maps with directions from the current position when possible.
 * @param {LngLat} destination - Event coordinates.
 * @param {GoogleMapsTravelMode} [travelMode] - Optional mode from map selector.
 * @returns {Promise<void>}
 */
export async function openGoogleMapsDirectionsFromCurrentLocation(
  destination: LngLat,
  travelMode?: GoogleMapsTravelMode,
): Promise<void> {
  try {
    const origin = await getCurrentLngLat();
    openGoogleMapsDirections(destination, origin, travelMode);
  } catch {
    openGoogleMapsDirections(destination, undefined, travelMode);
  }
}
