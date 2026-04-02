import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies['access_token']; // Leemos la cookie

    console.log('6. [BACKEND GUARD] El portero está revisando la petición...');

    if (!token){
        console.error('7. [BACKEND GUARD] ¡ALERTA! No se encontró la cookie "access_token"');
        throw new UnauthorizedException();
    } 
        
    try {
        const payload = await this.jwtService.verifyAsync(token, { secret: jwtConstants.secret });
        console.log('8. [BACKEND GUARD] Token válido. Usuario ID:', payload.sub);
        request['user'] = payload; // Metemos los datos del usuario en la petición
        return true;
    } catch {
        console.error('9. [BACKEND GUARD] Token inválido o caducado');
        throw new UnauthorizedException();
    }
  }
}