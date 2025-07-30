/**
 * Edge-compatible CSRF protection utilities.
 * Uses Web Crypto APIs only (no Node.js imports).
 * Secret must be injected at runtime (e.g., via env or config).
 */

// import { cookies } from "next/headers"

// Helper: Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Get random hex string of given byte length
function getRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Get SHA-256 digest as hex
async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(data)
  );
  return bufferToHex(hashBuffer);
}

/**
 * Generate a CSRF token using a secret.
 * @param secret - The CSRF secret (must be injected at runtime, not hardcoded)
 * @returns Promise<string> - The CSRF token in the format raw:hash
 */
export async function generateCsrfToken(secret: string): Promise<string> {
  const raw = getRandomHex(32);
  const token = await sha256Hex(`${raw}${secret}`);
  return `${raw}:${token}`;
}

/**
 * Validate a CSRF token using a secret.
 * @param fullToken - The CSRF token from the client
 * @param secret - The CSRF secret (must be injected at runtime, not hardcoded)
 * @returns Promise<boolean> - Whether the token is valid
 */
export async function validateCsrfToken(
  fullToken: string,
  secret: string
): Promise<boolean> {
  const [raw, token] = fullToken.split(':');
  if (!(raw && token)) {
    return false;
  }
  const expected = await sha256Hex(`${raw}${secret}`);
  return expected === token;
}

/**
 * Generate a CSRF token for use in a cookie.
 * The caller is responsible for setting the cookie using NextResponse or the appropriate API.
 * @param secret - The CSRF secret (must be injected at runtime, not hardcoded)
 * @returns Promise<string> - The CSRF token to set as a cookie
 */
export function getCsrfCookieValue(secret: string): Promise<string> {
  return generateCsrfToken(secret);
}
