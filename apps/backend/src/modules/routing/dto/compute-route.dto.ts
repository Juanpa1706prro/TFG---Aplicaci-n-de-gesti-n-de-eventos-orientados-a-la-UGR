import { IsEnum, IsNumber, Max, Min } from 'class-validator';

// -------------------------------------------------------------------
// Compute route request DTO
// WGS84 origin/destination and travel mode for Google Routes API.
// -------------------------------------------------------------------

/** Travel modes supported by Google Routes API computeRoutes. */
export enum RouteTravelModeDto {
  WALK = 'WALK',
  DRIVE = 'DRIVE',
  BICYCLE = 'BICYCLE',
  TRANSIT = 'TRANSIT',
}

/**
 * Body for POST /routing/directions.
 * Coordinates must be valid WGS84 degrees.
 */
export class ComputeRouteDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLng!: number;

  @IsEnum(RouteTravelModeDto)
  travelMode: RouteTravelModeDto = RouteTravelModeDto.WALK;
}
