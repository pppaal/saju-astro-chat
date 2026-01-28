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

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

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

// Only run middleware on API routes
export const config = {
  matcher: '/api/:path*',
}
