import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, CookieOptions, Request } from 'express';
import { jwtConstants } from './constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import { JwtService } from '@nestjs/jwt';

// -------------------------------------------------------------------
// Authentication Controller
// Exposes endpoints for user registration, login, logout and token refresh..
// Base route: /auth
// -------------------------------------------------------------------
@Controller('auth')
export class AuthController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  // ------------------------------------------------------------
  // Properties
  // ------------------------------------------------------------

  /**
   * Base configuration for cookies used in authentication flows.
   */
  private readonly baseCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: false, // true solo en producción con HTTPS
    sameSite: 'lax',
  };

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Handles user registration.
   * @param {RegisterDto} body - The payload containing 'email' and 'password'.
   * @returns {Promise<any>} The newly created user object.
   */
  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  /**
   * Authenticates a user and sets an HTTP-only cookie containing the JWT.
   * @param {LoginDto} body - The payload containing 'email' and 'password'.
   * @param {Response} res - The Express response object used to set the cookie.
   * @returns {Promise<any>} The sanitized user object (without the token).
   * @throws {UnauthorizedException} If credentials are invalid.
   */
  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(body.email, body.password);
    if (!session) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    res.cookie('access_token', session.accessToken, {
      ...this.baseCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', session.refreshToken, {
      ...this.baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return session.user;
  }

  /**
   * Rotates the user's access and refresh tokens using a valid refresh token.
   * @param {Request} req - The Express request object containing the cookies.
   * @param {Response} res - The Express response object used to set the new cookies.
   * @returns {Promise<{ message: string }>} A success message upon successful token rotation.
   * @throws {UnauthorizedException} If no refresh token is provided.
   * @throws {ForbiddenException} If the refresh token is invalid or expired.
   */
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {

    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken)
      throw new UnauthorizedException('No refresh token found');

    try {
      const payload = await this.authService.verifyRefreshToken(refreshToken);

      const tokens = await this.authService.refreshTokens(
        payload.sub,
        refreshToken,
      );

      res.cookie('access_token', tokens.accessToken, {
        ...this.baseCookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        ...this.baseCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/auth/refresh',
      });

      return { message: 'Tokens rotated' };
    } catch {
      // If the refresh token is completely invalid/expired, force a clean logout
      this.logout(req, res);
      throw new ForbiddenException('Session invalid or outdated');
    }
  }

  /**
   * Logs out the user by clearing the authentication cookie.
   * @param {Request} req - The Express request object containing the cookies.
   * @param {Response} res - The Express response object used to clear the cookie.
   * @returns {Promise<{ message: string }>} A success message.
   */
  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['access_token'];

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: jwtConstants.accessSecret,
        });
        // Invalidate the refresh token in the database
        await this.authService.logout(payload.sub);
      } catch {}
    }

    // Destroy cookies in the client's browser
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth/refresh' });

    return { message: 'Closed session' };
  }
}
