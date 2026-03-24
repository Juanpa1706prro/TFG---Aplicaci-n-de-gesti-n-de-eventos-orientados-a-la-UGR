import { Routes } from '@angular/router';
import { PATHS } from './app.paths';
import { MapComponent } from './map/map';
import { AuthComponent } from './auth/auth'

export const routes: Routes = [
  { path: PATHS.MAP, component: MapComponent },
  { path: PATHS.AUTH, component: AuthComponent },
  { path: '', redirectTo: PATHS.AUTH, pathMatch: 'full' }
];