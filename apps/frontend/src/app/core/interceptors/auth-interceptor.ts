import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.services';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

/**
 * Global state variables for the refresh token process
 */
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean>(false);

/**
 * Authentication Interceptor.
 * Attaches credentials (like HttpOnly cookies) to every outgoing HTTP request
 * so the backend can validate the user's session securely.
 * @param req - The outgoing HTTP request.
 * @param next - The next interceptor or backend handler in the chain.
 * @returns An observable of the HTTP event stream.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Clone the request to ensure credentials (cookies) are sent.
  const reqWithCredentials = req.clone({
    withCredentials: true,
  });

  return next(reqWithCredentials).pipe(
    catchError((error: HttpErrorResponse) => {

      const isRefreshUrl = req.url.includes('/auth/refresh');
      const isLoginUrl = req.url.includes('/auth/login');
      const isAuthMeUrl = req.url.includes('/auth/me');

      // Only handle 401 Unauthorized errors.
      // Ignore login, refresh, and /auth/me: "me" must fail fast so APP_INITIALIZER can clear
      // session without a refresh race; refresh failure must still run logout (subscribed).
      if (error.status !== 401 || isRefreshUrl || isLoginUrl || isAuthMeUrl) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        // First request to receive a 401 error: initiate the refresh process
        isRefreshing = true;
        refreshTokenSubject.next(false);

        return authService.refreshToken().pipe(
          switchMap(() => {
            // Refresh successful: signal all pending requests to continue
            isRefreshing = false;
            refreshTokenSubject.next(true);

            // Retry the original request with the new cookie
            return next(reqWithCredentials);
          }),
          catchError((refreshError) => {
            // Refresh failed: clean state and force logout (must subscribe for tap to run).
            isRefreshing = false;
            void authService.logout().subscribe();
            return throwError(() => refreshError);
          }),
        );
      } else {
        // A refresh is already in progress: wait for it to complete, then retry.
        // Avoid multiple simultaneous refresh attempts by queuing requests until the first refresh completes.
        return refreshTokenSubject.pipe(
          filter((done) => done === true),
          take(1),
          switchMap(() => next(reqWithCredentials)),
        );
      }
    }),
  );
};
