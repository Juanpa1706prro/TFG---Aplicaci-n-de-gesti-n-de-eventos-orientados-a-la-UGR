import { Routes } from '@angular/router';
import { PATHS } from './app.paths';

import { MapComponent } from '@features/map/map';
import { AuthComponent } from '@features/auth/auth';
import { ProfileComponent } from '@features/profile/profile';
import { AccountComponent } from '@features/account/account';
import { OnboardingComponent } from '@features/auth/pages/onboarding/onboarding';

import { guestGuard } from '@core/guards/guest-guard';
import { authGuard } from '@core/guards/auth-guard';
import { mapGuard } from '@core/guards/map-guard';
import { profileOnboardingGuard } from '@core/guards/profile-onboarding.guard';
import { profileCompleteGuard } from '@core/guards/profile-complete.guard';
import { accountOwnerGuard } from '@core/guards/account-owner.guard';

export const routes: Routes = [
  {
    path: PATHS.AUTH_ONBOARDING,
    component: OnboardingComponent,
    canActivate: [authGuard, profileOnboardingGuard],
  },
  {
    path: PATHS.MAP,
    component: MapComponent,
    canActivate: [authGuard, profileCompleteGuard, mapGuard],
  },
  {
    path: PATHS.AUTH,
    component: AuthComponent,
    canActivate: [guestGuard],
  },
  {
    path: PATHS.PROFILE,
    component: ProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: PATHS.ACCOUNT,
    component: AccountComponent,
    canActivate: [authGuard, accountOwnerGuard],
  },
  {
    path: '',
    redirectTo: PATHS.AUTH,
    pathMatch: 'full',
  },
];
