import {
  Controller,
  Post,
  Body,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';

// -------------------------------------------------------------------
// Authentication Controller
// Exposes endpoints for user registration, login, and logout.
// Base route: /auth
// -------------------------------------------------------------------
@Controller('auth')
export class AuthController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles user registration.
   * @param {any} body - The payload containing 'email' and 'password'.
   * @returns {Promise<any>} The newly created user object.
   */
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password);
  }

  /**
   * Authenticates a user and sets an HTTP-only cookie containing the JWT.
   * @param {any} body - The payload containing 'email' and 'password'.
   * @param {Response} res - The Express response object used to set the cookie.
   * @returns {Promise<any>} The sanitized user object (without the token).
   * @throws {UnauthorizedException} If credentials are invalid.
   */
  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.login(body.email, body.password);
    if (!session) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    res.cookie('access_token', session.accessToken, {
      httpOnly: true,
      secure: false, // true solo en producción con HTTPS
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    return session.user;
  }

  /**
   * Logs out the user by clearing the authentication cookie.
   * @param {Response} res - The Express response object used to clear the cookie.
   * @returns {Object} A success message.
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Sesión cerrada' };
  }
}
