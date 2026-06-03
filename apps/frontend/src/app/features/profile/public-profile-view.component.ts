import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicProfileView } from '@core/interfaces/user.profile-interface';
import { FriendRelationshipStatus } from '@core/interfaces/friend-interface';
import { StaffFunction } from '@core/constants/user-enums';
import { staffFunctionLabel } from '@core/utils/profile-display.utils';
import { buildPublicProfileRoleSections } from '@core/utils/profile-role-display.utils';
import { userProfilePhotoUrl } from '@core/utils/image-api.util';

@Component({
  selector: 'app-public-profile-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-profile-view.component.html',
  styleUrl: './profile.css',
})
export class PublicProfileViewComponent {
  readonly profile = input.required<PublicProfileView>();

  readonly roleSections = computed(() => {
    const p = this.profile();
    const fromApi = p.roleSections ?? [];
    if (fromApi.length > 0) {
      return fromApi;
    }
    return buildPublicProfileRoleSections(p);
  });
  readonly friendStatus = input<FriendRelationshipStatus | null>(null);
  readonly friendActionLoading = input(false);
  readonly friendActionError = input<string | null>(null);
  readonly showUnfriendConfirm = input(false);

  readonly sendFriendRequest = output<void>();
  readonly acceptFriendRequest = output<void>();
  readonly rejectFriendRequest = output<void>();
  readonly openUnfriendConfirm = output<void>();
  readonly closeUnfriendConfirm = output<void>();
  readonly confirmUnfriend = output<void>();

  readonly staffFunctionLabel = staffFunctionLabel;

  displayTitle(): string {
    const p = this.profile();
    if (p.userName?.trim()) {
      return p.userName.trim();
    }
    const parts = [p.firstName, p.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return `Usuario #${p.userNumber}`;
  }

  avatarInitials(): string {
    const p = this.profile();
    const seed = p.userName ?? p.firstName ?? 'U';
    return seed.slice(0, 2).toUpperCase();
  }

  displayName(): string {
    const p = this.profile();
    const parts = [p.firstName, p.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return p.userName?.trim() || `Usuario #${p.userNumber}`;
  }

  staffFunctionChipLabel(fn: StaffFunction): string {
    return staffFunctionLabel(fn);
  }

  publicProfilePhotoSrc(): string {
    return userProfilePhotoUrl(this.profile().userNumber);
  }
}
