/**
 * Streaming Route Factory
 *
 * Eliminates boilerplate across streaming API routes by providing a
 * declarative configuration-based approach.
 *
 * Handles: body parsing, Zod validation, backend SSE streaming,
 * error fallbacks, optional transform, and optional side effects.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ZodSchema } from 'zod'
import { initializeApiContext, type MiddlewareOptions, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import {
  createSSEStreamProxy,
  createTransformedSSEStream,
  createFallbackSSEStream,
} from './serverStreamProxy'
import { parseRequestBody } from '@/lib/api/requestParser'
import { enforceBodySize } from '@/lib/http'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

// ============ Types ============

export interface StreamPayloadResult {
  endpoint: string
  body: Record<string, unknown>
  timeout?: number
}

export interface StreamRouteConfig<TValidated> {
  /** Route name for logging */
  route: string

  /** Middleware guard options (auth, rate limit, credits) */
  guard: MiddlewareOptions

  /** Zod validation schema */
  schema: ZodSchema<TValidated>

  /** Max request body size in bytes (skipped if not set) */
  maxBodySize?: number

  /**
   * Build the backend request payload from validated data.
   * Return a Response to short-circuit (e.g. safety check fallback).
   * rawBody is the original unparsed body for accessing fields outside the Zod schema.
   */
  buildPayload: (
    validated: TValidated,
    context: ApiContext,
    req: NextRequest,
    rawBody: Record<string, unknown>
  ) => Promise<StreamPayloadResult | Response>

  /** Fallback message when backend stream fails */
  fallbackMessage: { ko: string; en: string }

  /** Optional stream chunk transformer (if absent, stream is proxied as-is) */
  transform?: (chunk: string, validated: TValidated) => string

  /** Optional fire-and-forget side effect after stream starts (e.g. DB save) */
  afterStream?: (validated: TValidated, context: ApiContext) => Promise<void>
}

// ============ Factory ============

/**
 * Create a Next.js POST handler for streaming routes.
 *
 * @example
 * ```ts
 * export const POST = createStreamRoute({
 *   route: 'IChingStream',
 *   guard: createPublicStreamGuard({ route: 'iching-stream', limit: 30, windowSeconds: 60 }),
 *   schema: iChingStreamRequestSchema,
 *   fallbackMessage: { ko: '...', en: '...' },
 *   async buildPayload(validated, context) {
 *     return { endpoint: '/iching/reading-stream', body: { ...validated } }
 *   },
 * })
 * ```
 */
export function createStreamRoute<TValidated>(config: StreamRouteConfig<TValidated>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      // 1. Body size check
      if (config.maxBodySize) {
        const oversized = enforceBodySize(req, config.maxBodySize)
        if (oversized) return oversized
      }

      // 2. Middleware: auth + rate limit + credits
      const { context, error } = await initializeApiContext(req, config.guard)
      if (error) return error

      // 3. Parse body
      const rawBody = await parseRequestBody<unknown>(req, { context: config.route })
      if (!rawBody || typeof rawBody !== 'object') {
        return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      // 4. Validate with Zod
      const validation = config.schema.safeParse(rawBody)
      if (!validation.success) {
        logger.warn(`[${config.route}] validation failed`, {
          errors: validation.error.issues,
        })
        return NextResponse.json(
          {
            error: 'validation_failed',
            details: validation.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const validated = validation.data

      // 5. Build payload (route-specific logic)
      const payloadResult = await config.buildPayload(
        validated,
        context,
        req,
        rawBody as Record<string, unknown>
      )

      // Early return if buildPayload returned a Response (e.g. safety check)
      if (payloadResult instanceof Response) return payloadResult

      const { endpoint, body: payload, timeout = 60000 } = payloadResult

      // 6. Call backend stream
      const streamResult = await apiClient.postSSEStream(endpoint, payload, { timeout })

      if (!streamResult.ok) {
        logger.error(`[${config.route}] Backend error:`, {
          status: streamResult.status,
          error: streamResult.error,
        })

        const lang = context.locale === 'ko' ? 'ko' : 'en'
        return createFallbackSSEStream({
          content: config.fallbackMessage[lang],
          done: true,
          error: streamResult.error,
        })
      }

      // 7. Fire-and-forget side effects
      if (config.afterStream) {
        config.afterStream(validated, context).catch((err) => {
          logger.warn(`[${config.route}] afterStream error:`, err)
        })
      }

      // 8. Return stream (transformed or proxied)
      if (config.transform) {
        const transformFn = config.transform
        return createTransformedSSEStream({
          source: streamResult.response,
          transform: (chunk) => transformFn(chunk, validated),
          route: config.route,
          additionalHeaders: {
            'X-Fallback': streamResult.response.headers.get('x-fallback') || '0',
          },
        })
      }

      return createSSEStreamProxy({
        source: streamResult.response,
        route: config.route,
      })
    } catch (err: unknown) {
      logger.error(`[${config.route}] error:`, err)
      return NextResponse.json({ error: 'Server error' }, { status: HTTP_STATUS.SERVER_ERROR })
    }
  }
}
