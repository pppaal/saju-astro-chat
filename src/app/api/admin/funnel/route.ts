/**
 * Admin Conversion-funnel API
 *
 * GET /api/admin/funnel?days=N
 *
 * 기간 내 가입한 코호트 기준 전환 퍼널: 가입 → 첫 리딩(사주/타로/상담) →
 * 첫 결제. 각 단계 인원과 직전 단계 대비 전환율을 반환한다.
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
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const realUserWhere: Prisma.UserWhereInput = {
  OR: [{ accounts: { some: {} } }, { passwordHash: { not: null } }],
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/funnel] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const daysRaw = parseInt(new URL(req.url).searchParams.get('days') || '30', 10)
      const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? daysRaw : 30
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // 코호트: 기간 내 가입한 실회원
      const cohort = await prisma.user.findMany({
        where: { AND: [realUserWhere, { createdAt: { gte: since } }] },
        select: { id: true, createdAt: true },
      })
      const ids = cohort.map((u) => u.id)
      const signupAt = new Map(cohort.map((u) => [u.id, u.createdAt]))

      let activated = 0
      let paid = 0
      let returned = 0
      if (ids.length > 0) {
        const inIds = { userId: { in: ids } }
        // Reading 모델 제거 (2026-06-06) — 옛 일반 리딩 archive.
        // 활성 판정은 tarotReading + counselorChatSession 만으로.
        // 재방문(리텐션): 가입 후 24h 이상 지나 다시 활동한 코호트 사용자.
        // → 활동 timestamp 가 필요하므로 distinct 대신 (userId, createdAt) 로 조회.
        const [tarotRows, counselorRows, buyerUsers] = await Promise.all([
          prisma.tarotReading.findMany({ where: inIds, select: { userId: true, createdAt: true } }),
          prisma.counselorChatSession.findMany({
            where: inIds,
            select: { userId: true, createdAt: true },
          }),
          prisma.bonusCreditPurchase.findMany({
            // 실결제 표식(stripePaymentId)이 있는 행만 — source='purchase' 는
            // addBonusCredits 기본값이라 추천·지급도 섞인다.
            where: { ...inIds, stripePaymentId: { not: null } },
            distinct: ['userId'],
            select: { userId: true },
          }),
        ])
        const RETURN_THRESHOLD_MS = 24 * 60 * 60 * 1000
        const activeSet = new Set<string>()
        const returnedSet = new Set<string>()
        for (const r of [...tarotRows, ...counselorRows]) {
          activeSet.add(r.userId)
          const signed = signupAt.get(r.userId)
          if (signed && r.createdAt.getTime() - signed.getTime() >= RETURN_THRESHOLD_MS) {
            returnedSet.add(r.userId)
          }
        }
        activated = activeSet.size
        returned = returnedSet.size
        paid = new Set(buyerUsers.map((b) => b.userId)).size
      }

      const signups = ids.length
      const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 1000) / 10 : 0)

      return apiSuccess({
        rangeDays: days,
        steps: [
          { key: 'signup', label: '가입', count: signups, fromPrev: 100, fromStart: 100 },
          {
            key: 'activated',
            label: '첫 리딩',
            count: activated,
            fromPrev: pct(activated, signups),
            fromStart: pct(activated, signups),
          },
          {
            key: 'paid',
            label: '첫 결제',
            count: paid,
            fromPrev: pct(paid, activated),
            fromStart: pct(paid, signups),
          },
        ],
        // 재방문은 결제의 하위 단계가 아니라 코호트 전체 기준 리텐션 지표라
        // steps 와 분리해 별도로 반환한다(>100% 혼동 방지).
        retention: { returned, rate: pct(returned, signups) },
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/funnel] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({ route: '/api/admin/funnel', limit: 30, windowSeconds: 60 })
)
