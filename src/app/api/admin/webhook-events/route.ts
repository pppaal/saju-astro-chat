/**
 * Admin Webhook / Payment-event Monitor API
 *
 * GET /api/admin/webhook-events?days=N
 *
 * Stripe 웹훅 처리 로그(StripeEventLog)를 모니터링한다. 결제 실패·웹훅 에러를
 * 한눈에 보기 위함. 성공률, 타입별 집계, 최근 실패 목록을 반환한다.
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
import { adminWebhookEventsQuerySchema, formatZodErrors } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId, context.session?.user?.email))) {
        logger.warn('[admin/webhook-events] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      // 잘못된 days 는 silent clamp 대신 422 — 오타를 기본값으로 흡수하면
      // 운영자가 의도와 다른 기간을 보고 있는 걸 알아챌 수 없다.
      const parsedQuery = adminWebhookEventsQuerySchema.safeParse(
        Object.fromEntries(new URL(req.url).searchParams)
      )
      if (!parsedQuery.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'days must be an integer between 1 and 90',
          formatZodErrors(parsedQuery.error)
        )
      }
      const { days } = parsedQuery.data
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const [total, failed, byTypeRaw, recentFailures] = await Promise.all([
        prisma.stripeEventLog.count({ where: { processedAt: { gte: since } } }),
        prisma.stripeEventLog.count({ where: { processedAt: { gte: since }, success: false } }),
        prisma.stripeEventLog.groupBy({
          by: ['type', 'success'],
          where: { processedAt: { gte: since } },
          _count: { id: true },
        }),
        prisma.stripeEventLog.findMany({
          where: { processedAt: { gte: since }, success: false },
          orderBy: { processedAt: 'desc' },
          take: 50,
          select: { id: true, eventId: true, type: true, processedAt: true, errorMsg: true },
        }),
      ])

      // 타입별 total/failed 집계
      const typeMap = new Map<string, { total: number; failed: number }>()
      for (const row of byTypeRaw) {
        const cur = typeMap.get(row.type) || { total: 0, failed: 0 }
        cur.total += row._count.id
        if (!row.success) cur.failed += row._count.id
        typeMap.set(row.type, cur)
      }

      return apiSuccess({
        rangeDays: days,
        total,
        failed,
        successRate: total > 0 ? Math.round(((total - failed) / total) * 1000) / 10 : 100,
        byType: Array.from(typeMap.entries())
          .map(([type, v]) => ({ type, total: v.total, failed: v.failed }))
          .sort((a, b) => b.failed - a.failed || b.total - a.total),
        recentFailures: recentFailures.map((e) => ({
          id: e.id,
          eventId: e.eventId,
          type: e.type,
          processedAt: e.processedAt.toISOString(),
          errorMsg: e.errorMsg,
        })),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/webhook-events] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({ route: '/api/admin/webhook-events', limit: 30, windowSeconds: 60 })
)
