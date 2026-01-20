/**
 * Tests for src/lib/metrics.ts
 * Core metrics collection functionality
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
  toPrometheus,
  toOtlp,
} from "@/lib/metrics";

// Mock logger to avoid console noise
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Metrics Module", () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe("recordCounter", () => {
    it("should record a counter with default value of 1", () => {
      recordCounter("test.counter");
      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toHaveLength(1);
      expect(snapshot.counters[0].name).toBe("test.counter");
      expect(snapshot.counters[0].value).toBe(1);
    });

    it("should increment counter on subsequent calls", () => {
      recordCounter("test.counter");
      recordCounter("test.counter");
      recordCounter("test.counter");

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(3);
    });

    it("should record counter with custom value", () => {
      recordCounter("test.counter", 5);
      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters[0].value).toBe(5);
    });

    it("should handle labels correctly", () => {
      recordCounter("api.requests", 1, { service: "tarot", status: "success" });
      recordCounter("api.requests", 1, { service: "tarot", status: "error" });
      recordCounter("api.requests", 1, { service: "tarot", status: "success" });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toHaveLength(2);

      const successCounter = snapshot.counters.find(
        c => c.labels?.status === "success"
      );
      const errorCounter = snapshot.counters.find(
        c => c.labels?.status === "error"
      );

      expect(successCounter?.value).toBe(2);
      expect(errorCounter?.value).toBe(1);
    });

    it("should sort labels alphabetically for consistent keys", () => {
      recordCounter("test", 1, { b: "2", a: "1" });
      recordCounter("test", 1, { a: "1", b: "2" });

      const snapshot = getMetricsSnapshot();
      // Should be same counter due to sorted labels
      expect(snapshot.counters).toHaveLength(1);
      expect(snapshot.counters[0].value).toBe(2);
    });
  });

  describe("recordTiming", () => {
    it("should record timing with count, sum, and max", () => {
      recordTiming("api.latency", 100);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings).toHaveLength(1);
      expect(snapshot.timings[0].name).toBe("api.latency");
      expect(snapshot.timings[0].count).toBe(1);
      expect(snapshot.timings[0].sum).toBe(100);
      expect(snapshot.timings[0].max).toBe(100);
    });

    it("should aggregate multiple timing samples", () => {
      recordTiming("api.latency", 100);
      recordTiming("api.latency", 200);
      recordTiming("api.latency", 150);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].count).toBe(3);
      expect(snapshot.timings[0].sum).toBe(450);
      expect(snapshot.timings[0].max).toBe(200);
      expect(snapshot.timings[0].avg).toBeCloseTo(150);
    });

    it("should handle timing with labels", () => {
      recordTiming("api.latency", 100, { endpoint: "/api/tarot" });
      recordTiming("api.latency", 200, { endpoint: "/api/saju" });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings).toHaveLength(2);
    });

    it("should track maximum value correctly", () => {
      recordTiming("test", 50);
      recordTiming("test", 100);
      recordTiming("test", 25);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].max).toBe(100);
    });
  });

  describe("recordGauge", () => {
    it("should record gauge value", () => {
      recordGauge("active.sessions", 42);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges).toHaveLength(1);
      expect(snapshot.gauges[0].name).toBe("active.sessions");
      expect(snapshot.gauges[0].value).toBe(42);
    });

    it("should replace gauge value on subsequent calls", () => {
      recordGauge("active.sessions", 10);
      recordGauge("active.sessions", 20);
      recordGauge("active.sessions", 15);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges).toHaveLength(1);
      expect(snapshot.gauges[0].value).toBe(15);
    });

    it("should handle gauge with labels", () => {
      recordGauge("memory.usage", 256, { service: "api" });
      recordGauge("memory.usage", 128, { service: "worker" });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges).toHaveLength(2);
    });
  });

  describe("getMetricsSnapshot", () => {
    it("should return empty arrays when no metrics recorded", () => {
      const snapshot = getMetricsSnapshot();

      expect(snapshot.counters).toEqual([]);
      expect(snapshot.timings).toEqual([]);
      expect(snapshot.gauges).toEqual([]);
    });

    it("should calculate average for timings", () => {
      recordTiming("test", 100);
      recordTiming("test", 200);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].avg).toBe(150);
    });

    it("should handle zero count timings", () => {
      // This tests edge case - normally won't happen
      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings).toEqual([]);
    });
  });

  describe("resetMetrics", () => {
    it("should clear all metrics", () => {
      recordCounter("counter1");
      recordTiming("timing1", 100);
      recordGauge("gauge1", 50);

      resetMetrics();

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toEqual([]);
      expect(snapshot.timings).toEqual([]);
      expect(snapshot.gauges).toEqual([]);
    });
  });

  describe("toPrometheus", () => {
    it("should format counters in Prometheus format", () => {
      recordCounter("http_requests_total", 100);

      const output = toPrometheus();
      expect(output).toContain("# TYPE http_requests_total counter");
      expect(output).toContain("http_requests_total 100");
    });

    it("should format counters with labels", () => {
      recordCounter("http_requests_total", 50, { method: "GET", path: "/api" });

      const output = toPrometheus();
      expect(output).toContain('method="GET"');
      expect(output).toContain('path="/api"');
    });

    it("should format gauges in Prometheus format", () => {
      recordGauge("memory_bytes", 1024);

      const output = toPrometheus();
      expect(output).toContain("# TYPE memory_bytes gauge");
      expect(output).toContain("memory_bytes 1024");
    });

    it("should format timings as summary with seconds conversion", () => {
      recordTiming("request_duration", 500); // 500ms

      const output = toPrometheus();
      expect(output).toContain("# TYPE request_duration_seconds summary");
      expect(output).toContain("request_duration_seconds_count 1");
      expect(output).toContain("request_duration_seconds_sum 0.5");
    });

    it("should handle empty metrics", () => {
      const output = toPrometheus();
      expect(output).toBe("");
    });
  });

  describe("toOtlp", () => {
    it("should return OTLP-compatible structure", () => {
      recordCounter("test_counter", 10);
      recordTiming("test_timing", 100);
      recordGauge("test_gauge", 50);

      const output = toOtlp();

      expect(output).toHaveProperty("resourceMetrics");
      expect(output.resourceMetrics).toHaveLength(1);
      expect(output.resourceMetrics[0]).toHaveProperty("scopeMetrics");
    });

    it("should include all metric types", () => {
      recordCounter("counter", 1);
      recordTiming("timing", 100);
      recordGauge("gauge", 50);

      const output = toOtlp();
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics;

      const counterMetric = metrics.find((m: { type: string }) => m.type === "counter");
      const summaryMetric = metrics.find((m: { type: string }) => m.type === "summary");
      const gaugeMetric = metrics.find((m: { type: string }) => m.type === "gauge");

      expect(counterMetric).toBeDefined();
      expect(summaryMetric).toBeDefined();
      expect(gaugeMetric).toBeDefined();
    });

    it("should include timing statistics in OTLP format", () => {
      recordTiming("api.latency", 100);
      recordTiming("api.latency", 200);

      const output = toOtlp();
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics;
      const timing = metrics.find((m: { name: string }) => m.name === "api.latency");

      expect(timing.count).toBe(2);
      expect(timing.sum_ms).toBe(300);
      expect(timing.max_ms).toBe(200);
    });

    it("should handle empty labels", () => {
      recordCounter("test", 1);

      const output = toOtlp();
      const metric = output.resourceMetrics[0].scopeMetrics[0].metrics[0];

      expect(metric.labels).toEqual({});
    });
  });

  describe("Label handling", () => {
    it("should handle numeric label values", () => {
      recordCounter("test", 1, { status_code: 200 });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels?.status_code).toBe(200);
    });

    it("should handle boolean label values", () => {
      recordCounter("test", 1, { cached: true });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels?.cached).toBe(true);
    });

    it("should differentiate metrics by labels", () => {
      recordCounter("requests", 10, { region: "us" });
      recordCounter("requests", 20, { region: "eu" });
      recordCounter("requests", 30, { region: "asia" });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toHaveLength(3);

      const total = snapshot.counters.reduce((sum, c) => sum + c.value, 0);
      expect(total).toBe(60);
    });
  });
});
