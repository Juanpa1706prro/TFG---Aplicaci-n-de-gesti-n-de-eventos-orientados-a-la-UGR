import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/services/auth.services';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

// Variables globales para el estado del interceptor
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean>(false);

const API_URL = 'http://localhost:3000';

/**
 * Authentication Interceptor.
 * Attaches credentials (like HttpOnly cookies) to every outgoing HTTP request
 * so the backend can validate the user's session securely.
 * @param req - The outgoing HTTP request.
 * @param next - The next interceptor or backend handler in the chain.
 * @returns An observable of the HTTP event stream.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const authService = inject(AuthService);
  const reqWithCredentials = req.clone({
    withCredentials: true,
  });

  return next(reqWithCredentials).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo manejamos 401 (no autorizado / token expirado)
      // Ignoramos el propio endpoint de refresh y el de login para evitar
      // bucles infinitos
      const isRefreshUrl = req.url.includes('/auth/refresh');
      const isLoginUrl = req.url.includes('/auth/login');

      if (error.status !== 401 || isRefreshUrl || isLoginUrl) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        // Primera petición que recibe 401: inicia el proceso de refresh
        isRefreshing = true;
        refreshTokenSubject.next(false);

        return authService.refreshToken().pipe(
          switchMap(() => {
            // Refresh exitoso: señalamos a las demás peticiones que continúen
            isRefreshing = false;
            refreshTokenSubject.next(true);
            // Reintentamos la petición original con la nueva cookie
            return next(reqWithCredentials);
          }),
          catchError((refreshError) => {
            // El refresh falló (refresh token expirado): forzamos logout
            isRefreshing = false;
            authService.logout();
            return throwError(() => refreshError);
          }),
        );
      } else {
        // Si ya hay un refresh en curso, esta petición espera a que termine
        // y luego se reintenta automáticamente con la nueva cookie
        return refreshTokenSubject.pipe(
          filter((done) => done === true),
          take(1),
          switchMap(() => next(reqWithCredentials)),
        );
      }
    }),
  );
};
