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
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { realUserWhere } from '@/lib/admin/realUser'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (_req: NextRequest, _context: ApiContext) => {
    try {
      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // "실제 회원" 정의(realUserWhere) 는 @/lib/admin/realUser 로 공용화 —
      // 출처불명 껍데기(~41,500행)를 제외해 overview·users-by·funnel 이 같은
      // 회원 기준을 쓰도록 한다.
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
        purchases7d,
        purchases30d,
        payingUsers,
        recentSignups,
        signupRows,
      ] = await Promise.all([
        prisma.user.count({ where: realUserWhere }),
        prisma.user.count({
          where: { AND: [realUserWhere, { createdAt: { gte: startOfToday } }] },
        }),
        prisma.user.count({ where: { AND: [realUserWhere, { createdAt: { gte: last7d } }] } }),
        prisma.user.count({ where: { AND: [realUserWhere, { createdAt: { gte: last30d } }] } }),
        // 총 활동 = 타로 + 상담(사주·궁합). Reading 테이블은 타로 커플리딩이
        // 부수적으로 쓰는 것이라 tarotReading 과 중복 → 집계에서 제외(사용량
        // 분석·상세지표와 동일하게 tarot + counselor 기준).
        Promise.all([prisma.tarotReading.count(), prisma.counselorChatSession.count()]).then(
          ([a, b]) => a + b
        ),
        Promise.all([
          prisma.tarotReading.count({ where: { createdAt: { gte: startOfToday } } }),
          prisma.counselorChatSession.count({ where: { createdAt: { gte: startOfToday } } }),
        ]).then(([a, b]) => a + b),
        // 오늘 활성 = 오늘 타로·상담 중 하나라도 한 distinct 유저.
        Promise.all([
          prisma.tarotReading.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: startOfToday } },
          }),
          prisma.counselorChatSession.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: startOfToday } },
          }),
        ]).then(([a, b]) => new Set([...a, ...b].map((r) => r.userId)).size),
        // 만료 전 미사용 '구매' 크레딧 (실제 결제 후 미사용 = 환불 위험 부채).
        // source 기본값이 'purchase' 라 신뢰 불가 → 실결제 표식인 stripePaymentId
        // 가 있는 행만 집계한다.
        prisma.bonusCreditPurchase
          .aggregate({
            where: {
              stripePaymentId: { not: null },
              expired: false,
              expiresAt: { gt: now },
              remaining: { gt: 0 },
            },
            _sum: { remaining: true },
          })
          .then((r) => r._sum.remaining ?? 0),
        // 실결제(크레딧팩 구매)만 — Stripe 결제 표식(stripePaymentId)이 있는 행.
        // (source='purchase' 는 addBonusCredits 기본값이라 추천·지급도 섞인다.)
        prisma.bonusCreditPurchase.count({ where: { stripePaymentId: { not: null } } }),
        prisma.bonusCreditPurchase.count({
          where: { stripePaymentId: { not: null }, createdAt: { gte: startOfToday } },
        }),
        prisma.bonusCreditPurchase.count({
          where: { stripePaymentId: { not: null }, createdAt: { gte: last7d } },
        }),
        prisma.bonusCreditPurchase.count({
          where: { stripePaymentId: { not: null }, createdAt: { gte: last30d } },
        }),
        prisma.bonusCreditPurchase
          .groupBy({ by: ['userId'], where: { stripePaymentId: { not: null } } })
          .then((rows) => rows.length),
        prisma.user.findMany({
          where: realUserWhere,
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, email: true, name: true, createdAt: true },
        }),
        // 일별 가입 추이용: 최근 30일 신규 실회원의 가입일시.
        prisma.user.findMany({
          where: { AND: [realUserWhere, { createdAt: { gte: last30d } }] },
          select: { createdAt: true },
        }),
      ])

      // 최근 30일 일별 신규 가입 (빈 날도 0)
      const signupStart = new Date(now)
      signupStart.setHours(0, 0, 0, 0)
      signupStart.setDate(signupStart.getDate() - 29)
      const signupMap = new Map<string, number>()
      for (let i = 0; i < 30; i++) {
        const d = new Date(signupStart.getTime() + i * 24 * 60 * 60 * 1000)
        signupMap.set(d.toISOString().slice(0, 10), 0)
      }
      for (const u of signupRows) {
        const k = u.createdAt.toISOString().slice(0, 10)
        if (signupMap.has(k)) signupMap.set(k, (signupMap.get(k) ?? 0) + 1)
      }
      const signupsDaily = Array.from(signupMap.entries()).map(([date, count]) => ({ date, count }))

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
          last7d: purchases7d,
          last30d: purchases30d,
        },
        recentSignups: recentSignups.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt.toISOString(),
        })),
        signupsDaily,
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/overview] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({
    route: '/api/admin/overview',
    limit: 30,
    windowSeconds: 60,
  })
)
