import { NextResponse } from 'next/server'
import { resetAllExpiredCredits, expireBonusCredits } from '@/lib/credits/creditService'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

// Vercel Cron 또는 외부 cron 서비스용 엔드포인트
// 매일 자정에 실행 권장

export const dynamic = 'force-dynamic'

// 보안: CRON_SECRET 환경변수로 인증
function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('[Cron] CRON_SECRET not set - rejecting request')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  try {
    if (!validateCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    // 1. 만료된 보너스 크레딧 정리 (구매일로부터 3개월)
    logger.warn('[Cron] Starting bonus credit expiration...')
    const bonusResult = await expireBonusCredits()
    logger.warn('[Cron] Bonus credit expiration completed:', bonusResult)

    // 2. 월간 크레딧 리셋 (periodEnd 지난 유저)
    logger.warn('[Cron] Starting monthly credit reset...')
    const monthlyResult = await resetAllExpiredCredits()
    logger.warn('[Cron] Credit reset completed:', monthlyResult)

    return NextResponse.json({
      success: true,
      message: 'Credit maintenance completed',
      bonusExpiration: bonusResult,
      monthlyReset: monthlyResult,
    })
  } catch (err: unknown) {
    logger.error('[Cron Reset error]', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// POST도 지원 (일부 cron 서비스는 POST 사용)
export async function POST(request: Request) {
  return GET(request)
}
