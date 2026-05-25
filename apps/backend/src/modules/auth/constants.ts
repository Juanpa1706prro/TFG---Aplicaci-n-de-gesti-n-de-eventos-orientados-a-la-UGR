// -------------------------------------------------------------------
// JWT configuration constants
// Signing secrets for access and refresh tokens.
// -------------------------------------------------------------------

/**
 * JWT signing secrets used by AuthService and JwtAuthGuard.
 * @remarks Load from environment variables in production deployments.
 */
export const jwtConstants = {
  accessSecret: '88Zy2gaPMZJo2IRyN+rBrtWqwGmwujgpUrjxdT9FlCs=',
  refreshSecret: 'PDvtBX4WkcWSft+xeLawahhOCzGj8XDLKcQahOoCzM6I=',
};
