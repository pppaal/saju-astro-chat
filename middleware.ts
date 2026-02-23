/**
 * Next.js Middleware
 * Handles CSRF protection for all mutating API requests
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REMOVED_PUBLIC_SERVICE_PREFIXES } from '@/config/enabledServices'

// Routes that should skip CSRF validation
const CSRF_SKIP_ROUTES = new Set([
  '/api/webhook/stripe', // Stripe webhooks have their own signature verification
  '/api/csp-report', // CSP violation reports from browser
  '/api/auth', // NextAuth handles its own CSRF
  '/api/cron', // Cron jobs authenticated via API key
])

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ── Module-level caches (computed once at cold start, reused across requests) ──

// Cached allowed origins (env vars don't change at runtime)
let _cachedAllowedOrigins: Set<string> | null = null
function getAllowedOrigins(): Set<string> {
  if (_cachedAllowedOrigins) return _cachedAllowedOrigins
  const origins = new Set<string>()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) {
    try {
      origins.add(new URL(baseUrl).origin)
    } catch {
      /* invalid base URL */
    }
  }
  const additional = process.env.ALLOWED_ORIGINS?.split(',') || []
  for (const o of additional) {
    const trimmed = o.trim()
    if (trimmed) origins.add(trimmed)
  }
  _cachedAllowedOrigins = origins
  return origins
}

// Cached CSP static parts (only nonce changes per request)
const _isProd = process.env.NODE_ENV === 'production'

const _cspConnectSrc: string = (() => {
  const src = [
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
  if (aiBackend) {
    try {
      const parsed = new URL(aiBackend)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        src.push(aiBackend)
      } else {
        console.warn(`[Middleware] AI_BACKEND_URL has invalid protocol: ${parsed.protocol}`)
      }
    } catch {
      console.warn(`[Middleware] AI_BACKEND_URL is malformed: ${aiBackend}`)
    }
  }
  if (!_isProd) {
    src.push('http://localhost:5000', 'http://127.0.0.1:5000')
  }
  return src.join(' ')
})()

const _cspScriptSrcBase: string[] = (() => {
  const src = [
    "'self'",
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://www.clarity.ms',
    'https://t1.kakaocdn.net',
  ]
  if (!_isProd) src.push("'unsafe-eval'")
  return src
})()

// Pre-built static directives (everything except script-src which needs nonce)
const _cspStaticPrefix = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`,
].join('; ')

const _cspStaticSuffix = [
  `connect-src ${_cspConnectSrc}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `report-uri /api/csp-report`,
  ...(_isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

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

  // SECURITY: Require origin/referer even in development for better security hygiene
  // Only allow localhost bypass for specific safe ports to prevent DNS rebinding attacks
  if (!origin && !referer) {
    if (process.env.NODE_ENV === 'development') {
      const host = request.headers.get('host')
      // Strict localhost check with specific port patterns
      const safeLocalPattern = /^(localhost|127\.0\.0\.1):(3000|3001|4000)$/
      if (host && safeLocalPattern.test(host)) {
        return true
      }
    }
    return false
  }

  const allowedOrigins = getAllowedOrigins()

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

/**
 * Build CSP header (only nonce is dynamic, rest is cached at module level)
 */
function buildCsp(nonce: string): string {
  const scriptSrc = `script-src ${_cspScriptSrcBase.join(' ')} 'nonce-${nonce}'`
  return `${_cspStaticPrefix}; ${scriptSrc}; ${_cspStaticSuffix}`
}

function isBlockedServicePath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) {
    return false
  }
  return REMOVED_PUBLIC_SERVICE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isBlockedServicePath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  // Only apply to API routes
  if (pathname.startsWith('/api/')) {
    // Only check mutating methods
    if (!MUTATING_METHODS.has(request.method)) {
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
