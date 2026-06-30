/**
 * Secret redaction for log/telemetry sinks.
 *
 * Deliberately self-contained — it imports NOTHING from the logger (or any
 * heavy module), so the logger can import it without an import cycle. Unlike
 * errorSanitizer.ts (which produces short, generic *client-facing* messages and
 * also strips file paths/IPs), this strips only secret-shaped substrings and
 * preserves length/shape, so it is safe to run on full multi-line stack traces
 * without destroying their debug value.
 */

/** Secret/credential-shaped substrings that must never reach console/Sentry. */
const SECRET_PATTERNS: ReadonlyArray<RegExp> = [
  /sk-[a-zA-Z0-9-_]{32,}/gi, // OpenAI API keys
  /sk_live_[a-zA-Z0-9]{24,}/gi, // Stripe live secret keys
  /sk_test_[a-zA-Z0-9]{24,}/gi, // Stripe test secret keys
  /rk_live_[a-zA-Z0-9]{24,}/gi, // Stripe restricted keys
  /whsec_[a-zA-Z0-9]{24,}/gi, // Stripe webhook signing secrets
  /Bearer\s+[a-zA-Z0-9-_=.]+/gi, // Bearer tokens (JWT included)
  /Basic\s+[a-zA-Z0-9+/=]{8,}/gi, // Basic auth tokens
  /[a-zA-Z0-9_-]*(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)[a-zA-Z0-9_-]*\s*[:=]\s*['"]?[a-zA-Z0-9-_]{8,}['"]?/gi, // key=value secrets
  /postgres(?:ql)?:\/\/[^\s@]*@[^\s]+/gi, // Postgres connection strings
  /mysql:\/\/[^\s@]*@[^\s]+/gi,
  /mongodb(?:\+srv)?:\/\/[^\s@]*@[^\s]+/gi,
  /redis(?:s)?:\/\/[^\s@]*@[^\s]+/gi,
  /AKIA[0-9A-Z]{16}/g, // AWS access key id
  /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/g, // GitHub tokens
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // email addresses (PII)
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWTs
]

/**
 * Replace secret-shaped substrings with [REDACTED], preserving everything else.
 * Returns '' for non-string input.
 */
export function redactSecrets(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return ''
  let out = text
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]')
  }
  return out
}
