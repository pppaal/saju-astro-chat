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
import { resolveCheckoutCurrency } from '@/lib/payments/prices'
import { packAmount } from '@/lib/config/pricing'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET: 현재 사용자가 첫구매 한정 스타터팩을 살 수 있는지 + 팩 정보.
// 자격 없으면 eligible:false, pack:null — 모달은 일반 흐름(/pricing)으로 폴백.
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const eligible = await isStarterEligible(context.userId!)
      // 통화·금액을 **서버가 확정해서** 내려준다. 예전엔 krw/usd 를 둘 다 내리고
      // 모달이 `locale === 'en' ? usd : krw` 로 골라서, USD Price 가 없는데도
      // $1.99 를 보여주고 ₩2,900 을 청구할 수 있었다. /api/checkout 과 같은
      // resolveCheckoutCurrency 를 써서 표시 == 청구를 보장한다.
      const currency = resolveCheckoutCurrency(context.locale)
      return apiSuccess({
        eligible,
        pack: eligible
          ? {
              id: STARTER_PACK.id,
              credits: STARTER_PACK.credits,
              currency,
              amount: packAmount(STARTER_PACK.id, currency),
              // 레거시 클라이언트 호환 — 신규 코드는 currency/amount 를 쓴다.
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
