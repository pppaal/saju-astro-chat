/**
 * Unified Metrics Schema
 *
 * Standardized metric names, labels, and types for consistent
 * monitoring across the application.
 */

import { z } from "zod";

// ============================================================
// Metric Types
// ============================================================

export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  labels?: string[];
}

// ============================================================
// Standard Label Values
// ============================================================

export const MetricLabels = {
  // Service categories
  service: ["destiny-map", "tarot", "dream", "astrology", "compatibility", "iching", "calendar", "counselor"] as const,

  // Operation types
  operation: ["create", "read", "update", "delete", "generate", "interpret", "analyze"] as const,

  // Status codes
  status: ["success", "error", "timeout", "rate_limited", "validation_error"] as const,

  // Locales
  locale: ["ko", "en", "ja", "zh", "vi", "th", "id", "de", "fr", "es"] as const,

  // Auth states
  auth: ["authenticated", "anonymous", "premium"] as const,

  // Error categories
  errorCategory: ["validation", "auth", "rate_limit", "internal", "external", "timeout"] as const,
} as const;

// ============================================================
// SLA Thresholds (Acceptance Criteria)
// ============================================================

export const SLA_THRESHOLDS = {
  /** p95 API response time must be under 700ms */
  P95_LATENCY_MS: 700,
  /** Error rate must be under 0.5% */
  ERROR_RATE_PERCENT: 0.5,
  /** Test coverage target */
  TEST_COVERAGE_PERCENT: 60,
} as const;

// ============================================================
// Metric Definitions (Registry)
// ============================================================

export const MetricRegistry: Record<string, MetricDefinition> = {
  // === HTTP Request Metrics ===
  "http.request.total": {
    name: "http_request_total",
    type: "counter",
    description: "Total HTTP requests",
    labels: ["method", "path", "status_code"],
  },
  "http.request.duration": {
    name: "http_request_duration_seconds",
    type: "histogram",
    description: "HTTP request duration in seconds",
    unit: "seconds",
    labels: ["method", "path"],
  },

  // === API Endpoint Metrics ===
  "api.request.total": {
    name: "api_request_total",
    type: "counter",
    description: "Total API requests by service",
    labels: ["service", "operation", "status"],
  },
  "api.request.duration": {
    name: "api_request_duration_ms",
    type: "summary",
    description: "API request duration",
    unit: "milliseconds",
    labels: ["service", "operation"],
  },
  "api.error.total": {
    name: "api_error_total",
    type: "counter",
    description: "Total API errors",
    labels: ["service", "error_category", "status_code"],
  },

  // === Service-Specific Metrics ===
  "destiny.report.total": {
    name: "destiny_report_total",
    type: "counter",
    description: "Total destiny map reports generated",
    labels: ["theme", "locale", "status"],
  },
  "destiny.report.duration": {
    name: "destiny_report_duration_ms",
    type: "summary",
    description: "Destiny report generation time",
    unit: "milliseconds",
    labels: ["theme", "locale"],
  },

  "tarot.reading.total": {
    name: "tarot_reading_total",
    type: "counter",
    description: "Total tarot readings",
    labels: ["category", "spread", "status"],
  },
  "tarot.interpret.duration": {
    name: "tarot_interpret_duration_ms",
    type: "summary",
    description: "Tarot interpretation time",
    unit: "milliseconds",
    labels: ["category"],
  },

  "dream.analysis.total": {
    name: "dream_analysis_total",
    type: "counter",
    description: "Total dream analyses",
    labels: ["locale", "status"],
  },

  "astrology.chart.total": {
    name: "astrology_chart_total",
    type: "counter",
    description: "Total astrology charts generated",
    labels: ["type", "locale", "status"],
  },

  // === Authentication Metrics ===
  "auth.login.total": {
    name: "auth_login_total",
    type: "counter",
    description: "Total login attempts",
    labels: ["provider", "status"],
  },
  "auth.session.active": {
    name: "auth_session_active",
    type: "gauge",
    description: "Currently active sessions",
    labels: ["auth_type"],
  },

  // === Rate Limiting Metrics ===
  "ratelimit.hit.total": {
    name: "ratelimit_hit_total",
    type: "counter",
    description: "Rate limit hits",
    labels: ["endpoint", "limit_type"],
  },

  // === Credit System Metrics ===
  "credits.usage.total": {
    name: "credits_usage_total",
    type: "counter",
    description: "Credits consumed",
    labels: ["service", "auth"],
  },
  "credits.balance": {
    name: "credits_balance",
    type: "gauge",
    description: "Current credit balance",
    labels: ["user_type"],
  },

  // === External Service Metrics ===
  "external.openai.request": {
    name: "external_openai_request_total",
    type: "counter",
    description: "OpenAI API requests",
    labels: ["model", "status"],
  },
  "external.openai.tokens": {
    name: "external_openai_tokens_total",
    type: "counter",
    description: "OpenAI tokens consumed",
    labels: ["model", "type"],
  },
  "external.openai.duration": {
    name: "external_openai_duration_ms",
    type: "summary",
    description: "OpenAI API latency",
    unit: "milliseconds",
    labels: ["model"],
  },

  // === Database Metrics ===
  "db.query.total": {
    name: "db_query_total",
    type: "counter",
    description: "Database queries executed",
    labels: ["operation", "table"],
  },
  "db.query.duration": {
    name: "db_query_duration_ms",
    type: "summary",
    description: "Database query duration",
    unit: "milliseconds",
    labels: ["operation"],
  },

  // === Cache Metrics ===
  "cache.hit": {
    name: "cache_hit_total",
    type: "counter",
    description: "Cache hits",
    labels: ["cache_type", "key_prefix"],
  },
  "cache.miss": {
    name: "cache_miss_total",
    type: "counter",
    description: "Cache misses",
    labels: ["cache_type", "key_prefix"],
  },

  // === Visitor Metrics ===
  "visitors.daily": {
    name: "visitors_daily",
    type: "gauge",
    description: "Daily unique visitors",
    labels: [],
  },
  "visitors.total": {
    name: "visitors_total",
    type: "counter",
    description: "Total visitors",
    labels: [],
  },
} as const;

