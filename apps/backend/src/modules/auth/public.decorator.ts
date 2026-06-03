import { SetMetadata } from '@nestjs/common';

// -------------------------------------------------------------------
// Public route decorator
// Marks routes that bypass the global JwtAuthGuard.
// -------------------------------------------------------------------

/**
 * Metadata key read by JwtAuthGuard to skip authentication.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a controller class or route handler as publicly accessible (no JWT required).
 * @returns {CustomDecorator} NestJS metadata decorator.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
