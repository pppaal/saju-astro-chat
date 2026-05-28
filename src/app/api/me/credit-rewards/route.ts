import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
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

export const dynamic = 'force-dynamic'

// 자동 지급된 보너스 (추천 보상 등) 중 사용자가 아직 모달로 못 본 항목 조회.
// 페이지 진입 / 로그인 직후 클라이언트가 호출 → 결과 있으면 CreditRewardModal
// 노출 → 닫으면 POST 로 acknowledge.

// acknowledgedAt 컬럼이 production 에 아직 적용 안 된 경우 graceful.
// P2022 (column does not exist) 가 정상 신호지만 일부 Prisma 버전 / Postgres
// 드라이버 조합에서 code 가 비거나 다른 값으로 떨어지는 케이스 보고됨 —
// "(not available)" 같은 placeholder 메시지면 같은 root cause 로 간주.
function isMissingColumnError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2022') {
    return true
  }
  // fallback: 메시지에서 column does not exist 패턴 감지.
  const msg = (err as { message?: string } | null)?.message ?? ''
  return /column .* does not exist/i.test(msg) && /acknowledged|not available/i.test(msg)
}

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const rewards = await prisma.bonusCreditPurchase.findMany({
        where: {
          userId: context.userId!,
          acknowledgedAt: null,
          // 본인 결제(purchase)는 grant 시점에 acknowledgedAt 미리 채움 — 여기
          // 안 잡힘. 자동 지급(referral/promotion/gift) 만 잡혀야.
          source: { not: 'purchase' },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          source: true,
          createdAt: true,
        },
      })

      return apiSuccess({ rewards })
    } catch (err) {
      if (isMissingColumnError(err)) {
        logger.warn('[credit-rewards GET] acknowledgedAt column missing — migration not applied')
        return apiSuccess({ rewards: [] })
      }
      throw err
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/credit-rewards',
    limit: 60,
    windowSeconds: 60,
  })
)

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON')
    }
    const { ids } = (body ?? {}) as { ids?: unknown }
    if (!Array.isArray(ids) || ids.some((v) => typeof v !== 'string')) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'ids must be string[]')
    }
    if (ids.length === 0) {
      return apiSuccess({ acknowledged: 0 })
    }
    if (ids.length > 50) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'too many ids (max 50)')
    }

    try {
      // updateMany 의 where 에 userId 강제 → 다른 사람 reward 행 못 건드림.
      const result = await prisma.bonusCreditPurchase.updateMany({
        where: {
          id: { in: ids as string[] },
          userId: context.userId!,
          acknowledgedAt: null,
        },
        data: { acknowledgedAt: new Date() },
      })
      return apiSuccess({ acknowledged: result.count })
    } catch (err) {
      if (isMissingColumnError(err)) {
        logger.warn('[credit-rewards POST] acknowledgedAt column missing — migration not applied')
        return apiSuccess({ acknowledged: 0 })
      }
      throw err
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/credit-rewards',
    limit: 30,
    windowSeconds: 60,
  })
)
