/**
 * Centralized API Error Handling
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/telemetry";
import { recordCounter } from "@/lib/metrics";
import { logger } from "@/lib/logger";

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
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",

  // Business Logic Errors
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  INVALID_DATE: "INVALID_DATE",
  INVALID_TIME: "INVALID_TIME",
  INVALID_COORDINATES: "INVALID_COORDINATES",
  INVALID_FORMAT: "INVALID_FORMAT",
  MISSING_FIELD: "MISSING_FIELD",
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
  EXTERNAL_API_ERROR: {
    en: "External service is temporarily unavailable.",
    ko: "외부 서비스가 일시적으로 사용 불가합니다.",
    ja: "外部サービスが一時的に利用できません。",
    zh: "外部服务暂时不可用。",
  },
  INVALID_TOKEN: {
    en: "Invalid or expired token.",
    ko: "유효하지 않거나 만료된 토큰입니다.",
    ja: "無効または期限切れのトークンです。",
    zh: "令牌无效或已过期。",
  },
  TOKEN_EXPIRED: {
    en: "Your session has expired. Please log in again.",
    ko: "세션이 만료되었습니다. 다시 로그인해주세요.",
    ja: "セッションが期限切れです。再度ログインしてください。",
    zh: "会话已过期。请重新登录。",
  },
  INSUFFICIENT_CREDITS: {
    en: "Insufficient credits. Please purchase more to continue.",
    ko: "크레딧이 부족합니다. 계속하려면 크레딧을 구매해주세요.",
    ja: "クレジットが不足しています。続行するには購入してください。",
    zh: "积分不足。请购买更多积分以继续。",
  },
  INVALID_DATE: {
    en: "Invalid date provided. Please use YYYY-MM-DD format.",
    ko: "잘못된 날짜입니다. YYYY-MM-DD 형식을 사용해주세요.",
    ja: "無効な日付です。YYYY-MM-DD形式で入力してください。",
    zh: "日期无效。请使用YYYY-MM-DD格式。",
  },
  INVALID_TIME: {
    en: "Invalid time provided. Please use HH:MM format.",
    ko: "잘못된 시간입니다. HH:MM 형식을 사용해주세요.",
    ja: "無効な時間です。HH:MM形式で入力してください。",
    zh: "时间无效。请使用HH:MM格式。",
  },
  INVALID_COORDINATES: {
    en: "Invalid geographic coordinates.",
    ko: "잘못된 좌표입니다.",
    ja: "無効な座標です。",
    zh: "地理坐标无效。",
  },
  INVALID_FORMAT: {
    en: "Invalid format. Please check your input.",
    ko: "잘못된 형식입니다. 입력을 확인해주세요.",
    ja: "形式が無効です。入力を確認してください。",
    zh: "格式无效。请检查您的输入。",
  },
  MISSING_FIELD: {
    en: "Required field is missing.",
    ko: "필수 항목이 누락되었습니다.",
    ja: "必須フィールドが不足しています。",
    zh: "缺少必填字段。",
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
  EXTERNAL_API_ERROR: 502,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  INSUFFICIENT_CREDITS: 402,
  INVALID_DATE: 400,
  INVALID_TIME: 400,
  INVALID_COORDINATES: 400,
  INVALID_FORMAT: 400,
  MISSING_FIELD: 400,
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

      logger.error(`[API Error] ${route}:`, e);

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
  if (acceptLang.includes("ko")) {return "ko";}
  if (acceptLang.includes("ja")) {return "ja";}
  if (acceptLang.includes("zh")) {return "zh";}
  return "en";
}

/**
 * Create a plain JSON error Response for streaming endpoints.
 * Returns a bare Response (not NextResponse) for SSE compatibility.
 */
export function jsonErrorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
