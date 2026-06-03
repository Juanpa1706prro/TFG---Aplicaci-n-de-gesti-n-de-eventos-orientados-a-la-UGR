import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  tap,
  firstValueFrom,
  of,
  filter,
  take,
  from,
  throwError,
  finalize,
} from 'rxjs';
import { UserSession } from '@core/interfaces/user-interface';
import {
  CompleteOnboardingPayload,
  LoginPayload,
  RegisterPayload,
  SetSessionPersonaPayload,
} from '@core/interfaces/auth-interface';
import { Router } from '@angular/router';
import { API_BASE_URL } from '@core/config/api.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = API_BASE_URL;

  /**
   * Pasa a true cuando ha terminado el primer intento de rehidratar la sesión
   * (con o sin cookies). Los guards deben esperar esto antes de leer currentUser.
   */
  private readonly sessionHydrated$ = new BehaviorSubject<boolean>(false);

  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  public readonly currentUser$: Observable<UserSession | null> =
    this.currentUserSubject.asObservable();

  /** Una sola petición /auth/refresh en vuelo (OAuth BCP: evita carreras al rotar). */
  private refreshInFlight: Promise<void> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  public get currentUserValue(): UserSession | null {
    return this.currentUserSubject.value;
  }

  /** Emite una vez cuando la hidratación inicial ha terminado. */
  waitForHydration(): Observable<boolean> {
    return this.sessionHydrated$.pipe(
      filter((done) => done === true),
      take(1),
    );
  }

  private normalizeSession(user: UserSession): UserSession {
    return {
      ...user,
      profileComplete: user.profileComplete === true,
      needsPersonaSelection: user.needsPersonaSelection === true,
      staffFunctions: Array.isArray(user.staffFunctions) ? user.staffFunctions : [],
      activeStaffFunction: user.activeStaffFunction ?? null,
      globalCapabilities: Array.isArray(user.globalCapabilities)
        ? user.globalCapabilities
        : [],
    };
  }

  /** Tras login u onboarding: onboarding → elección de perfil (si aplica) → mapa. */
  navigateToAppHome(user?: UserSession | null): void {
    const u = user ?? this.currentUserValue;
    if (!u?.userNumber) {
      void this.router.navigate(['/auth']);
      return;
    }
    if (u.profileComplete !== true) {
      void this.router.navigate(['/auth/onboarding']);
      return;
    }
    if (u.needsPersonaSelection === true) {
      void this.router.navigate(['/auth/select-profile']);
      return;
    }
    void this.router.navigate(['/u', u.userNumber, 'map']);
  }

  /**
   * Llamar una vez al arranque (APP_INITIALIZER).
   * Recupera sesión vía cookies y, si el access token caducó, intenta rotar con refresh token.
   */
  public async initializeAuth(): Promise<void> {
    try {
      const me = await this.loadSessionFromCookies();
      this.currentUserSubject.next(this.normalizeSession(me));
      localStorage.setItem('hasSession', 'true');
    } catch {
      localStorage.removeItem('hasSession');
      this.currentUserSubject.next(null);
    } finally {
      this.sessionHydrated$.next(true);
    }
  }

  private async loadSessionFromCookies(): Promise<UserSession> {
    try {
      return await firstValueFrom(
        this.http.get<UserSession>(`${this.API_URL}/auth/me`),
      );
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      if (status !== 401) {
        throw err;
      }
    }

    await firstValueFrom(this.refreshToken());
    return firstValueFrom(
      this.http.get<UserSession>(`${this.API_URL}/auth/me`),
    );
  }

  public register(credentials: RegisterPayload): Observable<unknown> {
    return this.http.post(`${this.API_URL}/auth/register`, credentials);
  }

  public login(credentials: LoginPayload): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap((user: UserSession) => {
        this.currentUserSubject.next(this.normalizeSession(user));
        localStorage.setItem('hasSession', 'true');
      }),
    );
  }

  public completeOnboarding(
    payload: CompleteOnboardingPayload,
  ): Observable<{ message: string; user: UserSession }> {
    return this.http
      .patch<{ message: string; user: UserSession }>(
        `${this.API_URL}/user/onboarding`,
        payload,
      )
      .pipe(
        tap((res) => {
          this.currentUserSubject.next(this.normalizeSession(res.user));
        }),
      );
  }

  public setSessionPersona(
    payload: SetSessionPersonaPayload,
  ): Observable<{ message: string; user: UserSession }> {
    return this.http
      .patch<{ message: string; user: UserSession }>(
        `${this.API_URL}/user/session-persona`,
        payload,
      )
      .pipe(
        tap((res) => {
          this.currentUserSubject.next(this.normalizeSession(res.user));
        }),
      );
  }

  public logout() {
    return this.http.post(`${this.API_URL}/auth/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.cleanLocalAuth()),
    );
  }

  public cleanLocalAuth() {
    localStorage.removeItem('hasSession');
    this.currentUserSubject.next(null);
    void this.router.navigate(['/auth']);
  }

  public isAuthenticated(): boolean {
    const u = this.currentUserValue;
    if (u == null) return false;
    if (typeof u.id !== 'number' || !Number.isFinite(u.id) || u.id <= 0) {
      return false;
    }
    if (typeof u.userNumber !== 'number' || !Number.isFinite(u.userNumber)) {
      return false;
    }
    if (typeof u.email !== 'string' || u.email.trim().length < 3) {
      return false;
    }
    return true;
  }

  /**
   * Renueva cookies (access + refresh rotado). Todas las llamadas comparten la misma promesa.
   */
  public refreshToken(): Observable<void> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = firstValueFrom(
        this.http.post(`${this.API_URL}/auth/refresh`, {}).pipe(
          tap(() => undefined),
          catchError((err) => {
            this.refreshInFlight = null;
            return throwError(() => err);
          }),
          finalize(() => {
            this.refreshInFlight = null;
          }),
        ),
      ).then(() => undefined);
    }

    return from(this.refreshInFlight);
  }

  public needsProfileCompletion(user: UserSession | null): boolean {
    return !!user && user.profileComplete !== true;
  }
}
