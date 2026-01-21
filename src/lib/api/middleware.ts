/**
 * API Middleware
 * Common initialization patterns for API routes
 * Reduces code duplication across 100+ API files
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  type ErrorCode,
} from "./errorHandler";
import {
  checkAndConsumeCredits,
  type CreditType,
} from "@/lib/credits";

// ============ Types ============

export interface ApiContext {
  ip: string;
  locale: string;
  session: Awaited<ReturnType<typeof getServerSession>> | null;
  userId: string | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  creditInfo?: {
    remaining: number;
  };
}

export interface RateLimitOptions {
  /** Requests allowed per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Optional key prefix for rate limiting */
  keyPrefix?: string;
}

export interface CreditOptions {
  /** Credit type to consume */
  type: CreditType;
  /** Amount of credits to consume */
  amount?: number;
  /** If true, only check credits without consuming */
  checkOnly?: boolean;
}

export interface MiddlewareOptions {
  /** Require valid public token */
  requireToken?: boolean;
  /** Require authenticated session */
  requireAuth?: boolean;
  /** Rate limiting configuration */
  rateLimit?: RateLimitOptions;
  /** Credit consumption configuration */
  credits?: CreditOptions;
  /** Route name for logging/metrics */
  route?: string;
}

export interface ApiHandlerResult<T> {
  data?: T;
  error?: {
    code: ErrorCode;
    message?: string;
    details?: unknown;
  };
  status?: number;
  headers?: Record<string, string>;
  meta?: Record<string, unknown>;
}

type ApiHandler<T> = (
  req: NextRequest,
  context: ApiContext
) => Promise<ApiHandlerResult<T> | NextResponse>;

// ============ Core Functions ============

/**
 * Extract locale from request headers
 */
export function extractLocale(req: Request): string {
  const acceptLang = req.headers.get("accept-language") || "";
  const urlLocale = new URL(req.url).searchParams.get("locale");

  if (urlLocale === "ko" || acceptLang.includes("ko")) return "ko";
  if (urlLocale === "ja" || acceptLang.includes("ja")) return "ja";
  if (urlLocale === "zh" || acceptLang.includes("zh")) return "zh";
  return "en";
}

/**
 * Initialize common API context
 */
export async function initializeApiContext(
  req: NextRequest,
  options: MiddlewareOptions = {}
): Promise<{ context: ApiContext; error?: NextResponse }> {
  const ip = getClientIp(req.headers) || "unknown";
  const locale = extractLocale(req);
  const route = options.route || new URL(req.url).pathname;

  // Rate limiting
  if (options.rateLimit) {
    const { limit, windowSeconds, keyPrefix = "api" } = options.rateLimit;
    const rateLimitKey = `${keyPrefix}:${route}:${ip}`;

    const result = await rateLimit(rateLimitKey, { limit, windowSeconds });

    if (!result.allowed) {
      return {
        context: {
          ip,
          locale,
          session: null,
          userId: null,
          isAuthenticated: false,
          isPremium: false,
        },
        error: createErrorResponse({
          code: ErrorCodes.RATE_LIMITED,
          locale,
          route,
          headers: {
            "Retry-After": String(result.retryAfter || windowSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }),
      };
    }
  }

  // Token validation
  if (options.requireToken) {
    const tokenResult = requirePublicToken(req);
    if (!tokenResult.valid) {
      return {
        context: {
          ip,
          locale,
          session: null,
          userId: null,
          isAuthenticated: false,
          isPremium: false,
        },
        error: createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message: tokenResult.reason || "Invalid or missing token",
          locale,
          route,
        }),
      };
    }
  }

  // Session (optional fetch)
  type SessionUser = { id?: string; plan?: string; email?: string | null };
  let session: { user?: SessionUser } | null = null;
  let userId: string | null = null;
  let isPremium = false;

  try {
    const rawSession = await getServerSession(authOptions);
    session = rawSession as { user?: SessionUser } | null;
    userId = session?.user?.id || null;
    isPremium = !!(session?.user?.plan && session.user.plan !== "free");
  } catch {
    // Session fetch failed, continue without it
  }

  // Auth requirement
  if (options.requireAuth && !session?.user) {
    return {
      context: {
        ip,
        locale,
        session: null,
        userId: null,
        isAuthenticated: false,
        isPremium: false,
      },
      error: createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale,
        route,
      }),
    };
  }

  // Credit check/consumption
  let creditInfo: { remaining: number } | undefined;

  if (options.credits) {
    // Credits require authentication
    if (!userId) {
      return {
        context: {
          ip,
          locale,
          session,
          userId: null,
          isAuthenticated: false,
          isPremium,
        },
        error: createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message: "Authentication required for credit-based operations",
          locale,
          route,
        }),
      };
    }

    const creditResult = await checkAndConsumeCredits(
      options.credits.type,
      options.credits.amount || 1
    );

    if (!creditResult.allowed) {
      return {
        context: {
          ip,
          locale,
          session,
          userId,
          isAuthenticated: true,
          isPremium,
        },
        error: NextResponse.json(
          {
            error: creditResult.error,
            code: creditResult.errorCode,
            remaining: creditResult.remaining,
            upgradeUrl: "/pricing",
          },
          { status: creditResult.errorCode === "not_authenticated" ? 401 : 402 }
        ),
      };
    }

    creditInfo = {
      remaining: creditResult.remaining || 0,
    };
  }

  return {
    context: {
      ip,
      locale,
      session,
      userId,
      isAuthenticated: !!session?.user,
      isPremium,
      creditInfo,
    },
  };
}

