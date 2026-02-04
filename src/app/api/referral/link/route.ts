import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { linkReferrer } from '@/lib/referral'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { referralClaimRequestSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// POST: OAuth 로그인 후 추천 코드 연결
export const POST = withApiMiddleware<Record<string, unknown>>(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = referralClaimRequestSchema.safeParse({ code: rawBody.referralCode })
    if (!validationResult.success) {
      logger.warn('[Referral link] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { code: referralCode } = validationResult.data

    try {
      // 이미 추천인이 연결되어 있는지 확인
      const user = await prisma.user.findUnique({
        where: { id: context.userId! },
        select: { referrerId: true, createdAt: true },
      })

      if (user?.referrerId) {
        return apiSuccess({ linked: false, reason: 'already_linked' } as Record<string, unknown>)
      }

      // 가입 후 24시간 이내에만 추천 코드 연결 가능
      const hoursSinceCreation = user?.createdAt
        ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60)
        : 0

      if (hoursSinceCreation > 24) {
        return apiSuccess({ linked: false, reason: 'too_late' } as Record<string, unknown>)
      }

      const result = await linkReferrer(context.userId!, referralCode)

      if (!result.success) {
        return apiSuccess({ linked: false, reason: result.error } as Record<string, unknown>)
      }

      return apiSuccess({ linked: true, referrerId: result.referrerId } as Record<string, unknown>)
    } catch (err) {
      logger.error('[Referral link error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/referral/link',
    limit: 30,
    windowSeconds: 60,
  })
)
