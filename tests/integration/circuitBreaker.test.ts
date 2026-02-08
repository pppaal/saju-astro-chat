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

describe("Circuit Breaker Advanced Scenarios", () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  describe("Multiple Independent Circuits", () => {
    it("should maintain separate state for different services", async () => {
      const serviceA = "service-a";
      const serviceB = "service-b";
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };

      // Fail service A
      await withCircuitBreaker(
        serviceA,
        async () => { throw new Error("A failed"); },
        "fallback-a",
        options
      );

      // Service B should still work
      const { result, fromFallback } = await withCircuitBreaker(
        serviceB,
        async () => "B works!",
        "fallback-b",
        options
      );

      expect(getCircuitStatus(serviceA).state).toBe("OPEN");
      expect(getCircuitStatus(serviceB).state).toBe("CLOSED");
      expect(result).toBe("B works!");
      expect(fromFallback).toBe(false);
    });

    it("should handle many independent circuits", async () => {
      const services = ["svc-1", "svc-2", "svc-3", "svc-4", "svc-5"];
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };

      // Fail odd-numbered services
      for (let i = 0; i < services.length; i++) {
        if (i % 2 === 0) {
          await withCircuitBreaker(
            services[i],
            async () => { throw new Error("fail"); },
            "fallback",
            options
          );
        } else {
          await withCircuitBreaker(
            services[i],
            async () => "success",
            "fallback",
            options
          );
        }
      }

      expect(getCircuitStatus("svc-1").state).toBe("OPEN");
      expect(getCircuitStatus("svc-2").state).toBe("CLOSED");
      expect(getCircuitStatus("svc-3").state).toBe("OPEN");
      expect(getCircuitStatus("svc-4").state).toBe("CLOSED");
      expect(getCircuitStatus("svc-5").state).toBe("OPEN");
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle concurrent requests correctly", async () => {
      const name = "concurrent-test";
      const options = { failureThreshold: 3, resetTimeoutMs: 60000 };
      let callCount = 0;

      const service = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      };

      // Launch 5 concurrent requests
      const promises = Array(5).fill(null).map(() =>
        withCircuitBreaker(name, service, "fallback", options)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(({ result, fromFallback }) => {
        expect(result).toBe("success");
        expect(fromFallback).toBe(false);
      });
      expect(callCount).toBe(5);
    });

    it("should handle concurrent failures", async () => {
      const name = "concurrent-fail-test";
      const options = { failureThreshold: 2, resetTimeoutMs: 60000 };
      let callCount = 0;

      const failingService = async () => {
        callCount++;
        throw new Error("Service down");
      };

      // Launch 5 concurrent failing requests
      const promises = Array(5).fill(null).map(() =>
        withCircuitBreaker(name, failingService, "fallback", options)
      );

      const results = await Promise.all(promises);

      // All should return fallback
      results.forEach(({ result, fromFallback }) => {
        expect(result).toBe("fallback");
        expect(fromFallback).toBe(true);
      });

      // Circuit should be open
      expect(getCircuitStatus(name).state).toBe("OPEN");
    });
  });

  describe("Failure Threshold Variations", () => {
    it("should respect different threshold values", async () => {
      const testCases = [
        { name: "threshold-1", threshold: 1 },
        { name: "threshold-3", threshold: 3 },
        { name: "threshold-5", threshold: 5 },
      ];

      for (const { name, threshold } of testCases) {
        const options = { failureThreshold: threshold, resetTimeoutMs: 60000 };

        // Record failures up to threshold - 1
        for (let i = 0; i < threshold - 1; i++) {
          await withCircuitBreaker(
            name,
            async () => { throw new Error("fail"); },
            "fallback",
            options
          );
          expect(getCircuitStatus(name).state).toBe("CLOSED");
        }

        // One more failure should open the circuit
        await withCircuitBreaker(
          name,
          async () => { throw new Error("fail"); },
          "fallback",
          options
        );
        expect(getCircuitStatus(name).state).toBe("OPEN");
      }
    });
  });

  describe("Fallback Function Behavior", () => {
    it("should pass error to fallback function", async () => {
      const name = "fallback-error-test";
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };
      let capturedError: Error | null = null;

      await withCircuitBreaker(
        name,
        async () => { throw new Error("Specific error message"); },
        (error) => {
          capturedError = error as Error;
          return "handled";
        },
        options
      );

      expect(capturedError).not.toBeNull();
      expect(capturedError?.message).toBe("Specific error message");
    });

    it("should handle async fallback functions", async () => {
      const name = "async-fallback-test";
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };

      const { result, fromFallback } = await withCircuitBreaker(
        name,
        async () => { throw new Error("fail"); },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return "async-fallback-result";
        },
        options
      );

      expect(result).toBe("async-fallback-result");
      expect(fromFallback).toBe(true);
    });
  });

  describe("Success After Failures", () => {
    it("should reset failure count after success", async () => {
      const name = "reset-on-success-test";
      const options = { failureThreshold: 3, resetTimeoutMs: 60000 };

      // Record 2 failures
      await withCircuitBreaker(name, async () => { throw new Error("fail"); }, "fallback", options);
      await withCircuitBreaker(name, async () => { throw new Error("fail"); }, "fallback", options);

      expect(getCircuitStatus(name).failures).toBe(2);
      expect(getCircuitStatus(name).state).toBe("CLOSED");

      // Record a success
      await withCircuitBreaker(name, async () => "success", "fallback", options);

      expect(getCircuitStatus(name).failures).toBe(0);
      expect(getCircuitStatus(name).state).toBe("CLOSED");
    });

    it("should handle intermittent failures", async () => {
      const name = "intermittent-test";
      const options = { failureThreshold: 3, resetTimeoutMs: 60000 };

      // Simulate intermittent failures
      const pattern = ["fail", "success", "fail", "success", "fail", "success"];

      for (const action of pattern) {
        if (action === "fail") {
          await withCircuitBreaker(name, async () => { throw new Error("fail"); }, "fallback", options);
        } else {
          await withCircuitBreaker(name, async () => "success", "fallback", options);
        }
      }

      // Circuit should still be closed due to resets
      expect(getCircuitStatus(name).state).toBe("CLOSED");
      expect(getCircuitStatus(name).failures).toBe(0);
    });
  });

  describe("Metrics and Monitoring", () => {
    it("should track last failure timestamp", async () => {
      const name = "timestamp-test";
      const options = { failureThreshold: 3, resetTimeoutMs: 60000 };

      const beforeFailure = new Date();

      await withCircuitBreaker(
        name,
        async () => { throw new Error("fail"); },
        "fallback",
        options
      );

      const afterFailure = new Date();
      const status = getCircuitStatus(name);

      expect(status.lastFailure).not.toBeNull();
      expect(status.lastFailure!.getTime()).toBeGreaterThanOrEqual(beforeFailure.getTime());
      expect(status.lastFailure!.getTime()).toBeLessThanOrEqual(afterFailure.getTime());
    });

    it("should accurately count failures", async () => {
      const name = "count-test";
      const options = { failureThreshold: 10, resetTimeoutMs: 60000 };

      for (let i = 1; i <= 5; i++) {
        await withCircuitBreaker(
          name,
          async () => { throw new Error("fail"); },
          "fallback",
          options
        );
        expect(getCircuitStatus(name).failures).toBe(i);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero timeout gracefully", async () => {
      const name = "zero-timeout-test";
      const options = { failureThreshold: 1, resetTimeoutMs: 0 };

      await withCircuitBreaker(
        name,
        async () => { throw new Error("fail"); },
        "fallback",
        options
      );

      // With 0 timeout, circuit should immediately allow retry
      const { result, fromFallback } = await withCircuitBreaker(
        name,
        async () => "recovered",
        "fallback",
        options
      );

      expect(result).toBe("recovered");
      expect(fromFallback).toBe(false);
    });

    it("should handle service that throws non-Error objects", async () => {
      const name = "non-error-throw-test";
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };

      const { result, fromFallback } = await withCircuitBreaker(
        name,
        async () => { throw "string error"; },
        "fallback",
        options
      );

      expect(result).toBe("fallback");
      expect(fromFallback).toBe(true);
      expect(getCircuitStatus(name).state).toBe("OPEN");
    });

    it("should handle null/undefined fallback values", async () => {
      const name = "null-fallback-test";
      const options = { failureThreshold: 1, resetTimeoutMs: 60000 };

      const { result, fromFallback } = await withCircuitBreaker(
        name,
        async () => { throw new Error("fail"); },
        null,
        options
      );

      expect(result).toBeNull();
      expect(fromFallback).toBe(true);
    });
  });
});
