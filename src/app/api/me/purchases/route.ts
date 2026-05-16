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
