import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, Observable, firstValueFrom } from 'rxjs';
import { UserSession } from '@core/interfaces/user-interface';
import { LoginPayload, RegisterPayload } from '@core/interfaces/auth-interface';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // ---- Constants ----
  private readonly API_URL = 'http://localhost:3000';
  private readonly SESSION_USER = 'user_session';

  // ---- States Management ----
  /**
   * currentUserSubject: Private behavior subject that holds the current user session state.
   * currentUser$: Public observable stream of the current user session. Components can subscribe to this to react to login/logout events.
   */
  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  public readonly currentUser$: Observable<UserSession | null> =
    this.currentUserSubject.asObservable();

  // ---- Constructor ----
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ---- Getters ----

  /**
   * Returns current user session values, maybe it can be null.
   */
  public get currentUserValue(): UserSession | null {
    return this.currentUserSubject.value;
  }

  // ---- Methods ----

  /**
   * Initializes the authentication state.
   */
  public async initializeAuth(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ user: UserSession }>(`${this.API_URL}/user/profile`),
      );
      this.currentUserSubject.next(response.user);
    } catch {
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Register new user in the bd.
   * @param {RegisterPayload} credentials - Data obtained from the registration form.
   * @returns {Observable<any>} An observable containing the backend response.
   */
  public register(credentials: RegisterPayload): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, credentials);
  }

  /**
   * Authenticates a user, stores the session data locally, and updates the reactive state.
   * @param {LoginPayload} credentials - Data obtained from the login form.
   * @returns {Observable<UserSession>} An observable containing the logged-in user's session data.
   */
  public login(credentials: LoginPayload): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap((user: UserSession) => {
        this.currentUserSubject.next(user);
      }),
    );
  }

  /**
   * Logs out the current user by destroying the backend session, clearing local storage,
   * and redirecting to the authentication view.
   */
  public logout() {
    this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth']);

    console.log('Sesión cerrada y estado limpiado.');
  }

  /**
   * Checks if there is a currently logged-in user based on the local state.
   * @returns {boolean} True if a user session exists, else false.
   */
  public isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }
}
