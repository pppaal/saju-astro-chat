/**
 * Centralized API Error Handling
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/telemetry";
import { recordCounter } from "@/lib/metrics";

// Error codes for categorization
export const ErrorCodes = {
  // 4xx Client Errors
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",

  // 5xx Server Errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  BACKEND_ERROR: "BACKEND_ERROR",
  TIMEOUT: "TIMEOUT",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// User-friendly error messages by language
const ERROR_MESSAGES: Record<ErrorCode, Record<string, string>> = {
  BAD_REQUEST: {
    en: "Invalid request. Please check your input.",
    ko: "잘못된 요청입니다. 입력을 확인해주세요.",
    ja: "リクエストが無効です。入力を確認してください。",
    zh: "请求无效。请检查您的输入。",
  },
  UNAUTHORIZED: {
    en: "Please log in to continue.",
    ko: "계속하려면 로그인해주세요.",
    ja: "続行するにはログインしてください。",
    zh: "请登录以继续。",
  },
  FORBIDDEN: {
    en: "You don't have permission to access this resource.",
    ko: "이 리소스에 대한 권한이 없습니다.",
    ja: "このリソースにアクセスする権限がありません。",
    zh: "您没有权限访问此资源。",
  },
  NOT_FOUND: {
    en: "The requested resource was not found.",
    ko: "요청하신 리소스를 찾을 수 없습니다.",
    ja: "リクエストされたリソースが見つかりません。",
    zh: "未找到请求的资源。",
  },
  RATE_LIMITED: {
    en: "Too many requests. Please wait a moment.",
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    ja: "リクエストが多すぎます。しばらくお待ちください。",
    zh: "请求过多。请稍等片刻。",
  },
  VALIDATION_ERROR: {
    en: "Input validation failed. Please check your data.",
    ko: "입력 검증에 실패했습니다. 데이터를 확인해주세요.",
    ja: "入力検証に失敗しました。データを確認してください。",
    zh: "输入验证失败。请检查您的数据。",
  },
  PAYLOAD_TOO_LARGE: {
    en: "Request data is too large.",
    ko: "요청 데이터가 너무 큽니다.",
    ja: "リクエストデータが大きすぎます。",
    zh: "请求数据过大。",
  },
  INTERNAL_ERROR: {
    en: "An unexpected error occurred. Please try again.",
    ko: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    ja: "予期しないエラーが発生しました。もう一度お試しください。",
    zh: "发生意外错误。请重试。",
  },
  SERVICE_UNAVAILABLE: {
    en: "Service is temporarily unavailable. Please try again later.",
    ko: "서비스가 일시적으로 사용 불가합니다. 나중에 다시 시도해주세요.",
    ja: "サービスが一時的に利用できません。後でもう一度お試しください。",
    zh: "服务暂时不可用。请稍后重试。",
  },
  BACKEND_ERROR: {
    en: "AI service is temporarily unavailable. We're using a fallback.",
    ko: "AI 서비스가 일시적으로 사용 불가합니다. 대체 응답을 사용합니다.",
    ja: "AIサービスが一時的に利用できません。代替応答を使用しています。",
    zh: "AI服务暂时不可用。正在使用备用响应。",
  },
  TIMEOUT: {
    en: "Request timed out. Please try again.",
    ko: "요청 시간이 초과되었습니다. 다시 시도해주세요.",
    ja: "リクエストがタイムアウトしました。もう一度お試しください。",
    zh: "请求超时。请重试。",
  },
  DATABASE_ERROR: {
    en: "Database error occurred. Please try again.",
    ko: "데이터베이스 오류가 발생했습니다. 다시 시도해주세요.",
    ja: "データベースエラーが発生しました。もう一度お試しください。",
    zh: "发生数据库错误。请重试。",
  },
};

// Status codes for each error type
const STATUS_CODES: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 422,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  BACKEND_ERROR: 502,
  TIMEOUT: 504,
  DATABASE_ERROR: 500,
};

export interface APIErrorOptions {
  code: ErrorCode;
  message?: string;
  details?: unknown;
  locale?: string;
  route?: string;
  originalError?: Error;
  headers?: Record<string, string>;
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(options: APIErrorOptions): NextResponse {
  const {
    code,
    message,
    details,
    locale = "en",
    route,
    originalError,
    headers = {},
  } = options;

  const status = STATUS_CODES[code] || 500;
  const userMessage = message || ERROR_MESSAGES[code]?.[locale] || ERROR_MESSAGES[code]?.en || "An error occurred";

  // Log error for monitoring
  if (status >= 500 && originalError) {
    captureServerError(originalError, { route, code, status });
  }

  // Record metrics
  recordCounter("api.error", 1, { code, status: String(status), route: route || "unknown" });

  const responseBody: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message: userMessage,
      status,
    },
  };

  // Include details only in development
  if (process.env.NODE_ENV === "development" && details) {
    responseBody.error = {
      ...responseBody.error as object,
      details,
    };
  }

  return NextResponse.json(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request) => Promise<T>,
  route: string
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const result = await handler(req);
      return result as unknown as NextResponse;
    } catch (error) {
      const e = error as Error & { code?: string };

      // Classify the error
      let code: ErrorCode = ErrorCodes.INTERNAL_ERROR;

      if (e.name === "AbortError" || e.message?.includes("timeout")) {
        code = ErrorCodes.TIMEOUT;
      } else if (e.message?.includes("rate limit") || e.message?.includes("too many")) {
        code = ErrorCodes.RATE_LIMITED;
      } else if (e.message?.includes("unauthorized") || e.message?.includes("auth")) {
        code = ErrorCodes.UNAUTHORIZED;
      } else if (e.message?.includes("not found")) {
        code = ErrorCodes.NOT_FOUND;
      } else if (e.message?.includes("validation") || e.message?.includes("invalid")) {
        code = ErrorCodes.VALIDATION_ERROR;
      } else if (e.code === "P2025" || e.message?.includes("database")) {
        code = ErrorCodes.DATABASE_ERROR;
      }

      console.error(`[API Error] ${route}:`, e);

      return createErrorResponse({
        code,
        originalError: e,
        route,
        locale: extractLocale(req),
      });
    }
  };
}

/**
 * Extract locale from request
 */
function extractLocale(req: Request): string {
  const acceptLang = req.headers.get("accept-language") || "";
  if (acceptLang.includes("ko")) return "ko";
  if (acceptLang.includes("ja")) return "ja";
  if (acceptLang.includes("zh")) return "zh";
  return "en";
}

/**
 * Create a success response with consistent format
 */
export function createSuccessResponse<T>(
  data: T,
  options: {
    status?: number;
    headers?: Record<string, string>;
    meta?: Record<string, unknown>;
  } = {}
): NextResponse {
  const { status = 200, headers = {}, meta } = options;

  const responseBody: Record<string, unknown> = {
    success: true,
    data,
  };

  if (meta) {
    responseBody.meta = meta;
  }

  return NextResponse.json(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
