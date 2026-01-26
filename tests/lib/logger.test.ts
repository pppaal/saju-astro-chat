/**
 * Tests for Logger module
 * src/lib/logger.ts
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

  describe("logger.info", () => {
    it("should log info message", () => {
      logger.info("Test info message");
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Test info message", "");
    });

    it("should log info message with metadata object", () => {
      logger.info("User logged in", { userId: "123", action: "login" });
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] User logged in",
        { userId: "123", action: "login" }
      );
    });

    it("should handle null metadata", () => {
      logger.info("Message", null);
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Message", "");
    });

    it("should handle undefined metadata", () => {
      logger.info("Message", undefined);
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Message", "");
    });
  });

  describe("logger.warn", () => {
    it("should log warning message", () => {
      logger.warn("Test warning");
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] Test warning", "");
    });

    it("should log warning with metadata", () => {
      logger.warn("Rate limit exceeded", { ip: "192.168.1.1", limit: 100 });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[WARN] Rate limit exceeded",
        { ip: "192.168.1.1", limit: 100 }
      );
    });
  });

  describe("logger.error", () => {
    it("should log error message", () => {
      logger.error("Test error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] Test error", "");
    });

    it("should log error with Error object", () => {
      const error = new Error("Something went wrong");
      logger.error("API Error", error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] API Error",
        expect.objectContaining({
          message: "Something went wrong",
          stack: expect.any(String),
        })
      );
    });

    it("should log error with metadata", () => {
      logger.error("Database error", { query: "SELECT *", table: "users" });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Database error",
        { query: "SELECT *", table: "users" }
      );
    });
  });

  describe("logger.debug", () => {
    it("should log debug message in non-production", () => {
      logger.debug("Debug info");
      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] Debug info", "");
    });

    it("should log debug with metadata", () => {
      logger.debug("Request details", { method: "GET", path: "/api/test" });
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[DEBUG] Request details",
        { method: "GET", path: "/api/test" }
      );
    });
  });

  describe("logInfo convenience function", () => {
    it("should call logger.info", () => {
      logInfo("Info message", { key: "value" });
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] Info message",
        { key: "value" }
      );
    });
  });

  describe("logWarn convenience function", () => {
    it("should call logger.warn", () => {
      logWarn("Warning message", { key: "value" });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[WARN] Warning message",
        { key: "value" }
      );
    });
  });

  describe("logDebug convenience function", () => {
    it("should call logger.debug", () => {
      logDebug("Debug message", { key: "value" });
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[DEBUG] Debug message",
        { key: "value" }
      );
    });
  });

  describe("logError convenience function", () => {
    it("should handle Error object", () => {
      const error = new Error("Test error");
      logError("Error occurred", error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error occurred",
        expect.objectContaining({
          error: "Test error",
          stack: expect.any(String),
        })
      );
    });

    it("should handle error-like object", () => {
      const errorLike = { message: "Custom error", code: "E001" };
      logError("Error occurred", errorLike);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error occurred",
        expect.objectContaining({
          error: "Custom error",
        })
      );
    });

    it("should handle string error", () => {
      logError("Error occurred", "Simple string error");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error occurred",
        expect.objectContaining({
          error: "Simple string error",
        })
      );
    });

    it("should include additional metadata", () => {
      const error = new Error("Test error");
      logError("Error occurred", error, { userId: "123", action: "save" });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error occurred",
        expect.objectContaining({
          error: "Test error",
          userId: "123",
          action: "save",
        })
      );
    });
  });

  describe("Metadata handling", () => {
    it("should wrap primitive values in object", () => {
      logger.info("Number value", 42);
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] Number value",
        { value: 42 }
      );
    });

    it("should wrap string values in object", () => {
      logger.info("String value", "test string");
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] String value",
        { value: "test string" }
      );
    });

    it("should wrap array values in object", () => {
      logger.info("Array value", [1, 2, 3]);
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] Array value",
        { value: [1, 2, 3] }
      );
    });

    it("should pass object values directly", () => {
      logger.info("Object value", { a: 1, b: 2 });
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] Object value",
        { a: 1, b: 2 }
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string message", () => {
      logger.info("");
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] ", "");
    });

    it("should handle very long messages", () => {
      const longMessage = "a".repeat(10000);
      logger.info(longMessage);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`[INFO] ${longMessage}`, "");
    });

    it("should handle special characters in message", () => {
      logger.info("Special chars: 한글 日本語 émoji 🎉");
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO] Special chars: 한글 日本語 émoji 🎉",
        ""
      );
    });

    it("should handle nested objects", () => {
      const nested = {
        level1: {
          level2: {
            level3: "deep value",
          },
        },
      };
      logger.info("Nested", nested);
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Nested", nested);
    });

    it("should handle circular references in Error", () => {
      const error = new Error("Circular");
      logger.error("Error with circular", error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});