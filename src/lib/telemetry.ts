// Minimal telemetry helper that logs to console and forwards to Sentry when available.
// Only loads Sentry when DSN is configured to avoid pulling optional deps (Prisma/OTel).

let sentry: any = null;
const hasSentryDsn = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

if (hasSentryDsn) {
  try {
    sentry = require("@sentry/nextjs");
  } catch {
    sentry = null;
  }
}

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  console.error("Server error:", payload);
  if (sentry?.captureException) {
    try {
      sentry.captureException(error, { extra: context });
    } catch (e) {
      console.error("Sentry capture failed:", e);
    }
  }
}
