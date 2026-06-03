// -------------------------------------------------------------------
// Routing environment configuration
// Reads GOOGLE_ROUTES_API_KEY from process.env (dotenv in main.ts).
// -------------------------------------------------------------------

/**
 * Returns the Google Routes API key from the environment (trimmed).
 * @returns {string | undefined} API key or undefined if missing/blank.
 */
export function getGoogleRoutesApiKey(): string | undefined {
  const raw = process.env.GOOGLE_ROUTES_API_KEY;
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Whether the backend may call Google Routes API (key present).
 * @returns {boolean} True when GOOGLE_ROUTES_API_KEY is set.
 */
export function isGoogleRoutingConfigured(): boolean {
  return getGoogleRoutesApiKey() !== undefined;
}
