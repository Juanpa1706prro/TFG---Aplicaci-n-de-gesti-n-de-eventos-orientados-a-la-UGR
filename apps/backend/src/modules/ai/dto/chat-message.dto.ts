import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatCurrentLocationDto {
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;
}

/**
 * Body for POST /ai/chat (phase 0: text only, no tools).
 */
export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  /** Client-held session id; server creates one if omitted. */
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  /** Optional live location from client for this turn ("mi ubicación"). */
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatCurrentLocationDto)
  currentLocation?: ChatCurrentLocationDto;
}
