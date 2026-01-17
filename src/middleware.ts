// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  // Generate 16 random bytes and convert to base64
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Buffer.from(array).toString('base64');
}

/**
 * Middleware to inject CSP nonce into requests and set CSP headers
 * This allows us to use nonce-based CSP instead of unsafe-inline
 */
export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const isProd = process.env.NODE_ENV === 'production';

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Create response with modified request headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add nonce to response headers for use in layout
  response.headers.set('x-nonce', nonce);

  // Set Content-Security-Policy with nonce
  const cspHeader = [
    "default-src 'self'",
    // Use nonce instead of unsafe-inline/unsafe-eval for scripts
    `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://t1.kakaocdn.net`,
    "worker-src 'self' blob: https://cdnjs.cloudflare.com",
    // Keep unsafe-inline for styles as it's commonly needed for styled-components, etc.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: https:${!isProd ? ' http:' : ''}`,
    `connect-src 'self' https://api.destinypal.com https://*.sentry.io ${isProd ? 'https://api.openai.com' : 'http://localhost:* https://api.openai.com'}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Add other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
