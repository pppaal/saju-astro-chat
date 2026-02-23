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

  // 비로그인 시 free 1회 허용 (별도 로직 필요)
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

  // 크레딧 체크
  const canUse = await canUseCredits(userId, type, amount)
  if (!canUse.allowed) {
    const errorMessages: Record<string, string> = {
      no_credits: '이번 달 리딩 횟수를 모두 사용했습니다. 플랜을 업그레이드하세요.',
      compatibility_limit: '이번 달 궁합 분석 횟수를 모두 사용했습니다.',
      followup_limit: '이번 달 후속질문 횟수를 모두 사용했습니다.',
    }

    // Get detailed limit info for compatibility/followUp errors
    let limitInfo
    if (canUse.reason === 'compatibility_limit' || canUse.reason === 'followup_limit') {
      const userCredits = await getUserCredits(userId)
      if (userCredits) {
        const isCompatibility = canUse.reason === 'compatibility_limit'
        limitInfo = {
          used: isCompatibility ? userCredits.compatibilityUsed : userCredits.followUpUsed,
          limit: isCompatibility ? userCredits.compatibilityLimit : userCredits.followUpLimit,
          planName: userCredits.plan || 'Free',
        }
      }
    }

    return {
      allowed: false,
      userId,
      error: errorMessages[canUse.reason || ''] || '크레딧이 부족합니다',
      errorCode: canUse.reason,
      remaining: canUse.remaining,
      limitInfo,
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
      await initializeUserCredits(userId, 'free')
    }
  } catch (err) {
    logger.error('[ensureUserCredits] Failed:', err)
  }
}
