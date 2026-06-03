import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ComputeRouteDto } from './dto/compute-route.dto';
import type { RouteDirectionsResponse } from './interfaces/route-directions-response.interface';
import { encodedPolylineToGeoJsonLine } from './utils/polyline-decode.util';
import {
  getGoogleRoutesApiKey,
  isGoogleRoutingConfigured,
} from './utils/routing-config.util';

// -------------------------------------------------------------------
// Routing Service
// Server-side proxy for Google Routes API computeRoutes (Essentials SKU).
// Picks the fastest alternative and returns GeoJSON for MapLibre.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Google Routes API constants
// ------------------------------------------------------------

const COMPUTE_ROUTES_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Field mask limiting billed fields and response size. */
const FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline';

// ------------------------------------------------------------
// Google API response shapes (partial)
// ------------------------------------------------------------

interface GoogleRouteLeg {
  distanceMeters?: number;
  duration?: string;
  polyline?: { encodedPolyline?: string };
}

interface GoogleComputeRoutesResponse {
  routes?: GoogleRouteLeg[];
  error?: { message?: string; status?: string };
}

@Injectable()
export class RoutingService {
  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  /**
   * Whether Google Routes API credentials are configured on the server.
   * @returns {boolean}
   */
  isConfigured(): boolean {
    return isGoogleRoutingConfigured();
  }

  /**
   * Computes a route between two WGS84 points using Google Routes API (Essentials).
   * @param {ComputeRouteDto} dto - Origin, destination and travel mode.
   * @returns {Promise<RouteDirectionsResponse>} Distance, duration and GeoJSON line.
   * @throws {ServiceUnavailableException} If GOOGLE_ROUTES_API_KEY is missing.
   * @throws {BadGatewayException} If Google returns an error or empty route.
   */
  async computeDirections(
    dto: ComputeRouteDto,
  ): Promise<RouteDirectionsResponse> {
    const apiKey = getGoogleRoutesApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El servicio de rutas no está configurado (falta GOOGLE_ROUTES_API_KEY).',
      );
    }

    const body = {
      origin: {
        location: {
          latLng: { latitude: dto.originLat, longitude: dto.originLng },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: dto.destinationLat,
            longitude: dto.destinationLng,
          },
        },
      },
      travelMode: dto.travelMode,
      computeAlternativeRoutes: true,
      languageCode: 'es-ES',
      units: 'METRIC',
    };

    let response: Response;
    try {
      response = await fetch(COMPUTE_ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new BadGatewayException(
        'No se pudo contactar con el servicio de rutas de Google.',
      );
    }

    const payload = (await response.json()) as GoogleComputeRoutesResponse;

    if (!response.ok) {
      const detail =
        payload.error?.message ??
        `Google Routes API respondió con estado ${response.status}.`;
      throw new BadGatewayException(detail);
    }

    const routes = payload.routes ?? [];
    const fastest = selectFastestRoute(routes);

    if (!fastest) {
      throw new BadGatewayException(
        'Google no devolvió una ruta válida para esos puntos.',
      );
    }

    const { encodedPolyline, distanceMeters, durationSeconds } = fastest;

    return {
      distanceMeters,
      durationSeconds,
      encodedPolyline,
      geoJson: encodedPolylineToGeoJsonLine(encodedPolyline),
      travelMode: dto.travelMode,
      routesReturned: routes.length,
    };
  }
}

// ------------------------------------------------------------
// Private helpers
// ------------------------------------------------------------

/**
 * Picks the route with the shortest duration among Google alternatives.
 * @param {GoogleRouteLeg[]} routes - Routes from computeRoutes.
 * @returns {object | null} Fastest route fields or null if none valid.
 */
function selectFastestRoute(routes: GoogleRouteLeg[]): {
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
} | null {
  let best: {
    encodedPolyline: string;
    distanceMeters: number;
    durationSeconds: number;
  } | null = null;
  let bestSeconds = Number.POSITIVE_INFINITY;

  for (const route of routes) {
    const encodedPolyline = route.polyline?.encodedPolyline;
    const distanceMeters = route.distanceMeters;
    const durationRaw = route.duration;

    if (
      !encodedPolyline ||
      distanceMeters === undefined ||
      !durationRaw
    ) {
      continue;
    }

    const durationSeconds = parseDurationSeconds(durationRaw);
    if (durationSeconds > 0 && durationSeconds < bestSeconds) {
      bestSeconds = durationSeconds;
      best = { encodedPolyline, distanceMeters, durationSeconds };
    }
  }

  return best;
}

/**
 * Parses Routes API duration strings such as "1700s" into seconds.
 * @param {string} duration - Duration from Google (e.g. "165s").
 * @returns {number}
 */
function parseDurationSeconds(duration: string): number {
  const match = /^(\d+)s$/.exec(duration.trim());
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10);
}
