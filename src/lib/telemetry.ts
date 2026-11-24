// Minimal telemetry helper with basic PII/token scrubbing.
//
// Scrubbing and the Sentry capture live in @/lib/logger/sentrySink, which the
// logger also uses. telemetry must not import '@/lib/logger': the logger
// forwards errors to Sentry through the sink, and a telemetry -> logger edge
// would bring back the logger <-> telemetry cycle.

import * as Sentry from '@sentry/nextjs'
import { captureToSentry, scrubObject } from '@/lib/logger/sentrySink'
import { redactSecrets } from '@/lib/security/logRedaction'

/**
 * Wrap an async unit of work in a Sentry span so it shows up as a named
 * child in the surrounding transaction's waterfall.
 *
 * Used to break down where time goes on hot user paths (e.g. the
 * /destiny-counselor entry: profile fetch -> saju/astrology compute ->
 * chat-history). When tracing is disabled or no transaction is active,
 * `Sentry.startSpan` simply runs the callback, so this is safe to call
 * unconditionally on both client and server.
 *
 * @param name Span name shown in Sentry (e.g. "counselor.saju").
 * @param op   Span operation/category (e.g. "http.client", "function").
 * @param fn   The async work to time.
 */
export function withSpan<T>(name: string, op: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name, op }, fn)
}

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const payload = {
    // message/stack 에 박힌 시크릿(연결 문자열·토큰·키)·이메일을 redact 한 뒤
    // 로그로 보낸다. context 는 scrubObject 가 키 기준으로 마스킹.
    message: redactSecrets(error instanceof Error ? error.message : String(error)),
    stack: error instanceof Error ? redactSecrets(error.stack) : undefined,
    ...(context ? (scrubObject(context) as Record<string, unknown>) : {}),
  }

  // 여기서 logger.error 를 부르면 안 된다: logger.error(프로덕션) →
  // logger.sendToSentry → … → logger.error 무한 상호 재귀로 이벤트 루프가
  // 고정돼 인스턴스 전체가 wedge 된다(cron 라우트가 영영 안 끝나던 CI 실패의
  // 근본 원인). 콘솔 직행이 재귀의 종단점(recursion terminal).
  console.error('[telemetry] Server error:', JSON.stringify(payload))

  // Send to Sentry for real-time alerts (server-side only)
  if (typeof window === 'undefined') {
    captureToSentry(error, context)
  }
}

/**
 * Capture an exception with Sentry
 * Used for catching errors and sending them to Sentry for monitoring
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  const scrubbedContext = context ? (scrubObject(context) as Record<string, unknown>) : undefined

  // captureServerError 와 동일 — logger.error 재진입 금지(무한 상호 재귀).
  // 콘솔 직행이 재귀의 종단점(recursion terminal).
  console.error(
    '[telemetry] Exception captured:',
    error instanceof Error ? error.message : String(error),
    scrubbedContext ? JSON.stringify(scrubbedContext) : ''
  )

  // Send to Sentry (client and server)
  captureToSentry(error, context)
}
