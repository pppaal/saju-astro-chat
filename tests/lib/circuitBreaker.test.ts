/**
 * Circuit Breaker Tests
 *
 * Tests for circuit breaker pattern implementation
 */

import { beforeEach, vi } from "vitest";
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  withCircuitBreaker,
  getCircuitStatus,
  resetAllCircuits,
} from "@/lib/circuitBreaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    resetAllCircuits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isCircuitOpen", () => {
    it("returns false for new circuit (CLOSED state)", () => {
      expect(isCircuitOpen("test-service")).toBe(false);
    });

    it("returns false after success", () => {
      recordSuccess("test-service");
      expect(isCircuitOpen("test-service")).toBe(false);
    });

    it("returns false after failures below threshold", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      expect(isCircuitOpen("test-service")).toBe(false);
    });

    it("returns true after reaching failure threshold", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");
      expect(isCircuitOpen("test-service")).toBe(true);
    });

    it("respects custom failure threshold", () => {
      recordFailure("test-service", { failureThreshold: 5 });
      recordFailure("test-service", { failureThreshold: 5 });
      recordFailure("test-service", { failureThreshold: 5 });
      recordFailure("test-service", { failureThreshold: 5 });
      expect(isCircuitOpen("test-service", { failureThreshold: 5 })).toBe(false);
      recordFailure("test-service", { failureThreshold: 5 });
      expect(isCircuitOpen("test-service", { failureThreshold: 5 })).toBe(true);
    });

    it("transitions to HALF_OPEN after reset timeout", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");
      expect(isCircuitOpen("test-service")).toBe(true);

      // Advance time by 60 seconds (default reset timeout)
      vi.advanceTimersByTime(60 * 1000);

      // Should now allow one request (HALF_OPEN)
      expect(isCircuitOpen("test-service")).toBe(false);
    });

    it("limits requests in HALF_OPEN state", () => {
      recordFailure("half-open-test");
      recordFailure("half-open-test");
      recordFailure("half-open-test");

      vi.advanceTimersByTime(60 * 1000);

      // First request: OPEN -> HALF_OPEN transition, returns false (allowed), halfOpenAttempts=0
      expect(isCircuitOpen("half-open-test")).toBe(false);
      // Second request: HALF_OPEN, halfOpenAttempts(0) < 1, increments to 1, returns false
      expect(isCircuitOpen("half-open-test")).toBe(false);
      // Third request: HALF_OPEN, halfOpenAttempts(1) >= 1, returns true (blocked)
      expect(isCircuitOpen("half-open-test")).toBe(true);
    });
  });

  describe("recordSuccess", () => {
    it("resets failures count", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordSuccess("test-service");

      const status = getCircuitStatus("test-service");
      expect(status.failures).toBe(0);
    });

    it("transitions from HALF_OPEN to CLOSED", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      vi.advanceTimersByTime(60 * 1000);
      isCircuitOpen("test-service"); // Trigger HALF_OPEN

      recordSuccess("test-service");
      const status = getCircuitStatus("test-service");
      expect(status.state).toBe("CLOSED");
    });

    it("clears halfOpenAttempts", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      vi.advanceTimersByTime(60 * 1000);
      isCircuitOpen("test-service");

      recordSuccess("test-service");
      expect(isCircuitOpen("test-service")).toBe(false);
    });
  });

  describe("recordFailure", () => {
    it("increments failure count", () => {
      recordFailure("test-service");
      let status = getCircuitStatus("test-service");
      expect(status.failures).toBe(1);

      recordFailure("test-service");
      status = getCircuitStatus("test-service");
      expect(status.failures).toBe(2);
    });

    it("updates lastFailure timestamp", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      recordFailure("test-service");
      const status = getCircuitStatus("test-service");
      expect(status.lastFailure?.getTime()).toBe(now);
    });

    it("opens circuit at threshold", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      const status = getCircuitStatus("test-service");
      expect(status.state).toBe("OPEN");
    });

    it("transitions HALF_OPEN back to OPEN on failure", () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      vi.advanceTimersByTime(60 * 1000);
      isCircuitOpen("test-service"); // Trigger HALF_OPEN

      recordFailure("test-service");
      const status = getCircuitStatus("test-service");
      expect(status.state).toBe("OPEN");
    });
  });

  describe("withCircuitBreaker", () => {
    it("executes function when circuit is closed", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const fallback = "fallback";

      const result = await withCircuitBreaker("test-service", fn, fallback);

      expect(fn).toHaveBeenCalled();
      expect(result.result).toBe("success");
      expect(result.fromFallback).toBe(false);
    });

    it("returns fallback when circuit is open", async () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      const fn = vi.fn().mockResolvedValue("success");
      const fallback = "fallback";

      const result = await withCircuitBreaker("test-service", fn, fallback);

      expect(fn).not.toHaveBeenCalled();
      expect(result.result).toBe("fallback");
      expect(result.fromFallback).toBe(true);
    });

    it("returns fallback on function error", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("API error"));
      const fallback = "fallback";

      const result = await withCircuitBreaker("test-service", fn, fallback);

      expect(result.result).toBe("fallback");
      expect(result.fromFallback).toBe(true);
    });

    it("executes fallback function", async () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      const fn = vi.fn().mockResolvedValue("success");
      const fallbackFn = vi.fn().mockReturnValue("dynamic fallback");

      const result = await withCircuitBreaker("test-service", fn, fallbackFn);

      expect(fallbackFn).toHaveBeenCalled();
      expect(result.result).toBe("dynamic fallback");
    });

    it("executes async fallback function", async () => {
      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      const fn = vi.fn().mockResolvedValue("success");
      const fallbackFn = vi.fn().mockResolvedValue("async fallback");

      const result = await withCircuitBreaker("test-service", fn, fallbackFn);

      expect(result.result).toBe("async fallback");
    });

    it("records success on function success", async () => {
      recordFailure("test-service");
      recordFailure("test-service");

      const fn = vi.fn().mockResolvedValue("success");
      await withCircuitBreaker("test-service", fn, "fallback");

      const status = getCircuitStatus("test-service");
      expect(status.failures).toBe(0);
    });

    it("records failure on function error", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("error"));
      await withCircuitBreaker("test-service", fn, "fallback");

      const status = getCircuitStatus("test-service");
      expect(status.failures).toBe(1);
    });
  });

  describe("getCircuitStatus", () => {
    it("returns initial state for new circuit", () => {
      const status = getCircuitStatus("new-service");
      expect(status.state).toBe("CLOSED");
      expect(status.failures).toBe(0);
      expect(status.lastFailure).toBeNull();
    });

    it("returns correct state after failures", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      recordFailure("test-service");
      recordFailure("test-service");
      recordFailure("test-service");

      const status = getCircuitStatus("test-service");
      expect(status.state).toBe("OPEN");
      expect(status.failures).toBe(3);
      expect(status.lastFailure).toBeInstanceOf(Date);
      expect(status.lastFailure?.getTime()).toBe(now);
    });
  });

  describe("resetAllCircuits", () => {
    it("clears all circuit states", () => {
      recordFailure("service-a");
      recordFailure("service-b");
      recordFailure("service-c");

      resetAllCircuits();

      expect(getCircuitStatus("service-a").failures).toBe(0);
      expect(getCircuitStatus("service-b").failures).toBe(0);
      expect(getCircuitStatus("service-c").failures).toBe(0);
    });
  });

  describe("multiple circuits", () => {
    it("maintains separate state for each circuit", () => {
      recordFailure("service-a");
      recordFailure("service-a");
      recordFailure("service-a");

      recordFailure("service-b");

      expect(isCircuitOpen("service-a")).toBe(true);
      expect(isCircuitOpen("service-b")).toBe(false);
    });
  });
});

// Import afterEach for cleanup
import { afterEach } from "vitest";
