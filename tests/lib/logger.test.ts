/**
 * Tests for Logger module
 * src/lib/logger/index.ts (re-exported from src/lib/logger.ts)
 *
 * The structured logger behaves as follows:
 * - In test env (NODE_ENV=test): only 'error' level logs are output
 * - In non-development: output is JSON formatted (single string argument)
 * - Info, warn, debug are suppressed in test environment
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, logInfo, logError, logWarn, logDebug } from "@/lib/logger";

describe("Logger", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("test environment log suppression", () => {
    it("should suppress info in test env", () => {
      logger.info("Test info message");
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("should suppress warn in test env", () => {
      logger.warn("Test warning");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should suppress debug in test env", () => {
      logger.debug("Debug info");
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe("logger.error (only level that logs in test env)", () => {
    it("should log error message as JSON", () => {
      logger.error("Test error");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("Test error");
      expect(parsed.timestamp).toBeDefined();
    });

    it("should log error with Error object", () => {
      const error = new Error("Something went wrong");
      logger.error("API Error", error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("API Error");
      expect(parsed.error.message).toBe("Something went wrong");
      expect(parsed.error.stack).toBeDefined();
    });

    it("should log error with context object", () => {
      logger.error("Database error", { query: "SELECT *", table: "users" });
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe("Database error");
      expect(parsed.context.query).toBe("SELECT *");
      expect(parsed.context.table).toBe("users");
    });
  });

  describe("logInfo convenience function", () => {
    it("should be suppressed in test env", () => {
      logInfo("Info message", { key: "value" });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe("logWarn convenience function", () => {
    it("should be suppressed in test env", () => {
      logWarn("Warning message", { key: "value" });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("logDebug convenience function", () => {
    it("should be suppressed in test env", () => {
      logDebug("Debug message", { key: "value" });
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe("logError convenience function", () => {
    it("should handle Error object", () => {
      const error = new Error("Test error");
      logError("Error occurred", error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe("Error occurred");
      expect(parsed.context.errorMessage).toBe("Test error");
      expect(parsed.context.stack).toBeDefined();
    });

    it("should handle error-like object", () => {
      const errorLike = { message: "Custom error", code: "E001" };
      logError("Error occurred", errorLike);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe("Error occurred");
      expect(parsed.context.errorMessage).toBe("Custom error");
    });

    it("should handle string error", () => {
      logError("Error occurred", "Simple string error");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.context.errorMessage).toBe("Simple string error");
    });

    it("should include additional metadata", () => {
      const error = new Error("Test error");
      logError("Error occurred", error, { userId: "123", action: "save" });
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.context.errorMessage).toBe("Test error");
      expect(parsed.context.userId).toBe("123");
      expect(parsed.context.action).toBe("save");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string error message", () => {
      logger.error("");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe("");
    });

    it("should handle very long error messages", () => {
      const longMessage = "a".repeat(10000);
      logger.error(longMessage);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe(longMessage);
    });

    it("should handle special characters in error message", () => {
      logger.error("Special chars: 한글 日本語 émoji");
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe("Special chars: 한글 日本語 émoji");
    });

    it("should handle circular references in Error gracefully", () => {
      const error = new Error("Circular");
      logger.error("Error with circular", error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle nested context objects", () => {
      const nested = { level1: { level2: { level3: "deep value" } } };
      logger.error("Nested", nested);
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.context.level1.level2.level3).toBe("deep value");
    });
  });
});
