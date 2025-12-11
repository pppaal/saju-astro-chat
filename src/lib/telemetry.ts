// Minimal telemetry helper - Sentry disabled

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  console.error("Server error:", payload);
}
