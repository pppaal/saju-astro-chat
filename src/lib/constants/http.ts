/**
 * HTTP Constants
 * Centralized HTTP status codes, timeouts, and cache headers
 */

/**
 * HTTP Status Codes
 * Standard HTTP response status codes used across API routes
 */
export const HTTP_STATUS = {
  /** Request succeeded */
  OK: 200,
  /** No content - successful with empty body */
  NO_CONTENT: 204,
  /** Bad request - client error */
  BAD_REQUEST: 400,
  /** Unauthorized - authentication required */
  UNAUTHORIZED: 401,
  /** Payment required - insufficient credits */
  PAYMENT_REQUIRED: 402,
  /** Forbidden - authenticated but no permission */
  FORBIDDEN: 403,
  /** Resource not found */
  NOT_FOUND: 404,
  /** Unprocessable entity - validation failed */
  UNPROCESSABLE_ENTITY: 422,
  /** Conflict - resource already exists */
  CONFLICT: 409,
  /** Payload too large */
  PAYLOAD_TOO_LARGE: 413,
  /** Too many requests - rate limited */
  RATE_LIMITED: 429,
  /** Internal server error */
  SERVER_ERROR: 500,
  /** Service unavailable */
  SERVICE_UNAVAILABLE: 503,
} as const

/**
 * HTTP Timeout Durations (milliseconds)
 * Used for fetch requests and API calls
 */
export const HTTP_TIMEOUTS = {
  /** Standard API request timeout */
  API_REQUEST: 5000,
  /** Extended timeout for long-running operations */
  LONG_OPERATION: 120000,
  /** Health check timeout */
  HEALTH_CHECK: 5000,
} as const

/**
 * Cache Control Headers (seconds)
 * Used for HTTP Cache-Control max-age directives
 */
export const CACHE_MAX_AGE = {
  /** Static assets (1 year) */
  STATIC_ASSETS: 31536000,
  /** City data (1 day) */
  CITY_DATA: 86400,
  /** Public API data (1 hour) */
  PUBLIC_API: 3600,
} as const
