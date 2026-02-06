/**
 * API Validation Wrapper
 * Consolidates duplicate validation patterns across 100+ API routes
 */

import { NextResponse } from 'next/server'
import type { ZodSchema, ZodError } from 'zod'
import { logger } from '@/lib/logger'

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult<T> {
  success: true
  data: T
}

export interface ValidationFailure {
  success: false
  errors: ValidationError[]
  response: NextResponse
}

/**
 * Formats Zod validation errors into a consistent structure
 */
export function formatValidationErrors(zodError: ZodError): ValidationError[] {
  return zodError.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Creates a standardized validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  route?: string
): NextResponse {
  if (route) {
    logger.warn(`[${route}] Validation failed`, { errors })
  }

  return NextResponse.json(
    {
      error: 'validation_failed',
      details: errors,
    },
    { status: HTTP_STATUS.BAD_REQUEST }
  )
}

/**
 * Validates and parses a request body against a Zod schema
 * Replaces 50-80 lines of duplicated validation code per route
 */
export async function validateAndParse<T>(
  request: Request,
  schema: ZodSchema<T>,
  options: { route?: string } = {}
): Promise<ValidationResult<T> | ValidationFailure> {
  try {
    const rawBody = await request.json()
    const result = schema.safeParse(rawBody)

    if (!result.success) {
      const errors = formatValidationErrors(result.error)
      return {
        success: false,
        errors,
        response: createValidationErrorResponse(errors, options.route),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    const errors: ValidationError[] = [
      {
        path: 'body',
        message: error instanceof Error ? error.message : 'Invalid JSON body',
      },
    ]
    return {
      success: false,
      errors,
      response: createValidationErrorResponse(errors, options.route),
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: Request,
  schema: ZodSchema<T>,
  options: { route?: string } = {}
): ValidationResult<T> | ValidationFailure {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())

    // Auto-convert numeric strings
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
      const errors = formatValidationErrors(result.error)
      return {
        success: false,
        errors,
        response: createValidationErrorResponse(errors, options.route),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    const errors: ValidationError[] = [
      {
        path: 'query',
        message: error instanceof Error ? error.message : 'Invalid query parameters',
      },
    ]
    return {
      success: false,
      errors,
      response: createValidationErrorResponse(errors, options.route),
    }
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: HttpStatus = HTTP_STATUS.OK): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Error response helper
 */
export function errorResponse(
  error: string,
  status: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: Record<string, unknown>
): NextResponse {
  const body: { error: string; details?: Record<string, unknown> } = { error }
  if (details) {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

/**
 * Not found response helper
 */
export function notFoundResponse(resource: string): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: HTTP_STATUS.NOT_FOUND }
  )
}

/**
 * Unauthorized response helper
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: HTTP_STATUS.UNAUTHORIZED }
  )
}
