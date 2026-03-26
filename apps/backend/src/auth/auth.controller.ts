import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth') // La URL será http://localhost:3000/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // La URL final: http://localhost:3000/auth/register
  async register(@Body() body: any) {
    console.log('Petición de registro recibida:', body);
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: any) {
    console.log('Peticion de login recibida', body);
    const user = await this.authService.login(body.email, body.password);

    if(!user){
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return user;
  }

}