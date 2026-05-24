import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StaffFunction, UserGender } from '@core/constants/user-enums';
import { StudentProfileDto } from '@core/interfaces/user.profile-interface';
import { staffFunctionLabel } from '@core/utils/profile-display.utils';
import { buildActiveStaffRoleSection } from '@core/utils/profile-role-display.utils';
import { sessionProfilePhotoUrl } from '@core/utils/image-api.util';

export type MyProfileView = {
  userNumber: number;
  userName?: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  staffFunctions: StaffFunction[];
  activeStaffFunction: StaffFunction | null;
  studentProfile: StudentProfileDto | null;
  department?: string | null;
  birthDate?: string | null;
  gender?: UserGender | null;
  phoneNumber?: string | null;
  bio?: string | null;
  hasProfilePicture: boolean;
};

@Component({
  selector: 'app-my-profile-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-profile-view.component.html',
  styleUrl: './profile.css',
})
export class MyProfileViewComponent {
  readonly profile = input.required<MyProfileView>();

  readonly activeRoleSection = computed(() =>
    buildActiveStaffRoleSection(this.profile()),
  );

  readonly needsPersonaSelection = computed(() => {
    const p = this.profile();
    return p.staffFunctions.length > 1 && p.activeStaffFunction == null;
  });

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

  activeStaffLabel(): string {
    return staffFunctionLabel(this.profile().activeStaffFunction);
  }

  staffFunctionChipLabel(fn: StaffFunction): string {
    return staffFunctionLabel(fn);
  }

  profilePhotoSrc(): string {
    return sessionProfilePhotoUrl();
  }
}
