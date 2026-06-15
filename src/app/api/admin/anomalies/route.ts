/**
 * Admin Anomaly Detection API
 *
 * GET /api/admin/anomalies?days=N
 *
 * 어뷰즈·부정사용 단서를 찾기 위한 이상치 목록:
 *  - 크레딧 과다 소비 유저 (기간 내 CONSUME 합계 상위)
 *  - 무료 크레딧 과다 수령 유저 (기간 내 비결제 지급/보너스 합계 상위)
 * 운영자가 빠르게 의심 계정을 좁히도록 상위 N명만 반환한다.
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
import { adminDaysQuerySchema, formatZodErrors } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

const TOP_N = 20

async function emailMap(
  userIds: string[]
): Promise<Map<string, { email: string | null; name: string | null }>> {
  if (userIds.length === 0) return new Map()
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  return new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]))
}

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      // 잘못된 days 는 silent clamp 대신 422 — 오타를 기본값으로 흡수하면
      // 운영자가 의도와 다른 기간을 보고 있는 걸 알아챌 수 없다.
      const parsedQuery = adminDaysQuerySchema.safeParse(
        Object.fromEntries(new URL(req.url).searchParams)
      )
      if (!parsedQuery.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'days must be an integer between 1 and 365',
          formatZodErrors(parsedQuery.error)
        )
      }
      const { days } = parsedQuery.data
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const [consumeGroups, grantGroups] = await Promise.all([
        // 소비: CONSUME 트랜잭션은 amount 가 음수 → 합계가 작을수록 많이 소비.
        prisma.creditTransaction.groupBy({
          by: ['userId'],
          where: { type: 'CONSUME', createdAt: { gte: since } },
          _sum: { amount: true },
        }),
        // 무료 지급/보너스: 실결제(stripePaymentId) 가 아닌 발행.
        prisma.bonusCreditPurchase.groupBy({
          by: ['userId'],
          where: { stripePaymentId: null, createdAt: { gte: since } },
          _sum: { amount: true },
        }),
      ])

      const topConsumersRaw = consumeGroups
        .map((g) => ({ userId: g.userId, consumed: Math.abs(g._sum.amount ?? 0) }))
        .filter((g) => g.consumed > 0)
        .sort((a, b) => b.consumed - a.consumed)
        .slice(0, TOP_N)

      const topGrantedRaw = grantGroups
        .map((g) => ({ userId: g.userId, granted: g._sum.amount ?? 0 }))
        .filter((g) => g.granted > 0)
        .sort((a, b) => b.granted - a.granted)
        .slice(0, TOP_N)

      const ids = [
        ...new Set([
          ...topConsumersRaw.map((c) => c.userId),
          ...topGrantedRaw.map((g) => g.userId),
        ]),
      ]
      const users = await emailMap(ids)

      const decorate = <T extends { userId: string }>(rows: T[]) =>
        rows.map((r) => ({
          ...r,
          email: users.get(r.userId)?.email ?? null,
          name: users.get(r.userId)?.name ?? null,
        }))

      return apiSuccess({
        rangeDays: days,
        topConsumers: decorate(topConsumersRaw),
        topGranted: decorate(topGrantedRaw),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/anomalies] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({ route: '/api/admin/anomalies', limit: 30, windowSeconds: 60 })
)
