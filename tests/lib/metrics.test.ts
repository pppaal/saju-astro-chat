/**
 * Metrics Tests
 *
 * Tests for application metrics collection
 */

import { beforeEach } from "vitest";
import {
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
  toPrometheus,
  toOtlp,
} from "@/lib/metrics";

describe("Metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe("recordCounter", () => {
    it("records counter with default value of 1", () => {
      recordCounter("test.counter");
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters.length).toBe(1);
      expect(snapshot.counters[0].value).toBe(1);
      expect(snapshot.counters[0].name).toBe("test.counter");
    });

    it("records counter with custom value", () => {
      recordCounter("test.counter", 5);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(5);
    });

    it("accumulates counter values", () => {
      recordCounter("test.counter", 3);
      recordCounter("test.counter", 2);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].value).toBe(5);
    });

    it("records counter with labels", () => {
      recordCounter("test.counter", 1, { route: "/api/test", method: "GET" });
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters[0].labels).toEqual({ route: "/api/test", method: "GET" });
    });

    it("separates counters by labels", () => {
      recordCounter("test.counter", 1, { route: "/api/a" });
      recordCounter("test.counter", 2, { route: "/api/b" });
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters.length).toBe(2);
    });
  });

  describe("recordTiming", () => {
    it("records timing with correct values", () => {
      recordTiming("test.timing", 100);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings.length).toBe(1);
      expect(snapshot.timings[0].count).toBe(1);
      expect(snapshot.timings[0].sum).toBe(100);
      expect(snapshot.timings[0].max).toBe(100);
    });

    it("accumulates timing statistics", () => {
      recordTiming("test.timing", 100);
      recordTiming("test.timing", 200);
      recordTiming("test.timing", 50);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].count).toBe(3);
      expect(snapshot.timings[0].sum).toBe(350);
      expect(snapshot.timings[0].max).toBe(200);
      expect(snapshot.timings[0].avg).toBeCloseTo(116.67, 1);
    });

    it("records timing with labels", () => {
      recordTiming("test.timing", 100, { endpoint: "/api/test" });
      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].labels).toEqual({ endpoint: "/api/test" });
    });
  });

  describe("recordGauge", () => {
    it("records gauge value", () => {
      recordGauge("test.gauge", 42);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges.length).toBe(1);
      expect(snapshot.gauges[0].value).toBe(42);
    });

    it("overwrites previous gauge value", () => {
      recordGauge("test.gauge", 10);
      recordGauge("test.gauge", 20);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges.length).toBe(1);
      expect(snapshot.gauges[0].value).toBe(20);
    });

    it("records gauge with labels", () => {
      recordGauge("test.gauge", 100, { region: "us-east" });
      const snapshot = getMetricsSnapshot();
      expect(snapshot.gauges[0].labels).toEqual({ region: "us-east" });
    });
  });

  describe("getMetricsSnapshot", () => {
    it("returns empty snapshot when no metrics", () => {
      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toEqual([]);
      expect(snapshot.gauges).toEqual([]);
      expect(snapshot.timings).toEqual([]);
    });

    it("returns all metrics types", () => {
      recordCounter("counter1");
      recordTiming("timing1", 100);
      recordGauge("gauge1", 50);

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters.length).toBe(1);
      expect(snapshot.timings.length).toBe(1);
      expect(snapshot.gauges.length).toBe(1);
    });

    it("includes avg calculation in timings", () => {
      recordTiming("timing1", 100);
      recordTiming("timing1", 200);
      const snapshot = getMetricsSnapshot();
      expect(snapshot.timings[0].avg).toBe(150);
    });
  });

  describe("resetMetrics", () => {
    it("clears all metrics", () => {
      recordCounter("counter1");
      recordTiming("timing1", 100);
      recordGauge("gauge1", 50);

      resetMetrics();

      const snapshot = getMetricsSnapshot();
      expect(snapshot.counters).toEqual([]);
      expect(snapshot.gauges).toEqual([]);
      expect(snapshot.timings).toEqual([]);
    });
  });

  describe("toPrometheus", () => {
    it("formats counters in Prometheus format", () => {
      recordCounter("http_requests_total", 10);
      const output = toPrometheus();
      expect(output).toContain("# TYPE http_requests_total counter");
      expect(output).toContain("http_requests_total 10");
    });

    it("formats gauges in Prometheus format", () => {
      recordGauge("active_connections", 5);
      const output = toPrometheus();
      expect(output).toContain("# TYPE active_connections gauge");
      expect(output).toContain("active_connections 5");
    });

    it("formats timings in Prometheus format", () => {
      recordTiming("request_duration", 150);
      const output = toPrometheus();
      expect(output).toContain("# TYPE request_duration_seconds summary");
      expect(output).toContain("request_duration_seconds_count");
      expect(output).toContain("request_duration_seconds_sum");
    });

    it("includes labels in Prometheus format", () => {
      recordCounter("http_requests", 5, { method: "GET", status: 200 });
      const output = toPrometheus();
      expect(output).toMatch(/http_requests\{.*method="GET".*\}/);
      expect(output).toMatch(/http_requests\{.*status="200".*\}/);
    });

    it("returns empty string when no metrics", () => {
      const output = toPrometheus();
      expect(output).toBe("");
    });
  });

  describe("toOtlp", () => {
    it("returns OTLP structure", () => {
      recordCounter("test_counter", 5);
      const output = toOtlp();
      expect(output.resourceMetrics).toBeDefined();
      expect(output.resourceMetrics[0].scopeMetrics).toBeDefined();
      expect(output.resourceMetrics[0].scopeMetrics[0].metrics).toBeDefined();
    });

    it("includes counters in OTLP format", () => {
      recordCounter("test_counter", 10, { env: "test" });
      const output = toOtlp();
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics;
      const counter = metrics.find((m) => m.name === "test_counter");
      expect(counter).toBeDefined();
      expect(counter?.type).toBe("counter");
      expect(counter?.value).toBe(10);
      expect(counter?.labels).toEqual({ env: "test" });
    });

    it("includes timings in OTLP format", () => {
      recordTiming("test_timing", 100);
      recordTiming("test_timing", 200);
      const output = toOtlp();
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics;
      const timing = metrics.find((m) => m.name === "test_timing");
      expect(timing).toBeDefined();
      expect(timing?.type).toBe("summary");
      expect(timing?.count).toBe(2);
      expect(timing?.sum_ms).toBe(300);
      expect(timing?.max_ms).toBe(200);
    });

    it("includes gauges in OTLP format", () => {
      recordGauge("test_gauge", 42);
      const output = toOtlp();
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics;
      const gauge = metrics.find((m) => m.name === "test_gauge");
      expect(gauge).toBeDefined();
      expect(gauge?.type).toBe("gauge");
      expect(gauge?.value).toBe(42);
    });
  });
});
