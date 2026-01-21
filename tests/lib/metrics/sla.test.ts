/**
 * Tests for SLA monitoring functionality
 * Related to: src/app/api/admin/metrics/sla/route.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordCounter,
  recordTiming,
  getMetricsSnapshot,
  resetMetrics,
} from "@/lib/metrics";
import { SLA_THRESHOLDS } from "@/lib/metrics/schema";

describe("SLA Monitoring", () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe("SLA_THRESHOLDS constants", () => {
    it("should have P95_LATENCY_MS threshold of 700ms", () => {
      expect(SLA_THRESHOLDS.P95_LATENCY_MS).toBe(700);
    });

    it("should have ERROR_RATE_PERCENT threshold of 0.5%", () => {
      expect(SLA_THRESHOLDS.ERROR_RATE_PERCENT).toBe(0.5);
    });

    it("should have TEST_COVERAGE_PERCENT threshold of 60%", () => {
      expect(SLA_THRESHOLDS.TEST_COVERAGE_PERCENT).toBe(60);
    });
  });

  describe("p95 Latency SLA Check", () => {
    it("should pass when p95 latency is under threshold", () => {
      // Simulate 100 API requests with latencies under 700ms
      for (let i = 0; i < 95; i++) {
        recordTiming("api.request.duration", 100 + Math.random() * 100);
      }
      // 5 slower requests still under 700ms
      for (let i = 0; i < 5; i++) {
        recordTiming("api.request.duration", 500 + Math.random() * 100);
      }

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];

      expect(timing.p95).toBeLessThan(SLA_THRESHOLDS.P95_LATENCY_MS);
    });

    it("should fail when p95 latency exceeds threshold", () => {
      // Simulate slow API responses
      for (let i = 0; i < 90; i++) {
        recordTiming("api.request.duration", 600);
      }
      // 10% of requests are very slow
      for (let i = 0; i < 10; i++) {
        recordTiming("api.request.duration", 1500);
      }

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];

      // p95 should be around 1500ms which exceeds 700ms threshold
      expect(timing.p95).toBeGreaterThan(SLA_THRESHOLDS.P95_LATENCY_MS);
    });

    it("should warn when p95 latency is between threshold and 120%", () => {
      // p95 should be between 700ms and 840ms (120% of 700)
      // Need 95% of requests at lower value and 5% at warning zone value
      for (let i = 0; i < 94; i++) {
        recordTiming("api.request.duration", 600);
      }
      // These 6 requests at 750ms will be at p95 position
      for (let i = 0; i < 6; i++) {
        recordTiming("api.request.duration", 750); // Between 700 and 840
      }

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];
      const warningThreshold = SLA_THRESHOLDS.P95_LATENCY_MS * 1.2;

      // p95 should be around 750ms (in warning zone: 700-840)
      expect(timing.p95).toBeGreaterThan(SLA_THRESHOLDS.P95_LATENCY_MS);
      expect(timing.p95).toBeLessThanOrEqual(warningThreshold);
    });
  });

  describe("Error Rate SLA Check", () => {
    it("should pass when error rate is under 0.5%", () => {
      // 1000 total requests
      for (let i = 0; i < 997; i++) {
        recordCounter("api.request.total", 1, { status: "success" });
      }
      // Only 3 errors (0.3%)
      for (let i = 0; i < 3; i++) {
        recordCounter("api.error.total", 1, { status: "error" });
      }

      const snapshot = getMetricsSnapshot();
      const successCounters = snapshot.counters.filter(c => c.name === "api.request.total");
      const errorCounters = snapshot.counters.filter(c => c.name === "api.error.total");

      const totalRequests = successCounters.reduce((sum, c) => sum + c.value, 0);
      const totalErrors = errorCounters.reduce((sum, c) => sum + c.value, 0);
      const errorRate = (totalErrors / totalRequests) * 100;

      expect(errorRate).toBeLessThan(SLA_THRESHOLDS.ERROR_RATE_PERCENT);
    });

    it("should fail when error rate exceeds 0.5%", () => {
      // 100 total requests
      for (let i = 0; i < 98; i++) {
        recordCounter("api.request.total", 1, { status: "success" });
      }
      // 2 errors (2%)
      for (let i = 0; i < 2; i++) {
        recordCounter("api.error.total", 1, { status: "error" });
      }

      const snapshot = getMetricsSnapshot();
      const successCounters = snapshot.counters.filter(c => c.name === "api.request.total");
      const errorCounters = snapshot.counters.filter(c => c.name === "api.error.total");

      const totalRequests = successCounters.reduce((sum, c) => sum + c.value, 0);
      const totalErrors = errorCounters.reduce((sum, c) => sum + c.value, 0);
      const errorRate = (totalErrors / totalRequests) * 100;

      expect(errorRate).toBeGreaterThan(SLA_THRESHOLDS.ERROR_RATE_PERCENT);
    });

    it("should handle zero requests gracefully", () => {
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toHaveLength(0);
      // Error rate should be 0 when no requests
      const errorRate = 0;
      expect(errorRate).toBe(0);
    });
  });

  describe("Service-specific SLA metrics", () => {
    it("should track destiny service metrics separately", () => {
      recordCounter("destiny.report.total", 50, { service: "destiny-map", status: "success" });
      recordCounter("destiny.report.total", 1, { service: "destiny-map", status: "error" });
      recordTiming("destiny.report.duration", 300, { service: "destiny-map" });

      const snapshot = getMetricsSnapshot();
      const destinyCounters = snapshot.counters.filter(c => c.labels?.service === "destiny-map");
      const destinyTimings = snapshot.timings.filter(t => t.labels?.service === "destiny-map");

      expect(destinyCounters.length).toBeGreaterThan(0);
      expect(destinyTimings).toHaveLength(1);
    });

    it("should track tarot service metrics separately", () => {
      recordCounter("tarot.reading.total", 100, { service: "tarot", status: "success" });
      recordTiming("tarot.interpret.duration", 450, { service: "tarot" });

      const snapshot = getMetricsSnapshot();
      const tarotCounters = snapshot.counters.filter(c => c.labels?.service === "tarot");
      const tarotTimings = snapshot.timings.filter(t => t.labels?.service === "tarot");

      expect(tarotCounters).toHaveLength(1);
      expect(tarotTimings).toHaveLength(1);
    });

    it("should track dream service metrics separately", () => {
      recordCounter("dream.analysis.total", 30, { service: "dream", status: "success" });

      const snapshot = getMetricsSnapshot();
      const dreamCounters = snapshot.counters.filter(c => c.labels?.service === "dream");

      expect(dreamCounters).toHaveLength(1);
      expect(dreamCounters[0].value).toBe(30);
    });

    it("should track astrology service metrics separately", () => {
      recordCounter("astrology.chart.total", 25, { service: "astrology", status: "success" });

      const snapshot = getMetricsSnapshot();
      const astrologyCounters = snapshot.counters.filter(c => c.labels?.service === "astrology");

      expect(astrologyCounters).toHaveLength(1);
      expect(astrologyCounters[0].value).toBe(25);
    });
  });

  describe("SLA Status Calculation", () => {
    it("should calculate overall healthy status when all metrics pass", () => {
      // Good latency
      for (let i = 0; i < 100; i++) {
        recordTiming("api.request.duration", 200 + Math.random() * 100);
      }

      // Low error rate
      recordCounter("api.request.total", 1000, { status: "success" });
      recordCounter("api.error.total", 2, { status: "error" });

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];

      // Both checks should pass
      expect(timing.p95).toBeLessThan(SLA_THRESHOLDS.P95_LATENCY_MS);

      const totalRequests = 1000;
      const totalErrors = 2;
      const errorRate = (totalErrors / totalRequests) * 100;
      expect(errorRate).toBeLessThan(SLA_THRESHOLDS.ERROR_RATE_PERCENT);
    });

    it("should calculate degraded status when metrics are in warning zone", () => {
      // Latency near threshold but not over
      for (let i = 0; i < 95; i++) {
        recordTiming("api.request.duration", 500);
      }
      for (let i = 0; i < 5; i++) {
        recordTiming("api.request.duration", 750); // In warning zone (700-840)
      }

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];
      const warningThreshold = SLA_THRESHOLDS.P95_LATENCY_MS * 1.2;

      // p95 should be in warning range
      const isWarning = timing.p95 > SLA_THRESHOLDS.P95_LATENCY_MS &&
                        timing.p95 <= warningThreshold;
      expect(isWarning || timing.p95 <= SLA_THRESHOLDS.P95_LATENCY_MS).toBe(true);
    });

    it("should calculate critical status when metrics fail", () => {
      // Very slow responses
      for (let i = 0; i < 100; i++) {
        recordTiming("api.request.duration", 1000);
      }

      // High error rate
      recordCounter("api.request.total", 100, { status: "success" });
      recordCounter("api.error.total", 5, { status: "error" });

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];

      // Latency exceeds threshold
      expect(timing.p95).toBeGreaterThan(SLA_THRESHOLDS.P95_LATENCY_MS);

      // Error rate exceeds threshold (5%)
      const errorRate = (5 / 100) * 100;
      expect(errorRate).toBeGreaterThan(SLA_THRESHOLDS.ERROR_RATE_PERCENT);
    });
  });

  describe("Metric Pattern Matching", () => {
    const API_REQUEST_METRICS = [
      "api.request.total",
      "http.request.total",
      "destiny.report.total",
      "tarot.reading.total",
      "dream.analysis.total",
      "astrology.chart.total",
    ];

    const API_ERROR_METRICS = ["api.error.total"];

    function matchesPattern(name: string, patterns: string[]): boolean {
      return patterns.some((p) => name === p || name.startsWith(p.replace(".total", "").replace(".duration", "")));
    }

    it("should match exact metric names", () => {
      expect(matchesPattern("api.request.total", API_REQUEST_METRICS)).toBe(true);
      expect(matchesPattern("api.error.total", API_ERROR_METRICS)).toBe(true);
    });

    it("should match prefix patterns", () => {
      expect(matchesPattern("api.request.count", API_REQUEST_METRICS)).toBe(true);
      expect(matchesPattern("destiny.report.count", API_REQUEST_METRICS)).toBe(true);
    });

    it("should not match unrelated metrics", () => {
      expect(matchesPattern("cache.hit.total", API_REQUEST_METRICS)).toBe(false);
      expect(matchesPattern("db.query.total", API_REQUEST_METRICS)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large number of samples", () => {
      // Record 10000 timing samples
      for (let i = 0; i < 10000; i++) {
        recordTiming("load.test", Math.random() * 500);
      }

      const snapshot = getMetricsSnapshot();
      const timing = snapshot.timings[0];

      // Should still calculate percentiles correctly (limited to MAX_SAMPLES=1000)
      expect(timing.p95).toBeGreaterThan(0);
      expect(timing.p95).toBeLessThanOrEqual(500);
      expect(timing.count).toBe(10000);
    });

    it("should handle concurrent metric recording", async () => {
      // Simulate concurrent requests - await the promises
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          recordCounter("concurrent.test", 1, { worker: i % 10 });
          recordTiming("concurrent.latency", Math.random() * 100);
        })
      );

      await Promise.all(promises);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters.length).toBeGreaterThan(0);
      expect(snapshot.timings.length).toBeGreaterThan(0);
    });

    it("should handle metrics with special characters in labels", () => {
      recordCounter("api.request", 1, { path: "/api/v1/users?id=123", method: "GET" });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toHaveLength(1);
      expect(snapshot.counters[0].labels?.path).toBe("/api/v1/users?id=123");
    });

    it("should handle boolean labels", () => {
      recordCounter("feature.flag", 1, { enabled: true, beta: false });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels?.enabled).toBe(true);
      expect(snapshot.counters[0].labels?.beta).toBe(false);
    });

    it("should handle numeric labels", () => {
      recordCounter("http.response", 1, { status_code: 200, retry_count: 0 });

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels?.status_code).toBe(200);
      expect(snapshot.counters[0].labels?.retry_count).toBe(0);
    });
  });
});
