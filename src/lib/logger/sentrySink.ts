// src/lib/logger/sentrySink.ts
//
// Sentry sink shared by the logger and telemetry: context scrubbing plus the
// actual Sentry capture.
//
// This module imports neither '@/lib/logger' nor '@/lib/telemetry'. The graph
// is one-way (logger/index -> sentrySink, telemetry -> sentrySink), so there is
// no logger <-> telemetry import cycle.
//
// Never log from here: logger.error -> sendToSentry -> captureToSentry ->
// logger.error would recurse forever and wedge the instance. A failure to reach
// Sentry is swallowed.

const REDACTED = '[redacted]'

// Substring match: a key whose lower-cased name contains one of these tokens
// has its value masked.
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
  // Birth/location PII: the product's real sensitive data class.
  'birthdate',
  'birthtime',
  'birthday',
  'latitude',
  'longitude',
  'email',
]

// Exact match only: as substrings, 'name'/'lat'/'lng' would also mask harmless
// keys such as username, filename or eventName.
const SENSITIVE_KEYS_EXACT = ['name', 'lat', 'lng', 'lon']

function scrubValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase()
  if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k)) || SENSITIVE_KEYS_EXACT.includes(lowerKey)) {
    return REDACTED
  }
  return value
}

/** Mask sensitive keys (see SENSITIVE_KEYS) up to two levels deep. */
export function scrubObject(obj: unknown, depth = 0): unknown {
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

/**
 * Send an error to Sentry with scrubbed context. An Error goes through
 * captureException; any other value becomes an error-level captureMessage.
 * Loads @sentry/nextjs lazily, works on client and server, and never throws.
 */
export function captureToSentry(error: unknown, context?: Record<string, unknown>): void {
  const extra = context ? (scrubObject(context) as Record<string, unknown>) : undefined
  import('@sentry/nextjs')
    .then((Sentry) => {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra })
      } else {
        Sentry.captureMessage(String(error), { extra, level: 'error' })
      }
    })
    .catch(() => {
      // Sentry unavailable: swallow (logging here would recurse).
    })
}
