import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'
import { getUserReferralCode, getReferralUrl } from '@/lib/referral'

export const dynamic = 'force-dynamic'

// POST: 추천 코드 발급 (기존 코드 있으면 반환)
export const POST = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const code = await getUserReferralCode(context.userId!)
    const referralUrl = getReferralUrl(code)

    return apiSuccess({
      code,
      referralUrl,
    })
  },
  createAuthenticatedGuard({ route: 'referral/create-code', limit: 20 })
)
