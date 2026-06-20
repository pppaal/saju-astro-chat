/**
 * Admin — 과금↔활동 정합성 감사
 *
 * GET /api/admin/reconcile-activity?days=7[&limit=5000]
 *
 * "크레딧은 차감됐는데 그 활동 레코드(세션/리딩)가 없음" 인 고아 과금을 찾는다.
 * consumeCredits 가 CONSUME 감사행에 박은 활동 링크(activityType+activityRef)를
 * 읽어 활동 PK 존재를 배치 확인한다. 자세한 동작/한계는 reconcileActivity.ts 참고.
 *
 * 조용한 매출 버그(차감 1·활동 0)를 *감사 전에* 드러내는 그물 — ensure*Record
 * 안전망이 실패하거나 새 과금 경로가 링크를 빼먹으면 여기서 보인다.
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
import { logger } from '@/lib/logger'
import { findOrphanedCharges } from '@/lib/credits/reconcileActivity'

export const dynamic = 'force-dynamic'

const MAX_DAYS = 90
const MAX_LIMIT = 20000

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const url = new URL(req.url)
      const daysRaw = Number(url.searchParams.get('days') ?? '7')
      const days = Number.isFinite(daysRaw)
        ? Math.min(Math.max(1, Math.floor(daysRaw)), MAX_DAYS)
        : 7
      const limitRaw = Number(url.searchParams.get('limit') ?? '5000')
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIMIT)
        : 5000

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const result = await findOrphanedCharges({ since, limit })

      if (result.orphaned.length > 0) {
        logger.warn('[admin/reconcile-activity] orphaned charges detected', {
          days,
          scanned: result.scanned,
          linked: result.linked,
          orphanedCount: result.orphaned.length,
        })
      }

      return apiSuccess({
        windowDays: days,
        scanned: result.scanned,
        linked: result.linked,
        orphanedCount: result.orphaned.length,
        orphaned: result.orphaned.map((o) => ({
          transactionId: o.transactionId,
          userId: o.userId,
          createdAt: o.createdAt.toISOString(),
          amount: o.amount,
          apiRoute: o.apiRoute ?? null,
          activityType: o.activityType,
          activityRef: o.activityRef,
        })),
        // 조치 전 같은 사용자·기간의 환불(REFUND/REVOKE)과 교차 확인 권장.
        note: 'orphaned may include legitimately-refunded turns; cross-check refunds before acting',
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/reconcile-activity] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({
    route: '/api/admin/reconcile-activity',
    limit: 10,
    windowSeconds: 60,
  })
)
