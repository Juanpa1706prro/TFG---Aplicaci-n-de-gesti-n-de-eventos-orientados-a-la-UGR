import { Routes } from '@angular/router';
import { PATHS } from './app.paths';

import { MapComponent } from '@features/map/map';
import { AuthComponent } from '@features/auth/auth'
import { ProfileComponent} from '@features/profile/profile'

import { guestGuard } from '@core/guards/guest-guard';
import { authGuard } from '@core/guards/auth-guard';
import { mapGuard } from '@core/guards/map-guard';


export const routes: Routes = [
  { 
    path: PATHS.MAP, 
    component: MapComponent,
    canActivate: [mapGuard]  
  },
  { 
    path: PATHS.AUTH,
    component: AuthComponent,
    canActivate: [guestGuard]
  },
  {
    path: PATHS.PROFILE,
    component: ProfileComponent,
    canActivate: [authGuard]
    
  },
  { 
    path: '',
    redirectTo: PATHS.AUTH,
    pathMatch: 'full' 
  }
];