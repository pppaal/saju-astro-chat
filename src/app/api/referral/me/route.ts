import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'
import { getReferralStats, getReferralUrl } from '@/lib/referral'

export const dynamic = 'force-dynamic'

// GET: 내 추천 현황 조회
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const stats = await getReferralStats(context.userId!)
    const referralUrl = getReferralUrl(stats.referralCode)

    return apiSuccess({
      ...stats,
      referralUrl,
    })
  },
  createAuthenticatedGuard({ route: 'referral/me', limit: 30 })
)
