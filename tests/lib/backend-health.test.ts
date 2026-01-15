/**
 * Tests for backend-health.ts
 * Backend AI health check and circuit breaker logic
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/metrics", () => ({
  recordCounter: vi.fn(),
  recordTiming: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("backend-health", () => {
  const BACKEND_URL = "https://api.example.com";

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    mockFetch.mockReset();

    // Reset health status before each test
    const { resetHealthStatus } = await import("@/lib/backend-health");
    resetHealthStatus();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkBackendHealth", () => {
    it("returns true when backend responds with OK", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { checkBackendHealth } = await import("@/lib/backend-health");
      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/`,
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("returns false when backend responds with error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { checkBackendHealth } = await import("@/lib/backend-health");
      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(false);
    });

    it("returns false when fetch throws error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { checkBackendHealth } = await import("@/lib/backend-health");
      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(false);
    });

    it("rate limits health checks within interval", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const { checkBackendHealth } = await import("@/lib/backend-health");

      // First check - should call fetch
      await checkBackendHealth(BACKEND_URL);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second check immediately - should use cached result
      await checkBackendHealth(BACKEND_URL);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("allows health check after interval passes", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const { checkBackendHealth } = await import("@/lib/backend-health");

      // First check
      await checkBackendHealth(BACKEND_URL);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by more than health check interval (1 minute)
      vi.advanceTimersByTime(61000);

      // Second check after interval - should call fetch again
      await checkBackendHealth(BACKEND_URL);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("opens circuit breaker after max failures", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const { checkBackendHealth, getHealthStatus } = await import("@/lib/backend-health");

      // Fail 3 times (MAX_FAILURES)
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000); // Advance past rate limit
        await checkBackendHealth(BACKEND_URL);
      }

      const status = getHealthStatus();
      expect(status.healthy).toBe(false);
      expect(status.consecutiveFailures).toBe(3);
    });

    it("circuit breaker blocks health checks", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const { checkBackendHealth, getHealthStatus } = await import("@/lib/backend-health");
      const { logger } = await import("@/lib/logger");

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      expect(getHealthStatus().healthy).toBe(false);

      // Clear mock to check new calls
      mockFetch.mockClear();
      vi.mocked(logger.warn).mockClear();

      // Advance time slightly (not past circuit break duration)
      vi.advanceTimersByTime(1000);

      // Check should be blocked by circuit breaker
      const result = await checkBackendHealth(BACKEND_URL);
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Circuit breaker active")
      );
    });

    it("circuit breaker allows retry after duration", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Recovery

      const { checkBackendHealth, getHealthStatus } = await import("@/lib/backend-health");

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      expect(getHealthStatus().healthy).toBe(false);

      // Advance past circuit break duration (5 minutes)
      vi.advanceTimersByTime(301000);

      // Should allow retry and succeed
      const result = await checkBackendHealth(BACKEND_URL);
      expect(result).toBe(true);
      expect(getHealthStatus().healthy).toBe(true);
    });

    it("includes API token in headers when available", async () => {
      const originalEnv = process.env.ADMIN_API_TOKEN;
      process.env.ADMIN_API_TOKEN = "test-token";

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      vi.resetModules();
      const { checkBackendHealth, resetHealthStatus } = await import("@/lib/backend-health");
      resetHealthStatus();

      await checkBackendHealth(BACKEND_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-KEY": "test-token",
          }),
        })
      );

      process.env.ADMIN_API_TOKEN = originalEnv;
    });
  });

  describe("getHealthStatus", () => {
    it("returns copy of health status", async () => {
      const { getHealthStatus } = await import("@/lib/backend-health");
      const status = getHealthStatus();

      expect(status).toHaveProperty("healthy");
      expect(status).toHaveProperty("lastCheck");
      expect(status).toHaveProperty("consecutiveFailures");
    });

    it("returns healthy by default", async () => {
      const { getHealthStatus } = await import("@/lib/backend-health");
      const status = getHealthStatus();

      expect(status.healthy).toBe(true);
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe("resetHealthStatus", () => {
    it("resets health status to defaults", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const { checkBackendHealth, getHealthStatus, resetHealthStatus } = await import("@/lib/backend-health");

      // Create some failures
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      expect(getHealthStatus().healthy).toBe(false);

      // Reset
      resetHealthStatus();

      const status = getHealthStatus();
      expect(status.healthy).toBe(true);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.lastCheck).toBe(0);
    });
  });

  describe("callBackendWithFallback", () => {
    it("returns success when backend is healthy and responds", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Health check
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { result: "success" } }),
        });

      const { callBackendWithFallback, resetHealthStatus } = await import("@/lib/backend-health");
      resetHealthStatus();

      const result = await callBackendWithFallback(
        BACKEND_URL,
        "/api/test",
        { input: "data" },
        { fallback: true }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: "success" });
    });

    it("returns fallback when backend is unhealthy", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const { callBackendWithFallback, checkBackendHealth, resetHealthStatus } = await import("@/lib/backend-health");
      resetHealthStatus();

      // Make backend unhealthy
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      const fallbackData = { fallback: true, message: "Using fallback" };
      const result = await callBackendWithFallback(
        BACKEND_URL,
        "/api/test",
        { input: "data" },
        fallbackData
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
    });

    it("returns fallback when request fails", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Health check passes
        .mockRejectedValueOnce(new Error("Request failed")); // Actual request fails

      const { callBackendWithFallback, resetHealthStatus } = await import("@/lib/backend-health");
      resetHealthStatus();

      const fallbackData = { fallback: true };
      const result = await callBackendWithFallback(
        BACKEND_URL,
        "/api/test",
        { input: "data" },
        fallbackData
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
    });

    it("sends correct request body", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Health check
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: {} }),
        });

      const { callBackendWithFallback, resetHealthStatus } = await import("@/lib/backend-health");
      resetHealthStatus();

      const requestBody = { foo: "bar", nested: { value: 123 } };
      await callBackendWithFallback(BACKEND_URL, "/api/test", requestBody, {});

      // Second call is the actual request (first is health check)
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${BACKEND_URL}/api/test`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestBody),
        })
      );
    });
  });
});
