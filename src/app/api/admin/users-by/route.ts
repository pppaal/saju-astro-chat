/**
 * Admin Users-by-segment API
 *
 * GET /api/admin/users-by?segment=total|today|7d|30d|paying
 *
 * 개요 페이지의 카드(총회원·오늘신규·7일/30일 신규·결제유저)를 클릭했을 때
 * "그게 누구인지" 목록을 보여주기 위한 엔드포인트. 카드 숫자와 개수가
 * 어긋나지 않도록 /api/admin/overview 와 동일한 기준(실회원 필터·기간)을 쓴다.
 * 목록은 최근순 최대 100명.
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
import { realUserWhere } from '@/lib/admin/realUser'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const SEGMENTS = ['total', 'today', '7d', '30d', 'paying'] as const
type Segment = (typeof SEGMENTS)[number]

// 결제유저 목록 상한. 회원 세그먼트(take 100)보다 넉넉히 잡아 실결제 유저는
// 거의 다 보이도록 한다. count 는 전체 distinct 수라 이 상한과 무관하다.
const PAYING_LIST_CAP = 1000

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId))) {
        logger.warn('[admin/users-by] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const segment = new URL(req.url).searchParams.get('segment') as Segment | null
      if (!segment || !SEGMENTS.includes(segment)) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Invalid segment. Must be one of: ${SEGMENTS.join(', ')}`
        )
      }

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // 결제유저: 실결제(Stripe 표식 stripePaymentId 있음) distinct userId → 그
      // 회원들. source='purchase' 는 addBonusCredits 기본값이라 추천·지급도 섞임.
      // 정렬은 "가입일"이 아니라 "마지막 결제일" 역순 — 가입일순이면 옛날에
      // 가입했지만 최근에 결제한 유저가 목록 아래로 밀려 안 보인다("결제 유저가
      // 다 안 나온다"의 원인). count 는 전체 distinct 결제유저 수를 그대로 두고,
      // 목록만 상한(PAYING_LIST_CAP)을 적용한다. UI 가 count > 표시수일 때
      // "N명, 최근 M명 표시"로 안내한다.
      if (segment === 'paying') {
        const grouped = await prisma.bonusCreditPurchase.groupBy({
          by: ['userId'],
          where: { stripePaymentId: { not: null } },
          _max: { createdAt: true },
        })
        // 마지막 결제일 역순 정렬 후 상한 적용.
        const orderedIds = grouped
          .slice()
          .sort((a, b) => (b._max?.createdAt?.getTime() ?? 0) - (a._max?.createdAt?.getTime() ?? 0))
          .map((g) => g.userId)
        const cappedIds = orderedIds.slice(0, PAYING_LIST_CAP)
        const found = cappedIds.length
          ? await prisma.user.findMany({
              where: { id: { in: cappedIds } },
              select: { id: true, email: true, name: true, createdAt: true },
            })
          : []
        // findMany 는 `in` 입력 순서를 보장하지 않으므로 결제순으로 재정렬.
        const byId = new Map(found.map((u) => [u.id, u]))
        const users = cappedIds
          .map((id) => byId.get(id))
          .filter((u): u is (typeof found)[number] => Boolean(u))
        return apiSuccess({
          segment,
          count: orderedIds.length,
          users: users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            createdAt: u.createdAt.toISOString(),
          })),
        } as Record<string, unknown>)
      }

      // 회원 세그먼트(total/today/7d/30d): 실회원 + 가입 기간 필터.
      const createdAtFilter: Prisma.UserWhereInput =
        segment === 'today'
          ? { createdAt: { gte: startOfToday } }
          : segment === '7d'
            ? { createdAt: { gte: last7d } }
            : segment === '30d'
              ? { createdAt: { gte: last30d } }
              : {}
      const where: Prisma.UserWhereInput = { AND: [realUserWhere, createdAtFilter] }

      const [count, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: { id: true, email: true, name: true, createdAt: true },
        }),
      ])

      return apiSuccess({
        segment,
        count,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt.toISOString(),
        })),
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/users-by] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/users-by',
    limit: 60,
    windowSeconds: 60,
  })
)
