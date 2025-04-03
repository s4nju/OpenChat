// middleware.ts - Production version with enhanced security
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware that adds comprehensive security headers
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Add Content-Security-Policy for production
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://openrouter.ai;"
  );

  // Add Strict-Transport-Security for HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

// Run middleware on all routes for security
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
