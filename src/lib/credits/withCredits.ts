import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  consumeCredits,
  canUseCredits,
  getUserCredits,
  initializeUserCredits,
} from './creditService'
import { logger } from '@/lib/logger'

export type CreditType = 'reading' | 'compatibility' | 'followUp'

interface CreditCheckResult {
  allowed: boolean
  userId?: string
  error?: string
  errorCode?: string
  remaining?: number
  limitInfo?: {
    used: number
    limit: number
    planName?: string
  }
  /**
   * Which counter was actually debited. Equals the request `type` in
   * the normal path; may downgrade to 'reading' when the dedicated
   * compat/followUp monthly cap is full and we fall back to general
   * credit. The refund path needs this to credit the right counter.
   */
  chargedAs?: CreditType
}

/**
 * 크레딧 체크 및 소비 헬퍼
 * API route에서 사용
 */
export async function checkAndConsumeCredits(
  type: CreditType = 'reading',
  amount: number = 1
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions)

  // 게스트(비로그인) 무료 리딩 폐지 — 모든 gated 액션은 로그인 필수.
  // (쿠키 우회 남용 + 기록 미저장 문제로 제거, audit 2026-06)
  if (!session?.user?.id) {
    return {
      allowed: false,
      error: '로그인이 필요합니다',
      errorCode: 'not_authenticated',
    }
  }

  const userId = session.user.id

  // 보안: 개발 환경에서만 크레딧 우회 허용 (NODE_ENV 체크)
  // 프로덕션에서는 절대 우회 불가
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  const bypassEnabled = process.env.BYPASS_CREDITS === 'true' && isDevelopment

  if (bypassEnabled) {
    logger.warn('[DEV ONLY] Credit check bypassed', { userId })
    return {
      allowed: true,
      userId,
      remaining: 9999,
    }
  }

  // 프로덕션에서 BYPASS_CREDITS가 설정된 경우 경고
  if (process.env.BYPASS_CREDITS === 'true' && !isDevelopment) {
    logger.error(
      'SECURITY WARNING: BYPASS_CREDITS is enabled in production! This is a critical security issue.'
    )
  }

  // 크레딧 체크 (크레딧 전용 — 종류 구분 없이 일반 크레딧 소비)
  const canUse = await canUseCredits(userId, type, amount)
  if (!canUse.allowed) {
    return {
      allowed: false,
      userId,
      error: '크레딧이 부족합니다. 충전 후 다시 시도해 주세요.',
      errorCode: canUse.reason,
      remaining: canUse.remaining,
    }
  }

  // 크레딧 소비
  const consumeResult = await consumeCredits(userId, type, amount)
  if (!consumeResult.success) {
    return {
      allowed: false,
      userId,
      error: '크레딧 차감 중 오류가 발생했습니다',
      errorCode: consumeResult.error,
    }
  }

  return {
    allowed: true,
    userId,
    remaining: canUse.remaining,
    // chargedAs reflects which counter actually got debited: it will
    // equal `type` for the normal case, but may downgrade to 'reading'
    // when the monthly compat/followUp cap was exhausted and we fell
    // back to general credit. Pass it on so the refund path can put
    // the credit back on the right counter when the route fails.
    chargedAs: consumeResult.chargedAs ?? type,
  }
}

/**
 * 크레딧 체크만 (소비 안 함)
 * pre-check용
 */
export async function checkCreditsOnly(
  type: CreditType = 'reading',
  amount: number = 1
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions)

  // 게스트(비로그인) 무료 리딩 폐지 — 로그인 필수. (audit 2026-06)
  if (!session?.user?.id) {
    return {
      allowed: false,
      error: '로그인이 필요합니다',
      errorCode: 'not_authenticated',
    }
  }

  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  const bypassEnabled = process.env.BYPASS_CREDITS === 'true' && isDevelopment

  // 개발/테스트 환경에서 크레딧 우회
  if (bypassEnabled) {
    return {
      allowed: true,
      userId: session.user.id,
      remaining: 9999,
    }
  }

  // 프로덕션에서 BYPASS_CREDITS가 설정된 경우 경고
  if (process.env.BYPASS_CREDITS === 'true' && !isDevelopment) {
    logger.error(
      'SECURITY WARNING: BYPASS_CREDITS is enabled in production! This is a critical security issue.'
    )
  }

  const canUse = await canUseCredits(session.user.id, type, amount)
  return {
    allowed: canUse.allowed,
    userId: session.user.id,
    error: canUse.allowed ? undefined : '크레딧이 부족합니다',
    errorCode: canUse.reason,
    remaining: canUse.remaining,
  }
}

/**
 * NextResponse 에러 반환 헬퍼
 */
export function creditErrorResponse(result: CreditCheckResult): NextResponse {
  // 비로그인 → 401. 클라이언트(apiFetch)가 전역 "로그인 유도" 모달을 띄운다.
  if (result.errorCode === 'not_authenticated') {
    return NextResponse.json({ error: result.error, code: result.errorCode }, { status: 401 })
  }

  return NextResponse.json(
    {
      error: result.error,
      code: result.errorCode,
      remaining: result.remaining,
      limitInfo: result.limitInfo,
      upgradeUrl: '/pricing',
    },
    { status: 402 } // Payment Required
  )
}

/**
 * 유저 가입 시 크레딧 초기화 훅
 * (NextAuth callbacks에서 사용)
 */
export async function ensureUserCredits(userId: string): Promise<void> {
  try {
    const credits = await getUserCredits(userId)
    if (!credits) {
      await initializeUserCredits(userId)
    }
  } catch (err) {
    logger.error('[ensureUserCredits] Failed:', err)
  }
}
