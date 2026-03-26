import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' }) // Esto hace que esté disponible en toda la app
export class AuthService {
  // La dirección de tu "oficina" de NestJS
  private apiUrl = 'http://localhost:3000/auth'; 
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private router: Router,) {}

  register(userData: any) {
    // Retorna un "Observable" (una promesa de que algo volverá del servidor)
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(userData: any){
    return this.http.post(`${this.apiUrl}/login`,userData).pipe(
      tap((user: any) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout() {
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth']);
  }

}