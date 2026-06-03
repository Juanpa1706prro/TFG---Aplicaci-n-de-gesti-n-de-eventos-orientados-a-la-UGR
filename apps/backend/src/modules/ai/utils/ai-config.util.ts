// -------------------------------------------------------------------
// AI environment configuration
// Reads GEMINI_* from process.env (dotenv in main.ts).
// -------------------------------------------------------------------

/**
 * Returns the Gemini API key from the environment (trimmed).
 * @returns {string | undefined} API key or undefined if missing/blank.
 */
export function getGeminiApiKey(): string | undefined {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Model id for generateContent (override via GEMINI_MODEL in .env).
 * @returns {string} Gemini model name.
 */
export function getGeminiModel(): string {
  const raw = process.env.GEMINI_MODEL?.trim();
  return raw && raw.length > 0 ? raw : 'gemini-2.5-flash';
}

/**
 * Whether the backend may call the Gemini API (key present).
 * @returns {boolean} True when GEMINI_API_KEY is set.
 */
export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() !== undefined;
}
