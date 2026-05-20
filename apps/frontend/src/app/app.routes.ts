import { Routes } from '@angular/router';
import { PATHS } from './app.paths';

import { MapComponent } from '@features/map/map';
import { CreateEventComponent } from '@features/events/create-event/create-event';
import { EventsListComponent } from '@features/events/events-list/events-list';
import { AuthComponent } from '@features/auth/auth';
import { ProfileComponent } from '@features/profile/profile';
import { AccountComponent } from '@features/account/account';
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
        path: 'map',
        component: MapComponent,
        canActivate: [authGuard, profileCompleteGuard, personaSelectedGuard, mapGuard],
        children: [
          {
            path: 'events',
            component: EventsListComponent,
          },
        ],
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard, profileCompleteGuard, personaSelectedGuard],
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
