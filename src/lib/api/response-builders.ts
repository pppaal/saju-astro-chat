/**
 * API Response Builder Utilities
 * Standardized response creation for Next.js API routes
 */

import { NextResponse } from 'next/server';

/**
 * Create a successful JSON response
 * @param data - Response data
 * @param additionalFields - Additional fields to merge into response
 * @returns NextResponse with success: true
 */
export function successResponse<T>(
  data: T,
  additionalFields?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({
    success: true,
    ...data,
    ...additionalFields,
  });
}

/**
 * Create an error JSON response
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with success: false
 */
export function errorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

/**
 * Create a validation error response
 * @param field - Field name that failed validation
 * @param message - Validation error message
 * @returns NextResponse with 400 status
 */
export function validationErrorResponse(
  field: string,
  message: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `Validation failed for ${field}: ${message}`,
      field,
    },
    { status: 400 }
  );
}

/**
 * Create a missing field error response
 * @param fields - Required field names
 * @returns NextResponse with 400 status
 */
export function missingFieldsResponse(
  ...fields: string[]
): NextResponse {
  const fieldList = fields.join(', ');
  return NextResponse.json(
    {
      success: false,
      error: `Missing required fields: ${fieldList}`,
      missingFields: fields,
    },
    { status: 400 }
  );
}

/**
 * Create a server error response
 * @param message - Error message (optional)
 * @param error - Error object (optional, for logging)
 * @returns NextResponse with 500 status
 */
export function serverErrorResponse(
  message: string = 'Internal server error',
  error?: unknown
): NextResponse {
  // Log error for debugging (could be sent to logging service)
  if (error) {
    console.error('[Server Error]:', error);
  }

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 500 }
  );
}

/**
 * Create a not found response
 * @param resource - Resource type that was not found
 * @returns NextResponse with 404 status
 */
export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} not found`,
    },
    { status: 404 }
  );
}

/**
 * Create an unauthorized response
 * @param message - Authorization error message
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  );
}

/**
 * Create a method not allowed response
 * @param allowedMethods - Allowed HTTP methods
 * @returns NextResponse with 405 status
 */
export function methodNotAllowedResponse(
  ...allowedMethods: string[]
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      allowedMethods,
    },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(', '),
      },
    }
  );
}

/**
 * Create a plain JSON error Response (for streaming endpoints)
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @returns Response with JSON error
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
