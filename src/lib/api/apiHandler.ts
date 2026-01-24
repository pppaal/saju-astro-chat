/**
 * API Handler Wrapper
 *
 * Provides unified error handling, validation, and response formatting
 * for all API routes. Use this to ensure consistent API behavior.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { logger } from '@/lib/logger';
import {
  createSuccessResponse,
  unauthorizedError,
  rateLimitError,
  internalError,
  validationError,
  type ErrorResponseData,
} from './errorResponse';
import { validateRequestBody } from './zodValidation';

// ============ Types ============

export interface ApiHandlerOptions<TBody = unknown, TQuery = unknown> {
  /** Zod schema for request body validation */
  bodySchema?: z.ZodSchema<TBody>;

  /** Zod schema for query parameters validation */
  querySchema?: z.ZodSchema<TQuery>;

  /** Require authentication */
  requireAuth?: boolean;

  /** Rate limit configuration */
  rateLimit?: {
    /** Unique key prefix for this route */
    key: string;
    /** Max requests allowed */
    limit: number;
    /** Time window in seconds */
    windowSeconds: number;
  };

  /** Maximum request body size in bytes */
  maxBodySize?: number;
}

export interface ApiContext<TBody = unknown, TQuery = unknown> {
  /** Validated request body */
  body: TBody;

  /** Validated query parameters */
  query: TQuery;

  /** Request object */
  request: Request;

  /** User session (if authenticated) */
  session: Awaited<ReturnType<typeof getServerSession>>;

  /** Client IP address */
  ip: string;
}

export type ApiHandler<TBody = unknown, TQuery = unknown, TResponse = unknown> = (
  context: ApiContext<TBody, TQuery>
) => Promise<TResponse>;

// ============ Main Handler Wrapper ============

/**
 * Wrap API handler with standard middleware
 *
 * @example
 * export const POST = withApiHandler({
 *   bodySchema: z.object({ name: z.string() }),
 *   requireAuth: true,
 *   rateLimit: { key: 'create-user', limit: 10, windowSeconds: 60 },
 * }, async ({ body, session }) => {
 *   const user = await createUser(body.name, session.user.id);
 *   return { user };
 * });
 */
export function withApiHandler<TBody = unknown, TQuery = unknown, TResponse = unknown>(
  options: ApiHandlerOptions<TBody, TQuery>,
  handler: ApiHandler<TBody, TQuery, TResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const ip = getClientIp(request.headers);
      const headers = new Headers();

      // ======== Rate Limiting ========
      if (options.rateLimit) {
        const { key, limit, windowSeconds } = options.rateLimit;
        const limitResult = await rateLimit(`${key}:${ip}`, {
          limit,
          windowSeconds,
        });

        // Add rate limit headers
        limitResult.headers.forEach((value, key) => headers.set(key, value));

        if (!limitResult.allowed) {
          return rateLimitError(limitResult.retryAfter || 60);
        }
      }

      // ======== Authentication ========
      const session = await getServerSession(authOptions);
      if (options.requireAuth && !session?.user?.id) {
        return unauthorizedError('You must be logged in to access this resource');
      }

      // ======== Body Validation ========
      let body: TBody = {} as TBody;
      if (options.bodySchema) {
        const validation = await validateRequestBody(request, options.bodySchema);
        if (!validation.success) {
          return validationError('Request validation failed', {
            errors: validation.errors,
          });
        }
        body = validation.data;
      }

      // ======== Query Validation ========
      let query: TQuery = {} as TQuery;
      if (options.querySchema) {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams.entries());
        const validated = options.querySchema.safeParse(params);

        if (!validated.success) {
          const errors = validated.error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          }));
          return validationError('Query parameter validation failed', { errors });
        }
        query = validated.data;
      }

      // ======== Execute Handler ========
      const context: ApiContext<TBody, TQuery> = {
        body,
        query,
        request,
        session,
        ip,
      };

      const result = await handler(context);

      // Return standardized success response
      return createSuccessResponse(result);
    } catch (error) {
      logger.error('[API Handler Error]', { error });

      if (error instanceof Error) {
        return internalError(error.message, {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }

      return internalError();
    }
  };
}

// ============ Convenience Wrappers ============

/**
 * Create authenticated API handler
 */
export function withAuth<TBody = unknown, TQuery = unknown, TResponse = unknown>(
  options: Omit<ApiHandlerOptions<TBody, TQuery>, 'requireAuth'>,
  handler: ApiHandler<TBody, TQuery, TResponse>
) {
  return withApiHandler({ ...options, requireAuth: true }, handler);
}

/**
 * Create rate-limited API handler
 */
export function withRateLimit<TBody = unknown, TQuery = unknown, TResponse = unknown>(
  rateLimit: ApiHandlerOptions['rateLimit'],
  handler: ApiHandler<TBody, TQuery, TResponse>
) {
  return withApiHandler({ rateLimit }, handler);
}

/**
 * Create public API handler (no auth, basic rate limiting)
 */
export function withPublicApi<TBody = unknown, TQuery = unknown, TResponse = unknown>(
  options: ApiHandlerOptions<TBody, TQuery>,
  handler: ApiHandler<TBody, TQuery, TResponse>
) {
  const defaultRateLimit = {
    key: 'public-api',
    limit: 60,
    windowSeconds: 60,
  };

  return withApiHandler(
    {
      ...options,
      rateLimit: options.rateLimit || defaultRateLimit,
      requireAuth: false,
    },
    handler
  );
}
