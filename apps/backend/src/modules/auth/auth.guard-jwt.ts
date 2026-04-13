import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

// -------------------------------------------------------------------
// JWT Authentication Guard.
// -------------------------------------------------------------------
@Injectable()
export class JwtAuthGuard implements CanActivate {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  /**
   * Determines whether the current request is allowed to proceed to the route handler.
   * @param context - The execution context that provides details about the current HTTP request pipeline.
   * @returns {Promise<boolean>} Resolves to `true` if the token is valid, granting access to the route.
   * @throws {UnauthorizedException} If the 'access_token' cookie is missing, tampered with, or expired.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public using the @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, bypass cookie verification
    if (isPublic) {
      return true;
    }

    // Extract the request object and the access token cookie
    const request = context.switchToHttp().getRequest();

    // --- NUEVOS LOGS ---
    console.log('----------------------------------------------------');
    console.log('🕵️‍♂️ [GUARD] 1. Petición entrante a URL:', request.url);
    console.log('🕵️‍♂️ [GUARD] 2. Cabecera origin:', request.headers['origin']);
    console.log('🕵️‍♂️ [GUARD] 3. Cabecera cookie (Raw):', request.headers['cookie']);
    console.log('🕵️‍♂️ [GUARD] 4. Cookies parseadas por cookie-parser:', request.cookies);
    // -------------------

    const accessToken = request.cookies['access_token'];

    // Ensure the token actually exists
    if (!accessToken) {
      throw new UnauthorizedException('Access token not found');
    }

    // Cryptographic verification of the token
    try {
      const payload = await this.jwtService.verifyAsync(accessToken, {
        secret: jwtConstants.accessSecret,
      });
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
