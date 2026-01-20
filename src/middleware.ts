// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate a cryptographically secure nonce for CSP
 * Uses Web Crypto API for secure random generation
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Middleware to inject CSP nonce into requests and set CSP headers
 * Implements strict nonce-based CSP for scripts and styles
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

  // Build CSP directives
  const cspDirectives: string[] = [
    // Default fallback
    "default-src 'self'",

    // Scripts: nonce-based with strict-dynamic for trusted script loading
    // 'strict-dynamic' allows scripts loaded by trusted scripts to execute
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://t1.kakaocdn.net`,

    // Workers
    "worker-src 'self' blob: https://cdnjs.cloudflare.com",

    // Styles: nonce-based with unsafe-inline fallback for React inline styles
    // Note: React uses inline style objects which require unsafe-inline
    // In production, consider using CSS-in-JS libraries with nonce support
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,

    // Fonts
    "font-src 'self' https://fonts.gstatic.com data:",

    // Images: allow data URIs and blobs for generated content
    `img-src 'self' data: blob: https:${!isProd ? ' http:' : ''}`,

    // API connections
    `connect-src 'self' https://api.destinypal.com https://*.sentry.io https://www.google-analytics.com https://region1.google-analytics.com ${isProd ? 'https://api.openai.com wss://api.openai.com' : 'http://localhost:* https://api.openai.com wss://api.openai.com'}`,

    // Prevent framing (clickjacking protection)
    "frame-ancestors 'none'",

    // Restrict base URI to prevent base tag injection
    "base-uri 'self'",

    // Restrict form submissions
    "form-action 'self'",

    // Object/embed restrictions (prevent Flash, etc.)
    "object-src 'none'",

    // Upgrade HTTP to HTTPS
    "upgrade-insecure-requests",
  ];

  // Report violations in production (optional - requires report endpoint)
  if (isProd && process.env.CSP_REPORT_URI) {
    cspDirectives.push(`report-uri ${process.env.CSP_REPORT_URI}`);
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Additional security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  // HSTS in production
  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
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
