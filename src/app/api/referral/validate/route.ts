import { NextResponse } from 'next/server'
import { findUserByReferralCode } from '@/lib/referral'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

// GET: 추천 코드 유효성 확인
export async function GET(request: Request) {
  try {
    // Rate limiting to prevent code enumeration attacks
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`referral-validate:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { valid: false, error: 'too_many_requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'missing_code' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const referrer = await findUserByReferralCode(code)

    if (!referrer) {
      return NextResponse.json({ valid: false, error: 'invalid_code' })
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.name || 'Friend',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    logger.error('[Referral validate error]', err)
    return NextResponse.json({ valid: false, error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
