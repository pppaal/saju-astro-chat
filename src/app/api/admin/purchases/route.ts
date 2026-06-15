/**
 * Admin Purchases (개별 결제 내역) API
 *
 * GET /api/admin/purchases?window=today|7d|30d|all
 *
 * 개요 페이지의 결제 카드(총 구매·오늘·7일·30일 구매)를 클릭했을 때 "누가
 * 결제했는지"를 보여주기 위한 엔드포인트. 결제유저(users-by?segment=paying)가
 * 중복 제거된 '구매자'를 보여주는 반면, 여기선 개별 결제 건마다 한 행씩 —
 * 같은 사람이 여러 번 결제하면 여러 행으로 나온다. 각 행에 구매자 이메일·ID·
 * 금액(크레딧)·일시를 담는다. 실결제(stripePaymentId 있음)만 집계해 overview
 * 의 구매 건수 카드와 기준을 맞춘다.
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
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const WINDOWS = ['today', '7d', '30d', 'all'] as const
type Window = (typeof WINDOWS)[number]

// 목록 상한. count 는 전체 건수라 이 상한과 무관(UI 가 캡 안내).
const PURCHASE_LIST_CAP = 500

// 실결제 표식. source 기본값이 'purchase' 라 신뢰 불가 → Stripe 결제 표식
// (stripePaymentId)이 있는 행만 '구매'로 본다. overview 카드와 동일 기준.
const paidWhere: Prisma.BonusCreditPurchaseWhereInput = { stripePaymentId: { not: null } }

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const window = (new URL(req.url).searchParams.get('window') || 'all') as Window
      if (!WINDOWS.includes(window)) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Invalid window. Must be one of: ${WINDOWS.join(', ')}`
        )
      }

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const since =
        window === 'today'
          ? startOfToday
          : window === '7d'
            ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            : window === '30d'
              ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              : null
      const where: Prisma.BonusCreditPurchaseWhereInput = since
        ? { ...paidWhere, createdAt: { gte: since } }
        : paidWhere

      const [count, rows] = await Promise.all([
        prisma.bonusCreditPurchase.count({ where }),
        prisma.bonusCreditPurchase.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: PURCHASE_LIST_CAP,
          select: { id: true, userId: true, amount: true, createdAt: true, stripePaymentId: true },
        }),
      ])

      // 구매자 신원(이메일·이름) 조인 — findMany 의 userId 들로 한 번에 조회.
      const userIds = Array.from(new Set(rows.map((r) => r.userId)))
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          })
        : []
      const byId = new Map(users.map((u) => [u.id, u]))

      return apiSuccess({
        window,
        count,
        purchases: rows.map((r) => {
          const u = byId.get(r.userId)
          return {
            id: r.id,
            userId: r.userId,
            email: u?.email ?? null,
            name: u?.name ?? null,
            amount: r.amount,
            stripePaymentId: r.stripePaymentId,
            createdAt: r.createdAt.toISOString(),
          }
        }),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/purchases] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({
    route: '/api/admin/purchases',
    limit: 60,
    windowSeconds: 60,
  })
)
