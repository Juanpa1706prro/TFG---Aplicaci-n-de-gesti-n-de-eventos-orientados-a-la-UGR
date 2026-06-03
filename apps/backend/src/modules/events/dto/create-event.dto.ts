import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
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
  ValidateNested,
} from 'class-validator';
import { EventManagerAssignmentRole } from '../event-manager-assignment.entity';
import { EventVisibility } from '../event-visibility.enum';

// -------------------------------------------------------------------
// Create event DTOs
// Request body for POST /events.
// -------------------------------------------------------------------

/**
 * Editor or moderator invite included in event creation.
 */
export class EventManagerInviteDto {
  @IsInt()
  @Min(100_000)
  @Max(999_999)
  userNumber: number;

  @IsEnum(EventManagerAssignmentRole)
  role: EventManagerAssignmentRole;
}

/**
 * Invitee for a private meeting (reunión) at creation time.
 */
export class EventParticipantInviteDto {
  @IsInt()
  @Min(100_000)
  @Max(999_999)
  userNumber: number;
}

/**
 * Payload for creating a new event with optional manager invites.
 */
export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsString()
  @MaxLength(8000)
  description: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location: string;

  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  /** ISO 8601 (UTC or with offset). */
  @IsDateString()
  startsAt: string;

  /** ISO 8601 (UTC or with offset). Must be after startsAt. */
  @IsDateString()
  endsAt: string;

  /** Defaults to public; private = reunión (requires participants). */
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  /** Omit or explicit null in JSON = no attendee limit */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxAttendees?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventManagerInviteDto)
  managers?: EventManagerInviteDto[];

  /** Required for private meetings: at least one invitee (not the creator). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventParticipantInviteDto)
  participants?: EventParticipantInviteDto[];
}
