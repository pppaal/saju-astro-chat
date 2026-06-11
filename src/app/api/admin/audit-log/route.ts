/**
 * Admin Audit Log API
 *
 * GET /api/admin/audit-log?days=N
 *
 * 어드민 액션 기록(크레딧 지급/환불 등) 조회. 돈이 움직이는 액션의
 * 책임추적용이라 상세지표 개편 후에도 전용 페이지로 유지한다.
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
import { adminDaysQuerySchema, formatZodErrors } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/audit-log] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      // 잘못된 days 는 silent clamp 대신 422 — 오타를 기본값으로 흡수하면
      // 운영자가 의도와 다른 기간을 보고 있는 걸 알아챌 수 없다.
      const parsedQuery = adminDaysQuerySchema.safeParse(
        Object.fromEntries(new URL(req.url).searchParams)
      )
      if (!parsedQuery.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'days must be an integer between 1 and 365',
          formatZodErrors(parsedQuery.error)
        )
      }
      const { days } = parsedQuery.data
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const [recentLogs, actionBreakdown, totalLogs] = await Promise.all([
        prisma.adminAuditLog.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        prisma.adminAuditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        prisma.adminAuditLog.count({ where: { createdAt: { gte: since } } }),
      ])

      return apiSuccess({
        rangeDays: days,
        totalLogs,
        actionBreakdown: actionBreakdown
          .map((a) => ({ action: a.action, count: a._count.id }))
          .sort((x, y) => y.count - x.count),
        recentLogs: recentLogs.map((l) => ({
          id: l.id,
          createdAt: l.createdAt.toISOString(),
          adminEmail: l.adminEmail,
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId,
          metadata: l.metadata,
          success: l.success,
          errorMessage: l.errorMessage,
        })),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/audit-log] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/audit-log',
    limit: 30,
    windowSeconds: 60,
  })
)
