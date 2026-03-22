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

type CookieReadableRequest = {
  cookies?: {
    get: (name: string) => { value: string } | undefined
  }
}

type GuestReadingAccess = 'draw_granted' | 'interpret_granted'

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
  guestReadingAccess?: GuestReadingAccess
}

const GUEST_TAROT_USED_COOKIE = 'tarot_guest_reading_used'
const GUEST_TAROT_INTERPRET_COOKIE = 'tarot_guest_interpret_pass'
const GUEST_TAROT_USED_MAX_AGE = 60 * 60 * 24 * 365
const GUEST_TAROT_INTERPRET_MAX_AGE = 60 * 30

function readCookie(request: CookieReadableRequest | undefined, name: string): string | null {
  return request?.cookies?.get(name)?.value || null
}

function buildGuestReadingDeniedResult(): CreditCheckResult {
  return {
    allowed: false,
    error: '무료 체험 리딩은 이미 사용했습니다. 로그인 후 계속 이용하세요.',
    errorCode: 'guest_limit_reached',
  }
}

function allowGuestDraw(request?: CookieReadableRequest): CreditCheckResult {
  const alreadyUsed = readCookie(request, GUEST_TAROT_USED_COOKIE) === '1'
  if (alreadyUsed) {
    return buildGuestReadingDeniedResult()
  }

  return {
    allowed: true,
    remaining: 0,
    guestReadingAccess: 'draw_granted',
  }
}

function allowGuestInterpret(request?: CookieReadableRequest): CreditCheckResult {
  const hasInterpretPass = readCookie(request, GUEST_TAROT_INTERPRET_COOKIE) === '1'
  if (!hasInterpretPass) {
    return {
      allowed: false,
      error: '무료 리딩 권한이 없습니다. 먼저 카드 뽑기를 시작하세요.',
      errorCode: 'not_authenticated',
    }
  }

  return {
    allowed: true,
    remaining: 0,
    guestReadingAccess: 'interpret_granted',
  }
}

/**
 * 크레딧 체크 및 소비 헬퍼
 * API route에서 사용
 */
export async function checkAndConsumeCredits(
  type: CreditType = 'reading',
  amount: number = 1,
  request?: CookieReadableRequest
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return type === 'reading'
      ? allowGuestInterpret(request)
      : {
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
  amount: number = 1,
  request?: CookieReadableRequest
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return type === 'reading'
      ? allowGuestDraw(request)
      : {
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
  if (result.errorCode === 'not_authenticated' || result.errorCode === 'guest_limit_reached') {
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

export function applyCreditResultCookies(
  response: NextResponse,
  result: CreditCheckResult | null | undefined
): NextResponse {
  if (!result?.guestReadingAccess) {
    return response
  }

  const secure = process.env.NODE_ENV === 'production'

  if (result.guestReadingAccess === 'draw_granted') {
    response.cookies.set(GUEST_TAROT_USED_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: GUEST_TAROT_USED_MAX_AGE,
    })
    response.cookies.set(GUEST_TAROT_INTERPRET_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: GUEST_TAROT_INTERPRET_MAX_AGE,
    })
    return response
  }

  response.cookies.set(GUEST_TAROT_USED_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: GUEST_TAROT_USED_MAX_AGE,
  })
  response.cookies.set(GUEST_TAROT_INTERPRET_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  })

  return response
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
