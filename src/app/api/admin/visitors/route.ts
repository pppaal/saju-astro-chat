/**
 * Admin Visitors API
 *
 * GET /api/admin/visitors?days=N
 *
 * 비로그인 방문자까지 포함한 트래픽 집계. PageView(일별 회전 익명 해시)에서
 * 일별 순방문자·페이지뷰·로그인 비율, 인기 경로/유입 출처/디바이스 분포를
 * 반환한다. "방문" 단위는 일(日) 기준(같은 사람도 다른 날이면 다른 해시).
 */

import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
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

const num = (v: unknown): number => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0))

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/visitors] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const daysRaw = parseInt(new URL(req.url).searchParams.get('days') || '30', 10)
      const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? daysRaw : 30
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const [totalsRows, dailyRows, pathRows, referrerRows, deviceRows] = await Promise.all([
        prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            COUNT(*) AS pageviews,
            COUNT(DISTINCT "visitorId") AS visits,
            COUNT(DISTINCT "visitorId") FILTER (WHERE "isLoggedIn") AS logged_in_visits
          FROM "PageView" WHERE "createdAt" >= ${since}
        `),
        prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT "visitorId") AS visits,
            COUNT(DISTINCT "visitorId") FILTER (WHERE "isLoggedIn") AS logged_in_visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
        prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT "path", COUNT(*) AS pageviews, COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY "path" ORDER BY pageviews DESC LIMIT 15
        `),
        prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT "referrerHost" AS host, COUNT(*) AS pageviews, COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since} AND "referrerHost" IS NOT NULL
          GROUP BY "referrerHost" ORDER BY visits DESC LIMIT 10
        `),
        prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT COALESCE("device", 'unknown') AS device, COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY visits DESC
        `),
      ])

      const t = totalsRows[0] || {}
      const visits = num(t.visits)
      const loggedInVisits = num(t.logged_in_visits)
      const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 1000) / 10 : 0)

      return apiSuccess({
        rangeDays: days,
        summary: {
          pageviews: num(t.pageviews),
          visits, // 일 기준 순방문(visit-days)
          loggedInVisits,
          anonymousVisits: Math.max(0, visits - loggedInVisits),
          loginShare: pct(loggedInVisits, visits), // 방문 중 로그인 비율(%)
        },
        daily: dailyRows.map((r) => ({
          day: String(r.day),
          pageviews: num(r.pageviews),
          visits: num(r.visits),
          loggedInVisits: num(r.logged_in_visits),
          anonymousVisits: Math.max(0, num(r.visits) - num(r.logged_in_visits)),
        })),
        topPaths: pathRows.map((r) => ({
          path: String(r.path),
          pageviews: num(r.pageviews),
          visits: num(r.visits),
        })),
        topReferrers: referrerRows.map((r) => ({
          host: String(r.host),
          pageviews: num(r.pageviews),
          visits: num(r.visits),
        })),
        devices: deviceRows.map((r) => ({ device: String(r.device), visits: num(r.visits) })),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/visitors] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({ route: '/api/admin/visitors', limit: 30, windowSeconds: 60 })
)
