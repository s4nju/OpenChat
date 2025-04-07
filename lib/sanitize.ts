import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

// We need to check if 'window' is defined because this might run in edge functions
// where JSDOM might not be available or necessary.
// If 'window' is available (like in a browser or Node.js environment with JSDOM), use it.
// Otherwise, DOMPurify might be able to run in a limited capacity or we might need
// a different approach for edge environments if full sanitization is required there.
const domWindow = typeof window !== 'undefined' ? window : new JSDOM("").window;
const DOMPurify = createDOMPurify(domWindow as any); // Cast to any to handle potential type mismatch

export function sanitizeUserInput(input: string): string {
  // Add configuration to allow specific elements if needed,
  // but default is usually safe.
  return DOMPurify.sanitize(input, { USE_PROFILES: { html: true } });
}
