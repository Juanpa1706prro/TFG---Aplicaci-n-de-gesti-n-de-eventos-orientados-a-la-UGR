export type LngLat = { lat: number; lng: number };

/**
 * URL oficial de Google Maps para indicaciones.
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 * Si no se pasa origen, Google Maps usa la ubicación actual del dispositivo.
 */
export function buildGoogleMapsDirectionsUrl(
  destination: LngLat,
  origin?: LngLat | null,
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
  });

  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function openGoogleMapsDirections(
  destination: LngLat,
  origin?: LngLat | null,
): void {
  const url = buildGoogleMapsDirectionsUrl(destination, origin);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getCurrentPosition(): Promise<LngLat> {
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

/** Abre Google Maps con ruta desde tu posición (si el navegador la permite). */
export async function openGoogleMapsDirectionsFromCurrentLocation(
  destination: LngLat,
): Promise<void> {
  try {
    const origin = await getCurrentPosition();
    openGoogleMapsDirections(destination, origin);
  } catch {
    openGoogleMapsDirections(destination);
  }
}
