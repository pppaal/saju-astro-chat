import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { claimReferralReward } from '@/lib/referral'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

// POST: 첫 분석 완료 시 추천 보상 청구
// 이 API는 분석 완료 후 자동 호출됨
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`referral-claim:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const result = await claimReferralReward(session.user.id)

    if (!result.success) {
      // no_pending_reward는 에러가 아님 (이미 처리됐거나 추천 없음)
      if (result.error === 'no_pending_reward') {
        return NextResponse.json({ claimed: false, reason: 'no_pending_reward' })
      }
      return NextResponse.json({ error: result.error }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const res = NextResponse.json({
      claimed: true,
      creditsAwarded: result.creditsAwarded,
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    logger.error('[Referral claim error]', err)
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
