/**
 * API Context Initialization
 * Handles: CSRF, rate limiting, auth, credits
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { csrfGuard } from '@/lib/security/csrf'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '../errorHandler'
import { checkAndConsumeCredits } from '@/lib/credits'
import { refundCredits } from '@/lib/credits/creditRefund'
import type { ApiContext, MiddlewareOptions } from './types'

// ============ Locale Extraction ============

/**
 * Extract locale from request headers
 */
export function extractLocale(req: Request): string {
  // proxy 가 사용자 선택(locale 쿠키)·Accept-Language 를 해석해 주입한 x-locale 가
  // 가장 권위적 — 페이지는 KO 인데 API 에러 메시지만 Accept-Language 기반 EN 으로
  // 나가던 불일치를 막는다.
  const headerLocale = req.headers.get('x-locale')
  if (headerLocale === 'ko' || headerLocale === 'en') return headerLocale

  const urlLocale = new URL(req.url).searchParams.get('locale')
  if (urlLocale === 'ko' || urlLocale === 'en') return urlLocale

  // 사용자가 토글로 고른 locale 쿠키 — Accept-Language 보다 우선.
  const cookieLocale = (req.headers.get('cookie') || '').match(/(?:^|;\s*)locale=(ko|en)\b/)?.[1]
  if (cookieLocale) return cookieLocale

  return req.headers.get('accept-language')?.includes('ko') ? 'ko' : 'en'
}

// ============ Context Helpers ============

function createEmptyContext(ip: string, locale: string): ApiContext {
  return {
    ip,
    locale,
    session: null,
    userId: null,
    isAuthenticated: false,
    isPremium: false,
  }
}

// ============ CSRF Validation ============

function validateCsrf(
  req: NextRequest,
  options: MiddlewareOptions,
  ip: string,
  locale: string,
  route: string
): NextResponse | null {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

  if (!options.skipCsrf && !isTestEnv && mutatingMethods.includes(req.method)) {
    // csrfGuard delegates to the single shared validateOrigin in
    // src/lib/security/csrf.ts (same validator used by the edge middleware).
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn(`[CSRF] Origin validation failed`, {
        route,
        ip,
        method: req.method,
      })
      return NextResponse.json({ error: 'csrf_validation_failed' }, { status: 403 })
    }
  }
  return null
}

// ============ Rate Limiting ============

type RateLimitCheckResult = {
  error?: NextResponse
  headers?: Headers
}

async function checkRateLimit(
  options: MiddlewareOptions,
  route: string,
  ip: string,
  locale: string,
  userId?: string | null,
  skipIpCheck: boolean = false
): Promise<RateLimitCheckResult> {
  if (!options.rateLimit) return {}

  const { limit, windowSeconds, keyPrefix = 'api', failClosed } = options.rateLimit
  let headers: Headers | undefined

  if (!skipIpCheck) {
    // IP-based rate limiting
    const rateLimitKey = `${keyPrefix}:${route}:${ip}`
    const result = await rateLimit(rateLimitKey, { limit, windowSeconds, failClosed })
    headers = result.headers

    if (!result.allowed) {
      return {
        error: createErrorResponse({
          code: ErrorCodes.RATE_LIMITED,
          locale,
          route,
          headers: result.headers,
        }),
        headers: result.headers,
      }
    }
  }

  // User-based rate limiting (if authenticated)
  if (userId) {
    const userRateLimitKey = `${keyPrefix}:${route}:user:${userId}`
    const userResult = await rateLimit(userRateLimitKey, {
      limit,
      windowSeconds,
      failClosed,
    })
    headers = userResult.headers

    if (!userResult.allowed) {
      return {
        error: createErrorResponse({
          code: ErrorCodes.RATE_LIMITED,
          locale,
          route,
          headers: userResult.headers,
        }),
        headers: userResult.headers,
      }
    }
  }

  return { headers }
}

// ============ Token Validation ============

function validateToken(
  req: NextRequest,
  options: MiddlewareOptions,
  locale: string,
  route: string,
  rateLimitHeaders?: Headers
): NextResponse | null {
  if (!options.requireToken) return null

  const tokenResult = requirePublicToken(req)
  if (!tokenResult.valid) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      message: tokenResult.reason || 'Invalid or missing token',
      locale,
      route,
      headers: rateLimitHeaders,
    })
  }
  return null
}

// ============ Credit Handling ============

