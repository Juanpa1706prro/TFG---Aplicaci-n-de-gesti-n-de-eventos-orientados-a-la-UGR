import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, firstValueFrom, of } from 'rxjs';
import { UserSession } from '@core/interfaces/user-interface';
import {
  CompleteOnboardingPayload,
  LoginPayload,
  RegisterPayload,
} from '@core/interfaces/auth-interface';
import { FullUserPayload } from '@core/interfaces/user.profile-interface';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000';

  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  public readonly currentUser$: Observable<UserSession | null> =
    this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  public get currentUserValue(): UserSession | null {
    return this.currentUserSubject.value;
  }

  private sessionFromApiUser(
    u: Pick<
      FullUserPayload,
      'id' | 'email' | 'userNumber' | 'profileComplete' | 'role'
    >,
  ): UserSession {
    return {
      id: u.id,
      email: u.email,
      userNumber: u.userNumber,
      profileComplete: u.profileComplete,
      role: u.role,
    };
  }

  public async initializeAuth(): Promise<void> {
    const hasSession = localStorage.getItem('hasSession');

    if (!hasSession) {
      this.currentUserSubject.next(null);
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ user: FullUserPayload }>(`${this.API_URL}/user/profile`),
      );
      this.currentUserSubject.next(this.sessionFromApiUser(response.user));
    } catch {
      this.currentUserSubject.next(null);
    }
  }

  public register(credentials: RegisterPayload): Observable<unknown> {
    return this.http.post(`${this.API_URL}/auth/register`, credentials);
  }

  public login(credentials: LoginPayload): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap((user: UserSession) => {
        this.currentUserSubject.next(user);
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
          this.currentUserSubject.next(res.user);
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
    this.router.navigate(['/auth']);
  }

  public isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  public refreshToken(): Observable<unknown> {
    return this.http.post(`${this.API_URL}/auth/refresh`, {});
  }

  public needsProfileCompletion(user: UserSession | null): boolean {
    return !!user && !user.profileComplete;
  }
}
