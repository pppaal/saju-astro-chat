/**
 * Tests for src/lib/metrics/schema.ts
 * Unified metrics schema definitions and validation
 */
import { describe, it, expect } from "vitest";
import {
  MetricLabels,
  MetricRegistry,
  SLA_THRESHOLDS,
  CounterMetricSchema,
  GaugeMetricSchema,
  SummaryMetricSchema,
  HistogramMetricSchema,
  MetricSchema,
  DashboardTimeRangeSchema,
  DashboardRequestSchema,
  type MetricType,
  type DashboardSummary,
  type DashboardTimeRange,
} from "@/lib/metrics/schema";

describe("Metrics Schema", () => {
  describe("SLA_THRESHOLDS", () => {
    it("should have p95 latency threshold of 700ms", () => {
      expect(SLA_THRESHOLDS.P95_LATENCY_MS).toBe(700);
    });

    it("should have error rate threshold of 0.5%", () => {
      expect(SLA_THRESHOLDS.ERROR_RATE_PERCENT).toBe(0.5);
    });

    it("should have test coverage target of 60%", () => {
      expect(SLA_THRESHOLDS.TEST_COVERAGE_PERCENT).toBe(60);
    });
  });

  describe("MetricLabels", () => {
    it("should define service categories", () => {
      expect(MetricLabels.service).toContain("destiny-map");
      expect(MetricLabels.service).toContain("tarot");
      expect(MetricLabels.service).toContain("dream");
      expect(MetricLabels.service).toContain("astrology");
    });

    it("should define operation types", () => {
      expect(MetricLabels.operation).toContain("create");
      expect(MetricLabels.operation).toContain("read");
      expect(MetricLabels.operation).toContain("generate");
    });

    it("should define status codes", () => {
      expect(MetricLabels.status).toContain("success");
      expect(MetricLabels.status).toContain("error");
      expect(MetricLabels.status).toContain("timeout");
    });

    it("should define supported locales", () => {
      expect(MetricLabels.locale).toContain("ko");
      expect(MetricLabels.locale).toContain("en");
      expect(MetricLabels.locale).toContain("ja");
    });

    it("should define auth states", () => {
      expect(MetricLabels.auth).toContain("authenticated");
      expect(MetricLabels.auth).toContain("anonymous");
      expect(MetricLabels.auth).toContain("premium");
    });

    it("should define error categories", () => {
      expect(MetricLabels.errorCategory).toContain("validation");
      expect(MetricLabels.errorCategory).toContain("auth");
      expect(MetricLabels.errorCategory).toContain("rate_limit");
    });
  });

  describe("MetricRegistry", () => {
    it("should define HTTP request metrics", () => {
      expect(MetricRegistry["http.request.total"]).toBeDefined();
      expect(MetricRegistry["http.request.total"].type).toBe("counter");
      expect(MetricRegistry["http.request.duration"]).toBeDefined();
      expect(MetricRegistry["http.request.duration"].type).toBe("histogram");
    });

    it("should define API metrics", () => {
      expect(MetricRegistry["api.request.total"]).toBeDefined();
      expect(MetricRegistry["api.request.duration"]).toBeDefined();
      expect(MetricRegistry["api.error.total"]).toBeDefined();
    });

    it("should define service-specific metrics", () => {
      expect(MetricRegistry["destiny.report.total"]).toBeDefined();
      expect(MetricRegistry["tarot.reading.total"]).toBeDefined();
      expect(MetricRegistry["dream.analysis.total"]).toBeDefined();
    });

    it("should define auth metrics", () => {
      expect(MetricRegistry["auth.login.total"]).toBeDefined();
      expect(MetricRegistry["auth.session.active"]).toBeDefined();
    });

    it("should define rate limit metrics", () => {
      expect(MetricRegistry["ratelimit.hit.total"]).toBeDefined();
    });

    it("should define credit metrics", () => {
      expect(MetricRegistry["credits.usage.total"]).toBeDefined();
      expect(MetricRegistry["credits.balance"]).toBeDefined();
    });

    it("should define external service metrics", () => {
      expect(MetricRegistry["external.openai.request"]).toBeDefined();
      expect(MetricRegistry["external.openai.tokens"]).toBeDefined();
      expect(MetricRegistry["external.openai.duration"]).toBeDefined();
    });

    it("should define database metrics", () => {
      expect(MetricRegistry["db.query.total"]).toBeDefined();
      expect(MetricRegistry["db.query.duration"]).toBeDefined();
    });

    it("should define cache metrics", () => {
      expect(MetricRegistry["cache.hit"]).toBeDefined();
      expect(MetricRegistry["cache.miss"]).toBeDefined();
    });

    it("should define visitor metrics", () => {
      expect(MetricRegistry["visitors.daily"]).toBeDefined();
      expect(MetricRegistry["visitors.total"]).toBeDefined();
    });

    it("should have proper metric definition structure", () => {
      const metric = MetricRegistry["api.request.total"];
      expect(metric).toHaveProperty("name");
      expect(metric).toHaveProperty("type");
      expect(metric).toHaveProperty("description");
    });
  });

  describe("CounterMetricSchema", () => {
    it("should validate valid counter metric", () => {
      const result = CounterMetricSchema.safeParse({
        name: "test_counter",
        type: "counter",
        value: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should validate counter with labels", () => {
      const result = CounterMetricSchema.safeParse({
        name: "test_counter",
        type: "counter",
        value: 50,
        labels: { service: "tarot", status: "success" },
      });
      expect(result.success).toBe(true);
    });

    it("should validate counter with timestamp", () => {
      const result = CounterMetricSchema.safeParse({
        name: "test_counter",
        type: "counter",
        value: 10,
        timestamp: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid type", () => {
      const result = CounterMetricSchema.safeParse({
        name: "test",
        type: "gauge",
        value: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("GaugeMetricSchema", () => {
    it("should validate valid gauge metric", () => {
      const result = GaugeMetricSchema.safeParse({
        name: "active_sessions",
        type: "gauge",
        value: 42,
      });
      expect(result.success).toBe(true);
    });

    it("should validate gauge with labels", () => {
      const result = GaugeMetricSchema.safeParse({
        name: "memory_usage",
        type: "gauge",
        value: 1024,
        labels: { service: "api" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("SummaryMetricSchema", () => {
    it("should validate valid summary metric", () => {
      const result = SummaryMetricSchema.safeParse({
        name: "request_duration",
        type: "summary",
        count: 100,
        sum: 5000,
        max: 200,
      });
      expect(result.success).toBe(true);
    });

    it("should validate summary with avg", () => {
      const result = SummaryMetricSchema.safeParse({
        name: "request_duration",
        type: "summary",
        count: 100,
        sum: 5000,
        max: 200,
        avg: 50,
      });
      expect(result.success).toBe(true);
    });

    it("should validate summary with labels", () => {
      const result = SummaryMetricSchema.safeParse({
        name: "request_duration",
        type: "summary",
        count: 50,
        sum: 2500,
        max: 100,
        labels: { endpoint: "/api/tarot" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("HistogramMetricSchema", () => {
    it("should validate valid histogram metric", () => {
      const result = HistogramMetricSchema.safeParse({
        name: "request_size",
        type: "histogram",
        buckets: { "100": 10, "500": 20, "1000": 5 },
        count: 35,
        sum: 15000,
      });
      expect(result.success).toBe(true);
    });

    it("should validate histogram with labels", () => {
      const result = HistogramMetricSchema.safeParse({
        name: "response_size",
        type: "histogram",
        buckets: { "1000": 50 },
        count: 50,
        sum: 25000,
        labels: { method: "GET" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("MetricSchema (discriminated union)", () => {
    it("should validate counter metric", () => {
      const result = MetricSchema.safeParse({
        name: "test",
        type: "counter",
        value: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should validate gauge metric", () => {
      const result = MetricSchema.safeParse({
        name: "test",
        type: "gauge",
        value: 50,
      });
      expect(result.success).toBe(true);
    });

    it("should validate summary metric", () => {
      const result = MetricSchema.safeParse({
        name: "test",
        type: "summary",
        count: 10,
        sum: 100,
        max: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should validate histogram metric", () => {
      const result = MetricSchema.safeParse({
        name: "test",
        type: "histogram",
        buckets: { "100": 5 },
        count: 5,
        sum: 250,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid metric type", () => {
      const result = MetricSchema.safeParse({
        name: "test",
        type: "invalid",
        value: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DashboardTimeRangeSchema", () => {
    it("should validate valid time ranges", () => {
      expect(DashboardTimeRangeSchema.safeParse("1h").success).toBe(true);
      expect(DashboardTimeRangeSchema.safeParse("6h").success).toBe(true);
      expect(DashboardTimeRangeSchema.safeParse("24h").success).toBe(true);
      expect(DashboardTimeRangeSchema.safeParse("7d").success).toBe(true);
      expect(DashboardTimeRangeSchema.safeParse("30d").success).toBe(true);
    });

    it("should reject invalid time ranges", () => {
      expect(DashboardTimeRangeSchema.safeParse("2h").success).toBe(false);
      expect(DashboardTimeRangeSchema.safeParse("invalid").success).toBe(false);
      expect(DashboardTimeRangeSchema.safeParse("").success).toBe(false);
    });
  });

  describe("DashboardRequestSchema", () => {
    it("should validate minimal request", () => {
      const result = DashboardRequestSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeRange).toBe("24h"); // default
        expect(result.data.includeRaw).toBe(false); // default
      }
    });

    it("should validate request with timeRange", () => {
      const result = DashboardRequestSchema.safeParse({
        timeRange: "7d",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeRange).toBe("7d");
      }
    });

    it("should validate request with services filter", () => {
      const result = DashboardRequestSchema.safeParse({
        services: ["tarot", "saju"],
      });
      expect(result.success).toBe(true);
    });

    it("should validate request with includeRaw", () => {
      const result = DashboardRequestSchema.safeParse({
        includeRaw: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRaw).toBe(true);
      }
    });

    it("should validate full request", () => {
      const result = DashboardRequestSchema.safeParse({
        timeRange: "1h",
        services: ["tarot"],
        includeRaw: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Type exports", () => {
    it("should export MetricType", () => {
      const types: MetricType[] = ["counter", "gauge", "histogram", "summary"];
      expect(types).toHaveLength(4);
    });

    it("should export DashboardTimeRange", () => {
      const ranges: DashboardTimeRange[] = ["1h", "6h", "24h", "7d", "30d"];
      expect(ranges).toHaveLength(5);
    });

    it("should have correct DashboardSummary structure", () => {
      const summary: DashboardSummary = {
        timeRange: "24h",
        timestamp: new Date().toISOString(),
        overview: {
          totalRequests: 1000,
          errorRate: 0.5,
          avgLatencyMs: 150,
          p95LatencyMs: 500,
          activeUsers: 50,
        },
        services: {
          tarot: {
            requests: 500,
            errors: 2,
            avgLatencyMs: 100,
            p95LatencyMs: 300,
          },
        },
        topErrors: [{ service: "tarot", category: "validation", count: 2 }],
        credits: {
          totalUsed: 100,
          byService: { tarot: 50, saju: 50 },
        },
      };

      expect(summary.timeRange).toBe("24h");
      expect(summary.overview.p95LatencyMs).toBe(500);
    });
  });
});
