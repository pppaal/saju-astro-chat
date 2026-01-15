// src/lib/errors/ApiError.ts
// Standardized API error handling

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Standard error codes used across API routes
 */
export const ErrorCodes = {
  // 400 Bad Request
  INVALID_BODY: "invalid_body",
  MISSING_FIELDS: "missing_fields",
  INVALID_DATE: "invalid_date",
  INVALID_TIME: "invalid_time",
  INVALID_LATITUDE: "invalid_latitude",
  INVALID_LONGITUDE: "invalid_longitude",
  INVALID_TIMEZONE: "invalid_timezone",
  VALIDATION_FAILED: "validation_failed",

  // 401 Unauthorized
  UNAUTHORIZED: "unauthorized",
  NOT_AUTHENTICATED: "not_authenticated",

  // 403 Forbidden
  FORBIDDEN: "forbidden",
  INSUFFICIENT_CREDITS: "insufficient_credits",

  // 404 Not Found
  NOT_FOUND: "not_found",
  RESOURCE_NOT_FOUND: "resource_not_found",

  // 429 Too Many Requests
  RATE_LIMITED: "rate_limited",
  TOO_MANY_REQUESTS: "too_many_requests",

  // 500 Internal Server Error
  INTERNAL_ERROR: "internal_error",
  SERVER_ERROR: "server_error",
  AI_SERVICE_ERROR: "ai_service_error",
  DATABASE_ERROR: "database_error",

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: "service_unavailable",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Localized error messages
 */
const ERROR_MESSAGES: Record<ErrorCode, { ko: string; en: string }> = {
  invalid_body: { ko: "요청 본문이 올바르지 않습니다", en: "Invalid request body" },
  missing_fields: { ko: "필수 필드가 누락되었습니다", en: "Missing required fields" },
  invalid_date: { ko: "날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)", en: "Invalid date format (YYYY-MM-DD)" },
  invalid_time: { ko: "시간 형식이 올바르지 않습니다 (HH:MM)", en: "Invalid time format (HH:MM)" },
  invalid_latitude: { ko: "위도가 올바르지 않습니다 (-90 ~ 90)", en: "Invalid latitude (-90 to 90)" },
  invalid_longitude: { ko: "경도가 올바르지 않습니다 (-180 ~ 180)", en: "Invalid longitude (-180 to 180)" },
  invalid_timezone: { ko: "타임존이 올바르지 않습니다", en: "Invalid timezone" },
  validation_failed: { ko: "입력값 검증에 실패했습니다", en: "Validation failed" },

  unauthorized: { ko: "인증이 필요합니다", en: "Unauthorized" },
  not_authenticated: { ko: "로그인이 필요합니다", en: "Not authenticated" },

  forbidden: { ko: "접근 권한이 없습니다", en: "Forbidden" },
  insufficient_credits: { ko: "크레딧이 부족합니다", en: "Insufficient credits" },

  not_found: { ko: "찾을 수 없습니다", en: "Not found" },
  resource_not_found: { ko: "요청한 리소스를 찾을 수 없습니다", en: "Resource not found" },

  rate_limited: { ko: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요", en: "Too many requests. Try again soon" },
  too_many_requests: { ko: "요청이 너무 많습니다", en: "Too many requests" },

  internal_error: { ko: "서버 오류가 발생했습니다", en: "Internal server error" },
  server_error: { ko: "서버 오류가 발생했습니다", en: "Server error" },
  ai_service_error: { ko: "AI 서비스 오류가 발생했습니다", en: "AI service error" },
  database_error: { ko: "데이터베이스 오류가 발생했습니다", en: "Database error" },

  service_unavailable: { ko: "서비스를 일시적으로 사용할 수 없습니다", en: "Service unavailable" },
};

/**
 * Standard API Error class
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    statusCode: number = 400,
    details?: unknown
  ) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Get localized message
   */
  getMessage(lang: "ko" | "en" = "en"): string {
    return ERROR_MESSAGES[this.code]?.[lang] || this.code;
  }

  /**
   * Convert to NextResponse
   */
  toResponse(lang: "ko" | "en" = "en", headers?: HeadersInit): NextResponse {
    return NextResponse.json(
      {
        error: this.code,
        message: this.getMessage(lang),
        ...(this.details ? { details: this.details } : {}),
      },
      { status: this.statusCode, headers }
    );
  }

  // ============================================================
  // Factory Methods
  // ============================================================

  static badRequest(code: ErrorCode = ErrorCodes.INVALID_BODY, details?: unknown): ApiError {
    return new ApiError(code, 400, details);
  }

  static unauthorized(code: ErrorCode = ErrorCodes.UNAUTHORIZED): ApiError {
    return new ApiError(code, 401);
  }

  static forbidden(code: ErrorCode = ErrorCodes.FORBIDDEN): ApiError {
    return new ApiError(code, 403);
  }

  static notFound(code: ErrorCode = ErrorCodes.NOT_FOUND): ApiError {
    return new ApiError(code, 404);
  }

  static rateLimited(): ApiError {
    return new ApiError(ErrorCodes.RATE_LIMITED, 429);
  }

  static internal(code: ErrorCode = ErrorCodes.INTERNAL_ERROR, details?: unknown): ApiError {
    return new ApiError(code, 500, details);
  }

  static serviceUnavailable(): ApiError {
    return new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, 503);
  }
}

// ============================================================
// Response Helper Functions
// ============================================================

/**
 * Create error response (shorthand)
 */
export function errorResponse(
  code: ErrorCode,
  statusCode: number = 400,
  lang: "ko" | "en" = "en",
  headers?: HeadersInit
): NextResponse {
  return new ApiError(code, statusCode).toResponse(lang, headers);
}

/**
 * Create success response with standard format
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(data, { status: statusCode, headers });
}

/**
 * Handle caught errors uniformly
 */
export function handleApiError(
  err: unknown,
  lang: "ko" | "en" = "en",
  defaultMessage?: string
): NextResponse {
  // Already an ApiError
  if (err instanceof ApiError) {
    return err.toResponse(lang);
  }

  // Standard Error
  if (err instanceof Error) {
    logger.error("[API Error]:", err.message);
    return new ApiError(
      ErrorCodes.INTERNAL_ERROR,
      500,
      defaultMessage || err.message
    ).toResponse(lang);
  }

  // Unknown error
  logger.error("[API Error]:", err);
  return new ApiError(ErrorCodes.INTERNAL_ERROR, 500).toResponse(lang);
}
