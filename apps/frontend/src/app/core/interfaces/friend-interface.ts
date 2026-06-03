export type FriendsListSort =
  | 'friends_newest'
  | 'friends_oldest'
  | 'name_asc'
  | 'name_desc';

export interface FriendUserSummaryDto {
  userId: number;
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
}

export interface FriendListItemDto {
  friendshipId: number;
  friendsSince: string;
  user: FriendUserSummaryDto;
}

export type SendFriendRequestResultDto =
  | { outcome: 'sent'; requestId: number }
  | { outcome: 'incoming_exists'; requestId: number; message: string };

export interface FriendRequestItemDto {
  id: number;
  createdAt: string;
  user: FriendUserSummaryDto;
}

export type FriendRelationshipStatus =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends';

export interface FriendRelationshipStatusDto {
  status: FriendRelationshipStatus;
  requestId?: number;
}
