import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from '@core/services/auth.services';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/interceptors/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ---- Routing ----
    provideRouter(routes),

    // ---- HTTP and Interceptors ----
    provideHttpClient(withInterceptors([authInterceptor])),

    // ---- App Initialization ----
    /**
     * * Executes the authentication initialization process before the application starts rendering.
     */
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      authService.initializeAuth();
    }),
  ],
};
