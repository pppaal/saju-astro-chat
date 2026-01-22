/**
 * API Error Response System
 *
 * Standardized error responses for consistent error handling across the API.
 */

import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// ============ Error Codes ============

export const ERROR_CODES = {
  // Validation Errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Authentication Errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Permission Errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Not Found Errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Server Errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Business Logic Errors
  INVALID_DATE: 'INVALID_DATE',
  INVALID_TIME: 'INVALID_TIME',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  PROFILE_NOT_COMPLETE: 'PROFILE_NOT_COMPLETE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============ Error Response Interface ============

export interface ErrorResponseData {
  /** Error code for programmatic handling */
  code: ErrorCode;

  /** Human-readable error message */
  message: string;

  /** Unique request ID for debugging */
  requestId: string;

  /** Additional error details (field-specific errors, etc.) */
  details?: Record<string, unknown>;

  /** Suggested action for the user */
  suggestedAction?: string;

  /** Retry after (in seconds) for rate limiting */
  retryAfter?: number;

  /** Timestamp when error occurred */
  timestamp: string;
}

export interface SuccessResponseData<T = unknown> {
  data: T;
  requestId: string;
  timestamp: string;
}

// ============ Helper Functions ============

/**
 * Create standardized error response
 *
 * @example
 * return createErrorResponse({
 *   code: ERROR_CODES.VALIDATION_ERROR,
 *   message: 'Invalid birth date format',
 *   status: 400,
 *   details: { field: 'birthDate', expected: 'YYYY-MM-DD' },
 *   suggestedAction: 'Please enter date in YYYY-MM-DD format'
 * });
 */
export function createErrorResponse(options: {
  code: ErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  suggestedAction?: string;
  retryAfter?: number;
  requestId?: string;
}): NextResponse<ErrorResponseData> {
  const {
    code,
    message,
    status,
    details,
    suggestedAction,
    retryAfter,
    requestId = nanoid(10),
  } = options;

  const errorData: ErrorResponseData = {
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    ...(suggestedAction && { suggestedAction }),
    ...(retryAfter && { retryAfter }),
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  // Log error for monitoring (in production, send to error tracking service)
  if (process.env.NODE_ENV === 'production') {
    console.error('[API Error]', {
      requestId,
      code,
      status,
      message,
      details,
    });
  }

  return NextResponse.json(errorData, { status, headers });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  options?: {
    status?: number;
    requestId?: string;
  }
): NextResponse<SuccessResponseData<T>> {
  const { status = 200, requestId = nanoid(10) } = options || {};

  return NextResponse.json(
    {
      data,
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// ============ Common Error Responses ============

/**
 * 400 - Validation Error
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>
) {
  return createErrorResponse({
    code: ERROR_CODES.VALIDATION_ERROR,
    message,
    status: 400,
    details,
    suggestedAction: 'Please check your input and try again',
  });
}

/**
 * 400 - Missing Required Field
 */
export function missingFieldError(fieldName: string) {
  return createErrorResponse({
    code: ERROR_CODES.MISSING_FIELD,
    message: `Missing required field: ${fieldName}`,
    status: 400,
    details: { field: fieldName },
    suggestedAction: `Please provide the ${fieldName} field`,
  });
}

/**
 * 400 - Invalid Format
 */
export function invalidFormatError(
  fieldName: string,
  expectedFormat: string
) {
  return createErrorResponse({
    code: ERROR_CODES.INVALID_FORMAT,
    message: `Invalid format for field: ${fieldName}`,
    status: 400,
    details: { field: fieldName, expectedFormat },
    suggestedAction: `Please enter ${fieldName} in ${expectedFormat} format`,
  });
}

/**
 * 401 - Unauthorized
 */
export function unauthorizedError(message = 'Authentication required') {
  return createErrorResponse({
    code: ERROR_CODES.UNAUTHORIZED,
    message,
    status: 401,
    suggestedAction: 'Please sign in to continue',
  });
}

/**
 * 403 - Forbidden / Insufficient Credits
 */
export function insufficientCreditsError(required: number, available: number) {
  return createErrorResponse({
    code: ERROR_CODES.INSUFFICIENT_CREDITS,
    message: 'Insufficient credits to perform this action',
    status: 403,
    details: { required, available, deficit: required - available },
    suggestedAction: 'Please purchase more credits to continue',
  });
}

/**
 * 403 - Rate Limit Exceeded
 */
export function rateLimitError(retryAfter: number) {
  return createErrorResponse({
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many requests. Please try again later.',
    status: 429,
    retryAfter,
    suggestedAction: `Please wait ${retryAfter} seconds before trying again`,
  });
}

/**
 * 404 - Not Found
 */
export function notFoundError(resourceType?: string) {
  const message = resourceType
    ? `${resourceType} not found`
    : 'Resource not found';

  return createErrorResponse({
    code: ERROR_CODES.NOT_FOUND,
    message,
    status: 404,
    ...(resourceType && { details: { resourceType } }),
    suggestedAction: 'Please check the URL and try again',
  });
}

/**
 * 500 - Internal Server Error
 */
export function internalError(
  message = 'An unexpected error occurred',
  details?: Record<string, unknown>
) {
  return createErrorResponse({
    code: ERROR_CODES.INTERNAL_ERROR,
    message,
    status: 500,
    details,
    suggestedAction: 'Please try again later or contact support',
  });
}

/**
 * 500 - Database Error
 */
export function databaseError(operation: string) {
  return createErrorResponse({
    code: ERROR_CODES.DATABASE_ERROR,
    message: `Database error during ${operation}`,
    status: 500,
    details: { operation },
    suggestedAction: 'Please try again later',
  });
}

/**
 * 500 - External API Error
 */
export function externalApiError(service: string, statusCode?: number) {
  return createErrorResponse({
    code: ERROR_CODES.EXTERNAL_API_ERROR,
    message: `External service error: ${service}`,
    status: 502,
    details: { service, statusCode },
    suggestedAction: 'The service is temporarily unavailable. Please try again later.',
  });
}

/**
 * 408 - Request Timeout
 */
export function timeoutError(operationName: string, timeoutMs: number) {
  return createErrorResponse({
    code: ERROR_CODES.TIMEOUT,
    message: `Request timeout: ${operationName}`,
    status: 408,
    details: { operation: operationName, timeoutMs },
    suggestedAction: 'The operation took too long. Please try again.',
  });
}

// ============ Business Logic Errors ============

/**
 * Invalid Date Error
 */
export function invalidDateError(date: string) {
  return createErrorResponse({
    code: ERROR_CODES.INVALID_DATE,
    message: 'Invalid date provided',
    status: 400,
    details: { date },
    suggestedAction: 'Please enter a valid date in YYYY-MM-DD format',
  });
}

/**
 * Invalid Time Error
 */
export function invalidTimeError(time: string) {
  return createErrorResponse({
    code: ERROR_CODES.INVALID_TIME,
    message: 'Invalid time provided',
    status: 400,
    details: { time },
    suggestedAction: 'Please enter a valid time in HH:MM format',
  });
}

/**
 * Invalid Coordinates Error
 */
export function invalidCoordinatesError(lat?: number, lon?: number) {
  return createErrorResponse({
    code: ERROR_CODES.INVALID_COORDINATES,
    message: 'Invalid geographic coordinates',
    status: 400,
    details: { latitude: lat, longitude: lon },
    suggestedAction: 'Please select a valid city from the list',
  });
}

// ============ Error Handling Wrapper ============

/**
 * Wrap async API handler with error handling
 *
 * @example
 * export const GET = withErrorHandling(async (req) => {
 *   const data = await fetchData();
 *   return createSuccessResponse(data);
 * });
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[API Handler Error]', error);

      // Handle known error types
      if (error instanceof Error) {
        return internalError(error.message, {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }

      return internalError();
    }
  };
}

// ============ Type Guards ============

/**
 * Check if response is an error response
 */
export function isErrorResponse(
  response: unknown
): response is ErrorResponseData {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response &&
    'requestId' in response
  );
}
