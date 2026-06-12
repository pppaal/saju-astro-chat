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

// PageView 테이블 self-heal — 빌드타임 schema-verify 가 DB 접속 실패로
// 테이블을 못 만든(phantom-apply) 경우, 라이브 앱 커넥션(=정상 동작 중인
// pooler)으로 직접 생성한다. 전부 IF NOT EXISTS 라 멱등. 성공 시 true.
const PAGEVIEW_DDL = [
  `CREATE TABLE IF NOT EXISTS "PageView" (
     "id" TEXT NOT NULL,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "visitorId" TEXT NOT NULL,
     "path" TEXT NOT NULL,
     "referrerHost" TEXT,
     "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
     "userId" TEXT,
     "country" TEXT,
     "device" TEXT,
     CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "PageView_isLoggedIn_createdAt_idx" ON "PageView"("isLoggedIn", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt")`,
]

async function ensurePageViewTable(): Promise<boolean> {
  try {
    for (const stmt of PAGEVIEW_DDL) {
      await prisma.$executeRawUnsafe(stmt)
    }
    return true
  } catch (err) {
    logger.error('[admin/visitors] PageView self-heal failed', { err })
    return false
  }
}

const emptyResult = (days: number, notReady: boolean): Record<string, unknown> => ({
  rangeDays: days,
  notReady,
  summary: { pageviews: 0, visits: 0, loggedInVisits: 0, anonymousVisits: 0, loginShare: 0 },
  daily: [],
  topPaths: [],
  topReferrers: [],
  devices: [],
})

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

      let totalsRows: Array<Record<string, unknown>>
      let dailyRows: Array<Record<string, unknown>>
      let pathRows: Array<Record<string, unknown>>
      let referrerRows: Array<Record<string, unknown>>
      let deviceRows: Array<Record<string, unknown>>
      try {
        ;[totalsRows, dailyRows, pathRows, referrerRows, deviceRows] = await Promise.all([
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
      } catch (err) {
        // 배포 직후 / phantom-apply 로 PageView 테이블이 아직 없을 수 있다.
        // 그땐 ISE 대신 빈 데이터(notReady)로 응답해 탭이 안전하게 뜨게 한다.
        const code = (err as { code?: string })?.code
        const msg = err instanceof Error ? err.message : String(err)
        const tableMissing =
          code === 'P2021' ||
          code === '42P01' ||
          /relation .* does not exist|does not exist/i.test(msg)
        if (!tableMissing) throw err
        // build-time schema-verify 가 못 만든 경우, 라이브 앱이 직접 생성 시도.
        const healed = await ensurePageViewTable()
        logger.warn(
          `[admin/visitors] PageView table missing — self-heal ${healed ? 'created table' : 'failed'}`
        )
        // 생성 성공: 방금 만든 빈 테이블 → notReady=false 로 정상 빈 상태 표시.
        // 실패: notReady=true 로 '준비 중' 안내 유지.
        return apiSuccess(emptyResult(days, !healed))
      }

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
