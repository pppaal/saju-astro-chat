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

async function checkRateLimit(
  options: MiddlewareOptions,
  route: string,
  ip: string,
  locale: string,
  userId?: string | null
): Promise<NextResponse | null> {
  if (!options.rateLimit) return null

  const { limit, windowSeconds, keyPrefix = 'api' } = options.rateLimit

  // IP-based rate limiting
  const rateLimitKey = `${keyPrefix}:${route}:${ip}`
  const result = await rateLimit(rateLimitKey, { limit, windowSeconds })

  if (!result.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale,
      route,
      headers: {
        'Retry-After': String(result.retryAfter || windowSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
      },
    })
  }

  // User-based rate limiting (if authenticated)
  if (userId) {
    const userRateLimitKey = `${keyPrefix}:${route}:user:${userId}`
    const userResult = await rateLimit(userRateLimitKey, {
      limit,
      windowSeconds,
    })

    if (!userResult.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale,
        route,
        headers: {
          'Retry-After': String(userResult.retryAfter || windowSeconds),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        },
      })
    }
  }

  return null
}

// ============ Token Validation ============

function validateToken(
  req: NextRequest,
  options: MiddlewareOptions,
  locale: string,
  route: string
): NextResponse | null {
  if (!options.requireToken) return null

  const tokenResult = requirePublicToken(req)
  if (!tokenResult.valid) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      message: tokenResult.reason || 'Invalid or missing token',
      locale,
      route,
    })
  }
  return null
}

// ============ Credit Handling ============

async function handleCredits(
  options: MiddlewareOptions,
  userId: string | null,
  locale: string,
  route: string
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
      }),
    }
  }

  const creditResult = await checkAndConsumeCredits(
    options.credits.type,
    options.credits.amount || 1
  )

  if (!creditResult.allowed) {
    return {
      error: NextResponse.json(
        {
          error: creditResult.error,
          code: creditResult.errorCode,
          remaining: creditResult.remaining,
          upgradeUrl: '/pricing',
        },
        { status: creditResult.errorCode === 'not_authenticated' ? 401 : 402 }
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
  const ipRateLimitError = await checkRateLimit(options, route, ip, locale)
  if (ipRateLimitError) {
    return { context: createEmptyContext(ip, locale), error: ipRateLimitError }
  }

  // 3. Token validation
  const tokenError = validateToken(req, options, locale, route)
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
      }),
    }
  }

  // 6. User-based rate limiting (after auth)
  if (userId) {
    const userRateLimitError = await checkRateLimit(options, route, ip, locale, userId)
    if (userRateLimitError) {
      return {
        context: {
          ip,
          locale,
          session,
          userId,
          isAuthenticated: true,
          isPremium,
        },
        error: userRateLimitError,
      }
    }
  }

  // 7. Credit handling
  const {
    error: creditError,
    creditInfo,
    refundCreditsOnError,
  } = await handleCredits(options, userId, locale, route)

  if (creditError) {
    return {
      context: {
        ip,
        locale,
        session,
        userId,
        isAuthenticated: !!session?.user,
        isPremium,
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
    },
  }
}
