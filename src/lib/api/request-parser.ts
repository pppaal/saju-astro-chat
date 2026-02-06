/**
 * Request Parser Utilities
 * Consolidates duplicate JSON body parsing across 70+ API routes
 */

import type { ZodSchema } from 'zod'
import { logger } from '@/lib/logger'
import { apiError, ErrorCodes } from '@/lib/api/middleware'

// ============ Types ============

export interface ParseResult<T> {
  success: true
  data: T
}

export interface ParseFailure {
  success: false
  error: ReturnType<typeof apiError>
}

export interface ValidationErrorDetail {
  path: string
  message: string
}

// ============ JSON Body Parsing ============

/**
 * Parses JSON body from request
 * Returns null if parsing fails
 */
export async function parseJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

/**
 * Parses and validates JSON body is an object
 * Previously duplicated in 70+ routes
 */
export async function parseJsonBodyStrict(
  req: Request
): Promise<ParseResult<Record<string, unknown>> | ParseFailure> {
  const rawBody = await parseJsonBody(req)

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      success: false,
      error: apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body'),
    }
  }

  return {
    success: true,
    data: rawBody as Record<string, unknown>,
  }
}

// ============ Validation Helpers ============

/**
 * Formats Zod validation errors into a consistent structure
 * Previously duplicated in 68+ routes
 */
export function formatValidationErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>
): ValidationErrorDetail[] {
  return issues.map((e) => ({
    path: e.path.map(String).join('.'),
    message: e.message,
  }))
}

/**
 * Creates a validation error response with logging
 * Previously duplicated in 82+ routes
 */
export function createValidationFailure(
  issues: Array<{ path: PropertyKey[]; message: string }>,
  route: string
): ReturnType<typeof apiError> {
  const details = formatValidationErrors(issues)

  logger.warn(`[${route}] validation failed`, { errors: issues })

  return apiError(ErrorCodes.VALIDATION_ERROR, 'validation_failed', { details })
}

/**
 * Parses request body and validates with Zod schema
 * Combines JSON parsing + validation in one call
 *
 * @example
 * const result = await parseAndValidate(req, mySchema, 'MyRoute')
 * if (!result.success) return result.error
 * const data = result.data
 */
export async function parseAndValidate<T>(
  req: Request,
  schema: ZodSchema<T>,
  route: string
): Promise<ParseResult<T> | ParseFailure> {
  // Parse JSON
  const rawBody = await parseJsonBody(req)

  if (!rawBody || typeof rawBody !== 'object') {
    return {
      success: false,
      error: apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body'),
    }
  }

  // Validate with Zod
  const result = schema.safeParse(rawBody)

  if (!result.success) {
    return {
      success: false,
      error: createValidationFailure(result.error.issues, route),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Validates data against schema (without parsing)
 */
export function validateData<T>(
  data: unknown,
  schema: ZodSchema<T>,
  route: string
): ParseResult<T> | ParseFailure {
  const result = schema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: createValidationFailure(result.error.issues, route),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

// ============ Query Parameter Parsing ============

/**
 * Parses query parameters from request URL
 */
export function parseQueryParams(req: Request): Record<string, string> {
  const url = new URL(req.url)
  return Object.fromEntries(url.searchParams.entries())
}

/**
 * Parses and validates query parameters with Zod schema
 */
export function parseAndValidateQuery<T>(
  req: Request,
  schema: ZodSchema<T>,
  route: string
): ParseResult<T> | ParseFailure {
  const params = parseQueryParams(req)

  // Convert numeric strings for Zod
  const converted = Object.entries(params).reduce(
    (acc, [key, value]) => {
      const numValue = Number(value)
      acc[key] = !isNaN(numValue) && value !== '' ? numValue : value
      return acc
    },
    {} as Record<string, unknown>
  )

  const result = schema.safeParse(converted)

  if (!result.success) {
    return {
      success: false,
      error: createValidationFailure(result.error.issues, route),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}
