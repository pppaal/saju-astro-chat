import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  apiSuccess,
  apiError,
  ErrorCodes,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { findUserByReferralCode } from '@/lib/referral'
import { referralValidateQuerySchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// GET: 추천 코드 유효성 확인
export const GET = withApiMiddleware<{
  valid: boolean
  error?: string
  referrerName?: string
}>(
  async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams
    const queryValidation = referralValidateQuerySchema.safeParse({
      code: searchParams.get('code') ?? undefined,
    })
    if (!queryValidation.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Missing or invalid referral code', {
        valid: false,
      })
    }
    const { code } = queryValidation.data

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
