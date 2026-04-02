import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/services/auth.services';
import { UserProfile } from '@core/interfaces/user.profile-interface';


@Component({
  selector: 'app-profile',
  standalone: true, // <-- ¡AÑADE ESTO! Es vital si no usas NgModules
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {

  private readonly API_URL = 'http://localhost:3000'; 
  public userProfile: UserProfile | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  
  ngOnInit() {
    // Si quieres que se pruebe nada más entrar a la pantalla

    console.log('🚀 [FRONTEND] Lanzando petición GET al backend...');
    this.getProfileTest().subscribe({
      next: (res: any) => {
        console.log('✅ [FRONTEND] Respuesta recibida del backend:', res);
        this.userProfile = res.user;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar el perfil:', err);
      }
    })
  }


 
  probarRutaProtegida() {
    console.log('-> Iniciando petición a zona protegida...');
    
    this.getProfileTest().subscribe({
      next: (respuesta) => {
        console.log('✅ ¡ÉXITO! El servidor nos ha dejado entrar:', respuesta);
      },
      error: (error) => {
        console.error('❌ ¡BLOQUEADO! El servidor nos rechazó (Probablemente 401 Unauthorized):', error);
      }
    });
  }

  getProfileTest() {
    // Solo hacemos la petición GET. El Interceptor le dirá al navegador que adjunte la cookie.
    // IMPORTANTE: Asegúrate de que la URL apunte al controlador 'user', no a 'auth'
    return this.http.get(`${this.API_URL}/user/profile`); 
  }
}