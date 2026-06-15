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
import { z } from 'zod'
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
import { runWithConcurrency } from '@/lib/utils/concurrency'

export const dynamic = 'force-dynamic'

// days 쿼리 — 'all'(전체 기간) 또는 1~365 정수(기본 30). 이 라우트는 기존부터
// 잘못된 값을 조용히 기본(30)으로 흡수해 왔으므로(다른 어드민 라우트의 422
// 정책과 달리) 동작을 그대로 유지하려고 .catch() 로 폴백한다 — 검증 신호만 추가.
const visitorsDaysQuerySchema = z
  .object({
    days: z
      .union([z.literal('all'), z.coerce.number().int().min(1).max(365)])
      .catch(30)
      .default(30),
  })
  .catch({ days: 30 })

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

const emptyResult = (days: number | 'all', notReady: boolean): Record<string, unknown> => ({
  rangeDays: days,
  notReady,
  today: { visits: 0, pageviews: 0, loggedInVisits: 0, anonymousVisits: 0, yesterdayVisits: 0 },
  realtime: { active: 0, pageviews: 0 },
  conversion: { visits: 0, signups: 0, rate: 0 },
  hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, visits: 0, pageviews: 0 })),
  countries: [],
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
      if (!(await isAdminUser(context.userId, context.session?.user?.email))) {
        logger.warn('[admin/visitors] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      // days=all → 전체 기간. 그 외엔 1~365 숫자(기본 30).
      const { days: parsedDays } = visitorsDaysQuerySchema.parse(
        Object.fromEntries(new URL(req.url).searchParams)
      )
      const allTime = parsedDays === 'all'
      const daysNum = allTime ? 30 : parsedDays
      const rangeDays: number | 'all' = allTime ? 'all' : daysNum
      const since = allTime ? new Date(0) : new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000)

      // 'today/yesterday' 는 운영자 기준 KST(UTC+9) 자정부터. (해시는 UTC 자정에
      // 회전하므로 KST 경계 = 09:00 UTC 에서 동일인이 두 방문으로 셀 수 있으나
      // 미미해 무시.)
      const KST = 9 * 60 * 60 * 1000
      const kstNow = Date.now() + KST
      const todayStart = new Date(Math.floor(kstNow / 86400000) * 86400000 - KST)
      const yesterdayStart = new Date(todayStart.getTime() - 86400000)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

      let totalsRows: Array<Record<string, unknown>>
      let dailyRows: Array<Record<string, unknown>>
      let pathRows: Array<Record<string, unknown>>
      let referrerRows: Array<Record<string, unknown>>
      let deviceRows: Array<Record<string, unknown>>
      let todayRows: Array<Record<string, unknown>>
      let hourlyRows: Array<Record<string, unknown>>
      let countryRows: Array<Record<string, unknown>>
      let activeRows: Array<Record<string, unknown>>
      try {
        ;[
          totalsRows,
          dailyRows,
          pathRows,
          referrerRows,
          deviceRows,
          todayRows,
          hourlyRows,
          countryRows,
          activeRows,
          // 한 요청에서 9개 집계를 전부 동시에 던지면 그만큼 커넥션을 한꺼번에
          // 빌려 풀을 압박한다(ECHECKOUTTIMEOUT 원인). 동시 실행을 4개로 제한.
        ] = await runWithConcurrency(
          [
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            COUNT(*) AS pageviews,
            COUNT(DISTINCT "visitorId") AS visits,
            COUNT(DISTINCT "visitorId") FILTER (WHERE "isLoggedIn") AS logged_in_visits
          FROM "PageView" WHERE "createdAt" >= ${since}
        `),
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT "visitorId") AS visits,
            COUNT(DISTINCT "visitorId") FILTER (WHERE "isLoggedIn") AS logged_in_visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT "path", COUNT(*) AS pageviews, COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY "path" ORDER BY pageviews DESC LIMIT 15
        `),
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT "referrerHost" AS host, COUNT(*) AS pageviews, COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since} AND "referrerHost" IS NOT NULL
          GROUP BY "referrerHost" ORDER BY visits DESC LIMIT 10
        `),
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT COALESCE("device", 'unknown') AS device, COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY visits DESC
        `),
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            COUNT(DISTINCT "visitorId") FILTER (WHERE "createdAt" >= ${todayStart}) AS today_visits,
            COUNT(*) FILTER (WHERE "createdAt" >= ${todayStart}) AS today_pageviews,
            COUNT(DISTINCT "visitorId") FILTER (WHERE "createdAt" >= ${todayStart} AND "isLoggedIn") AS today_logged_in,
            COUNT(DISTINCT "visitorId") FILTER (WHERE "createdAt" >= ${yesterdayStart} AND "createdAt" < ${todayStart}) AS yesterday_visits
          FROM "PageView" WHERE "createdAt" >= ${yesterdayStart}
        `),
            // 시간대별(KST 0~23시) 분포
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'))::int AS hour,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT "visitorId") AS visits
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
            // 국가/지역별
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT COALESCE(NULLIF("country", ''), '??') AS country,
            COUNT(DISTINCT "visitorId") AS visits, COUNT(*) AS pageviews
          FROM "PageView" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY visits DESC LIMIT 12
        `),
            // 실시간(최근 30분) 활성 방문자
            () =>
              prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT COUNT(DISTINCT "visitorId") AS active, COUNT(*) AS pageviews
          FROM "PageView" WHERE "createdAt" >= ${thirtyMinAgo}
        `),
          ],
          4
        )
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
        return apiSuccess(emptyResult(rangeDays, !healed))
      }

      const t = totalsRows[0] || {}
      const visits = num(t.visits)
      const loggedInVisits = num(t.logged_in_visits)
      const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 1000) / 10 : 0)

      const tr = todayRows[0] || {}
      const todayVisits = num(tr.today_visits)
      const todayLoggedIn = num(tr.today_logged_in)

      // 방문→가입 전환: 같은 기간 신규 가입(실회원) 수 / 순방문(visit-days).
      // 정밀 코호트는 아니지만 방향 지표로 충분.
      const realUserWhere: Prisma.UserWhereInput = {
        OR: [{ accounts: { some: {} } }, { passwordHash: { not: null } }],
      }
      const signups = await prisma.user.count({
        where: { AND: [realUserWhere, { createdAt: { gte: since } }] },
      })

      // 시간대 0~23 채우기(빈 시간은 0).
      const hourMap = new Map(hourlyRows.map((r) => [num(r.hour), r]))
      const hourly = Array.from({ length: 24 }, (_, h) => {
        const r = hourMap.get(h)
        return { hour: h, visits: r ? num(r.visits) : 0, pageviews: r ? num(r.pageviews) : 0 }
      })

      const active = activeRows[0] || {}

      return apiSuccess({
        rangeDays,
        today: {
          visits: todayVisits,
          pageviews: num(tr.today_pageviews),
          loggedInVisits: todayLoggedIn,
          anonymousVisits: Math.max(0, todayVisits - todayLoggedIn),
          yesterdayVisits: num(tr.yesterday_visits),
        },
        realtime: { active: num(active.active), pageviews: num(active.pageviews) },
        conversion: { visits, signups, rate: pct(signups, visits) },
        hourly,
        countries: countryRows.map((r) => ({
          country: String(r.country),
          visits: num(r.visits),
          pageviews: num(r.pageviews),
        })),
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
