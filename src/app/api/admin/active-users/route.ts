/**
 * Admin Active Users (today) API
 *
 * GET /api/admin/active-users
 *
 * 개요 페이지의 "오늘 활성 유저" 카드(= 오늘 리딩한 유저)를 클릭했을 때,
 * 그 유저들이 누구인지 보여주기 위한 목록. 카드 숫자와 개수가 정확히
 * 일치하도록 overview 와 동일한 정의(오늘 자정 이후 reading 을 만든 유저)를
 * 쓴다. 리딩 횟수 많은 순 → 같으면 최근 활동 순으로 정렬한다.
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
        logger.warn('[admin/active-users] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      // overview 의 activeToday 와 동일 기준: 오늘 reading 을 만든 distinct 유저.
      const grouped = await prisma.reading.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startOfToday } },
        _count: { id: true },
        _max: { createdAt: true },
      })

      const userIds = grouped.map((g) => g.userId)
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          })
        : []
      const userMap = new Map(users.map((u) => [u.id, u]))

      const list = grouped
        .map((g) => {
          const u = userMap.get(g.userId)
          return {
            id: g.userId,
            email: u?.email ?? null,
            name: u?.name ?? null,
            readings: g._count.id,
            lastActiveAt: g._max.createdAt ? g._max.createdAt.toISOString() : null,
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
