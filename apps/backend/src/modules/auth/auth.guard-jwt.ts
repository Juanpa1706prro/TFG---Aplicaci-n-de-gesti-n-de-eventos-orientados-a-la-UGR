import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

// -------------------------------------------------------------------
// JWT Authentication Guard.
// -------------------------------------------------------------------
@Injectable()
export class JwtAuthGuard implements CanActivate {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------
  constructor(private jwtService: JwtService) {}

  /**
   * Determines whether the current request is allowed to proceed to the route handler.
   * @param context - The execution context that provides details about the current HTTP request pipeline.
   * @returns {Promise<boolean>} Resolves to `true` if the token is valid, granting access to the route.
   * @throws {UnauthorizedException} If the 'access_token' cookie is missing, tampered with, or expired.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies['access_token'];

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.accessSecret,
      });
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
