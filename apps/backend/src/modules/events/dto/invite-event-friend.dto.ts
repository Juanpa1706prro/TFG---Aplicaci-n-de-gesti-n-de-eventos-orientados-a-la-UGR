import { IsInt, Max, Min } from 'class-validator';

// -------------------------------------------------------------------
// Invite event friend DTO
// Body for POST /events/:id/invitations (public event recommendation).
// -------------------------------------------------------------------
export class InviteEventFriendDto {
  @IsInt()
  @Min(100_000)
  @Max(999_999)
  userNumber: number;
}
