import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'
import { getUserReferralCode, getReferralUrl } from '@/lib/referral'
import { recordCounter } from '@/lib/metrics/index'

export const dynamic = 'force-dynamic'

// POST: 추천 코드 발급 (기존 코드 있으면 반환)
export const POST = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const code = await getUserReferralCode(context.userId!)
    const referralUrl = getReferralUrl(code)

    // 퍼널 — 추천 링크를 실제로 꺼내 든 시점(초대 의향). 코드 발급/조회 모두 포함.
    recordCounter('referral.code_issued', 1)

    return apiSuccess({
      code,
      referralUrl,
    })
  },
  createAuthenticatedGuard({ route: 'referral/create-code', limit: 20 })
)
