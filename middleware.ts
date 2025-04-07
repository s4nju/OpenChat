import { updateSession } from "@/utils/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"
import { validateCsrfToken } from "@/lib/csrf" // Import async CSRF validation

export async function middleware(request: NextRequest) {
  // Start by getting the response from updateSession
  const response = await updateSession(request)

  // CSRF protection for state-changing requests (POST, PUT, DELETE)
  if (["POST", "PUT", "DELETE"].includes(request.method)) {
    const csrfCookie = request.cookies.get("csrf_token")?.value
    const headerToken = request.headers.get("x-csrf-token")

    // Await the async validation of the token from the header
    const isTokenValid = headerToken ? await validateCsrfToken(headerToken) : false;

    if (!csrfCookie || !headerToken || !isTokenValid) {
      console.warn("Invalid CSRF token detected for request:", request.method, request.url);
      // Return a 403 Forbidden response if validation fails
      return new NextResponse("Invalid CSRF token", { status: 403 })
    }
  }

  // Content Security Policy (CSP) for development and production
  const isDev = process.env.NODE_ENV === "development"
  // Ensure NEXT_PUBLIC_SUPABASE_URL is defined, provide a fallback or handle error
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error("NEXT_PUBLIC_SUPABASE_URL environment variable is not set!");
    // Handle appropriately - maybe return an error response or use a default?
    // For now, let's proceed but log the error. A default might break functionality.
  }
  const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : "" // Get origin (e.g., https://xyz.supabase.co)

  // Define CSP directives
  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Often needed for Next.js inline scripts, review if possible to remove
      "https://cdnjs.cloudflare.com", // Example CDN
      "https://analytics.umami.is", // Umami analytics
      "https://vercel.live", // Vercel toolbar
      // Add 'unsafe-eval' only in development if absolutely necessary
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for many UI libraries/inline styles
    ],
    "img-src": [
      "'self'",
      "data:", // Allow data URIs
      "https:", // Allow images from any HTTPS source
      "blob:", // Allow blob URLs (often used for previews)
    ],
    "connect-src": [
      "'self'",
      "wss:", // Allow websockets
      "https://api.openai.com",
      "https://api.mistral.ai",
      "https://api.supabase.com",
      supabaseDomain, // Allow connections to Supabase project URL
      "https://api-gateway.umami.dev", // Umami analytics API
      // Add other necessary API endpoints here
    ],
    "frame-src": [
      "'self'",
      "https://vercel.live", // Vercel toolbar
    ],
    // Add other directives as needed (e.g., font-src, media-src)
  }

  // Format the CSP header string
  const cspString = Object.entries(cspDirectives)
    .map(([key, value]) => `${key} ${value.join(" ")}`)
    .join("; ")

  // Set the CSP header on the response object obtained from updateSession
  response.headers.set("Content-Security-Policy", cspString)

  // Return the modified response
  return response
}

export const config = {
  matcher: [
    // Exclude static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
