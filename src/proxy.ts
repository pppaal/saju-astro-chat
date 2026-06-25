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
  // Google Fonts: stylesheet from fonts.googleapis.com, font files from fonts.gstatic.com.
  // (proxy 가 src/ 로 와 CSP 가 다시 활성화되며 드러난 차단 — --dp-serif/Newsreader 등.)
  `font-src 'self' data: https://fonts.gstatic.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
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

// 접속 국가로 언어 결정 — 한국이면 한국어, 그 외 알려진 나라면 영어.
// "한국에선 한국어, 외국에선 영어"가 정책. Vercel 엣지가 IP 로 채워주는
// x-vercel-ip-country 헤더를 읽는다. 로컬/비-Vercel 환경엔 이 헤더가 없어
// null 을 반환(그땐 Accept-Language 로 폴백).
function localeFromGeo(request: NextRequest): string | null {
  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase()
  if (!country) return null
  return country === 'KR' ? 'ko' : 'en'
}

// 우선순위: (1) 사용자가 스위처로 직접 고른 쿠키 → (2) 접속 국가(geo) →
// (3) 브라우저 언어(geo 를 모를 때만, 주로 로컬). 자동 감지값은 쿠키로 굽지
// 않는다 — 그래야 위치가 바뀌면(여행 등) 매 방문 위치 기준으로 다시 뜨고,
// 잘못 잡힌 값이 1년간 고정되는 일이 없다. 명시적 선택만 쿠키로 영속화한다
// (I18nProvider.setLocale).
function resolveLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && SUPPORTED_LOCALES.has(cookieLocale)) {
    return cookieLocale
  }
  const geoLocale = localeFromGeo(request)
  if (geoLocale) {
    return geoLocale
  }
  return pickLocaleFromAcceptLanguage(request.headers.get('accept-language'))
}

// Next 16 renamed the `middleware` file convention to `proxy` (same runtime).
export function proxy(request: NextRequest) {
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
  const locale = resolveLocale(request)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-locale', locale)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', buildCsp(nonce, pathname.startsWith('/admin')))
  response.headers.set('Content-Language', locale)
  // 같은 URL 이 쿠키/언어/접속국가에 따라 다른 언어를 낸다 — 크롤러/CDN 에 알림.
  response.headers.set('Vary', 'Cookie, Accept-Language, X-Vercel-IP-Country')

  // 자동 감지(geo/Accept-Language)값은 쿠키로 굽지 않는다. 명시적 선택만
  // 영속화(I18nProvider.setLocale)해, 위치 변화에 매 방문 재평가되도록 한다.
  return response
}

// Matcher for the proxy (runs on all paths; logic gates per request).
export const config = {
  matcher: '/:path*',
}
