/**
 * Tests for Circuit Breaker Pattern
 * src/lib/circuitBreaker.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  withCircuitBreaker,
  getCircuitStatus,
  resetAllCircuits,
} from "@/lib/circuitBreaker";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Circuit Breaker", () => {
  beforeEach(() => {
    resetAllCircuits();
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should start in CLOSED state", () => {
      const status = getCircuitStatus("test-service");
      expect(status.state).toBe("CLOSED");
      expect(status.failures).toBe(0);
      expect(status.lastFailure).toBeNull();
    });

    it("should allow requests when circuit is closed", () => {
      expect(isCircuitOpen("test-service")).toBe(false);
    });

    it("should create separate circuits for different services", () => {
      recordFailure("service-a");
      recordFailure("service-a");

      const statusA = getCircuitStatus("service-a");
      const statusB = getCircuitStatus("service-b");

      expect(statusA.failures).toBe(2);
      expect(statusB.failures).toBe(0);
    });
  });

  describe("CLOSED → OPEN Transition", () => {
    it("should open circuit after 3 failures (default threshold)", () => {
      recordFailure("api-service");
      expect(getCircuitStatus("api-service").state).toBe("CLOSED");

      recordFailure("api-service");
      expect(getCircuitStatus("api-service").state).toBe("CLOSED");

      recordFailure("api-service");
      expect(getCircuitStatus("api-service").state).toBe("OPEN");
    });

    it("should respect custom failure threshold", () => {
      const options = { failureThreshold: 5 };

      for (let i = 0; i < 4; i++) {
        recordFailure("custom-service", options);
      }
      expect(getCircuitStatus("custom-service").state).toBe("CLOSED");

      recordFailure("custom-service", options);
      expect(getCircuitStatus("custom-service").state).toBe("OPEN");
    });

    it("should block requests when circuit is open", () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        recordFailure("blocked-service");
      }

      expect(isCircuitOpen("blocked-service")).toBe(true);
    });

    it("should track last failure timestamp", () => {
      const beforeFailure = Date.now();
      recordFailure("timestamp-service");
      const afterFailure = Date.now();

      const status = getCircuitStatus("timestamp-service");
      expect(status.lastFailure).not.toBeNull();
      expect(status.lastFailure!.getTime()).toBeGreaterThanOrEqual(beforeFailure);
      expect(status.lastFailure!.getTime()).toBeLessThanOrEqual(afterFailure);
    });
  });

  describe("OPEN → HALF_OPEN Transition", () => {
    it("should transition to HALF_OPEN after reset timeout", async () => {
      const options = { resetTimeoutMs: 100 }; // Short timeout for testing

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        recordFailure("timeout-service", options);
      }
      expect(getCircuitStatus("timeout-service").state).toBe("OPEN");

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check should transition to HALF_OPEN
      const isOpen = isCircuitOpen("timeout-service", options);
      expect(isOpen).toBe(false);
      expect(getCircuitStatus("timeout-service").state).toBe("HALF_OPEN");
    });

    it("should not transition before reset timeout", () => {
      const options = { resetTimeoutMs: 60000 }; // Long timeout

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        recordFailure("long-timeout", options);
      }

      // Immediately check - should still be OPEN
      expect(isCircuitOpen("long-timeout", options)).toBe(true);
      expect(getCircuitStatus("long-timeout").state).toBe("OPEN");
    });
  });

  describe("HALF_OPEN State", () => {
    it("should allow limited requests in HALF_OPEN state", async () => {
      const options = { resetTimeoutMs: 50, halfOpenMaxAttempts: 1 };

      // Open and wait for HALF_OPEN
      for (let i = 0; i < 3; i++) {
        recordFailure("half-open-service", options);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First request transitions OPEN → HALF_OPEN (allowed, no increment)
      expect(isCircuitOpen("half-open-service", options)).toBe(false);
      expect(getCircuitStatus("half-open-service").state).toBe("HALF_OPEN");

      // Second request increments attempts (0→1), still allowed
      expect(isCircuitOpen("half-open-service", options)).toBe(false);

      // Third request - attempts=1 >= maxAttempts=1, should be blocked
      expect(isCircuitOpen("half-open-service", options)).toBe(true);
    });

    it("should close circuit on success in HALF_OPEN", async () => {
      const options = { resetTimeoutMs: 50 };

      // Open and wait for HALF_OPEN
      for (let i = 0; i < 3; i++) {
        recordFailure("recovery-service", options);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger HALF_OPEN
      isCircuitOpen("recovery-service", options);
      expect(getCircuitStatus("recovery-service").state).toBe("HALF_OPEN");

      // Record success
      recordSuccess("recovery-service");
      expect(getCircuitStatus("recovery-service").state).toBe("CLOSED");
      expect(getCircuitStatus("recovery-service").failures).toBe(0);
    });

    it("should reopen circuit on failure in HALF_OPEN", async () => {
      const options = { resetTimeoutMs: 50 };

      // Open and wait for HALF_OPEN
      for (let i = 0; i < 3; i++) {
        recordFailure("reopen-service", options);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger HALF_OPEN
      isCircuitOpen("reopen-service", options);
      expect(getCircuitStatus("reopen-service").state).toBe("HALF_OPEN");

      // Record failure
      recordFailure("reopen-service", options);
      expect(getCircuitStatus("reopen-service").state).toBe("OPEN");
    });
  });

  describe("recordSuccess", () => {
    it("should reset failure count on success", () => {
      recordFailure("success-test");
      recordFailure("success-test");
      expect(getCircuitStatus("success-test").failures).toBe(2);

      recordSuccess("success-test");
      expect(getCircuitStatus("success-test").failures).toBe(0);
    });

    it("should close circuit on success", () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        recordFailure("close-test");
      }
      expect(getCircuitStatus("close-test").state).toBe("OPEN");

      recordSuccess("close-test");
      expect(getCircuitStatus("close-test").state).toBe("CLOSED");
    });
  });

  describe("withCircuitBreaker wrapper", () => {
    it("should execute function when circuit is closed", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const fallback = "fallback";

      const result = await withCircuitBreaker("wrapper-test", fn, fallback);

      expect(fn).toHaveBeenCalled();
      expect(result.result).toBe("success");
      expect(result.fromFallback).toBe(false);
    });

    it("should use fallback when circuit is open", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        recordFailure("open-wrapper");
      }

      const fn = vi.fn().mockResolvedValue("success");
      const fallback = "fallback-value";

      const result = await withCircuitBreaker("open-wrapper", fn, fallback);

      expect(fn).not.toHaveBeenCalled();
      expect(result.result).toBe("fallback-value");
      expect(result.fromFallback).toBe(true);
    });

    it("should use fallback on function error", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("API Error"));
      const fallback = "error-fallback";

      const result = await withCircuitBreaker("error-wrapper", fn, fallback);

      expect(fn).toHaveBeenCalled();
      expect(result.result).toBe("error-fallback");
      expect(result.fromFallback).toBe(true);
    });

    it("should support fallback function", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Error"));
      const fallbackFn = vi.fn().mockResolvedValue("dynamic-fallback");

      const result = await withCircuitBreaker("fn-fallback", fn, fallbackFn);

      expect(fallbackFn).toHaveBeenCalled();
      expect(result.result).toBe("dynamic-fallback");
      expect(result.fromFallback).toBe(true);
    });

    it("should support async fallback function", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Error"));
      const fallbackFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-fallback";
      });

      const result = await withCircuitBreaker("async-fallback", fn, fallbackFn);

      expect(result.result).toBe("async-fallback");
      expect(result.fromFallback).toBe(true);
    });

    it("should record success and close circuit", async () => {
      const fn = vi.fn().mockResolvedValue("ok");

      await withCircuitBreaker("success-wrapper", fn, "fallback");

      expect(getCircuitStatus("success-wrapper").state).toBe("CLOSED");
      expect(getCircuitStatus("success-wrapper").failures).toBe(0);
    });

    it("should record failure and potentially open circuit", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Fail"));

      // 3 failures should open circuit
      await withCircuitBreaker("fail-wrapper", fn, "fb");
      await withCircuitBreaker("fail-wrapper", fn, "fb");
      await withCircuitBreaker("fail-wrapper", fn, "fb");

      expect(getCircuitStatus("fail-wrapper").state).toBe("OPEN");
    });
  });

  describe("Multiple Services", () => {
    it("should isolate circuit state between services", () => {
      // Open circuit for service A
      for (let i = 0; i < 3; i++) {
        recordFailure("service-a");
      }

      expect(getCircuitStatus("service-a").state).toBe("OPEN");
      expect(getCircuitStatus("service-b").state).toBe("CLOSED");

      // Service B should still work
      expect(isCircuitOpen("service-b")).toBe(false);
    });

    it("should track failures independently", () => {
      recordFailure("backend-api");
      recordFailure("backend-api");
      recordFailure("cache-service");

      expect(getCircuitStatus("backend-api").failures).toBe(2);
      expect(getCircuitStatus("cache-service").failures).toBe(1);
    });
  });

  describe("resetAllCircuits", () => {
    it("should reset all circuit states", () => {
      // Create multiple circuits with failures
      for (let i = 0; i < 3; i++) {
        recordFailure("circuit-1");
        recordFailure("circuit-2");
      }

      expect(getCircuitStatus("circuit-1").state).toBe("OPEN");
      expect(getCircuitStatus("circuit-2").state).toBe("OPEN");

      resetAllCircuits();

      // After reset, circuits start fresh
      expect(getCircuitStatus("circuit-1").state).toBe("CLOSED");
      expect(getCircuitStatus("circuit-1").failures).toBe(0);
    });
  });

  describe("Custom Options", () => {
    it("should use custom failure threshold", () => {
      const options = { failureThreshold: 5 };

      for (let i = 0; i < 4; i++) {
        recordFailure("custom-threshold", options);
      }
      expect(getCircuitStatus("custom-threshold").state).toBe("CLOSED");

      recordFailure("custom-threshold", options);
      expect(getCircuitStatus("custom-threshold").state).toBe("OPEN");
    });

    it("should use custom halfOpenMaxAttempts", async () => {
      const options = { resetTimeoutMs: 50, halfOpenMaxAttempts: 3 };

      // Open circuit
      for (let i = 0; i < 3; i++) {
        recordFailure("custom-half-open", options);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First call transitions OPEN → HALF_OPEN (no increment, just transitions)
      expect(isCircuitOpen("custom-half-open", options)).toBe(false);
      // Next 3 calls increment halfOpenAttempts (0→1, 1→2, 2→3)
      expect(isCircuitOpen("custom-half-open", options)).toBe(false); // attempts=1
      expect(isCircuitOpen("custom-half-open", options)).toBe(false); // attempts=2
      expect(isCircuitOpen("custom-half-open", options)).toBe(false); // attempts=3
      // 5th attempt should be blocked (attempts >= 3)
      expect(isCircuitOpen("custom-half-open", options)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid successive failures", () => {
      for (let i = 0; i < 10; i++) {
        recordFailure("rapid-fail");
      }

      const status = getCircuitStatus("rapid-fail");
      expect(status.state).toBe("OPEN");
      expect(status.failures).toBe(10);
    });

    it("should handle intermittent failures", () => {
      recordFailure("intermittent");
      recordSuccess("intermittent");
      recordFailure("intermittent");
      recordSuccess("intermittent");

      // Failures should reset after success
      expect(getCircuitStatus("intermittent").failures).toBe(0);
    });

    it("should handle empty service name", () => {
      expect(() => isCircuitOpen("")).not.toThrow();
      expect(() => recordFailure("")).not.toThrow();
      expect(() => recordSuccess("")).not.toThrow();
    });

    it("should handle service names with special characters", () => {
      const serviceName = "api/v1/users:create";
      recordFailure(serviceName);

      expect(getCircuitStatus(serviceName).failures).toBe(1);
    });
  });
});
