/**
 * API Context Initialization
 * Handles: CSRF, rate limiting, auth, credits
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
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
  const acceptLang = req.headers.get('accept-language') || ''
  const urlLocale = new URL(req.url).searchParams.get('locale')

  if (urlLocale === 'ko' || acceptLang.includes('ko')) {
    return 'ko'
  }
  if (urlLocale === 'ja' || acceptLang.includes('ja')) {
    return 'ja'
  }
  if (urlLocale === 'zh' || acceptLang.includes('zh')) {
    return 'zh'
  }
  return 'en'
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

  const { limit, windowSeconds, keyPrefix = 'api' } = options.rateLimit
  let headers: Headers | undefined

  if (!skipIpCheck) {
    // IP-based rate limiting
    const rateLimitKey = `${keyPrefix}:${route}:${ip}`
    const result = await rateLimit(rateLimitKey, { limit, windowSeconds })
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

  // Create refund function for error cases
  const refundCreditsOnError = async (errorMessage: string, metadata?: Record<string, unknown>) => {
    try {
      await refundCredits({
        userId: userId!,
        creditType: options.credits!.type,
        amount: options.credits!.amount || 1,
        reason: 'api_error',
        apiRoute: options.route,
        errorMessage,
        metadata,
      })
      logger.info('[Middleware] Credits refunded due to API error', {
        userId,
        route: options.route,
        creditType: options.credits!.type,
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
    session = await getServerSession(authOptions)
    userId = session?.user?.id || null
    isPremium = !!(session?.user?.plan && session.user.plan !== 'free')
  } catch {
    // Session fetch failed, continue without it
  }

  // 5. Auth requirement check
  if (options.requireAuth && !session?.user) {
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
