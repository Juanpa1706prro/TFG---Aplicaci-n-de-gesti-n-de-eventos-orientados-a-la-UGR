import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' }) // Esto hace que esté disponible en toda la app
export class AuthService {
  // La dirección de tu "oficina" de NestJS
  private apiUrl = 'http://localhost:3000/auth'; 

  constructor(private http: HttpClient) {}

  register(userData: any) {
    // Retorna un "Observable" (una promesa de que algo volverá del servidor)
    return this.http.post(`${this.apiUrl}/register`, userData);
  }
}