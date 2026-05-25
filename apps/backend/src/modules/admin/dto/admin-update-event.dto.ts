import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
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
import { EventVisibility } from '../../events/event-visibility.enum';

// -------------------------------------------------------------------
// Admin update event DTO
// Request body for PATCH /admin/events/:id.
// -------------------------------------------------------------------

/**
 * Partial event update payload for administrators (includes soft-delete restore).
 */
export class AdminUpdateEventDto {
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

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxAttendees?: number | null;

  /** Restores a soft-deleted event (admin only). */
  @IsOptional()
  @IsBoolean()
  restore?: boolean;
}
