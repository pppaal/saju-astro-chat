/**
 * Next.js Middleware
 * Handles CSRF protection for all mutating API requests
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that should skip CSRF validation
const CSRF_SKIP_ROUTES = new Set([
  '/api/webhook/stripe', // Stripe webhooks have their own signature verification
  '/api/csp-report', // CSP violation reports from browser
  '/api/auth', // NextAuth handles its own CSRF
  '/api/cron', // Cron jobs authenticated via API key
])

/**
 * Check if the route should skip CSRF validation
 */
function shouldSkipCsrf(pathname: string): boolean {
  // Exact matches
  if (CSRF_SKIP_ROUTES.has(pathname)) {
    return true
  }

  // Prefix matches (e.g., /api/auth/callback/google)
  for (const route of CSRF_SKIP_ROUTES) {
    if (pathname.startsWith(route + '/')) {
      return true
    }
  }

  return false
}

/**
 * Validate request origin for CSRF protection
 */
function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  // In development, allow requests without origin from localhost
  if (!origin && !referer) {
    if (process.env.NODE_ENV === 'development') {
      const host = request.headers.get('host')
      if (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
        return true
      }
    }
    return false
  }

  // Build allowed origins set
  const allowedOrigins = new Set<string>()

  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      allowedOrigins.add(url.origin)
    } catch {
      // Invalid base URL, skip
    }
  }

  // Additional allowed origins from env (comma-separated)
  const additionalOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
  for (const o of additionalOrigins) {
    const trimmed = o.trim()
    if (trimmed) {
      allowedOrigins.add(trimmed)
    }
  }

  // Check origin header
  if (origin && allowedOrigins.has(origin)) {
    return true
  }

  // Check referer header as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (allowedOrigins.has(refererUrl.origin)) {
        return true
      }
    } catch {
      // Invalid referer URL
    }
  }

  return false
}

function buildCsp(nonce: string) {
  const isProd = process.env.NODE_ENV === 'production'
  const connectSrc = [
    "'self'",
    'https://api.destinypal.com',
    'https://*.sentry.io',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://www.clarity.ms',
    'https://vitals.vercel-insights.com',
    'wss:',
  ]

  const aiBackend = process.env.AI_BACKEND_URL
  if (aiBackend && aiBackend.startsWith('https://')) {
    connectSrc.push(aiBackend)
  }

  if (!isProd) {
    connectSrc.push('http://localhost:5000', 'http://127.0.0.1:5000')
  }

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://www.clarity.ms',
    'https://t1.kakaocdn.net',
  ]

  if (!isProd) {
    scriptSrc.push("'unsafe-eval'")
  }

  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `style-src 'self' 'unsafe-inline'`,
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `report-uri /api/csp-report`,
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ]

  return directives.join('; ')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to API routes
  if (pathname.startsWith('/api/')) {
    // Only check mutating methods
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (!mutatingMethods.includes(request.method)) {
      return NextResponse.next()
    }

    // Skip certain routes
    if (shouldSkipCsrf(pathname)) {
      return NextResponse.next()
    }

    // Validate origin
    if (!validateOrigin(request)) {
      // Log the failed attempt (will appear in Vercel logs)
      console.warn(`[CSRF] Origin validation failed: ${pathname}`, {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        method: request.method,
      })

      return NextResponse.json({ error: 'csrf_validation_failed' }, { status: 403 })
    }

    return NextResponse.next()
  }

  const accept = request.headers.get('accept') || ''
  if (!accept.includes('text/html')) {
    return NextResponse.next()
  }

  const nonce = crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  return response
}

// Only run middleware on API routes
export const config = {
  matcher: '/:path*',
}
