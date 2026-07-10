// Minimal telemetry helper with basic PII/token scrubbing

import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'
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

const REDACTED = '[redacted]'
// 부분일치(substring) 로 가리는 키 — 이 토큰이 키 이름에 포함되면 값 마스킹.
const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-api-token',
  'token',
  'secret',
  'password',
  'apikey',
  'access_key',
  'refresh_token',
  // 출생/위치 PII — 이 제품의 실제 민감 데이터 클래스. (DataRedactor 가 같은
  // 필드를 마스킹하도록 만들어졌지만 로거에 연결돼 있지 않았다.)
  'birthdate',
  'birthtime',
  'birthday',
  'latitude',
  'longitude',
  'email',
]
// 정확일치(exact) 로만 가리는 키 — 'name'/'lat'/'lng' 를 substring 으로 쓰면
// username/filename/eventName 등 무해한 키까지 과도하게 마스킹되므로 분리한다.
const SENSITIVE_KEYS_EXACT = ['name', 'lat', 'lng', 'lon']

function scrubValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase()
  if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k)) || SENSITIVE_KEYS_EXACT.includes(lowerKey)) {
    return REDACTED
  }
  return value
}

function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 2) {
    return '[truncated]'
  }
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map((v) => scrubObject(v, depth + 1))
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = scrubValue(k, scrubObject(v, depth + 1))
    }
    return out
  }
  return obj
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
  // logger.sendToSentry → captureServerError → logger.error → … 무한 상호
  // 재귀로 이벤트 루프가 고정돼 인스턴스 전체가 wedge 된다(cron 라우트가
  // 영영 안 끝나던 CI 실패의 근본 원인). 콘솔 직행이 재귀의 종단점.
  console.error('[telemetry] Server error:', JSON.stringify(payload))

  // Send to Sentry for real-time alerts
  if (typeof window === 'undefined') {
    // Server-side
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (error instanceof Error) {
          Sentry.captureException(error, { extra: scrubObject(context) as Record<string, unknown> })
        } else {
          Sentry.captureMessage(String(error), {
            extra: scrubObject(context) as Record<string, unknown>,
            level: 'error',
          })
        }
      })
      .catch(() => {})
  }
}

/**
 * Capture an exception with Sentry
 * Used for catching errors and sending them to Sentry for monitoring
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  const scrubbedContext = context ? (scrubObject(context) as Record<string, unknown>) : undefined

  // captureServerError 와 동일 — logger.error 재진입 금지(무한 상호 재귀).
  console.error(
    '[telemetry] Exception captured:',
    error instanceof Error ? error.message : String(error),
    scrubbedContext ? JSON.stringify(scrubbedContext) : ''
  )

  // Send to Sentry
  if (typeof window !== 'undefined') {
    // Client-side
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (error instanceof Error) {
          Sentry.captureException(error, { extra: scrubbedContext })
        } else {
          Sentry.captureMessage(String(error), { extra: scrubbedContext, level: 'error' })
        }
      })
      .catch(() => {})
  } else {
    // Server-side
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (error instanceof Error) {
          Sentry.captureException(error, { extra: scrubbedContext })
        } else {
          Sentry.captureMessage(String(error), { extra: scrubbedContext, level: 'error' })
        }
      })
      .catch(() => {})
  }
}

/**
 * Track a custom metric
 */
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  // Log locally
  logger.debug(`[Metric] ${name}: ${value}`, tags || '')

  // Send to Sentry as a custom metric (requires Sentry performance monitoring)
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.setMeasurement(name, value, 'none')
    })
    .catch(() => {})
}