async function handleCredits(
  options: MiddlewareOptions,
  userId: string | null,
  locale: string,
  route: string,
  rateLimitHeaders?: Headers
): Promise<{
  error?: NextResponse
  creditInfo?: { remaining: number }
  refundCreditsOnError?: ApiContext['refundCreditsOnError']
}> {
  if (!options.credits) {
    return {}
  }

  // Credits require authentication
  if (!userId) {
    return {
      error: createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Authentication required for credit-based operations',
        locale,
        route,
        headers: rateLimitHeaders,
      }),
    }
  }

  const creditResult = await checkAndConsumeCredits(
    options.credits.type,
    options.credits.amount || 1
  )

  if (!creditResult.allowed) {
    const headerRecord = rateLimitHeaders
      ? Object.fromEntries(rateLimitHeaders.entries())
      : undefined
    return {
      error: NextResponse.json(
        {
          error: creditResult.error,
          code: creditResult.errorCode,
          remaining: creditResult.remaining,
          upgradeUrl: '/pricing',
        },
        {
          status: creditResult.errorCode === 'not_authenticated' ? 401 : 402,
          headers: headerRecord,
        }
      ),
    }
  }

  // Create refund function for error cases. We refund on whatever
  // counter the consume path *actually* debited (chargedAs) — not the
  // request type. They diverge when monthly compat/followUp caps fall
  // back to general reading credit; without this the refund would
  // credit a counter that was never charged.
  const refundType = creditResult.chargedAs ?? options.credits!.type
  // 한 요청에서 정확히 한 번만 환불한다. 핸들러가 자체 에러 경로에서 부르고
  // 그 뒤 throw 해 미들웨어 catch 가 다시 부르더라도(또는 그 반대) 이중 환불이
  // 되지 않도록 클로저 플래그로 잠근다. (refundCredits 는 멱등 가드가 없는 원함수)
  let refundIssued = false
  const refundCreditsOnError = async (errorMessage: string, metadata?: Record<string, unknown>) => {
    if (refundIssued) return
    refundIssued = true
    try {
      await refundCredits({
        userId: userId!,
        creditType: refundType,
        amount: options.credits!.amount || 1,
        reason: 'api_error',
        apiRoute: options.route,
        errorMessage,
        metadata,
      })
      logger.info('[Middleware] Credits refunded due to API error', {
        userId,
        route: options.route,
        creditType: refundType,
        amount: options.credits!.amount || 1,
      })
    } catch (error) {
      logger.error('[Middleware] Failed to refund credits', { error })
    }
  }

  return {
    creditInfo: { remaining: creditResult.remaining || 0 },
    refundCreditsOnError,
  }
}

// ============ Main Context Initialization ============

/**
 * Initialize common API context
 * Handles: CSRF, rate limiting, token validation, auth, credits
 */
export async function initializeApiContext(
  req: NextRequest,
  options: MiddlewareOptions = {}
): Promise<{ context: ApiContext; error?: NextResponse }> {
  const ip = getClientIp(req.headers) || 'unknown'
  const locale = extractLocale(req)
  const route = options.route || new URL(req.url).pathname

  // 1. CSRF validation
  const csrfError = validateCsrf(req, options, ip, locale, route)
  if (csrfError) {
    return { context: createEmptyContext(ip, locale), error: csrfError }
  }

  // 2. IP-based rate limiting (before auth)
  const ipRateLimit = await checkRateLimit(options, route, ip, locale)
  let rateLimitHeaders = ipRateLimit.headers
  if (ipRateLimit.error) {
    return { context: createEmptyContext(ip, locale), error: ipRateLimit.error }
  }

  // 3. Token validation
  const tokenError = validateToken(req, options, locale, route, rateLimitHeaders)
  if (tokenError) {
    return { context: createEmptyContext(ip, locale), error: tokenError }
  }

  // 4. Session fetch
  let session = null
  let userId: string | null = null
  let isPremium = false

  try {
    session = await getServerSession()
    userId = session?.user?.id || null
    isPremium = !!(session?.user?.plan && session.user.plan !== 'free')
  } catch {
    // Session fetch failed, continue without it
  }

  // 5. Auth requirement check (requireAdmin implies authentication)
  if ((options.requireAuth || options.requireAdmin) && !session?.user) {
    return {
      context: createEmptyContext(ip, locale),
      error: createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale,
        route,
        headers: rateLimitHeaders,
      }),
    }
  }

  // 5b. Admin requirement check — centralizes the auth+admin gate that every
  // /api/admin route used to repeat inline. A malformed session without a user
  // id is treated as unauthenticated (401); an authenticated non-admin is
  // forbidden (403).
  if (options.requireAdmin) {
    if (!userId) {
      return {
        context: createEmptyContext(ip, locale),
        error: createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          locale,
          route,
          headers: rateLimitHeaders,
        }),
      }
    }
    // Lazily import so admin.ts (and its prisma dependency) stays out of the
    // static module graph of every non-admin route that uses this middleware.
    const { isAdminUser } = await import('@/lib/auth/admin')
    const isAdmin = await isAdminUser(userId, session?.user?.email)
    if (!isAdmin) {
      logger.warn('[Middleware] admin check failed', { route, userId })
      return {
        context: {
          ip,
          locale,
          session,
          userId,
          isAuthenticated: true,
          isPremium,
          rateLimitHeaders,
        },
        error: createErrorResponse({
          code: ErrorCodes.FORBIDDEN,
          locale,
          route,
          headers: rateLimitHeaders,
        }),
      }
    }
  }

  // 6. User-based rate limiting (after auth)
  if (userId) {
    const userRateLimit = await checkRateLimit(options, route, ip, locale, userId, true)
    if (userRateLimit.headers) {
      rateLimitHeaders = userRateLimit.headers
    }
    if (userRateLimit.error) {
      return {
        context: {
          ip,
          locale,
          session,
          userId,
          isAuthenticated: true,
          isPremium,
          rateLimitHeaders,
        },
        error: userRateLimit.error,
      }
    }
  }

  // 7. Credit handling
  const {
    error: creditError,
    creditInfo,
    refundCreditsOnError,
  } = await handleCredits(options, userId, locale, route, rateLimitHeaders)

  if (creditError) {
    return {
      context: {
        ip,
        locale,
        session,
        userId,
        isAuthenticated: !!session?.user,
        isPremium,
        rateLimitHeaders,
      },
      error: creditError,
    }
  }

  // 8. Build final context
  return {
    context: {
      ip,
      locale,
      session,
      userId,
      isAuthenticated: !!session?.user,
      isPremium,
      creditInfo,
      refundCreditsOnError,
      rateLimitHeaders,
    },
  }
}
