// lib/csrf.ts (Updated for Web Crypto API)
import { cookies } from "next/headers"

// Helper function to convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => x.toString(16).padStart(2, "0"))
    .join("")
}

// Ensure CSRF_SECRET is defined in environment variables
const CSRF_SECRET = process.env.CSRF_SECRET
if (!CSRF_SECRET) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("CSRF_SECRET environment variable not set. Using default value for development. SET THIS IN PRODUCTION!");
  } else {
    throw new Error("CSRF_SECRET environment variable is not set. This is required for production.")
  }
}
const effectiveCsrfSecret = CSRF_SECRET || 'default-dev-secret-please-change';
const encoder = new TextEncoder(); // Reusable TextEncoder

// --- Updated generateCsrfToken (async) ---
export async function generateCsrfToken(): Promise<string> {
  // Generate 32 random bytes using Web Crypto
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const raw = bufferToHex(randomBytes.buffer); // Convert random bytes to hex

  // Prepare data for hashing
  const dataToHash = encoder.encode(`${raw}${effectiveCsrfSecret}`);

  // Hash using Web Crypto SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
  const token = bufferToHex(hashBuffer); // Convert hash buffer to hex

  return `${raw}:${token}`
}

// --- Updated validateCsrfToken (async) ---
export async function validateCsrfToken(fullToken: string): Promise<boolean> {
  if (!fullToken) return false;
  const parts = fullToken.split(":")
  // Ensure we have exactly two parts after splitting
  if (parts.length !== 2) return false;
  const [raw, token] = parts;
  if (!raw || !token) return false; // Basic check

  // Prepare data for hashing
  const dataToHash = encoder.encode(`${raw}${effectiveCsrfSecret}`);

  // Compute the expected hash using Web Crypto SHA-256
  const expectedHashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
  const expectedToken = bufferToHex(expectedHashBuffer);

  // Compare the computed hash with the provided token
  // Note: For enhanced security, a timing-safe comparison function should be used
  // in a real production environment, but Web Crypto API doesn't provide one directly.
  // Basic equality check is used here as per the original logic.
  return expectedToken === token
}

// Note: setCsrfCookie function is implemented in the API route (api/csrf/route.ts)
