import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/purchases
 *
 * Returns recent BonusCreditPurchase rows (one-time credit packs / referral /
 * promotion / gift grants). Capped to 30.
 *
 * NB: 프리미엄 개념 폐기 (2026-06-06) — Subscription 모델 제거. 옛 응답의
 * `subscription` 필드는 client UI 가 안 읽었음 (purchases 만 사용).
 *
 * Stripe 가 full billing history 의 source of truth. 본 엔드포인트는 우리가
 * 로컬에 저장하는 것만 — "남은 크레딧 + 어떻게 받았나" 표시용.
 */
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    try {
      const purchases = await prisma.bonusCreditPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          createdAt: true,
          amount: true,
          remaining: true,
          expiresAt: true,
          expired: true,
          source: true,
        },
      })

      return apiSuccess({ purchases })
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      const msg = (err as { message?: string } | null)?.message ?? ''
      const isMissingColumn = code === 'P2022' || /column .* does not exist/i.test(msg)
      if (isMissingColumn) {
        logger.warn('[me/purchases GET] missing column — migration not applied', { msg })
        return apiSuccess({ purchases: [] })
      }
      logger.error('[me/purchases GET]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/purchases',
    limit: 60,
    windowSeconds: 60,
  }),
)
