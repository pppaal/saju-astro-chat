/**
 * Tests for api/errorHandler.ts
 * Centralized API error handling utilities
 */

import { vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/telemetry", () => ({
  captureServerError: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  recordCounter: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  ErrorCodes,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
  type ErrorCode,
} from "@/lib/api/errorHandler";
import { captureServerError } from "@/lib/telemetry";
import { recordCounter } from "@/lib/metrics";
import { logger } from "@/lib/logger";

describe("errorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ErrorCodes", () => {
    it("has all expected client error codes", () => {
      expect(ErrorCodes.BAD_REQUEST).toBe("BAD_REQUEST");
      expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN");
      expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
      expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe("PAYLOAD_TOO_LARGE");
    });

    it("has all expected server error codes", () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
      expect(ErrorCodes.BACKEND_ERROR).toBe("BACKEND_ERROR");
      expect(ErrorCodes.TIMEOUT).toBe("TIMEOUT");
      expect(ErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR");
    });
  });

  describe("createErrorResponse", () => {
    it("returns 400 for BAD_REQUEST", async () => {
      const response = createErrorResponse({ code: ErrorCodes.BAD_REQUEST });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 401 for UNAUTHORIZED", async () => {
      const response = createErrorResponse({ code: ErrorCodes.UNAUTHORIZED });
      expect(response.status).toBe(401);
    });

    it("returns 403 for FORBIDDEN", async () => {
      const response = createErrorResponse({ code: ErrorCodes.FORBIDDEN });
      expect(response.status).toBe(403);
    });

    it("returns 404 for NOT_FOUND", async () => {
      const response = createErrorResponse({ code: ErrorCodes.NOT_FOUND });
      expect(response.status).toBe(404);
    });

    it("returns 429 for RATE_LIMITED", async () => {
      const response = createErrorResponse({ code: ErrorCodes.RATE_LIMITED });
      expect(response.status).toBe(429);
    });

    it("returns 422 for VALIDATION_ERROR", async () => {
      const response = createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR });
      expect(response.status).toBe(422);
    });

    it("returns 413 for PAYLOAD_TOO_LARGE", async () => {
      const response = createErrorResponse({ code: ErrorCodes.PAYLOAD_TOO_LARGE });
      expect(response.status).toBe(413);
    });

    it("returns 500 for INTERNAL_ERROR", async () => {
      const response = createErrorResponse({ code: ErrorCodes.INTERNAL_ERROR });
      expect(response.status).toBe(500);
    });

    it("returns 503 for SERVICE_UNAVAILABLE", async () => {
      const response = createErrorResponse({ code: ErrorCodes.SERVICE_UNAVAILABLE });
      expect(response.status).toBe(503);
    });

    it("returns 502 for BACKEND_ERROR", async () => {
      const response = createErrorResponse({ code: ErrorCodes.BACKEND_ERROR });
      expect(response.status).toBe(502);
    });

    it("returns 504 for TIMEOUT", async () => {
      const response = createErrorResponse({ code: ErrorCodes.TIMEOUT });
      expect(response.status).toBe(504);
    });

    it("returns 500 for DATABASE_ERROR", async () => {
      const response = createErrorResponse({ code: ErrorCodes.DATABASE_ERROR });
      expect(response.status).toBe(500);
    });

    it("uses custom message when provided", async () => {
      const customMessage = "Custom error message";
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: customMessage,
      });

      const body = await response.json();
      expect(body.error.message).toBe(customMessage);
    });

    it("returns Korean message for ko locale", async () => {
      const response = createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: "ko",
      });

      const body = await response.json();
      expect(body.error.message).toContain("로그인");
    });

    it("returns Japanese message for ja locale", async () => {
      const response = createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: "ja",
      });

      const body = await response.json();
      expect(body.error.message).toContain("ログイン");
    });

    it("returns Chinese message for zh locale", async () => {
      const response = createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: "zh",
      });

      const body = await response.json();
      expect(body.error.message).toContain("登录");
    });

    it("defaults to English message for unknown locale", async () => {
      const response = createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: "xx",
      });

      const body = await response.json();
      expect(body.error.message).toContain("log in");
    });

    it("captures server errors for 5xx status", () => {
      const originalError = new Error("Test error");
      createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        originalError,
        route: "/api/test",
      });

      expect(captureServerError).toHaveBeenCalledWith(
        originalError,
        expect.objectContaining({
          route: "/api/test",
          code: "INTERNAL_ERROR",
          status: 500,
        })
      );
    });

    it("does not capture server errors for 4xx status", () => {
      const originalError = new Error("Test error");
      createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        originalError,
      });

      expect(captureServerError).not.toHaveBeenCalled();
    });

    it("records metrics for all errors", () => {
      createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        route: "/api/test",
      });

      expect(recordCounter).toHaveBeenCalledWith(
        "api.error",
        1,
        expect.objectContaining({
          code: "NOT_FOUND",
          status: "404",
          route: "/api/test",
        })
      );
    });

    it("includes custom headers", async () => {
      const response = createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        headers: { "Retry-After": "60" },
      });

      expect(response.headers.get("Retry-After")).toBe("60");
    });

    it("includes details in development mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const response = createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        details: { field: "email", reason: "invalid format" },
      });

      const body = await response.json();
      expect(body.error.details).toEqual({ field: "email", reason: "invalid format" });

      process.env.NODE_ENV = originalEnv;
    });

    it("excludes details in production mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const response = createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        details: { field: "email", reason: "invalid format" },
      });

      const body = await response.json();
      expect(body.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("sets Content-Type header to application/json", async () => {
      const response = createErrorResponse({ code: ErrorCodes.BAD_REQUEST });
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("createSuccessResponse", () => {
    it("returns success: true with data", async () => {
      const data = { id: 1, name: "Test" };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it("uses custom status code", async () => {
      const response = createSuccessResponse({ created: true }, { status: 201 });
      expect(response.status).toBe(201);
    });

    it("includes custom headers", async () => {
      const response = createSuccessResponse(
        { id: 1 },
        { headers: { "X-Custom-Header": "value" } }
      );

      expect(response.headers.get("X-Custom-Header")).toBe("value");
    });

    it("includes meta information when provided", async () => {
      const response = createSuccessResponse(
        { items: [] },
        { meta: { total: 100, page: 1 } }
      );

      const body = await response.json();
      expect(body.meta).toEqual({ total: 100, page: 1 });
    });

    it("excludes meta when not provided", async () => {
      const response = createSuccessResponse({ id: 1 });

      const body = await response.json();
      expect(body.meta).toBeUndefined();
    });

    it("sets Content-Type header to application/json", async () => {
      const response = createSuccessResponse({ id: 1 });
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("withErrorHandler", () => {
    it("returns handler result on success", async () => {
      const mockResponse = NextResponse.json({ success: true });
      const handler = vi.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result).toBe(mockResponse);
      expect(handler).toHaveBeenCalledWith(request);
    });

    it("catches and handles timeout errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Request timeout"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(504);
      const body = await result.json();
      expect(body.error.code).toBe("TIMEOUT");
    });

    it("catches and handles AbortError", async () => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(504);
    });

    it("catches and handles rate limit errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("rate limit exceeded"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(429);
    });

    it("catches and handles too many requests errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("too many requests"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(429);
    });

    it("catches and handles unauthorized errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("unauthorized access"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(401);
    });

    it("catches and handles auth errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("auth failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(401);
    });

    it("catches and handles not found errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Resource not found"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(404);
    });

    it("catches and handles validation errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("validation failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(422);
    });

    it("catches and handles invalid input errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("invalid input"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(422);
    });

    it("catches and handles Prisma P2025 errors", async () => {
      const error = new Error("Prisma error") as Error & { code: string };
      error.code = "P2025";
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.error.code).toBe("DATABASE_ERROR");
    });

    it("catches and handles database errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("database connection failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.error.code).toBe("DATABASE_ERROR");
    });

    it("defaults to INTERNAL_ERROR for unknown errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Something unexpected"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("logs errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Test error"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      await wrappedHandler(request);

      expect(logger.error).toHaveBeenCalledWith(
        "[API Error] /api/test:",
        expect.any(Error)
      );
    });

    it("extracts Korean locale from Accept-Language header", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("auth failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test", {
        headers: { "Accept-Language": "ko-KR,ko;q=0.9" },
      });
      const result = await wrappedHandler(request);

      const body = await result.json();
      expect(body.error.message).toContain("로그인");
    });

    it("extracts Japanese locale from Accept-Language header", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("auth failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test", {
        headers: { "Accept-Language": "ja-JP,ja;q=0.9" },
      });
      const result = await wrappedHandler(request);

      const body = await result.json();
      expect(body.error.message).toContain("ログイン");
    });

    it("extracts Chinese locale from Accept-Language header", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("auth failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test", {
        headers: { "Accept-Language": "zh-CN,zh;q=0.9" },
      });
      const result = await wrappedHandler(request);

      const body = await result.json();
      expect(body.error.message).toContain("登录");
    });

    it("defaults to English locale", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("auth failed"));
      const wrappedHandler = withErrorHandler(handler, "/api/test");

      const request = new Request("https://example.com/api/test");
      const result = await wrappedHandler(request);

      const body = await result.json();
      expect(body.error.message).toContain("log in");
    });
  });
});
