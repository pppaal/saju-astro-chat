import { NextResponse } from 'next/server'
import { expireBonusCredits } from '@/lib/credits/creditService'
import { sweepExpiredIdempotency } from '@/lib/credits/sweepExpiredIdempotency'
import { sweepDataRetention } from '@/lib/db/dataRetention'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { withCronAuth } from '@/lib/api/middleware/cronGuard'

// Vercel Cron 또는 외부 cron 서비스용 엔드포인트
// 매일 자정에 실행 권장

export const dynamic = 'force-dynamic'

// 보안: withCronAuth — IP 레이트리밋(5/min) → timing-safe CRON_SECRET (fail-closed).
async function handle(): Promise<NextResponse> {
  try {
    // 만료된 보너스 크레딧 정리 (구매일로부터 3개월). 월간 충전 모델이 없으므로
    // 옛 "월간 크레딧 리셋" 단계는 제거됨 (크레딧 = 구매/보너스 풀 단일).
    logger.warn('[Cron] Starting bonus credit expiration...')
    const bonusResult = await expireBonusCredits()
    logger.warn('[Cron] Bonus credit expiration completed:', bonusResult)

    // 만료된 멱등/취소-큐 행 정리 — 무한 누적으로 핫 머니 경로가 느려지는 것 방지.
    const sweep = await sweepExpiredIdempotency()
    logger.warn('[Cron] Expired idempotency/revocation sweep completed:', sweep)

    // 무한 증식 테이블 보존기간 스윕 — PageView·캘린더 캐시·버전 고아·만료 공유.
    // 전부 fail-soft 캐시/로그라 지워도 재계산될 뿐(DB 감사 2026-07). 내부에서
    // 테이블별 try/catch — 부분 실패해도 크레딧 정리 결과는 이미 확보됨.
    const retention = await sweepDataRetention()
    logger.warn('[Cron] Data retention sweep completed:', retention)

    return NextResponse.json({
      success: true,
      message: 'Credit maintenance completed',
      bonusExpiration: bonusResult,
      idempotencySweep: sweep,
      dataRetention: retention,
    })
  } catch (err: unknown) {
    logger.error('[Cron Reset error]', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/reset-credits',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

export const GET = withCronAuth('reset-credits', handle)
// POST도 지원 (일부 cron 서비스는 POST 사용)
export const POST = GET
