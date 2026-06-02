/**
 * Admin User Detail (drill-down) API
 *
 * GET /api/admin/users/[id]
 *
 * 검색 결과에서 유저 한 명을 클릭했을 때 보여줄 종합 상세:
 * 프로필 · 크레딧(플랜/월간/보너스) · 결제 이력 · 활동(리딩/타로/상담) 요약.
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  apiSuccess,
  apiError,
  ErrorCodes,
  createAuthenticatedGuard,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, routeContext: RouteContext) {
  const { id } = await routeContext.params

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        if (!context.userId || !context.session?.user?.email) {
          return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
        }
        if (!(await isAdminUser(context.userId))) {
          logger.warn('[admin/users/:id] unauthorized', { userId: context.userId })
          return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
        }
        if (!id) {
          return apiError(ErrorCodes.VALIDATION_ERROR, 'id is required')
        }

        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            image: true,
            createdAt: true,
            passwordHash: true,
            accounts: { select: { provider: true } },
          },
        })
        if (!user) {
          return apiError(ErrorCodes.NOT_FOUND, 'user_not_found')
        }

        const [credits, purchases, recentPurchases, readings, tarot, counselor, lastReading] =
          await Promise.all([
            prisma.userCredits.findUnique({ where: { userId: id } }),
            prisma.bonusCreditPurchase.count({ where: { userId: id, source: 'purchase' } }),
            prisma.bonusCreditPurchase.findMany({
              where: { userId: id },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                amount: true,
                remaining: true,
                source: true,
                expired: true,
                createdAt: true,
                stripePaymentId: true,
              },
            }),
            prisma.reading.count({ where: { userId: id } }),
            prisma.tarotReading.count({ where: { userId: id } }),
            prisma.counselorChatSession.count({ where: { userId: id } }),
            prisma.reading.findFirst({
              where: { userId: id },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
          ])

        return apiSuccess({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            createdAt: user.createdAt.toISOString(),
            hasPassword: !!user.passwordHash,
            providers: user.accounts.map((a) => a.provider),
          },
          credits: credits
            ? {
                plan: credits.plan,
                monthlyCredits: credits.monthlyCredits,
                usedCredits: credits.usedCredits,
                monthlyRemaining: Math.max(0, credits.monthlyCredits - credits.usedCredits),
                bonusCredits: credits.bonusCredits,
                totalBonusReceived: credits.totalBonusReceived,
              }
            : null,
          activity: {
            readings,
            tarot,
            counselor,
            total: readings + tarot + counselor,
            lastReadingAt: lastReading?.createdAt ? lastReading.createdAt.toISOString() : null,
          },
          purchases: {
            paidCount: purchases,
            recent: recentPurchases.map((p) => ({
              amount: p.amount,
              remaining: p.remaining,
              source: p.source,
              expired: p.expired,
              createdAt: p.createdAt.toISOString(),
              stripePaymentId: p.stripePaymentId,
            })),
          },
        } as Record<string, unknown>)
      } catch (err) {
        logger.error('[admin/users/:id] error', err)
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/admin/users/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request)
}
