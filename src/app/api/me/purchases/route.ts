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
 * Returns the user's purchase signals:
 *  - `subscription`: latest Subscription row (or null for free users) with
 *    just the fields the profile page needs — no Stripe IDs leaked.
 *  - `purchases`: recent BonusCreditPurchase rows (one-time credit packs,
 *    referral / promotion / gift grants). Capped to 30.
 *
 * NB: there is no canonical payment/invoice table — Stripe is the source
 * of truth for full billing history. This endpoint surfaces what we do
 * persist locally so the user can see "what credits I have left and
 * how they got here".
 */
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    try {
      const [subscription, purchases] = await Promise.all([
        prisma.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            plan: true,
            billingCycle: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            canceledAt: true,
            paymentMethod: true,
            createdAt: true,
          },
        }),
        prisma.bonusCreditPurchase.findMany({
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
        }),
      ])

      return apiSuccess({
        subscription,
        purchases,
      })
    } catch (err) {
      // 마이그레이션이 prod 에 아직 안 적용된 신규 컬럼(acknowledgedAt 등)
      // 때문에 P2022 가 떨어지면 사용자한테 500 띄우기보단 빈 구매 내역으로
      // graceful degrade — 페이지 진입은 막지 않는다.
      const code = (err as { code?: string } | null)?.code
      const msg = (err as { message?: string } | null)?.message ?? ''
      const isMissingColumn = code === 'P2022' || /column .* does not exist/i.test(msg)
      if (isMissingColumn) {
        logger.warn('[me/purchases GET] missing column — migration not applied', { msg })
        return apiSuccess({ subscription: null, purchases: [] })
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
