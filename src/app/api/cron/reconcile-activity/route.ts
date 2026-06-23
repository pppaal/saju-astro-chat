import { NextResponse } from 'next/server'
import { findOrphanedCharges } from '@/lib/credits/reconcileActivity'
import { captureException } from '@/lib/telemetry'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'

// 과금↔활동 정합성 cron — "크레딧은 차감됐는데 그 활동 레코드가 없음"(고아 과금)을
// *매일 자동*으로 스캔해, 발견 시 Sentry 로 실시간 알림한다. 이전엔 reconciliation
// 이 수동 어드민 엔드포인트라 사람이 열어봐야만 보였다 → 이 cron 이 "사람이 안
// 봐도 고아가 생기면 알림"으로 감지를 자가발동시킨다.

export const dynamic = 'force-dynamic'

// 스캔 윈도: 최근 SCAN_DAYS 일. 단, 막 일어난 과금은 아직 활동 행이 안 생겼을 수
// 있어(스트림 진행 중 / 클라 저장 in-flight) SETTLE_MS 만큼의 최근 구간은 제외해
// "정착된" 과금만 본다 — in-flight 오탐을 제거하는 핵심 가드.
const SCAN_DAYS = 2
const SETTLE_MS = 60 * 60 * 1000 // 1h

// CRON_SECRET 인증 (reset-credits 와 동일 패턴 — timing-safe 비교).
function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:reconcile-activity:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'cron/reconcile-activity',
      })
    }

    if (!validateCronSecret(request)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'cron/reconcile-activity',
      })
    }

    const now = Date.now()
    const since = new Date(now - SCAN_DAYS * 24 * 60 * 60 * 1000)
    const until = new Date(now - SETTLE_MS)
    const result = await findOrphanedCharges({ since, until })

    // apiRoute 별 집계 — 어느 과금 경로가 새는지 한눈에.
    const byRoute: Record<string, number> = {}
    for (const o of result.orphaned) {
      const key = o.apiRoute ?? 'unknown'
      byRoute[key] = (byRoute[key] ?? 0) + 1
    }

    if (result.orphaned.length > 0) {
      // Sentry 실시간 알림 — 고아 과금은 "조용한 매출 버그"라 error 레벨로 띄운다.
      // 단, 정당하게 환불된 턴이 섞일 수 있어(현재 CONSUME↔REFUND 직접 링크 없음)
      // 알림 본문에 교차확인 안내를 남긴다. 표본 transactionId 만 싣고(과다 방지)
      // 상세는 GET /api/admin/reconcile-activity 로 본다.
      captureException(new Error('orphaned charges detected (charged but no activity record)'), {
        scope: 'reconcile-activity-cron',
        scanDays: SCAN_DAYS,
        scanned: result.scanned,
        linked: result.linked,
        orphanedCount: result.orphaned.length,
        byRoute,
        sampleTransactionIds: result.orphaned.slice(0, 20).map((o) => o.transactionId),
        note: 'may include legitimately-refunded turns; cross-check refunds and /api/admin/reconcile-activity',
      })
      logger.error('[Cron reconcile-activity] orphaned charges detected', {
        orphanedCount: result.orphaned.length,
        byRoute,
      })
    } else {
      logger.warn('[Cron reconcile-activity] no orphaned charges', {
        scanned: result.scanned,
        linked: result.linked,
      })
    }

    return NextResponse.json({
      success: true,
      scanDays: SCAN_DAYS,
      scanned: result.scanned,
      linked: result.linked,
      orphanedCount: result.orphaned.length,
      byRoute,
    })
  } catch (err: unknown) {
    logger.error('[Cron reconcile-activity error]', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/reconcile-activity',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

// POST 도 지원 (일부 cron 서비스는 POST 사용).
export async function POST(request: Request) {
  return GET(request)
}
