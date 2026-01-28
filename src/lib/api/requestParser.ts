/**
 * API Request Parsing Utilities
 * Provides safe JSON parsing with proper error logging
 */

import { logger } from '@/lib/logger';

/**
 * Safely parse JSON from request body with error logging
 *
 * @param request - Next.js request object
 * @param options - Parsing options
 * @returns Parsed body or fallback value
 *
 * @example
 * ```ts
 * const body = await parseRequestBody<MyType>(request);
 * if (!body) {
 *   return json({ error: 'Invalid JSON' }, 400);
 * }
 * ```
 */
export async function parseRequestBody<T = unknown>(
  request: Request,
  options: {
    /** Fallback value if parsing fails */
    fallback?: T | null;
    /** Custom error message context */
    context?: string;
    /** Whether to log parse failures (default: true) */
    logErrors?: boolean;
  } = {}
): Promise<T | null> {
  const { fallback = null, context = 'API request', logErrors = true } = options;

  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    if (logErrors) {
      logger.warn('Failed to parse request JSON', {
        context,
        error: error instanceof Error ? error.message : String(error),
        url: request.url,
        method: request.method,
      });
    }
    return fallback as T | null;
  }
}

/**
 * Parse request body with validation
 * Throws if body is null/invalid
 *
 * @param request - Next.js request object
 * @param validator - Validation function that returns error message if invalid
 * @returns Validated parsed body
 * @throws Error if validation fails
 *
 * @example
 * ```ts
 * const body = await parseAndValidateBody<MyType>(
 *   request,
 *   (data) => !data?.userId ? 'userId is required' : null
 * );
 * ```
 */
export async function parseAndValidateBody<T>(
  request: Request,
  validator?: (body: T | null) => string | null
): Promise<T> {
  const body = await parseRequestBody<T>(request);

  if (body === null) {
    throw new Error('Request body is required');
  }

  if (validator) {
    const error = validator(body);
    if (error) {
      logger.warn('Request body validation failed', {
        error,
        url: request.url,
      });
      throw new Error(error);
    }
  }

  return body;
}

/**
 * Safely clone and parse request for logging/retry
 *
 * @param request - Next.js request object
 * @returns Cloned request body or null
 */
export async function cloneAndParseRequest(request: Request): Promise<unknown | null> {
  try {
    const cloned = request.clone();
    return await cloned.json();
  } catch (error) {
    logger.debug('Failed to clone and parse request', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
