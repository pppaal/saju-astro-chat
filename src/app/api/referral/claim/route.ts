import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { claimReferralReward } from '@/lib/referral'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// POST: 첫 분석 완료 시 추천 보상 청구
export const POST = withApiMiddleware<Record<string, unknown>>(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const result = await claimReferralReward(context.userId!)

      if (!result.success) {
        if (result.error === 'no_pending_reward') {
          return apiSuccess({ claimed: false, reason: 'no_pending_reward' } as Record<
            string,
            unknown
          >)
        }
        return apiError(ErrorCodes.BAD_REQUEST, result.error || 'Claim failed')
      }

      return apiSuccess({
        claimed: true,
        creditsAwarded: result.creditsAwarded,
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[Referral claim error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/referral/claim',
    limit: 20,
    windowSeconds: 60,
  })
)
