/**
 * Admin Revenue & Credit-economy API
 *
 * GET /api/admin/revenue?days=N
 *
 * 매출(KRW 추정)과 크레딧 경제(발행/소비/만료/잔여)를 한 번에 반환한다.
 * StripeEventLog 엔 금액 필드가 없어, BonusCreditPurchase 의 크레딧 수량을
 * pricing.ts 의 팩 정가로 환산해 매출을 추정한다(라벨에 "추정" 명시).
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
import { CREDIT_PACKS, BASE_CREDIT_PRICE_KRW } from '@/lib/config/pricing'

export const dynamic = 'force-dynamic'

// 구매 크레딧 수량 → 팩 정가(KRW). 정확히 일치하는 팩이 있으면 그 가격,
// 없으면(과거 정책 등) 기본 단가로 보수적 추정.
const PACK_BY_CREDITS = new Map(Object.values(CREDIT_PACKS).map((p) => [p.credits, p]))
function creditsToKrw(credits: number): number {
  return PACK_BY_CREDITS.get(credits)?.pricing.krw ?? credits * BASE_CREDIT_PRICE_KRW
}
function packLabel(credits: number): string {
  const p = PACK_BY_CREDITS.get(credits)
  return p ? `${p.id} (${credits})` : `기타 (${credits})`
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/revenue] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const daysRaw = parseInt(new URL(req.url).searchParams.get('days') || '30', 10)
      const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? daysRaw : 30
      const now = new Date()
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)

      // 실결제 표식. source 기본값이 'purchase' 라 신뢰 불가 →
      // Stripe 결제 표식(stripePaymentId)이 있는 행만 '구매'로 본다.
      const paidWhere = { stripePaymentId: { not: null } }

      const [windowPurchases, economy, consumeAgg] = await Promise.all([
        // 기간 내 실결제 구매 (일별·팩별·매출 추정용)
        prisma.bonusCreditPurchase.findMany({
          where: { ...paidWhere, createdAt: { gte: since } },
          select: { amount: true, createdAt: true },
        }),
        // 크레딧 경제 스냅샷(전체 기간): 발행/잔여/만료
        Promise.all([
          prisma.bonusCreditPurchase.aggregate({
            where: paidWhere,
            _sum: { amount: true },
          }),
          prisma.bonusCreditPurchase.aggregate({
            where: { stripePaymentId: null },
            _sum: { amount: true },
          }),
          prisma.bonusCreditPurchase.aggregate({
            where: { expired: false },
            _sum: { remaining: true },
          }),
          prisma.bonusCreditPurchase.aggregate({
            where: { expired: true },
            _sum: { remaining: true },
          }),
        ]),
        // 기간 내 소비(CONSUME = 음수) 합계
        prisma.creditTransaction.aggregate({
          where: { type: 'CONSUME', createdAt: { gte: since } },
          _sum: { amount: true },
        }),
        // CreditRefundLog 모델 제거 (2026-06-06) — CreditTransaction 의
        // type='REFUND' row 가 SSOT. 기간 내 환불 통계 별도 항목 제거.
      ])

      const [paidAgg, freeAgg, outstandingAgg, expiredAgg] = economy

      // 일별 매출 (빈 날도 0 으로 채움)
      const dailyMap = new Map<string, { krw: number; count: number }>()
      for (let i = 0; i < days; i++) {
        const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
        dailyMap.set(dayKey(d), { krw: 0, count: 0 })
      }
      const packMap = new Map<number, { count: number; krw: number }>()
      let windowKrw = 0
      let todayKrw = 0
      for (const p of windowPurchases) {
        const krw = creditsToKrw(p.amount)
        windowKrw += krw
        if (p.createdAt >= startOfToday) todayKrw += krw
        const k = dayKey(p.createdAt)
        const cur = dailyMap.get(k)
        if (cur) {
          cur.krw += krw
          cur.count += 1
        }
        const pk = packMap.get(p.amount) || { count: 0, krw: 0 }
        pk.count += 1
        pk.krw += krw
        packMap.set(p.amount, pk)
      }

      return apiSuccess({
        rangeDays: days,
        revenue: {
          windowKrw,
          todayKrw,
          purchaseCount: windowPurchases.length,
          daily: Array.from(dailyMap.entries()).map(([date, v]) => ({
            date,
            krw: v.krw,
            count: v.count,
          })),
          byPack: Array.from(packMap.entries())
            .map(([credits, v]) => ({ pack: packLabel(credits), credits, count: v.count, krw: v.krw }))
            .sort((a, b) => b.krw - a.krw),
        },
        credits: {
          issuedPaid: paidAgg._sum.amount ?? 0,
          issuedFree: freeAgg._sum.amount ?? 0,
          consumed: Math.abs(consumeAgg._sum.amount ?? 0),
          outstanding: outstandingAgg._sum.remaining ?? 0,
          expiredLost: expiredAgg._sum.remaining ?? 0,
        },
        // refunds 통계 — CreditRefundLog 제거 (2026-06-06). 필요 시
        // CreditTransaction.type='REFUND' aggregate 로 재구현.
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/revenue] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({ route: '/api/admin/revenue', limit: 30, windowSeconds: 60 })
)
