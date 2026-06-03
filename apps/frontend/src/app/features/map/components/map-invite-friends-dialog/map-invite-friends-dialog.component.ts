import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FriendListItemDto } from '@core/interfaces/friend-interface';
import { userProfilePhotoUrl } from '@core/utils/image-api.util';

@Component({
  selector: 'app-map-invite-friends-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-invite-friends-dialog.component.html',
  styleUrl: './map-invite-friends-dialog.component.css',
})
export class MapInviteFriendsDialogComponent {
  readonly friends = input<FriendListItemDto[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly success = input<string | null>(null);
  readonly inviteActionUserNumber = input<number | null>(null);
  readonly invitedUserNumbers = input<ReadonlySet<number>>(new Set());

  readonly closed = output<void>();
  readonly invite = output<FriendListItemDto>();

  close(): void {
    this.closed.emit();
  }

  inviteFriend(friend: FriendListItemDto): void {
    this.invite.emit(friend);
  }

  userPhotoSrc(userNumber: number): string {
    return userProfilePhotoUrl(userNumber);
  }

  friendDisplayName(friend: FriendListItemDto): string {
    const parts = [friend.user.firstName, friend.user.lastName].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return `#${friend.user.userNumber}`;
  }

  friendUserInitials(friend: FriendListItemDto): string {
    const first = friend.user.firstName?.trim().charAt(0) ?? '';
    const last = friend.user.lastName?.trim().charAt(0) ?? '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || '#';
  }

  isFriendInvited(friend: FriendListItemDto): boolean {
    return this.invitedUserNumbers().has(friend.user.userNumber);
  }
}
