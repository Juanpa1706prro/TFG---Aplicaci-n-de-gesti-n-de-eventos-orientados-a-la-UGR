import { Controller, Post, Body, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth') // La URL será http://localhost:3000/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // La URL final: http://localhost:3000/auth/register
  async register(@Body() body: any) {
    console.log('Petición de registro recibida:', body);
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response)
  {

    console.log('Peticion de login recibida', body);
    const session = await this.authService.login(body.email, body.password);
    if(!session){
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    console.log('1. [BACKEND] Login exitoso para:', session.user.email);
    console.log('2. [BACKEND] Seteando cookie "access_token"');

    res.cookie('access_token', session.accessToken, {
      httpOnly: true,
      secure: false, // true solo en producción con HTTPS
      sameSite: 'lax',
      maxAge: 3 * 60 * 60 * 1000, // 3 horas
    });

    console.log('3. [BACKEND] Enviando respuesta al Front (sin el token en el JSON)')

    return session.user;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Sesión cerrada' };
  }

}