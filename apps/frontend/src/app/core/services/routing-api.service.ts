import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import type {
  ComputeDirectionsRequest,
  RouteDirectionsResponse,
  RoutingStatusResponse,
} from '@core/interfaces/route-directions.interface';

// -------------------------------------------------------------------
// Routing API Service
// HTTP client for NestJS /routing (Google Routes proxy, JWT via interceptor).
// -------------------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class RoutingApiService {
  // ------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------

  private readonly base = `${API_BASE_URL}/routing`;

  // ------------------------------------------------------------
  // Constructor
  // ------------------------------------------------------------

  constructor(private readonly http: HttpClient) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Whether the backend has GOOGLE_ROUTES_API_KEY configured.
   * @returns {Observable<RoutingStatusResponse>}
   */
  getStatus(): Observable<RoutingStatusResponse> {
    return this.http.get<RoutingStatusResponse>(`${this.base}/status`);
  }

  /**
   * Computes a route and returns GeoJSON for the MapLibre line layer.
   * @param {ComputeDirectionsRequest} body - Origin, destination and travel mode.
   * @returns {Observable<RouteDirectionsResponse>}
   */
  computeDirections(
    body: ComputeDirectionsRequest,
  ): Observable<RouteDirectionsResponse> {
    return this.http.post<RouteDirectionsResponse>(
      `${this.base}/directions`,
      body,
    );
  }
}
