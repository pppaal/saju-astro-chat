/**
 * Admin Funnel Metrics API
 *
 * GET /api/admin/metrics/funnel - Get core funnel metrics
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
import { DashboardTimeRangeSchema, type DashboardTimeRange } from '@/lib/metrics/schema'

function getDateRange(timeRange: DashboardTimeRange): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (timeRange) {
    case '1h':
      start.setHours(start.getHours() - 1)
      break
    case '6h':
      start.setHours(start.getHours() - 6)
      break
    case '24h':
      start.setDate(start.getDate() - 1)
      break
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
  }

  return { start, end }
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        logger.warn('[Funnel] No session or userId', {
          hasSession: !!context.session,
          hasUserId: !!context.userId,
          hasEmail: !!context.session?.user?.email,
        })
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }

      const isAdmin = await isAdminUser(context.userId)
      if (!isAdmin) {
        logger.warn('[Funnel] Unauthorized access attempt', {
          email: context.session.user.email,
          userId: context.userId,
        })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const { searchParams } = new URL(req.url)
      const timeRangeParam = searchParams.get('timeRange') || '24h'

      const validationResult = DashboardTimeRangeSchema.safeParse(timeRangeParam)
      if (!validationResult.success) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid timeRange parameter')
      }

      const timeRange = validationResult.data
      const { start, end } = getDateRange(timeRange)

      // 이전 기간(추세 계산용): 선택 기간과 같은 길이의 직전 구간
      const windowMs = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - windowMs)
      const prevEnd = start

      // DAU/WAU 는 정의상 고정 윈도(최근 24h / 7d) — 선택한 timeRange 와 무관
      const now = Date.now()
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000)
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

      // 핵심 활동 테이블에서 윈도 내 활동한 distinct userId 집합을 구한다.
      // Reading 모델 제거 (2026-06-06) — 타로 + 상담챗 만으로 활성 판정.
      async function activeUserIds(since: Date): Promise<Set<string>> {
        const [t, c] = await Promise.all([
          prisma.tarotReading.groupBy({ by: ['userId'], where: { createdAt: { gte: since } } }),
          prisma.counselorChatSession.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: since } },
          }),
        ])
        const ids = new Set<string>()
        for (const row of [...t, ...c]) if (row.userId) ids.add(row.userId)
        return ids
      }

      // 전부 실측. 측정 불가능한 익명 '방문자' 지표는 제거했다.
      const results = await Promise.allSettled([
        prisma.user.count(), // [0] 누적 가입
        prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }), // [1] 기간 내 신규
        prisma.user.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }), // [2] 직전 기간 신규(추세)
        activeUserIds(new Date(0)), // [3] 한 번이라도 활동한 사용자(=활성화)
        activeUserIds(dayAgo), // [4] DAU
        activeUserIds(weekAgo), // [5] WAU
        prisma.tarotReading.count({ where: { createdAt: { gte: weekAgo } } }), // [6]
        prisma.counselorChatSession.count({ where: { createdAt: { gte: weekAgo } } }), // [7]
      ])

      const val = <T>(i: number, fallback: T): T =>
        results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : fallback

      const totalUsers = val(0, 0)
      const newUsers = val(1, 0)
      const prevNewUsers = val(2, 0)
      const activatedUsers = val<Set<string>>(3, new Set()).size
      const dau = val<Set<string>>(4, new Set()).size
      const wau = val<Set<string>>(5, new Set()).size
      const weeklyActions = val<number>(6, 0) + val<number>(7, 0)

      const failedCount = results.filter((r) => r.status === 'rejected').length
      if (failedCount > 0) {
        logger.warn(`[Admin Funnel] ${failedCount} queries failed, using fallback values`)
      }

      // 신규 가입 추세: 직전 동일 기간 대비 증감률 (실측)
      const registrationTrend =
        prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : newUsers > 0 ? 100 : 0

      const funnelData = {
        registrations: {
          total: totalUsers,
          daily: newUsers,
          trend: Math.round(registrationTrend * 10) / 10,
        },
        activations: {
          total: activatedUsers,
          rate: totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0,
        },
        engagement: {
          dailyActiveUsers: dau,
          weeklyActiveUsers: wau,
          readingsPerUser: wau > 0 ? Math.round((weeklyActions / wau) * 10) / 10 : 0,
        },
      }

      return apiSuccess({ data: funnelData, timeRange } as Record<string, unknown>)
    } catch (err) {
      logger.error('[Funnel API Error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/metrics/funnel',
    limit: 30,
    windowSeconds: 60,
  })
)
