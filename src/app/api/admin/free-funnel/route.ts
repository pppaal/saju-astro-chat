// src/app/api/admin/free-funnel/route.ts
//
// 무료 퍼널 지표 — 소셜 바이오 랜딩(/free)이 실제로 트래픽을 받고, 무료 도구를
// 거쳐 상담사(유료)까지 전환되는지를 PageView(영구 저장)로 집계한다.
// recordCounter('funnel.*') 는 인메모리/인스턴스별이라 어드민 신뢰지표로 못 쓰고,
// PageView 는 DB 라 경로·방문자·유입출처가 다 영구 보존된다.
//
// 3단계 퍼널은 "/free 를 거친 방문자" 기준 교집합으로 계산(진짜 전환). 추가로
// 경로별 순방문자와 /free 유입 출처(referrerHost)를 보여 인스타/유튜브 같은
// 채널이 실제로 사람을 보내는지 확인한다.

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { adminDaysQuerySchema, formatZodErrors } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// 퍼널 경로 정의 — 무료 허브 → 무료 도구(합집합) → 상담사(유료, 합집합).
const HUB = '/free'
const TOOLS = ['/integrated-report', '/compatibility/free', '/tarot/daily', '/destiny']
const COUNSELORS = ['/destiny-counselor', '/compatibility/counselor']

type Row = Record<string, unknown>
const n = (v: unknown): number => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0))

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const parsed = adminDaysQuerySchema.safeParse(
        Object.fromEntries(new URL(req.url).searchParams)
      )
      if (!parsed.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'days must be an integer between 1 and 365',
          formatZodErrors(parsed.error)
        )
      }
      const { days } = parsed.data
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // 레퍼럴 전환 — PageView 와 독립(영구 모델). 추천 링크로 가입(referrerId) →
      // 친구 첫 결제로 보상 완료(ReferralReward.status='completed')가 진짜 전환.
      const referral = await (async () => {
        try {
          const [signups, paid, pending] = await Promise.all([
            prisma.user.count({
              where: { referrerId: { not: null }, createdAt: { gte: since } },
            }),
            prisma.referralReward.count({
              where: { status: 'completed', completedAt: { gte: since } },
            }),
            prisma.referralReward.count({ where: { status: 'pending' } }),
          ])
          const paidRate = signups > 0 ? Math.round((paid / signups) * 1000) / 10 : 0
          return { signups, paid, pending, paidRate }
        } catch (e) {
          logger.warn('[admin/free-funnel] referral query failed', {
            code: (e as { code?: string })?.code,
          })
          return { signups: 0, paid: 0, pending: 0, paidRate: 0 }
        }
      })()

      const toolList = Prisma.join(TOOLS)
      const counselorList = Prisma.join(COUNSELORS)

      try {
        const [funnelRows, pathRows, refRows] = await Promise.all([
          // /free 를 거친 방문자 기준 3단계 교집합 퍼널.
          prisma.$queryRaw<Row[]>(Prisma.sql`
            WITH hub AS (
              SELECT DISTINCT "visitorId" FROM "PageView"
              WHERE "createdAt" >= ${since} AND "path" = ${HUB}
            ),
            tool AS (
              SELECT DISTINCT "visitorId" FROM "PageView"
              WHERE "createdAt" >= ${since} AND "path" IN (${toolList})
            ),
            counselor AS (
              SELECT DISTINCT "visitorId" FROM "PageView"
              WHERE "createdAt" >= ${since} AND "path" IN (${counselorList})
            )
            SELECT
              (SELECT COUNT(*) FROM hub) AS hub,
              (SELECT COUNT(*) FROM tool WHERE "visitorId" IN (SELECT "visitorId" FROM hub)) AS hub_tool,
              (SELECT COUNT(*) FROM counselor WHERE "visitorId" IN (SELECT "visitorId" FROM hub)) AS hub_counselor
          `),
          // 경로별 순방문자 / 총조회 (퍼널 경유 무관 — 전체 도달).
          prisma.$queryRaw<Row[]>(Prisma.sql`
            SELECT "path",
              COUNT(DISTINCT "visitorId") AS visitors,
              COUNT(*) AS views
            FROM "PageView"
            WHERE "createdAt" >= ${since}
              AND "path" IN (${HUB}, ${toolList}, ${counselorList})
            GROUP BY "path"
            ORDER BY visitors DESC
          `),
          // /free 유입 출처 — 인스타/유튜브 등 외부 채널이 실제로 보내는지.
          prisma.$queryRaw<Row[]>(Prisma.sql`
            SELECT COALESCE("referrerHost", '(직접/북마크)') AS source,
              COUNT(DISTINCT "visitorId") AS visitors
            FROM "PageView"
            WHERE "createdAt" >= ${since} AND "path" = ${HUB}
            GROUP BY 1
            ORDER BY visitors DESC
            LIMIT 12
          `),
        ])

        const f = funnelRows[0] ?? {}
        const hub = n(f.hub)
        const hubTool = n(f.hub_tool)
        const hubCounselor = n(f.hub_counselor)

        const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

        return apiSuccess({
          rangeDays: days,
          funnel: {
            hub,
            tool: hubTool,
            counselor: hubCounselor,
            toolRate: pct(hubTool, hub), // 허브 → 무료 도구 전환%
            counselorRate: pct(hubCounselor, hubTool), // 무료 도구 → 상담사 전환%
          },
          paths: pathRows.map((r) => ({
            path: String(r.path),
            visitors: n(r.visitors),
            views: n(r.views),
          })),
          sources: refRows.map((r) => ({
            source: String(r.source),
            visitors: n(r.visitors),
          })),
          referral,
        } as Record<string, unknown>)
      } catch (dbErr) {
        // PageView 테이블이 아직 없거나(신규 배포) 쿼리 실패 — 빈 값으로 폴백.
        logger.warn('[admin/free-funnel] query failed, returning empty', {
          code: (dbErr as { code?: string })?.code,
        })
        return apiSuccess({
          rangeDays: days,
          funnel: { hub: 0, tool: 0, counselor: 0, toolRate: 0, counselorRate: 0 },
          paths: [],
          sources: [],
          referral,
          unavailable: true,
        } as Record<string, unknown>)
      }
    } catch (err) {
      logger.error('[admin/free-funnel] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({ route: '/api/admin/free-funnel', limit: 30, windowSeconds: 60 })
)
