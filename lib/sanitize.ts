import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window)

export function sanitizeUserInput(input: string): string {
  // First, sanitize any HTML tags to avoid potential XSS.
  const purified = DOMPurify.sanitize(input)
  // Then, remove characters whose char code exceeds 255 (they are incompatible with ByteString in some runtimes).
  return purified.replace(/[\u0100-\u{10FFFF}]/gu, "")
}
