import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  withCircuitBreaker,
  getCircuitStatus,
  resetAllCircuits,
} from "../../src/lib/circuitBreaker";

describe("Circuit Breaker", () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  describe("isCircuitOpen", () => {
    it("starts in CLOSED state (allows requests)", () => {
      expect(isCircuitOpen("test-service")).toBe(false);
      expect(getCircuitStatus("test-service").state).toBe("CLOSED");
    });

    it("opens after threshold failures", () => {
      const name = "test-open";
      const options = { failureThreshold: 3, resetTimeoutMs: 1000 };

      // Record failures
      recordFailure(name, options);
      expect(isCircuitOpen(name, options)).toBe(false); // Still closed

      recordFailure(name, options);
      expect(isCircuitOpen(name, options)).toBe(false); // Still closed

      recordFailure(name, options);
      expect(isCircuitOpen(name, options)).toBe(true); // Now open
      expect(getCircuitStatus(name).state).toBe("OPEN");
    });

    it("resets to CLOSED after success", () => {
      const name = "test-reset";
      const options = { failureThreshold: 2, resetTimeoutMs: 1000 };

      recordFailure(name, options);
      recordFailure(name, options);
      expect(getCircuitStatus(name).state).toBe("OPEN");

      // Wait for HALF_OPEN (simulate timeout by checking again)
      // In real scenario, would wait resetTimeoutMs
      recordSuccess(name);
      expect(getCircuitStatus(name).state).toBe("CLOSED");
      expect(getCircuitStatus(name).failures).toBe(0);
    });
  });

  describe("withCircuitBreaker", () => {
    it("returns result on success", async () => {
      const { result, fromFallback } = await withCircuitBreaker(
        "success-test",
        async () => "success!",
        "fallback"
      );

      expect(result).toBe("success!");
      expect(fromFallback).toBe(false);
    });

    it("returns fallback on failure", async () => {
      const { result, fromFallback } = await withCircuitBreaker(
        "failure-test",
        async () => {
          throw new Error("Service down");
        },
        "fallback response"
      );

      expect(result).toBe("fallback response");
      expect(fromFallback).toBe(true);
    });

    it("uses fallback function if provided", async () => {
      const { result, fromFallback } = await withCircuitBreaker(
        "fallback-fn-test",
        async () => {
          throw new Error("Service down");
        },
        () => ({ message: "generated fallback" })
      );

      expect(result).toEqual({ message: "generated fallback" });
      expect(fromFallback).toBe(true);
    });

    it("skips request when circuit is open", async () => {
      const name = "skip-test";
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };
      let callCount = 0;

      // First call fails and opens circuit
      await withCircuitBreaker(
        name,
        async () => {
          callCount++;
          throw new Error("fail");
        },
        "fallback",
        options
      );

      expect(callCount).toBe(1);

      // Second call should skip the actual function
      const { result, fromFallback } = await withCircuitBreaker(
        name,
        async () => {
          callCount++;
          return "should not reach";
        },
        "fallback",
        options
      );

      expect(callCount).toBe(1); // Should NOT increment
      expect(result).toBe("fallback");
      expect(fromFallback).toBe(true);
    });
  });

  describe("getCircuitStatus", () => {
    it("returns current circuit state", () => {
      const name = "status-test";

      const initialStatus = getCircuitStatus(name);
      expect(initialStatus.state).toBe("CLOSED");
      expect(initialStatus.failures).toBe(0);
      expect(initialStatus.lastFailure).toBeNull();

      recordFailure(name);

      const afterFailure = getCircuitStatus(name);
      expect(afterFailure.failures).toBe(1);
      expect(afterFailure.lastFailure).toBeInstanceOf(Date);
    });
  });
});

describe("Circuit Breaker Integration", () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  it("protects against cascading failures", async () => {
    const name = "cascade-test";
    const options = { failureThreshold: 2, resetTimeoutMs: 100 };
    const results: string[] = [];

    // Simulate failing service
    const failingService = async () => {
      throw new Error("Service unavailable");
    };

    // First two calls hit the service
    for (let i = 0; i < 5; i++) {
      const { fromFallback } = await withCircuitBreaker(
        name,
        failingService,
        "cached-response",
        options
      );
      results.push(fromFallback ? "fallback" : "live");
    }

    // First 2 calls tried the service, rest used fallback immediately
    expect(results).toEqual([
      "fallback", // Tried, failed
      "fallback", // Tried, failed (opens circuit)
      "fallback", // Circuit open, skipped
      "fallback", // Circuit open, skipped
      "fallback", // Circuit open, skipped
    ]);

    // Verify circuit is open
    expect(getCircuitStatus(name).state).toBe("OPEN");
  });

  it("recovers after timeout", async () => {
    const name = "recovery-test";
    const options = { failureThreshold: 1, resetTimeoutMs: 50 };

    // Fail once to open circuit
    await withCircuitBreaker(
      name,
      async () => {
        throw new Error("fail");
      },
      "fallback",
      options
    );

    expect(getCircuitStatus(name).state).toBe("OPEN");

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next call should try the service (HALF_OPEN)
    const { fromFallback } = await withCircuitBreaker(
      name,
      async () => "recovered!",
      "fallback",
      options
    );

    expect(fromFallback).toBe(false);
    expect(getCircuitStatus(name).state).toBe("CLOSED");
  });
});
