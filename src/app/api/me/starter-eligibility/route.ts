import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { isStarterEligible, STARTER_PACK } from '@/lib/credits/starterPack'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET: 현재 사용자가 첫구매 한정 스타터팩을 살 수 있는지 + 팩 정보.
// 자격 없으면 eligible:false, pack:null — 모달은 일반 흐름(/pricing)으로 폴백.
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const eligible = await isStarterEligible(context.userId!)
      return apiSuccess({
        eligible,
        pack: eligible
          ? {
              id: STARTER_PACK.id,
              credits: STARTER_PACK.credits,
              krw: STARTER_PACK.pricing.krw,
              usd: STARTER_PACK.pricing.usd,
            }
          : null,
      })
    } catch (err) {
      logger.error('[starter-eligibility GET error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'eligibility_check_failed')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/starter-eligibility',
    limit: 30,
    windowSeconds: 60,
  })
)
