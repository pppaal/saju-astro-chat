import { NextResponse } from 'next/server'
import { expireBonusCredits } from '@/lib/credits/creditService'
import { sweepExpiredIdempotency } from '@/lib/credits/sweepExpiredIdempotency'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'

// Vercel Cron 또는 외부 cron 서비스용 엔드포인트
// 매일 자정에 실행 권장

export const dynamic = 'force-dynamic'

// 보안: CRON_SECRET 환경변수로 인증.
// 비교는 timing-safe — 단순 === 는 문자 단위 조기 반환으로 시크릿 prefix 를
// 타이밍으로 추측할 여지를 준다.
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
    // 시크릿 brute-force 방지 — IP 당 분당 5회. 정상 cron 은 하루 1~2회라
    // 영향 없음. (인증 전 단계라 withApiMiddleware 가드 미사용 라우트.)
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:reset-credits:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'cron/reset-credits',
      })
    }

    if (!validateCronSecret(request)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'cron/reset-credits',
      })
    }

    // 만료된 보너스 크레딧 정리 (구매일로부터 3개월). 월간 충전 모델이 없으므로
    // 옛 "월간 크레딧 리셋" 단계는 제거됨 (크레딧 = 구매/보너스 풀 단일).
    logger.warn('[Cron] Starting bonus credit expiration...')
    const bonusResult = await expireBonusCredits()
    logger.warn('[Cron] Bonus credit expiration completed:', bonusResult)

    // 만료된 멱등/취소-큐 행 정리 — 무한 누적으로 핫 머니 경로가 느려지는 것 방지.
    const sweep = await sweepExpiredIdempotency()
    logger.warn('[Cron] Expired idempotency/revocation sweep completed:', sweep)

    return NextResponse.json({
      success: true,
      message: 'Credit maintenance completed',
      bonusExpiration: bonusResult,
      idempotencySweep: sweep,
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

// POST도 지원 (일부 cron 서비스는 POST 사용)
export async function POST(request: Request) {
  return GET(request)
}
