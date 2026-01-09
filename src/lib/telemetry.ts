// Minimal telemetry helper with basic PII/token scrubbing

const REDACTED = "[redacted]";
const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-api-token",
  "token",
  "secret",
  "password",
  "apikey",
  "access_key",
  "refresh_token",
];

function scrubValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();
  if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) return REDACTED;
  return value;
}

function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 2) return "[truncated]";
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = scrubValue(k, scrubObject(v, depth + 1));
    }
    return out;
  }
  return obj;
}

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...(context ? (scrubObject(context) as Record<string, unknown>) : {}),
  };

  console.error("Server error:", payload);

  // Send to Sentry for real-time alerts
  if (typeof window === 'undefined') {
    // Server-side
    import('@sentry/nextjs').then(Sentry => {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: scrubObject(context) as Record<string, unknown> });
      } else {
        Sentry.captureMessage(String(error), { extra: scrubObject(context) as Record<string, unknown>, level: 'error' });
      }
    }).catch(() => {});
  }
}

/**
 * Capture an exception with Sentry
 * Used for catching errors and sending them to Sentry for monitoring
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  const scrubbedContext = context ? scrubObject(context) as Record<string, unknown> : undefined;

  console.error("Exception captured:", {
    message: error instanceof Error ? error.message : String(error),
    ...(scrubbedContext || {})
  });

  // Send to Sentry
  if (typeof window !== 'undefined') {
    // Client-side
    import('@sentry/nextjs').then(Sentry => {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: scrubbedContext });
      } else {
        Sentry.captureMessage(String(error), { extra: scrubbedContext, level: 'error' });
      }
    }).catch(() => {});
  } else {
    // Server-side
    import('@sentry/nextjs').then(Sentry => {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: scrubbedContext });
      } else {
        Sentry.captureMessage(String(error), { extra: scrubbedContext, level: 'error' });
      }
    }).catch(() => {});
  }
}

/**
 * Track a custom metric
 */
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  // Log locally
  console.log(`[Metric] ${name}: ${value}`, tags || '');

  // Send to Sentry as a custom metric (requires Sentry performance monitoring)
  import('@sentry/nextjs').then(Sentry => {
    Sentry.setMeasurement(name, value, 'none');
  }).catch(() => {});
}
