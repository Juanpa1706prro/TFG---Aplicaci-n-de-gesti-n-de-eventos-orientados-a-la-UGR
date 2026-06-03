import { Routes } from '@angular/router';
import { PATHS } from './app.paths';

import { ShellPassThroughComponent } from './layout/shell-pass-through.component';
import { CreateEventComponent } from '@features/events/create-event/create-event';
import { EventsListComponent } from '@features/events/events-list/events-list';
import { FriendsPanelComponent } from '@features/friends/friends-panel/friends-panel';
import { AuthComponent } from '@features/auth/auth';
import { ProfileComponent } from '@features/profile/profile';
import { EditProfileComponent } from '@features/profile/edit-profile.component';
import { AdminUsersListComponent } from '@features/admin/admin-users-list/admin-users-list';
import { AdminUserProfileComponent } from '@features/admin/admin-user-profile/admin-user-profile';
import { AdminEditUserComponent } from '@features/admin/admin-edit-user/admin-edit-user';
import { AdminEventsListComponent } from '@features/admin/admin-events-list/admin-events-list';
import { AdminEventDetailComponent } from '@features/admin/admin-event-detail/admin-event-detail';
import { AdminEditEventComponent } from '@features/admin/admin-edit-event/admin-edit-event';
import { AccountComponent } from '@features/account/account';
import { adminGuard } from '@core/guards/admin.guard';
import { OnboardingComponent } from '@features/auth/pages/onboarding/onboarding';
import { SelectProfileComponent } from '@features/auth/pages/select-profile/select-profile';
import { EntryShellComponent } from './entry-shell.component';
import { AppShellComponent } from './layout/app-shell.component';

import { guestGuard } from '@core/guards/guest-guard';
import { authGuard } from '@core/guards/auth-guard';
import { mapGuard } from '@core/guards/map-guard';
import { profileOnboardingGuard } from '@core/guards/profile-onboarding.guard';
import { profileCompleteGuard } from '@core/guards/profile-complete.guard';
import { accountOwnerGuard } from '@core/guards/account-owner.guard';
import { personaSelectedGuard } from '@core/guards/persona-selected.guard';
import { selectPersonaPageGuard } from '@core/guards/select-persona-page.guard';
import { canCreateEventsGuard } from '@core/guards/can-create-events.guard';
import { sessionOwnerGuard } from '@core/guards/session-owner.guard';
import { profileCanonicalGuard } from '@core/guards/profile-canonical.guard';

export const routes: Routes = [
  {
    path: PATHS.AUTH,
    children: [
      {
        path: 'onboarding',
        component: OnboardingComponent,
        canActivate: [authGuard, profileOnboardingGuard],
      },
      {
        path: 'select-profile',
        component: SelectProfileComponent,
        canActivate: [authGuard, profileCompleteGuard, selectPersonaPageGuard],
      },
      {
        path: '',
        pathMatch: 'full',
        component: AuthComponent,
        canActivate: [guestGuard],
      },
    ],
  },
  {
    path: 'u/:userNumber',
    component: AppShellComponent,
    canActivate: [authGuard, sessionOwnerGuard],
    runGuardsAndResolvers: 'paramsChange',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'map',
      },
      {
        path: 'events/new',
        component: CreateEventComponent,
        canActivate: [
          authGuard,
          profileCompleteGuard,
          personaSelectedGuard,
          mapGuard,
          canCreateEventsGuard,
        ],
      },
      {
        path: 'events/:eventId/edit',
        component: CreateEventComponent,
        canActivate: [
          authGuard,
          profileCompleteGuard,
          personaSelectedGuard,
          mapGuard,
          canCreateEventsGuard,
        ],
      },
      {
        path: 'map',
        component: ShellPassThroughComponent,
        canActivate: [profileCompleteGuard, personaSelectedGuard, mapGuard],
        children: [
          {
            path: 'events',
            component: EventsListComponent,
          },
          {
            path: 'friends',
            component: FriendsPanelComponent,
          },
        ],
      },
      {
        path: 'profile/edit',
        component: EditProfileComponent,
        canActivate: [profileCompleteGuard],
      },
      {
        path: 'profile/:viewUserNumber',
        component: ProfileComponent,
        canActivate: [profileCompleteGuard, profileCanonicalGuard],
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [profileCompleteGuard],
      },
      {
        path: 'account',
        component: AccountComponent,
        canActivate: [
          authGuard,
          profileCompleteGuard,
          personaSelectedGuard,
          accountOwnerGuard,
        ],
      },
      {
        path: 'admin/users',
        component: AdminUsersListComponent,
        canActivate: [profileCompleteGuard, adminGuard],
      },
      {
        path: 'admin/users/:viewUserNumber/edit',
        component: AdminEditUserComponent,
        canActivate: [profileCompleteGuard, adminGuard],
      },
      {
        path: 'admin/users/:viewUserNumber',
        component: AdminUserProfileComponent,
        canActivate: [profileCompleteGuard, adminGuard],
      },
      {
        path: 'admin/events',
        component: AdminEventsListComponent,
        canActivate: [profileCompleteGuard, adminGuard],
      },
      {
        path: 'admin/events/:eventId/edit',
        component: AdminEditEventComponent,
        canActivate: [profileCompleteGuard, adminGuard],
      },
      {
        path: 'admin/events/:eventId',
        component: AdminEventDetailComponent,
        canActivate: [profileCompleteGuard, adminGuard],
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    component: EntryShellComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
