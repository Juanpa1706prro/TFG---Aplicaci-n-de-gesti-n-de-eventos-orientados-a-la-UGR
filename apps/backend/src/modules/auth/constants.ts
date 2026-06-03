// -------------------------------------------------------------------
// JWT configuration — secrets loaded from environment variables.
// Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in apps/backend/.env
// -------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy apps/backend/.env.example to .env and set JWT secrets.`,
    );
  }
  return value;
}

/**
 * JWT signing secrets used by AuthService and JwtAuthGuard.
 */
export const jwtConstants = {
  accessSecret: requireEnv('JWT_ACCESS_SECRET'),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
};
