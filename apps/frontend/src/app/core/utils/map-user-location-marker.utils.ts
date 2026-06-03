import maplibregl from 'maplibre-gl';
import { MAP_3D_BUILDINGS_MIN_PITCH } from '@core/utils/map-3d-buildings.utils';

/** Marcador HTML de «tu ubicación» (2D: blue dot; 3D: poste + punto hacia cámara). */

const ACCURACY_RING_MIN_PX = 36;
const ACCURACY_RING_MAX_PX = 112;
const ACCURACY_RING_DEFAULT_PX = 52;

/**
 * Tamaño del anillo de precisión en píxeles según metros reportados por el GPS.
 * Sin dato → tamaño por defecto.
 */
export function userLocationAccuracyRingPx(
  accuracyMeters: number | undefined,
): number {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters) || accuracyMeters <= 0) {
    return ACCURACY_RING_DEFAULT_PX;
  }
  return Math.min(
    ACCURACY_RING_MAX_PX,
    Math.max(ACCURACY_RING_MIN_PX, accuracyMeters * 1.35),
  );
}

export function updateUserLocationAccuracyRing(
  root: HTMLElement,
  accuracyMeters: number | undefined,
): void {
  const ring = root.querySelector<HTMLElement>('.ugr-user-location__accuracy');
  if (!ring) {
    return;
  }
  const size = userLocationAccuracyRingPx(accuracyMeters);
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
}

export function isUserLocationPitchedView(map: maplibregl.Map): boolean {
  return map.getPitch() >= MAP_3D_BUILDINGS_MIN_PITCH;
}

/** Elipse en el suelo (solo visible con pitch alto; alineada al plano del mapa). */
export function createUserLocationGroundElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ugr-user-location-ground';
  root.setAttribute('aria-hidden', 'true');
  return root;
}

export function syncUserLocationMarkerVisual(
  map: maplibregl.Map,
  markerRoot: HTMLElement,
  groundMarker: maplibregl.Marker | null,
): void {
  const pitched = isUserLocationPitchedView(map);
  markerRoot.classList.toggle('ugr-user-location--pitched', pitched);

  const groundEl = groundMarker?.getElement();
  if (groundEl) {
    groundEl.style.display = pitched ? 'block' : 'none';
  }
}

export function createUserLocationMarkerElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ugr-user-location';
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', 'Tu ubicación');

  const accuracy = document.createElement('div');
  accuracy.className = 'ugr-user-location__accuracy';
  accuracy.setAttribute('aria-hidden', 'true');

  const pulse = document.createElement('div');
  pulse.className = 'ugr-user-location__pulse';
  pulse.setAttribute('aria-hidden', 'true');

  const stem = document.createElement('div');
  stem.className = 'ugr-user-location__stem';
  stem.setAttribute('aria-hidden', 'true');

  const dot = document.createElement('div');
  dot.className = 'ugr-user-location__dot';
  dot.setAttribute('aria-hidden', 'true');

  root.append(accuracy, pulse, stem, dot);
  updateUserLocationAccuracyRing(root, undefined);
  return root;
}
