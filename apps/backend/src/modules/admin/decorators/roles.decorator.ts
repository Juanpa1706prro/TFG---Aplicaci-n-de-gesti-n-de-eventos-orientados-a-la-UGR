import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '../../user/user-enums';

// -------------------------------------------------------------------
// Roles decorator
// Declares required SystemRole values for RolesGuard.
// -------------------------------------------------------------------

/**
 * Metadata key read by RolesGuard to enforce role-based access.
 */
export const ROLES_KEY = 'roles';

/**
 * Restricts a controller or handler to users with one of the given system roles.
 * @param {...SystemRole} roles - Allowed roles (e.g. SystemRole.ADMIN).
 * @returns {CustomDecorator} NestJS metadata decorator.
 */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
