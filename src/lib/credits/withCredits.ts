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
  /**
   * Which counter was actually debited. Equals the request `type` in
   * the normal path; may downgrade to 'reading' when the dedicated
   * compat/followUp monthly cap is full and we fall back to general
   * credit. The refund path needs this to credit the right counter.
   */
  chargedAs?: CreditType
}

const GUEST_TAROT_USED_COOKIE = 'tarot_guest_reading_used'
const GUEST_TAROT_INTERPRET_COOKIE = 'tarot_guest_interpret_pass'
const GUEST_TAROT_USED_MAX_AGE = 60 * 60 * 24 * 30
const GUEST_TAROT_INTERPRET_MAX_AGE = 60 * 30
// 비로그인 사용자 무료 리딩 횟수. 카운터는 cookie GUEST_TAROT_USED_COOKIE에
// 숫자로 저장 (legacy '1' 값은 1회 사용한 것으로 호환).
// 게스트는 무료 1회만 — 2회째 draw 부터 로그인 유도. UI 문구('무료 1회')와 일치.
const GUEST_TAROT_FREE_LIMIT = 1

function readCookie(request: CookieReadableRequest | undefined, name: string): string | null {
  return request?.cookies?.get(name)?.value || null
}

function readGuestUsedCount(request: CookieReadableRequest | undefined): number {
  const raw = readCookie(request, GUEST_TAROT_USED_COOKIE)
  if (!raw) return 0
  const n = parseInt(raw, 10)
  if (Number.isFinite(n) && n >= 0) return n
  // legacy boolean '1' = 1회 사용
  return raw === '1' ? 1 : 0
}

function buildGuestReadingDeniedResult(): CreditCheckResult {
  return {
    allowed: false,
    error: `무료 체험 리딩 ${GUEST_TAROT_FREE_LIMIT}회를 모두 사용했습니다. 로그인 후 계속 이용하세요.`,
    errorCode: 'guest_limit_reached',
  }
}

function allowGuestDraw(request?: CookieReadableRequest): CreditCheckResult {
  const used = readGuestUsedCount(request)
  if (used >= GUEST_TAROT_FREE_LIMIT) {
    return buildGuestReadingDeniedResult()
  }

  return {
    allowed: true,
    remaining: GUEST_TAROT_FREE_LIMIT - used - 1,
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
  amount: number = 1,
  request?: CookieReadableRequest
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
  if (result.errorCode === 'not_authenticated' || result.errorCode === 'guest_limit_reached') {
    const response = NextResponse.json(
      { error: result.error, code: result.errorCode },
      { status: 401 }
    )
    // 게스트 무료 체험 한도 → 클라이언트(apiFetch)가 전역 "로그인 유도" 모달을
    // 띄울 수 있도록 헤더 동봉. not_authenticated(일반 인증 오류)에는 붙이지 않는다.
    if (result.errorCode === 'guest_limit_reached') {
      response.headers.set('X-Guest-Limit-Reached', '1')
    }
    return response
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

// applyCreditResultCookies가 request 컨텍스트를 받을 수 있도록 optional 인자 추가.
// request가 있으면 GUEST_TAROT_USED_COOKIE 카운터를 정확히 +1 할 수 있다.
// 없으면 (legacy 호출) draw_granted는 적어도 1로, interpret_granted는 +1.
export function applyCreditResultCookies(
  response: NextResponse,
  result: CreditCheckResult | null | undefined,
  request?: CookieReadableRequest
): NextResponse {
  if (!result?.guestReadingAccess) {
    return response
  }

  const secure = process.env.NODE_ENV === 'production'
  const currentUsed = readGuestUsedCount(request)

  if (result.guestReadingAccess === 'draw_granted') {
    const nextUsed = Math.min(currentUsed + 1, GUEST_TAROT_FREE_LIMIT)
    response.cookies.set(GUEST_TAROT_USED_COOKIE, String(nextUsed), {
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

  // interpret_granted — interpret pass 소비, 카운터는 draw에서 이미 증가
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
      await initializeUserCredits(userId)
    }
  } catch (err) {
    logger.error('[ensureUserCredits] Failed:', err)
  }
}
