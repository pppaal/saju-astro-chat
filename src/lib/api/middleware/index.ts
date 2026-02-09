/**
 * API Middleware
 * Common initialization patterns for API routes
 * Reduces code duplication across 100+ API files
 *
 * @module
 * @example
 * // Basic usage
 * import { withApiMiddleware, apiSuccess, apiError } from '@/lib/api/middleware';
 *
 * export const POST = withApiMiddleware(async (req, context) => {
 *   if (!context.isAuthenticated) {
 *     return apiError('UNAUTHORIZED');
 *   }
 *   return apiSuccess({ message: 'Hello' });
 * }, { requireAuth: true });
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  type ErrorCode,
} from '../errorHandler'
import { initializeApiContext, extractLocale } from './context'
import type { ApiContext, ApiHandler, ApiHandlerResult, MiddlewareOptions } from './types'

function mergeHeaderRecords(
  base?: Record<string, string>,
  extra?: Headers | Record<string, string>
): Record<string, string> | undefined {
  if (!extra && !base) return undefined
  const merged: Record<string, string> = { ...(base ?? {}) }
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => {
        merged[key] = value
      })
    } else {
      Object.entries(extra).forEach(([key, value]) => {
        merged[key] = value
      })
    }
  }
  return merged
}

function applyHeadersToResponse(
  response: Response,
  extra?: Headers | Record<string, string>
): NextResponse {
  if (!extra) {
    return response as NextResponse
  }

  if (response instanceof NextResponse) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => {
        response.headers.set(key, value)
      })
    } else {
      Object.entries(extra).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
    return response
  }

  const merged = new Headers(response.headers)
  if (extra instanceof Headers) {
    extra.forEach((value, key) => {
      merged.set(key, value)
    })
  } else {
    Object.entries(extra).forEach(([key, value]) => {
      merged.set(key, value)
    })
  }
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  })
}

// ============ Main Wrapper ============

/**
 * Wrap an API handler with middleware
 * Provides: rate limiting, auth, error handling, consistent responses
 */
export function withApiMiddleware<T>(handler: ApiHandler<T>, options: MiddlewareOptions = {}) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const route = options.route || new URL(req.url).pathname

    try {
      // Initialize context
      const { context, error } = await initializeApiContext(req, options)
      const rateLimitHeaders: Headers | undefined = context.rateLimitHeaders

      if (error) {
        return error
      }

      // Execute handler (pass through any additional args like params for dynamic routes)
      const result = await handler(req, context, ...args)

      // If handler returned a Response/NextResponse directly (e.g. SSE streams), use it
      if (result instanceof Response) {
        return applyHeadersToResponse(result, rateLimitHeaders)
      }

      // Handle error result
      if (result.error) {
        return createErrorResponse({
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          locale: context.locale,
          route,
          headers: mergeHeaderRecords(result.headers, rateLimitHeaders),
        })
      }

      // Success response
      return createSuccessResponse(result.data, {
        status: result.status,
        headers: mergeHeaderRecords(result.headers, rateLimitHeaders),
        meta: result.meta,
      })
    } catch (error) {
      const e = error as Error & { code?: string }
      logger.error(`[API Error] ${route}:`, e)

      // Classify error
      let code: ErrorCode = ErrorCodes.INTERNAL_ERROR

      if (e.name === 'AbortError' || e.message?.includes('timeout')) {
        code = ErrorCodes.TIMEOUT
      } else if (e.message?.includes('rate limit') || e.message?.includes('too many')) {
        code = ErrorCodes.RATE_LIMITED
      } else if (e.message?.includes('unauthorized') || e.message?.includes('auth')) {
        code = ErrorCodes.UNAUTHORIZED
      } else if (e.message?.includes('not found')) {
        code = ErrorCodes.NOT_FOUND
      } else if (e.message?.includes('validation') || e.message?.includes('invalid')) {
        code = ErrorCodes.VALIDATION_ERROR
      } else if (e.code === 'P2025' || e.message?.includes('database')) {
        code = ErrorCodes.DATABASE_ERROR
      }

      return createErrorResponse({
        code,
        originalError: e,
        route,
        locale: extractLocale(req),
        headers: undefined,
      })
    }
  }
}

// ============ Utility Functions ============

/**
 * Parse JSON body with error handling
 */
export async function parseJsonBody<T>(req: NextRequest): Promise<T> {
  try {
    return await req.json()
  } catch {
    throw new Error('Invalid JSON body')
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
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missing.length > 0) {
    return { valid: false, missing: missing.map(String) }
  }

  return { valid: true }
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
  }
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
  }
}

// ============ Re-exports ============

// Types
export type {
  ApiContext,
  ApiHandler,
  ApiHandlerResult,
  MiddlewareOptions,
  RateLimitOptions,
  CreditOptions,
  CreditType,
} from './types'

// Context utilities
export { initializeApiContext, extractLocale } from './context'

// Guard presets
export {
  createPublicStreamGuard,
  createAuthenticatedGuard,
  createSimpleGuard,
  createSajuGuard,
  createAstrologyGuard,
  createTarotGuard,
  createAdminGuard,
  createAiGenerationGuard,
  createChatGuard,
} from './guards'

// Error handling
export { ErrorCodes } from '../errorHandler'
export type { ErrorCode } from '../errorHandler'
