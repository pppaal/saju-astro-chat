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

export const dynamic = 'force-dynamic'

const HISTORY_PAGE_SIZE = 50

/**
 * GET /api/me/credits/history
 *
 * 사용자가 자기 크레딧 변동 (grant / consume / refund / expire / signup_bonus
 * 등) 의 최근 50 건을 시계열로 조회. 분쟁/문의 시 "내가 언제 뭐 얼마
 * 썼지?" 를 사용자가 직접 확인할 수 있도록 만든 자기 자신용 audit view.
 *
 * 응답에서 의도적으로 빠지는 필드: `sourceRef`, `metadata`.
 *  - `sourceRef` 는 stripePaymentId / purchaseId 같은 내부 키. 노출하면
 *    refund forgery / 계정 매칭 등의 부수 attack surface 가 생긴다.
 *  - `metadata` 는 apiRoute / errorMessage / connectionId 같은 운영 디버그
 *    정보를 담는다. 사용자 facing 화면에 노출할 의도 아님.
 *
 * 관리자 / 내부 운영자는 prisma 직접 조회 (또는 별도 admin endpoint) 를
 * 사용한다.
 */
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'not_authenticated')
    }

    try {
      const rows = await prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_PAGE_SIZE,
        select: {
          id: true,
          type: true,
          pool: true,
          amount: true,
          reason: true,
          createdAt: true,
        },
      })

      return apiSuccess({
        transactions: rows.map((r) => ({
          id: r.id,
          type: r.type,
          pool: r.pool,
          amount: r.amount,
          reason: r.reason,
          createdAt: r.createdAt,
        })),
      })
    } catch (err) {
      logger.error('[Credits history GET error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/credits/history',
    limit: 30,
    windowSeconds: 60,
  })
)
