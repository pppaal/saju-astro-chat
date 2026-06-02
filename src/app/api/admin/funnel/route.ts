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
        select: { id: true },
      })
      const ids = cohort.map((u) => u.id)

      let activated = 0
      let paid = 0
      if (ids.length > 0) {
        const inIds = { userId: { in: ids } }
        const [readingUsers, tarotUsers, counselorUsers, buyerUsers] = await Promise.all([
          prisma.reading.findMany({ where: inIds, distinct: ['userId'], select: { userId: true } }),
          prisma.tarotReading.findMany({ where: inIds, distinct: ['userId'], select: { userId: true } }),
          prisma.counselorChatSession.findMany({
            where: inIds,
            distinct: ['userId'],
            select: { userId: true },
          }),
          prisma.bonusCreditPurchase.findMany({
            // 실결제 표식(stripePaymentId)이 있는 행만 — source='purchase' 는
            // addBonusCredits 기본값이라 추천·지급도 섞인다.
            where: { ...inIds, stripePaymentId: { not: null } },
            distinct: ['userId'],
            select: { userId: true },
          }),
        ])
        const activeSet = new Set<string>()
        for (const r of [...readingUsers, ...tarotUsers, ...counselorUsers]) activeSet.add(r.userId)
        activated = activeSet.size
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
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/funnel] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({ route: '/api/admin/funnel', limit: 30, windowSeconds: 60 })
)
