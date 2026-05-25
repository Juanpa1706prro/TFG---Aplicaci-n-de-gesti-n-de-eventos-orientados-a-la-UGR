import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// -------------------------------------------------------------------
// Send friend request DTO
// Request body for POST /friends/requests.
// -------------------------------------------------------------------

/**
 * Friend request target: exactly one of the two fields must be set.
 * - targetUserNumber: form / code lookup by profile user number.
 * - targetUserId: profile button lookup by user primary key.
 */
export class SendFriendRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100_000)
  @Max(999_999)
  targetUserNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetUserId?: number;
}
