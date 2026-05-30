/**
 * Admin Overview API
 *
 * GET /api/admin/overview
 *
 * /admin 개요 페이지 전용 경량 집계. 기존 /api/admin/metrics 는 in-memory
 * 요청 지표(요청수/에러/레이턴시)라 회원수·결제 같은 DB 카운트가 없다.
 * comprehensive 는 섹션별 무거운 쿼리라 개요엔 과하다. 그래서 개요에 필요한
 * 숫자만 직접 prisma 로 집계해 한 번에 돌려준다.
 */

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
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/overview] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        usersTotal,
        usersToday,
        users7d,
        users30d,
        readingsTotal,
        readingsToday,
        activeToday,
        bonusOutstanding,
        purchaseCount,
        purchasesToday,
        purchases30d,
        payingUsers,
        recentSignups,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.user.count({ where: { createdAt: { gte: last7d } } }),
        prisma.user.count({ where: { createdAt: { gte: last30d } } }),
        prisma.reading.count(),
        prisma.reading.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.reading
          .groupBy({ by: ['userId'], where: { createdAt: { gte: startOfToday } } })
          .then((rows) => rows.length),
        // 만료 전 잔여 보너스 크레딧 합계 (실제 미사용 부채).
        prisma.bonusCreditPurchase
          .aggregate({
            where: { expired: false, expiresAt: { gt: now }, remaining: { gt: 0 } },
            _sum: { remaining: true },
          })
          .then((r) => r._sum.remaining ?? 0),
        // 실결제(크레딧팩 구매)만 — source='purchase'.
        prisma.bonusCreditPurchase.count({ where: { source: 'purchase' } }),
        prisma.bonusCreditPurchase.count({
          where: { source: 'purchase', createdAt: { gte: startOfToday } },
        }),
        prisma.bonusCreditPurchase.count({
          where: { source: 'purchase', createdAt: { gte: last30d } },
        }),
        prisma.bonusCreditPurchase
          .groupBy({ by: ['userId'], where: { source: 'purchase' } })
          .then((rows) => rows.length),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, email: true, name: true, createdAt: true },
        }),
      ])

      return apiSuccess({
        generatedAt: now.toISOString(),
        users: {
          total: usersTotal,
          today: usersToday,
          last7d: users7d,
          last30d: users30d,
          activeToday,
          paying: payingUsers,
        },
        readings: {
          total: readingsTotal,
          today: readingsToday,
        },
        credits: {
          outstanding: bonusOutstanding,
        },
        purchases: {
          total: purchaseCount,
          today: purchasesToday,
          last30d: purchases30d,
        },
        recentSignups: recentSignups.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt.toISOString(),
        })),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/overview] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/overview',
    limit: 30,
    windowSeconds: 60,
  })
)
