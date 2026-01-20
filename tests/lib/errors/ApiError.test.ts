/**
 * Tests for src/lib/errors/ApiError.ts
 * API Error handling utilities
 */
import { describe, it, expect, vi } from "vitest";
import {
  ApiError,
  ErrorCodes,
  errorResponse,
  successResponse,
  handleApiError,
} from "@/lib/errors/ApiError";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("ApiError", () => {
  describe("ErrorCodes", () => {
    it("should have 400 error codes", () => {
      expect(ErrorCodes.INVALID_BODY).toBe("invalid_body");
      expect(ErrorCodes.MISSING_FIELDS).toBe("missing_fields");
      expect(ErrorCodes.INVALID_DATE).toBe("invalid_date");
      expect(ErrorCodes.VALIDATION_FAILED).toBe("validation_failed");
    });

    it("should have 401 error codes", () => {
      expect(ErrorCodes.UNAUTHORIZED).toBe("unauthorized");
      expect(ErrorCodes.NOT_AUTHENTICATED).toBe("not_authenticated");
    });

    it("should have 403 error codes", () => {
      expect(ErrorCodes.FORBIDDEN).toBe("forbidden");
      expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe("insufficient_credits");
    });

    it("should have 404 error codes", () => {
      expect(ErrorCodes.NOT_FOUND).toBe("not_found");
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe("resource_not_found");
    });

    it("should have 429 error codes", () => {
      expect(ErrorCodes.RATE_LIMITED).toBe("rate_limited");
      expect(ErrorCodes.TOO_MANY_REQUESTS).toBe("too_many_requests");
    });

    it("should have 500 error codes", () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe("internal_error");
      expect(ErrorCodes.SERVER_ERROR).toBe("server_error");
      expect(ErrorCodes.AI_SERVICE_ERROR).toBe("ai_service_error");
      expect(ErrorCodes.DATABASE_ERROR).toBe("database_error");
    });

    it("should have 503 error code", () => {
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("service_unavailable");
    });
  });

  describe("ApiError class", () => {
    it("should create error with code and status", () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400);

      expect(error.code).toBe("invalid_body");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe("invalid_body");
    });

    it("should create error with details", () => {
      const details = { field: "email", reason: "invalid format" };
      const error = new ApiError(ErrorCodes.VALIDATION_FAILED, 400, details);

      expect(error.details).toEqual(details);
    });

    it("should use default status code of 400", () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      expect(error.statusCode).toBe(400);
    });

    describe("getMessage", () => {
      it("should return English message by default", () => {
        const error = new ApiError(ErrorCodes.UNAUTHORIZED);
        expect(error.getMessage()).toBe("Unauthorized");
      });

      it("should return Korean message when specified", () => {
        const error = new ApiError(ErrorCodes.UNAUTHORIZED);
        expect(error.getMessage("ko")).toBe("인증이 필요합니다");
      });

      it("should return code if message not found", () => {
        const error = new ApiError("unknown_code" as any);
        expect(error.getMessage()).toBe("unknown_code");
      });
    });

    describe("toResponse", () => {
      it("should create NextResponse with error data", async () => {
        const error = new ApiError(ErrorCodes.NOT_FOUND, 404);
        const response = error.toResponse();

        expect(response.status).toBe(404);

        const body = await response.json();
        expect(body.error).toBe("not_found");
        expect(body.message).toBe("Not found");
      });

      it("should include details when present", async () => {
        const error = new ApiError(ErrorCodes.VALIDATION_FAILED, 400, { field: "name" });
        const response = error.toResponse();

        const body = await response.json();
        expect(body.details).toEqual({ field: "name" });
      });

      it("should use Korean message when specified", async () => {
        const error = new ApiError(ErrorCodes.FORBIDDEN);
        const response = error.toResponse("ko");

        const body = await response.json();
        expect(body.message).toBe("접근 권한이 없습니다");
      });
    });

    describe("Factory methods", () => {
      it("should create badRequest error", () => {
        const error = ApiError.badRequest();
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("invalid_body");
      });

      it("should create badRequest with custom code", () => {
        const error = ApiError.badRequest(ErrorCodes.INVALID_DATE);
        expect(error.code).toBe("invalid_date");
      });

      it("should create unauthorized error", () => {
        const error = ApiError.unauthorized();
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe("unauthorized");
      });

      it("should create forbidden error", () => {
        const error = ApiError.forbidden();
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe("forbidden");
      });

      it("should create notFound error", () => {
        const error = ApiError.notFound();
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe("not_found");
      });

      it("should create rateLimited error", () => {
        const error = ApiError.rateLimited();
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe("rate_limited");
      });

      it("should create internal error", () => {
        const error = ApiError.internal();
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe("internal_error");
      });

      it("should create serviceUnavailable error", () => {
        const error = ApiError.serviceUnavailable();
        expect(error.statusCode).toBe(503);
        expect(error.code).toBe("service_unavailable");
      });
    });
  });

  describe("errorResponse", () => {
    it("should create error response", async () => {
      const response = errorResponse(ErrorCodes.INVALID_BODY, 400);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("invalid_body");
    });

    it("should use Korean message when specified", async () => {
      const response = errorResponse(ErrorCodes.RATE_LIMITED, 429, "ko");

      const body = await response.json();
      expect(body.message).toContain("요청이 너무 많습니다");
    });
  });

  describe("successResponse", () => {
    it("should create success response with data", async () => {
      const data = { id: 1, name: "test" };
      const response = successResponse(data);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("should use custom status code", async () => {
      const response = successResponse({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe("handleApiError", () => {
    it("should handle ApiError instances", async () => {
      const error = new ApiError(ErrorCodes.FORBIDDEN, 403);
      const response = handleApiError(error);

      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe("forbidden");
    });

    it("should handle standard Error", async () => {
      const error = new Error("Something went wrong");
      const response = handleApiError(error);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("internal_error");
    });

    it("should handle unknown errors", async () => {
      const response = handleApiError("string error");

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("internal_error");
    });

    it("should use Korean message when specified", async () => {
      const error = new ApiError(ErrorCodes.DATABASE_ERROR, 500);
      const response = handleApiError(error, "ko");

      const body = await response.json();
      expect(body.message).toBe("데이터베이스 오류가 발생했습니다");
    });
  });
});
