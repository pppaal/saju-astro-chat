import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { getCreditBalance, canUseCredits } from '@/lib/credits/creditService'
import { logger } from '@/lib/logger'
import { creditCheckRequestSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

type CreditType = 'reading' | 'compatibility' | 'followUp'

// GET: 현재 크레딧 상태 조회
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const balance = await getCreditBalance(context.userId!)

      return apiSuccess({
        isLoggedIn: true,
        plan: balance.plan,
        credits: {
          monthly: balance.monthlyCredits,
          used: balance.usedCredits,
          bonus: balance.bonusCredits,
          remaining: balance.remainingCredits,
          total: balance.totalCredits,
        },
        compatibility: balance.compatibility,
        followUp: balance.followUp,
        historyRetention: balance.historyRetention,
        periodEnd: balance.periodEnd,
      })
    } catch (err) {
      logger.error('[Credits GET error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/credits',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: 크레딧 사용 가능 여부 확인 (pre-check)
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return apiError(ErrorCodes.BAD_REQUEST, 'invalid_body')
    }

    const validationResult = creditCheckRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Credits check] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { type = 'reading', amount = 1, feature } = validationResult.data

    try {
      // 기능 게이트 폐지 — 크레딧만 있으면 모든 기능 사용 가능.
      if (feature) {
        return apiSuccess({ feature, allowed: true } as Record<string, unknown>)
      }

      // 크레딧 체크
      const result = await canUseCredits(context.userId!, type as CreditType, amount)
      return apiSuccess(result as Record<string, unknown>)
    } catch (err) {
      logger.error('[Credits POST error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/credits',
    limit: 60,
    windowSeconds: 60,
  })
)
