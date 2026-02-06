/**
 * Advanced Astrology Route Wrapper
 * Consolidates duplicate boilerplate across 11+ advanced astrology routes
 *
 * Each route was repeating ~50 lines of:
 * - Rate limiting
 * - Token validation
 * - Zod validation
 * - Date/time parsing
 * - Response header setting
 */

import { NextResponse } from 'next/server'
import type { ZodSchema } from 'zod'
import { rateLimit, type RateLimitResult } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'

// ============ Types ============

export interface AstrologyRouteContext<T> {
  data: T
  rateLimitResult: RateLimitResult
  parsedDateTime: ParsedDateTime
}

export interface ParsedDateTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export interface AstrologyRouteOptions {
  rateLimitKey: string
  rateLimitConfig?: {
    limit?: number
    windowSeconds?: number
  }
  logPrefix: string
}

type AstrologyRouteHandler<T, R> = (
  context: AstrologyRouteContext<T>
) => Promise<R>

// ============ Date/Time Parsing ============

/**
 * Parses date and time strings into numeric components
 * Previously duplicated in 18+ API routes
 */
export function parseDateTimeStrings(date: string, time: string): ParsedDateTime {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return { year, month, day, hour, minute }
}

/**
 * Parses just the date string
 */
export function parseDateString(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

/**
 * Parses just the time string
 */
export function parseTimeString(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number)
  return { hour, minute }
}

// ============ Response Helpers ============

/**
 * Creates a response with rate limit headers
 * Previously duplicated in 26+ routes
 */
export function createResponseWithHeaders<T>(
  data: T,
  rateLimitResult: RateLimitResult,
  status: number = HTTP_STATUS.OK,
  cacheControl: string = 'no-store'
): NextResponse {
  const res = NextResponse.json(data, { status })
  rateLimitResult.headers.forEach((value, key) => res.headers.set(key, value))
  res.headers.set('Cache-Control', cacheControl)
  return res
}

/**
 * Creates an error response with rate limit headers
 */
export function createErrorWithHeaders(
  error: string,
  rateLimitResult: RateLimitResult,
  status: number,
  details?: unknown
): NextResponse {
  const body: Record<string, unknown> = { error }
  if (details !== undefined) {
    body.details = details
  }
  return createResponseWithHeaders(body, rateLimitResult, status)
}

// ============ Main Wrapper ============

/**
 * Wraps an advanced astrology route with common boilerplate
 *
 * Handles:
 * - Rate limiting
 * - Public token validation
 * - Zod schema validation
 * - Date/time parsing
 * - Error handling with telemetry
 * - Response headers
 *
 * @example
 * export const POST = createAstrologyRoute(
 *   AsteroidsRequestSchema,
 *   { rateLimitKey: 'astro-asteroids', logPrefix: 'Asteroids API' },
 *   async ({ data, parsedDateTime }) => {
 *     // Your route logic here
 *     return { asteroids: [...] }
 *   }
 * )
 */
export function createAstrologyRoute<T extends { date: string; time: string }, R>(
  schema: ZodSchema<T>,
  options: AstrologyRouteOptions,
  handler: AstrologyRouteHandler<T, R>
): (request: Request) => Promise<NextResponse> {
  const {
    rateLimitKey,
    rateLimitConfig = { limit: 20, windowSeconds: 60 },
    logPrefix,
  } = options

  return async (request: Request): Promise<NextResponse> => {
    let rateLimitResult: RateLimitResult | null = null

    try {
      // Rate limiting
      const ip = getClientIp(request.headers)
      rateLimitResult = await rateLimit(`${rateLimitKey}:${ip}`, rateLimitConfig)

      if (!rateLimitResult.allowed) {
        return createErrorWithHeaders(
          'Too many requests. Try again soon.',
          rateLimitResult,
          HTTP_STATUS.RATE_LIMITED
        )
      }

      // Token validation
      const tokenCheck = requirePublicToken(request)
      if (!tokenCheck.valid) {
        return createErrorWithHeaders(
          'Unauthorized',
          rateLimitResult,
          HTTP_STATUS.UNAUTHORIZED
        )
      }

      // Parse and validate request body
      const body = await request.json().catch(() => ({}))
      const validation = schema.safeParse(body)

      if (!validation.success) {
        const errors = validation.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')

        logger.warn(`[${logPrefix}] Validation failed`, {
          errors: validation.error.issues,
        })

        return createResponseWithHeaders(
          {
            error: 'Validation failed',
            details: errors,
            issues: validation.error.issues,
          },
          rateLimitResult,
          HTTP_STATUS.BAD_REQUEST
        )
      }

      // Parse date/time
      const parsedDateTime = parseDateTimeStrings(validation.data.date, validation.data.time)

      // Execute handler
      const result = await handler({
        data: validation.data,
        rateLimitResult,
        parsedDateTime,
      })

      // Return success response
      return createResponseWithHeaders(result, rateLimitResult)
    } catch (error) {
      logger.error(`[${logPrefix}] Error`, { error })
      captureServerError(error instanceof Error ? error : new Error(String(error)), {
        route: logPrefix,
      })

      if (rateLimitResult) {
        return createErrorWithHeaders(
          'Internal server error',
          rateLimitResult,
          HTTP_STATUS.SERVER_ERROR
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  }
}

/**
 * Simplified wrapper for routes that don't need date/time parsing
 */
export function createSimpleAstrologyRoute<T, R>(
  schema: ZodSchema<T>,
  options: AstrologyRouteOptions,
  handler: (context: { data: T; rateLimitResult: RateLimitResult }) => Promise<R>
): (request: Request) => Promise<NextResponse> {
  const {
    rateLimitKey,
    rateLimitConfig = { limit: 20, windowSeconds: 60 },
    logPrefix,
  } = options

  return async (request: Request): Promise<NextResponse> => {
    let rateLimitResult: RateLimitResult | null = null

    try {
      const ip = getClientIp(request.headers)
      rateLimitResult = await rateLimit(`${rateLimitKey}:${ip}`, rateLimitConfig)

      if (!rateLimitResult.allowed) {
        return createErrorWithHeaders(
          'Too many requests. Try again soon.',
          rateLimitResult,
          HTTP_STATUS.RATE_LIMITED
        )
      }

      const tokenCheck = requirePublicToken(request)
      if (!tokenCheck.valid) {
        return createErrorWithHeaders(
          'Unauthorized',
          rateLimitResult,
          HTTP_STATUS.UNAUTHORIZED
        )
      }

      const body = await request.json().catch(() => ({}))
      const validation = schema.safeParse(body)

      if (!validation.success) {
        const errors = validation.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')

        logger.warn(`[${logPrefix}] Validation failed`, {
          errors: validation.error.issues,
        })

        return createResponseWithHeaders(
          {
            error: 'Validation failed',
            details: errors,
            issues: validation.error.issues,
          },
          rateLimitResult,
          HTTP_STATUS.BAD_REQUEST
        )
      }

      const result = await handler({
        data: validation.data,
        rateLimitResult,
      })

      return createResponseWithHeaders(result, rateLimitResult)
    } catch (error) {
      logger.error(`[${logPrefix}] Error`, { error })
      captureServerError(error instanceof Error ? error : new Error(String(error)), {
        route: logPrefix,
      })

      if (rateLimitResult) {
        return createErrorWithHeaders(
          'Internal server error',
          rateLimitResult,
          HTTP_STATUS.SERVER_ERROR
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  }
}
