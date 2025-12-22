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
}
