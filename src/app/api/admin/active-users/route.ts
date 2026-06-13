/**
 * Admin Active Users (today) API
 *
 * GET /api/admin/active-users
 *
 * 개요 페이지의 "오늘 활성 유저" 카드를 클릭했을 때, 그 유저들이 누구인지
 * 보여주기 위한 목록. 카드 숫자와 개수가 정확히 일치하도록 overview 의
 * activeToday 와 동일한 정의(오늘 자정 이후 타로·상담 중 하나라도 한 유저)를
 * 쓴다. 활동 횟수 많은 순 → 같으면 최근 활동 순으로 정렬한다.
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
      if (!(await isAdminUser(context.userId, context.session?.user?.email))) {
        logger.warn('[admin/active-users] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const where = { createdAt: { gte: startOfToday } }

      // overview 의 activeToday 와 동일 기준: 오늘 타로·상담 중 하나라도 한
      // distinct 유저. 두 소스의 활동 횟수와 마지막 활동시각을 유저별로 합친다.
      const [tarotG, counselorG] = await Promise.all([
        prisma.tarotReading.groupBy({
          by: ['userId'],
          where,
          _count: { id: true },
          _max: { createdAt: true },
        }),
        prisma.counselorChatSession.groupBy({
          by: ['userId'],
          where,
          _count: { id: true },
          _max: { createdAt: true },
        }),
      ])

      const agg = new Map<string, { count: number; last: Date | null }>()
      for (const g of [...tarotG, ...counselorG]) {
        const cur = agg.get(g.userId) ?? { count: 0, last: null }
        cur.count += g._count.id
        const last = g._max.createdAt
        if (last && (!cur.last || last > cur.last)) cur.last = last
        agg.set(g.userId, cur)
      }

      const userIds = Array.from(agg.keys())
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          })
        : []
      const userMap = new Map(users.map((u) => [u.id, u]))

      const list = userIds
        .map((id) => {
          const u = userMap.get(id)
          const a = agg.get(id)!
          return {
            id,
            email: u?.email ?? null,
            name: u?.name ?? null,
            readings: a.count,
            lastActiveAt: a.last ? a.last.toISOString() : null,
          }
        })
        .sort((a, b) => {
          if (b.readings !== a.readings) return b.readings - a.readings
          return (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '')
        })

      return apiSuccess({
        generatedAt: new Date().toISOString(),
        count: list.length,
        users: list,
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/active-users] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/active-users',
    limit: 30,
    windowSeconds: 60,
  })
)
