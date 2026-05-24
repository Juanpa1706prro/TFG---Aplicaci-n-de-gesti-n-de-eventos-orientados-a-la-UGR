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

export class EventManagerInviteDto {
  @IsInt()
  @Min(100_000)
  @Max(999_999)
  userNumber: number;

  @IsEnum(EventManagerAssignmentRole)
  role: EventManagerAssignmentRole;
}

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

  /** ISO 8601 (UTC o con offset). */
  @IsDateString()
  startsAt: string;

  /** ISO 8601 (UTC o con offset). Debe ser posterior a startsAt. */
  @IsDateString()
  endsAt: string;

  /** Por defecto público; privado para tutorías u otros (solo creador y gestores en mapa). */
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  /** Omitir o null explícito en JSON = sin límite */
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
}
