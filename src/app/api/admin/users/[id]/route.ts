/**
 * Admin User Detail (drill-down) API
 *
 * GET /api/admin/users/[id]
 *
 * 검색 결과에서 유저 한 명을 클릭했을 때 보여줄 종합 상세:
 * 프로필 · 크레딧(사용가능 잔액) · 결제 이력 · 활동 타임라인 요약.
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  apiSuccess,
  apiError,
  ErrorCodes,
  createAdminGuard,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, routeContext: RouteContext) {
  const { id } = await routeContext.params

  const handler = withApiMiddleware(
    async (_req: NextRequest, _context: ApiContext) => {
      try {
        if (!id) {
          return apiError(ErrorCodes.VALIDATION_ERROR, 'id is required')
        }

        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            image: true,
            createdAt: true,
            passwordHash: true,
            accounts: { select: { provider: true } },
          },
        })
        if (!user) {
          return apiError(ErrorCodes.NOT_FOUND, 'user_not_found')
        }

        const [
          credits,
          purchases,
          recentPurchases,
          tarot,
          counselor,
          recentTarot,
          recentCounselor,
          recentTx,
          purchasedAgg,
          consumedAgg,
          firstPurchase,
        ] = await Promise.all([
          prisma.userCredits.findUnique({ where: { userId: id } }),
          prisma.bonusCreditPurchase.count({
            where: { userId: id, stripePaymentId: { not: null } },
          }),
          prisma.bonusCreditPurchase.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              amount: true,
              remaining: true,
              source: true,
              expired: true,
              createdAt: true,
              stripePaymentId: true,
            },
          }),
          // Reading 모델 제거 (2026-06-06) — 타로 + 상담챗 counter 만.
          prisma.tarotReading.count({ where: { userId: id } }),
          prisma.counselorChatSession.count({ where: { userId: id } }),
          // 타임라인용 최근 활동
          prisma.tarotReading.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { createdAt: true },
          }),
          prisma.counselorChatSession.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { createdAt: true, type: true },
          }),
          prisma.creditTransaction.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 15,
            select: { createdAt: true, amount: true, reason: true, type: true },
          }),
          // 총 구매(실결제) 크레딧 — stripePaymentId 있는 pack 의 amount 합.
          prisma.bonusCreditPurchase.aggregate({
            _sum: { amount: true },
            where: { userId: id, stripePaymentId: { not: null } },
          }),
          // 총 소비 크레딧 — CONSUME 감사행 amount 합(음수)이라 부호 뒤집어 노출.
          prisma.creditTransaction.aggregate({
            _sum: { amount: true },
            where: { userId: id, type: 'CONSUME' },
          }),
          // 첫 실결제 시각 — 가입→첫구매 전환 파악용.
          prisma.bonusCreditPurchase.findFirst({
            where: { userId: id, stripePaymentId: { not: null } },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
        ])

        // 여러 소스를 하나의 시간순 타임라인으로 병합 (최근 25개)
        const timeline = [
          ...recentTarot.map((t) => ({
            type: 'tarot',
            label: '타로',
            detail: '',
            at: t.createdAt.toISOString(),
          })),
          ...recentCounselor.map((c) => ({
            type: 'counselor',
            label: c.type === 'compat' ? '궁합 상담' : '사주 상담',
            detail: '',
            at: c.createdAt.toISOString(),
          })),
          ...recentPurchases.map((p) => ({
            type: 'purchase',
            // 실결제 여부는 source 기본값('purchase') 대신 stripePaymentId 로 판별.
            label: p.stripePaymentId ? '구매' : `보너스(${p.source})`,
            detail: `+${p.amount} 크레딧`,
            at: p.createdAt.toISOString(),
          })),
          ...recentTx.map((tx) => ({
            type: 'credit',
            label: tx.type === 'CONSUME' ? '크레딧 소비' : '크레딧 적립',
            detail: `${tx.amount > 0 ? '+' : ''}${tx.amount} · ${tx.reason}`,
            at: tx.createdAt.toISOString(),
          })),
        ]
          .sort((a, b) => (a.at < b.at ? 1 : -1))
          .slice(0, 25)

        return apiSuccess({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            createdAt: user.createdAt.toISOString(),
            hasPassword: !!user.passwordHash,
            providers: user.accounts.map((a) => a.provider),
          },
          credits: credits
            ? {
                // 실제 사용가능 잔액 = bonusCredits (SSOT). monthlyCredits/
                // usedCredits 는 폐기된 frozen 컬럼이라 제외 — getCreditBalance/
                // canUseCredits 와 동일한 bonus-only 정의로 맞춰 과금 로직과 어긋나지
                // 않게 한다(직전엔 monthly @default(1) 만큼 +1 부풀려졌다).
                usable: Math.max(0, credits.bonusCredits),
                bonusCredits: credits.bonusCredits,
                totalBonusReceived: credits.totalBonusReceived,
              }
            : null,
          activity: {
            tarot,
            counselor,
            total: tarot + counselor,
            // 마지막 활동 시각 — 타로/상담 중 가장 최근(둘 다 desc 정렬의 첫 행).
            lastActiveAt:
              [recentTarot[0]?.createdAt, recentCounselor[0]?.createdAt]
                .filter((d): d is Date => !!d)
                .sort((a, b) => b.getTime() - a.getTime())[0]
                ?.toISOString() ?? null,
          },
          spend: {
            // 실결제로 받은 크레딧 총량.
            purchasedCredits: purchasedAgg._sum.amount ?? 0,
            // 소비 총량(양수로 노출). CONSUME amount 는 음수.
            consumedCredits: Math.abs(consumedAgg._sum.amount ?? 0),
            firstPurchaseAt: firstPurchase?.createdAt.toISOString() ?? null,
          },
          purchases: {
            paidCount: purchases,
            recent: recentPurchases.map((p) => ({
              amount: p.amount,
              remaining: p.remaining,
              source: p.source,
              expired: p.expired,
              createdAt: p.createdAt.toISOString(),
              stripePaymentId: p.stripePaymentId,
            })),
          },
          timeline,
        } as Record<string, unknown>)
      } catch (err) {
        logger.error('[admin/users/:id] error', err)
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
      }
    },
    createAdminGuard({
      route: '/api/admin/users/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request)
}
