/**
 * Unified Metrics Module
 *
 * Re-exports core metrics functionality with unified schema support.
 */

// Core metrics functions from original implementation
export {
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
  toPrometheus,
  toOtlp,
} from "../metrics";

// Unified schema and types
export * from "./schema";

// Helper functions for standardized metric recording
import { recordCounter, recordTiming } from "../metrics";
import { MetricLabels } from "./schema";

type Labels = Record<string, string | number | boolean>;

/**
 * Record API request with standardized labels
 */
export function recordApiRequest(
  service: (typeof MetricLabels.service)[number],
  operation: (typeof MetricLabels.operation)[number],
  status: (typeof MetricLabels.status)[number],
  durationMs?: number
) {
  recordCounter("api.request.total", 1, { service, operation, status });

  if (durationMs !== undefined) {
    recordTiming("api.request.duration", durationMs, { service, operation });
  }

  if (status === "error" || status === "validation_error" || status === "timeout") {
    recordCounter("api.error.total", 1, { service, error_category: status, status_code: "500" });
  }
}

/**
 * Record service-specific operation
 */
export function recordServiceOperation(
  service: (typeof MetricLabels.service)[number],
  status: "success" | "error",
  durationMs: number,
  extraLabels?: Labels
) {
  const metricName = `${service.replace("-", "_")}.operation`;
  recordCounter(metricName, 1, { status, ...extraLabels });
  recordTiming(`${metricName}.duration`, durationMs, extraLabels);
}

/**
 * Record authentication event
 */
export function recordAuthEvent(
  event: "login" | "logout" | "session_start" | "session_end",
  provider: string,
  status: "success" | "error"
) {
  recordCounter("auth.event.total", 1, { event, provider, status });
}

/**
 * Record rate limit hit
 */
export function recordRateLimitHit(endpoint: string, limitType: "ip" | "user" | "global" = "ip") {
  recordCounter("ratelimit.hit.total", 1, { endpoint, limit_type: limitType });
}

/**
 * Record credit usage
 */
export function recordCreditUsage(
  service: (typeof MetricLabels.service)[number],
  amount: number,
  auth: (typeof MetricLabels.auth)[number]
) {
  recordCounter("credits.usage.total", amount, { service, auth });
}

/**
 * Record external API call (OpenAI, etc.)
 */
export function recordExternalCall(
  provider: "openai" | "stripe" | "sentry",
  model: string,
  status: "success" | "error",
  durationMs: number,
  tokens?: { input?: number; output?: number }
) {
  recordCounter(`external.${provider}.request`, 1, { model, status });
  recordTiming(`external.${provider}.duration`, durationMs, { model });

  if (tokens) {
    if (tokens.input) {
      recordCounter(`external.${provider}.tokens`, tokens.input, { model, type: "input" });
    }
    if (tokens.output) {
      recordCounter(`external.${provider}.tokens`, tokens.output, { model, type: "output" });
    }
  }
}

/**
 * Record cache operation
 */
export function recordCacheOperation(
  cacheType: "redis" | "memory" | "firestore",
  hit: boolean,
  keyPrefix: string
) {
  if (hit) {
    recordCounter("cache.hit", 1, { cache_type: cacheType, key_prefix: keyPrefix });
  } else {
    recordCounter("cache.miss", 1, { cache_type: cacheType, key_prefix: keyPrefix });
  }
}
