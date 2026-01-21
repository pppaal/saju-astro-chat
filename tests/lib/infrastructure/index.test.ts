/**
 * Tests for Infrastructure Index exports
 * src/lib/infrastructure/index.ts
 */
import { describe, it, expect } from "vitest";

describe("Infrastructure Index Exports", () => {
  describe("Circuit Breaker exports", () => {
    it("should export isCircuitOpen", async () => {
      const { isCircuitOpen } = await import("@/lib/infrastructure");
      expect(typeof isCircuitOpen).toBe("function");
    });

    it("should export recordSuccess", async () => {
      const { recordSuccess } = await import("@/lib/infrastructure");
      expect(typeof recordSuccess).toBe("function");
    });

    it("should export recordFailure", async () => {
      const { recordFailure } = await import("@/lib/infrastructure");
      expect(typeof recordFailure).toBe("function");
    });

    it("should export withCircuitBreaker", async () => {
      const { withCircuitBreaker } = await import("@/lib/infrastructure");
      expect(typeof withCircuitBreaker).toBe("function");
    });

    it("should export getCircuitStatus", async () => {
      const { getCircuitStatus } = await import("@/lib/infrastructure");
      expect(typeof getCircuitStatus).toBe("function");
    });

    it("should export resetAllCircuits", async () => {
      const { resetAllCircuits } = await import("@/lib/infrastructure");
      expect(typeof resetAllCircuits).toBe("function");
    });
  });

  describe("Rate Limiting exports", () => {
    it("should export rateLimit", async () => {
      const { rateLimit } = await import("@/lib/infrastructure");
      expect(typeof rateLimit).toBe("function");
    });
  });

  describe("Metrics exports", () => {
    it("should export recordCounter", async () => {
      const { recordCounter } = await import("@/lib/infrastructure");
      expect(typeof recordCounter).toBe("function");
    });

    it("should export recordTiming", async () => {
      const { recordTiming } = await import("@/lib/infrastructure");
      expect(typeof recordTiming).toBe("function");
    });

    it("should export recordGauge", async () => {
      const { recordGauge } = await import("@/lib/infrastructure");
      expect(typeof recordGauge).toBe("function");
    });

    it("should export getMetricsSnapshot", async () => {
      const { getMetricsSnapshot } = await import("@/lib/infrastructure");
      expect(typeof getMetricsSnapshot).toBe("function");
    });

    it("should export resetMetrics", async () => {
      const { resetMetrics } = await import("@/lib/infrastructure");
      expect(typeof resetMetrics).toBe("function");
    });

    it("should export toPrometheus", async () => {
      const { toPrometheus } = await import("@/lib/infrastructure");
      expect(typeof toPrometheus).toBe("function");
    });

    it("should export toOtlp", async () => {
      const { toOtlp } = await import("@/lib/infrastructure");
      expect(typeof toOtlp).toBe("function");
    });
  });

  describe("Telemetry exports", () => {
    it("should export captureServerError", async () => {
      const { captureServerError } = await import("@/lib/infrastructure");
      expect(typeof captureServerError).toBe("function");
    });
  });

  describe("Redis Cache exports", () => {
    it("should export cacheGet", async () => {
      const { cacheGet } = await import("@/lib/infrastructure");
      expect(typeof cacheGet).toBe("function");
    });

    it("should export cacheSet", async () => {
      const { cacheSet } = await import("@/lib/infrastructure");
      expect(typeof cacheSet).toBe("function");
    });

    it("should export makeCacheKey", async () => {
      const { makeCacheKey } = await import("@/lib/infrastructure");
      expect(typeof makeCacheKey).toBe("function");
    });
  });
});