/**
 * Wrap an API handler with middleware
 * Provides: rate limiting, auth, error handling, consistent responses
 */
export function withApiMiddleware<T>(
  handler: ApiHandler<T>,
  options: MiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const route = options.route || new URL(req.url).pathname;

    try {
      // Initialize context
      const { context, error } = await initializeApiContext(req, options);

      if (error) {
        return error;
      }

      // Execute handler
      const result = await handler(req, context);

      // If handler returned NextResponse directly, use it
      if (result instanceof NextResponse) {
        return result;
      }

      // Handle error result
      if (result.error) {
        return createErrorResponse({
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          locale: context.locale,
          route,
        });
      }

      // Success response
      return createSuccessResponse(result.data, {
        status: result.status,
        headers: result.headers,
        meta: result.meta,
      });
    } catch (error) {
      const e = error as Error & { code?: string };
      logger.error(`[API Error] ${route}:`, e);

      // Classify error
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

      return createErrorResponse({
        code,
        originalError: e,
        route,
        locale: extractLocale(req),
      });
    }
  };
}

// ============ Utility Functions ============

/**
 * Parse JSON body with error handling
 */
export async function parseJsonBody<T>(req: NextRequest): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing = fields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ""
  );

  if (missing.length > 0) {
    return { valid: false, missing: missing.map(String) };
  }

  return { valid: true };
}

/**
 * Create a typed API error
 */
export function apiError(
  code: ErrorCode,
  message?: string,
  details?: unknown
): ApiHandlerResult<never> {
  return {
    error: { code, message, details },
  };
}

/**
 * Create a typed API success response
 */
export function apiSuccess<T>(
  data: T,
  options?: { status?: number; meta?: Record<string, unknown> }
): ApiHandlerResult<T> {
  return {
    data,
    status: options?.status,
    meta: options?.meta,
  };
}

// ============ Convenience Presets ============

/**
 * Preset for public streaming APIs (e.g., tarot, iching, dream)
 * - Requires public token
 * - Rate limited (default: 30/60s)
 * - Optional credit consumption
 */
export function createPublicStreamGuard(options: {
  route: string;
  limit?: number;
  windowSeconds?: number;
  requireCredits?: boolean;
  creditType?: CreditType;
  creditAmount?: number;
}): MiddlewareOptions {
  return {
    route: options.route,
    requireToken: true,
    rateLimit: {
      limit: options.limit || 30,
      windowSeconds: options.windowSeconds || 60,
    },
    credits: options.requireCredits
      ? {
          type: options.creditType || "reading",
          amount: options.creditAmount || 1,
        }
      : undefined,
  };
}

/**
 * Preset for authenticated APIs (e.g., saju chat, compatibility)
 * - Requires session authentication
 * - Rate limited (default: 60/60s)
 * - Optional credit consumption
 */
export function createAuthenticatedGuard(options: {
  route: string;
  limit?: number;
  windowSeconds?: number;
  requireCredits?: boolean;
  creditType?: CreditType;
  creditAmount?: number;
}): MiddlewareOptions {
  return {
    route: options.route,
    requireAuth: true,
    rateLimit: {
      limit: options.limit || 60,
      windowSeconds: options.windowSeconds || 60,
    },
    credits: options.requireCredits
      ? {
          type: options.creditType || "reading",
          amount: options.creditAmount || 1,
        }
      : undefined,
  };
}

/**
 * Preset for simple rate-limited APIs
 * - No auth required
 * - Rate limited only
 */
export function createSimpleGuard(options: {
  route: string;
  limit?: number;
  windowSeconds?: number;
}): MiddlewareOptions {
  return {
    route: options.route,
    rateLimit: {
      limit: options.limit || 60,
      windowSeconds: options.windowSeconds || 60,
    },
  };
}

// Re-export error codes for convenience
export { ErrorCodes } from "./errorHandler";
export type { ErrorCode } from "./errorHandler";
export type { CreditType };
