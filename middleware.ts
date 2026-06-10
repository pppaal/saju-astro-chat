/**
 * Next.js Middleware
 * Handles CSRF protection for all mutating API requests
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REMOVED_PUBLIC_SERVICE_PREFIXES } from '@/config/enabledServices'
import { validateOrigin } from '@/lib/security/csrf'

// Routes that should skip CSRF validation
const CSRF_SKIP_ROUTES = new Set([
  '/api/webhook/stripe', // Stripe webhooks have their own signature verification
  '/api/csp-report', // CSP violation reports from browser
  '/api/auth', // NextAuth handles its own CSRF
  '/api/cron', // Cron jobs authenticated via API key
  '/api/metrics/track', // Anonymous metrics endpoint (no sensitive mutation)
])

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ── Module-level caches (computed once at cold start, reused across requests) ──

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
 * Build CSP header (only nonce is dynamic, rest is cached at module level)
 */
function buildCsp(nonce: string, allowEval = false): string {
  // admin 대시보드 번들은 eval 기반 코드가 있어 prod 의 엄격한 script-src
  // (unsafe-eval 없음) 아래서 "문제가 발생했어요" 로 통째 죽는다. admin 은
  // 인증 + noindex 로 격리된 내부 경로라 일반 사용자 공격면이 아니므로 이
  // 경로에 한해 unsafe-eval 을 허용한다. 공개 페이지의 CSP 는 그대로 엄격.
  const base = allowEval ? [..._cspScriptSrcBase, "'unsafe-eval'"] : _cspScriptSrcBase
  const scriptSrc = `script-src ${base.join(' ')} 'nonce-${nonce}'`
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

// ── Locale detection ──
const SUPPORTED_LOCALES = new Set(['ko', 'en'])
const DEFAULT_LOCALE = 'en'
const LOCALE_COOKIE = 'locale'
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function pickLocaleFromAcceptLanguage(header: string | null): string {
  if (!header) return DEFAULT_LOCALE
  // Parse "ko-KR,ko;q=0.9,en;q=0.8" — take first supported lang in order
  const parts = header.split(',').map((p) => p.trim().split(';')[0].toLowerCase())
  for (const part of parts) {
    const lang = part.split('-')[0]
    if (SUPPORTED_LOCALES.has(lang)) return lang
  }
  return DEFAULT_LOCALE
}

function resolveLocale(request: NextRequest): { locale: string; fromCookie: boolean } {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && SUPPORTED_LOCALES.has(cookieLocale)) {
    return { locale: cookieLocale, fromCookie: true }
  }
  return {
    locale: pickLocaleFromAcceptLanguage(request.headers.get('accept-language')),
    fromCookie: false,
  }
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

    // Validate origin (shared validator — see src/lib/security/csrf.ts)
    if (!validateOrigin(request.headers)) {
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
  const { locale, fromCookie } = resolveLocale(request)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-locale', locale)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', buildCsp(nonce, pathname.startsWith('/admin')))
  response.headers.set('Content-Language', locale)
  // Tell crawlers/CDNs the same URL serves different content per cookie
  response.headers.set('Vary', 'Cookie, Accept-Language')

  // Persist detected locale on first visit so SSR + client agree from now on
  if (!fromCookie) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })
  }

  return response
}

// Only run middleware on API routes
export const config = {
  matcher: '/:path*',
}
