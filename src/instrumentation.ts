// src/instrumentation.ts
// Next.js instrumentation file for Sentry error monitoring
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from '@sentry/nextjs'

// Export error handler for nested React Server Components
export const onRequestError = Sentry.captureRequestError

/**
 * Server-side noise filter — Sentry 알림 시그널 대 노이즈 비율 개선.
 * 여기서 null 반환하면 그 event 는 Sentry 로 안 보냄.
 *
 * 필터 기준: "actionable 한가" — 우리가 실제로 코드 수정해야 할 일인가.
 * 아래 패턴들은 모두 의도된/정상적 동작이라 알림 가치 없음.
 */
function shouldDropEvent(event: Sentry.ErrorEvent, hint: Sentry.EventHint): boolean {
  // Dev 모드 — SENTRY_DEBUG 없으면 전부 drop.
  if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
    return true
  }

  const error = hint.originalException
  const errMessage = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase()
  // logger 호출처럼 originalException 없이 message 만 있는 경우 대응.
  const eventMessage = (event.message ?? '').toLowerCase()
  const combined = `${errMessage} ${eventMessage}`

  // 1) Rate limit — 정상 동작 (사용자 abuse 방어가 발화한 것).
  if (combined.includes('too many requests')) return true

  // 2) 인증 실패 — 사용자 facing 401, 우리가 고칠 게 없음.
  if (combined.includes('unauthorized')) return true
  // Admin 라우트의 권한 거부 로그도 같은 카테고리.
  if (combined.includes('unauthorized access attempt')) return true

  // 3) 사용자가 stream/요청 중단 — 페이지 이동·새로고침 등. 빈번하지만 정상.
  if (error instanceof Error && error.name === 'AbortError') return true
  if (combined.includes('the operation was aborted')) return true

  // 4) 크레딧 소진 — 사용자가 다 쓴 것. 결제로 유도되는 정상 흐름.
  if (combined.includes('insufficient_credits')) return true
  if (combined.includes('credit_exhausted')) return true
  if (combined.includes('credits required')) return true

  // 5) Stripe webhook — 정상 방어 동작 (replay attack 차단, 미처리 이벤트 type).
  if (combined.includes('stale event rejected')) return true
  if (combined.includes('unhandled event type')) return true

  // 6) Zod 입력 검증 실패 — 사용자 잘못된 입력. 400 반환만 하면 되는 일.
  if (combined.includes('validation failed')) return true
  if (combined.includes('validation_failed')) return true
  if (combined.includes('invalid_query_parameters')) return true
  if (combined.includes('invalid json body')) return true
  if (combined.includes('invalid json')) return true

  return false
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
      beforeSend(event, hint) {
        if (shouldDropEvent(event, hint)) return null
        return event
      },
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
      // Edge 도 같은 필터 적용 — 작은 부분이지만 일관성.
      beforeSend(event, hint) {
        if (shouldDropEvent(event, hint)) return null
        return event
      },
    })
  }
}
