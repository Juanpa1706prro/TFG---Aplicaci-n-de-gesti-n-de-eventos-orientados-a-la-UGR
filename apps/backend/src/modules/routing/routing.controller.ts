import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { RoutingService } from './routing.service';
import { ComputeRouteDto } from './dto/compute-route.dto';

// -------------------------------------------------------------------
// Routing Controller
// Directions via Google Routes API (server-side key). Base route: /routing
// -------------------------------------------------------------------
@Controller('routing')
export class RoutingController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(private readonly routingService: RoutingService) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Health check for server-side Google Routes API key (public, no JWT).
   * Reports whether Google Routes API is configured on the server.
   * @returns {{ configured: boolean }}
   */
  @Public()
  @Get('status')
  status(): { configured: boolean } {
    return { configured: this.routingService.isConfigured() };
  }

  /**
   * Computes a route (fastest of Google alternatives) and returns GeoJSON for MapLibre.
   * Requires JWT. API key never leaves the server.
   * @param {ComputeRouteDto} dto - Origin, destination and travel mode (WALK, DRIVE, …).
   * @returns {Promise<import('./interfaces/route-directions-response.interface').RouteDirectionsResponse>}
   * @throws {ServiceUnavailableException} If GOOGLE_ROUTES_API_KEY is missing.
   * @throws {BadGatewayException} If Google request fails or returns no valid route.
   */
  @Post('directions')
  directions(@Body() dto: ComputeRouteDto) {
    return this.routingService.computeDirections(dto);
  }
}
