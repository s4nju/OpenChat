// lib/stream-debug.ts
// This file has been disabled for production
// Only utility functions needed for production are kept

/**
 * Sanitizes a JSON string by removing any invalid characters
 * @param jsonString The potentially invalid JSON string
 * @returns A sanitized JSON string
 */
export function sanitizeJsonString(jsonString: string): string {
  // Remove any control characters that might break JSON parsing
  return jsonString
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\\"/g, '\\"')          // Escape quotes
    .replace(/\n/g, '\\n')           // Replace newlines
    .replace(/\r/g, '\\r')           // Replace carriage returns
    .replace(/\t/g, '\\t');          // Replace tabs
}

/**
 * Safely parses JSON without debug logging
 * @param jsonString The JSON string to parse
 * @returns The parsed object or null if parsing failed
 */
export function safeJsonParse(jsonString: string): any | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}
