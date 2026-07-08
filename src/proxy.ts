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
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// ── /ko 경로 프리픽스 (SEO: 한국어 고유 URL) ──
// 쿠키/Accept-Language 기반 단일 URL i18n 은 크롤러 입장에서 en/ko 가 같은
// URL 을 놓고 경쟁해 hreflang 이 무력했다. /ko/* 를 실제 라우트로 리라이트해
// 앱 트리 재구성 없이 한국어 콘텐츠에 색인 가능한 고유 URL 을 준다.
// 베어 경로(/)는 영어 canonical, /ko/... 는 한국어 canonical — hreflang 쌍은
// SEO.tsx / sitemap.ts 가 이 규약을 기준으로 생성한다.
function stripKoPrefix(pathname: string): string | null {
  if (pathname === '/ko') return '/'
  if (pathname.startsWith('/ko/')) {
    const rest = pathname.slice(3)
    // API 는 로케일 프리픽스 대상이 아님 — 리라이트하면 CSRF 게이트를 우회한다
    if (rest === '/api' || rest.startsWith('/api/')) return null
    return rest
  }
  return null
}

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

function resolveLocale(request: NextRequest): {
  locale: string
  /** cookie 로 이미 확정돼 재저장 불필요한 경우만 true. query/header 유래는 false → 저장. */
  fromCookie: boolean
} {
  // 1) ?lang / ?locale 쿼리 — 서버 페이지(예: /integrated-report)와 같은 우선순위로
  //    전역 로케일도 강제한다. 예전엔 쿼리를 무시해, ?lang=ko 링크가 리포트 본문만
  //    한국어로 바꾸고 공용 UI(동의 배너·메뉴 등)는 브라우저 언어로 남아 섞였다.
  //    강제 로케일은 쿠키에도 심어 이후 네비게이션·클라 I18nProvider 와 일치시킨다.
  const q = request.nextUrl.searchParams
  const queryLocale = q.get('lang') || q.get('locale')
  if (queryLocale && SUPPORTED_LOCALES.has(queryLocale)) {
    return { locale: queryLocale, fromCookie: false }
  }
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && SUPPORTED_LOCALES.has(cookieLocale)) {
    return { locale: cookieLocale, fromCookie: true }
  }
  return {
    locale: pickLocaleFromAcceptLanguage(request.headers.get('accept-language')),
    fromCookie: false,
  }
}

// Next 16 renamed the `middleware` file convention to `proxy` (same runtime).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /ko/... 는 스트립된 실제 경로 기준으로 이후 로직(삭제 서비스 리다이렉트 등)을 태운다
  const koPath = stripKoPrefix(pathname)
  const effectivePath = koPath ?? pathname

  if (isBlockedServicePath(effectivePath)) {
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

  // 로케일 주입 대상: 전체 HTML 로드 + RSC 요청(soft nav·router.refresh()).
  // RSC 요청은 Accept 에 text/html 이 없어 예전엔 x-locale 이 안 실렸고, 그래서
  // EN/KO 토글(router.refresh) 이 서버 컴포넌트(/free·/integrated-report 등)를
  // 영어로 안 바꿨다. CSP nonce 는 HTML 에만 필요하므로 그대로 HTML 한정.
  const accept = request.headers.get('accept') || ''
  const isHtml = accept.includes('text/html')
  const isRsc =
    request.headers.has('rsc') ||
    request.headers.has('next-router-state-tree') ||
    accept.includes('text/x-component')
  // /ko 경로는 accept 와 무관하게 리라이트가 필요하다(크롤러가 text/html 을
  // 안 보내는 경우에도 404 가 아니라 페이지가 나가야 함). 그 외 경로는
  // 기존대로 HTML/RSC 요청에만 로케일을 주입한다.
  if (koPath === null && !isHtml && !isRsc) {
    return NextResponse.next()
  }

  const resolved = resolveLocale(request)
  // /ko URL 은 ?lang 핀과 같은 강제 로케일 — 쿠키/헤더보다 우선하고,
  // 이후 베어 경로 네비게이션도 한국어가 유지되게 쿠키로 저장한다.
  const locale = koPath !== null ? 'ko' : resolved.locale
  const fromCookie =
    koPath !== null ? request.cookies.get(LOCALE_COOKIE)?.value === 'ko' : resolved.fromCookie

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', locale)

  let nonce: string | null = null
  if (isHtml) {
    nonce = crypto.randomUUID()
    requestHeaders.set('x-nonce', nonce)
  }

  let response: NextResponse
  if (koPath !== null) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = koPath
    response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } })
  }
  if (nonce) {
    response.headers.set(
      'Content-Security-Policy',
      buildCsp(nonce, effectivePath.startsWith('/admin'))
    )
  }
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

// Matcher for the proxy. 정적 자산(_next/static·_next/image·파비콘·이미지/폰트
// 확장자)은 제외 — 이들은 최다 볼륨 요청인데 로케일/CSP/CSRF 주입이 필요 없고,
// 매 요청 isBlockedServicePath 배열 스캔만 헛돌렸다. API/HTML/RSC 는 그대로 매칭.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|map)$).*)',
  ],
}
