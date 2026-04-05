import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, CookieOptions, Request } from 'express';
import { jwtConstants } from './constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
  async register(@Body() body: RegisterDto) {
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
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(body.email, body.password);
    if (!session) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const baseCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: false, // true solo en producción con HTTPS
      sameSite: 'lax',
    };

    res.cookie('access_token', session.accessToken, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refres_token', session.refreshToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return session.user;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refres_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('No hay refresh token');
    }

    const payload = await this.authService.verifyRefreshToken(refreshToken);

    const newAccessToken = await this.authService.generateAccessToken({
      id: payload.id,
      userNumber: payload.userNumber,
    });

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict' as const,
      maxAge: 15 * 60 * 1000,
    });

    return { ok: true };
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
