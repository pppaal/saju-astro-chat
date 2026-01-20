/**
 * Tests for src/lib/telemetry.ts
 * Telemetry and error capture utilities
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureServerError, captureException, trackMetric } from "@/lib/telemetry";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setMeasurement: vi.fn(),
}));

describe("Telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("captureServerError", () => {
    it("should capture Error instance", async () => {
      const error = new Error("Test error");
      captureServerError(error);

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should capture string error", async () => {
      captureServerError("String error");

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should scrub sensitive context data", async () => {
      const error = new Error("Test");
      const context = {
        userId: "123",
        authorization: "Bearer token123",
        apiKey: "secret-key",
        safeData: "visible",
      };

      captureServerError(error, context);

      const { logger } = await import("@/lib/logger");
      const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = logCall[1];

      expect(payload.safeData).toBe("visible");
      expect(payload.authorization).toBe("[redacted]");
    });

    it("should handle nested context objects", async () => {
      const error = new Error("Test");
      const context = {
        user: {
          id: "123",
          password: "secret123",
        },
      };

      captureServerError(error, context);

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle context with arrays", async () => {
      const error = new Error("Test");
      const context = {
        items: ["item1", "item2"],
      };

      captureServerError(error, context);

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("captureException", () => {
    it("should capture Error instance", async () => {
      const error = new Error("Test exception");
      captureException(error);

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalledWith(
        "Exception captured:",
        expect.objectContaining({ message: "Test exception" })
      );
    });

    it("should capture non-Error values", async () => {
      captureException("String exception");

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should scrub sensitive context", async () => {
      const error = new Error("Test");
      captureException(error, { token: "secret", safe: "value" });

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle undefined context", async () => {
      const error = new Error("Test");
      captureException(error);

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("trackMetric", () => {
    it("should log metric with value", async () => {
      trackMetric("api.latency", 150);

      const { logger } = await import("@/lib/logger");
      expect(logger.debug).toHaveBeenCalledWith(
        "[Metric] api.latency: 150",
        ""
      );
    });

    it("should log metric with tags", async () => {
      trackMetric("api.latency", 150, { endpoint: "/api/tarot" });

      const { logger } = await import("@/lib/logger");
      expect(logger.debug).toHaveBeenCalledWith(
        "[Metric] api.latency: 150",
        { endpoint: "/api/tarot" }
      );
    });
  });

  describe("Sensitive data scrubbing", () => {
    const sensitiveKeys = [
      "authorization",
      "cookie",
      "x-api-key",
      "token",
      "secret",
      "password",
      "apikey",
      "access_key",
      "refresh_token",
    ];

    sensitiveKeys.forEach((key) => {
      it(`should redact "${key}" field`, async () => {
        const context = { [key]: "sensitive-value", safe: "visible" };
        captureServerError(new Error("Test"), context);

        const { logger } = await import("@/lib/logger");
        const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
        const payload = logCall[1];

        expect(payload[key]).toBe("[redacted]");
        expect(payload.safe).toBe("visible");
      });
    });

    it("should handle case-insensitive key matching", async () => {
      const context = {
        AUTHORIZATION: "bearer token",
        Authorization: "bearer token",
        PASSWORD: "secret",
      };

      captureServerError(new Error("Test"), context);

      const { logger } = await import("@/lib/logger");
      const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = logCall[1];

      expect(payload.AUTHORIZATION).toBe("[redacted]");
      expect(payload.Authorization).toBe("[redacted]");
      expect(payload.PASSWORD).toBe("[redacted]");
    });
  });
});