// ============================================================
// Zod Schemas for Validation
// ============================================================

export const MetricLabelSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const CounterMetricSchema = z.object({
  name: z.string(),
  type: z.literal("counter"),
  value: z.number(),
  labels: MetricLabelSchema.optional(),
  timestamp: z.number().optional(),
});

export const GaugeMetricSchema = z.object({
  name: z.string(),
  type: z.literal("gauge"),
  value: z.number(),
  labels: MetricLabelSchema.optional(),
  timestamp: z.number().optional(),
});

export const SummaryMetricSchema = z.object({
  name: z.string(),
  type: z.literal("summary"),
  count: z.number(),
  sum: z.number(),
  max: z.number(),
  avg: z.number().optional(),
  labels: MetricLabelSchema.optional(),
  timestamp: z.number().optional(),
});

export const HistogramMetricSchema = z.object({
  name: z.string(),
  type: z.literal("histogram"),
  buckets: z.record(z.number()),
  count: z.number(),
  sum: z.number(),
  labels: MetricLabelSchema.optional(),
  timestamp: z.number().optional(),
});

export const MetricSchema = z.discriminatedUnion("type", [
  CounterMetricSchema,
  GaugeMetricSchema,
  SummaryMetricSchema,
  HistogramMetricSchema,
]);

export type CounterMetric = z.infer<typeof CounterMetricSchema>;
export type GaugeMetric = z.infer<typeof GaugeMetricSchema>;
export type SummaryMetric = z.infer<typeof SummaryMetricSchema>;
export type HistogramMetric = z.infer<typeof HistogramMetricSchema>;
export type Metric = z.infer<typeof MetricSchema>;

// ============================================================
// Dashboard Data Schema
// ============================================================

export const DashboardTimeRangeSchema = z.enum(["1h", "6h", "24h", "7d", "30d"]);
export type DashboardTimeRange = z.infer<typeof DashboardTimeRangeSchema>;

export const DashboardRequestSchema = z.object({
  timeRange: DashboardTimeRangeSchema.default("24h"),
  services: z.array(z.string()).optional(),
  includeRaw: z.boolean().default(false),
});
export type DashboardRequest = z.infer<typeof DashboardRequestSchema>;

export interface DashboardSummary {
  timeRange: DashboardTimeRange;
  timestamp: string;
  overview: {
    totalRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    activeUsers: number;
  };
  services: Record<string, {
    requests: number;
    errors: number;
    avgLatencyMs: number;
    p95LatencyMs?: number;
  }>;
  topErrors: Array<{
    service: string;
    category: string;
    count: number;
  }>;
  credits: {
    totalUsed: number;
    byService: Record<string, number>;
  };
}
