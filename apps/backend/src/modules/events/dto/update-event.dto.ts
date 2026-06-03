import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// -------------------------------------------------------------------
// Update event DTO
// Request body for PATCH /events/:id (creator only).
// Event type (public event vs reunión) cannot be changed after creation.
// -------------------------------------------------------------------

/**
 * Partial event update payload for the event creator.
 */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  /** Event type (public / reunión) is fixed at creation and cannot be changed. */

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxAttendees?: number | null;
}
