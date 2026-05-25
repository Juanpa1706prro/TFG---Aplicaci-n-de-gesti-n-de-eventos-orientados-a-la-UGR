import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../../user/user-enums';
import { UsersService } from '../../user/user.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

// -------------------------------------------------------------------
// Roles Guard
// Enforces @Roles() metadata on admin routes after JWT authentication.
// -------------------------------------------------------------------
@Injectable()
export class RolesGuard implements CanActivate {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  // ------------------------------------------------------------
  // Guard lifecycle
  // ------------------------------------------------------------

  /**
   * Verifies the authenticated user has at least one of the required system roles.
   * @param {ExecutionContext} context - Current HTTP request pipeline context.
   * @returns {Promise<boolean>} True when no roles are required or the user role matches.
   * @throws {ForbiddenException} If unauthenticated or the role is not allowed.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles metadata: allow through (guard is a no-op for that route)
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { sub: number } }>();
    const userId = request.user?.sub;
    if (userId == null) {
      throw new ForbiddenException('Acceso denegado');
    }

    const user = await this.usersService.findByID(userId);
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    return true;
  }
}
