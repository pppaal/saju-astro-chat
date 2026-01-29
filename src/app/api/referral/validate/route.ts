import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  apiSuccess,
  apiError,
  ErrorCodes,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { findUserByReferralCode } from '@/lib/referral'

export const dynamic = 'force-dynamic'

// GET: 추천 코드 유효성 확인
export const GET = withApiMiddleware<{
  valid: boolean
  error?: string
  referrerName?: string
}>(
  async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Missing referral code', { valid: false })
    }

    const referrer = await findUserByReferralCode(code)

    if (!referrer) {
      return apiSuccess({
        valid: false,
        error: 'invalid_code',
      })
    }

    return apiSuccess({
      valid: true,
      referrerName: referrer.name || 'Friend',
    })
  },
  {
    route: 'referral/validate',
    rateLimit: {
      limit: 20,
      windowSeconds: 60,
    },
    // No auth required - public endpoint
    // Rate limit to prevent code enumeration attacks
  } as MiddlewareOptions
)
