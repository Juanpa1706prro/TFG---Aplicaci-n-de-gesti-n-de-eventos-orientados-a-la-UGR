import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  switchMap,
} from 'rxjs';
import { ensurePublicProfileRoleSections } from '@core/utils/profile-role-display.utils';
import { AuthService } from '@core/services/auth.services';
import { FriendsService } from '@core/services/friends.service';
import {
  FriendRelationshipStatus,
  FriendRelationshipStatusDto,
} from '@core/interfaces/friend-interface';
import {
  FullUserPayload,
  PublicProfileView,
  StudentProfileDto,
  UserProfileDetails,
} from '@core/interfaces/user.profile-interface';
import { PublicProfileViewComponent } from './public-profile-view.component';
import { MyProfileViewComponent, MyProfileView } from './my-profile-view.component';
import { ColumnOverlayComponent } from '../../layout/column-overlay.component';
import { API_BASE_URL } from '@core/config/api.config';

type ProfilePageView = MyProfileView & {
  userId: number;
  viewerIsOwner: boolean;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ColumnOverlayComponent,
    PublicProfileViewComponent,
    MyProfileViewComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly friendsService = inject(FriendsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  profileView: ProfilePageView | null = null;
  publicProfile: PublicProfileView | null = null;
  loadError = false;

  readonly friendStatus = signal<FriendRelationshipStatus | null>(null);
  readonly pendingRequestId = signal<number | null>(null);
  readonly friendActionLoading = signal(false);
  readonly friendActionError = signal<string | null>(null);
  readonly showUnfriendConfirm = signal(false);

  ngOnInit(): void {
    const shellRoute = this.route.parent ?? this.route;

    combineLatest([
      shellRoute.paramMap.pipe(
        map((params) => params.get('userNumber')),
        filter((n): n is string => !!n),
        map((n) => parseInt(n, 10)),
        filter((n) => !Number.isNaN(n)),
        distinctUntilChanged(),
      ),
      this.route.paramMap.pipe(
        map((params) => params.get('viewUserNumber')),
        distinctUntilChanged(),
      ),
    ])
      .pipe(
        switchMap(([sessionUserNumber, viewUserNumberParam]) => {
          const isOwnProfile = viewUserNumberParam == null;
          const viewedUserNumber = isOwnProfile
            ? sessionUserNumber
            : parseInt(viewUserNumberParam, 10);

          if (!isOwnProfile && Number.isNaN(viewedUserNumber)) {
            throw new Error('Número de usuario de perfil no válido');
          }

          if (isOwnProfile) {
            return this.http
              .get<{ user: FullUserPayload }>(`${this.API_URL}/user/profile`)
              .pipe(
                map((res) => ({
                  kind: 'own' as const,
                  profile: this.fullProfileToView(res.user),
                  relationship: null as FriendRelationshipStatusDto | null,
                })),
              );
          }

          return forkJoin({
            profile: this.http
              .get<{ profile: PublicProfileView }>(
                `${this.API_URL}/user/public/${viewedUserNumber}`,
              )
              .pipe(
                map((res) => ensurePublicProfileRoleSections(res.profile)),
              ),
            relationship:
              this.friendsService.getRelationshipStatus(viewedUserNumber),
          }).pipe(
            map(({ profile, relationship }) => ({
              kind: 'public' as const,
              profile,
              relationship,
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ kind, profile, relationship }) => {
          this.loadError = false;
          this.friendActionError.set(null);
          this.showUnfriendConfirm.set(false);
          if (kind === 'own') {
            this.profileView = profile;
            this.publicProfile = null;
          } else {
            this.publicProfile = profile;
            this.profileView = null;
          }
          if (relationship) {
            this.friendStatus.set(relationship.status);
            this.pendingRequestId.set(relationship.requestId ?? null);
          } else {
            this.friendStatus.set(null);
            this.pendingRequestId.set(null);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.profileView = null;
          this.publicProfile = null;
          this.friendStatus.set(null);
          this.cdr.markForCheck();
        },
      });
  }

  sendFriendRequest(): void {
    const profile = this.publicProfile;
    if (!profile) {
      return;
    }

    this.friendActionLoading.set(true);
    this.friendActionError.set(null);

    this.friendsService
      .sendRequest({ targetUserId: profile.userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.friendActionLoading.set(false);
          if (res.outcome === 'incoming_exists') {
            this.friendStatus.set('pending_incoming');
            this.pendingRequestId.set(res.requestId);
            return;
          }
          this.friendStatus.set('pending_outgoing');
          this.pendingRequestId.set(res.requestId);
        },
        error: (err) => {
          this.friendActionLoading.set(false);
          this.friendActionError.set(this.readErrorMessage(err));
        },
      });
  }

  profileDisplayName(): string {
    const profile = this.publicProfile;
    if (!profile) {
      return 'este usuario';
    }
    const parts = [profile.firstName, profile.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return profile.userName?.trim() || `Usuario #${profile.userNumber}`;
  }

  openUnfriendConfirm(): void {
    this.friendActionError.set(null);
    this.showUnfriendConfirm.set(true);
  }

  closeUnfriendConfirm(): void {
    if (this.friendActionLoading()) {
      return;
    }
    this.showUnfriendConfirm.set(false);
  }

  confirmUnfriend(): void {
    const profile = this.publicProfile;
    if (!profile || this.friendStatus() !== 'friends') {
      return;
    }

    this.friendActionLoading.set(true);
    this.friendActionError.set(null);

    this.friendsService
      .removeFriend(profile.userNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.friendActionLoading.set(false);
          this.showUnfriendConfirm.set(false);
          this.friendStatus.set('none');
          this.pendingRequestId.set(null);
        },
        error: (err) => {
          this.friendActionLoading.set(false);
          this.friendActionError.set(this.readErrorMessage(err));
        },
      });
  }

  acceptFriendRequest(): void {
    this.runIncomingRequestAction((id) => this.friendsService.acceptRequest(id), () => {
      this.friendStatus.set('friends');
      this.pendingRequestId.set(null);
    });
  }

  rejectFriendRequest(): void {
    this.runIncomingRequestAction((id) => this.friendsService.rejectRequest(id), () => {
      this.friendStatus.set('none');
      this.pendingRequestId.set(null);
    });
  }

  private runIncomingRequestAction(
    action: (requestId: number) => import('rxjs').Observable<unknown>,
    onSuccess: () => void,
  ): void {
    const requestId = this.pendingRequestId();
    if (requestId == null) {
      return;
    }

    this.friendActionLoading.set(true);
    this.friendActionError.set(null);

    action(requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.friendActionLoading.set(false);
          onSuccess();
        },
        error: (err) => {
          this.friendActionLoading.set(false);
          this.friendActionError.set(this.readErrorMessage(err));
        },
      });
  }

  private fullProfileToView(user: FullUserPayload): ProfilePageView {
    const profile: UserProfileDetails = user.profile;
    return {
      userId: user.id,
      userNumber: user.userNumber,
      userName: profile.userName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: user.email,
      viewerIsOwner: true,
      staffFunctions: user.staffFunctions,
      activeStaffFunction: user.activeStaffFunction,
      studentProfile: user.studentProfile,
      department: profile.department ?? null,
      birthDate: profile.birthDate,
      gender: profile.gender,
      phoneNumber: profile.phoneNumber,
      bio: profile.bio,
      hasProfilePicture: profile.hasProfilePicture,
    };
  }

  closeToMap(): void {
    const userNumber = this.authService.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
  }

  private readErrorMessage(err: unknown): string {
    const body = (err as { error?: { message?: string | string[] } })?.error
      ?.message;
    if (Array.isArray(body)) {
      return body.join(' ');
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return 'No se pudo completar la acción.';
  }
}
