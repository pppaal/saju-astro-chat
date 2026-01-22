/**
 * Error Sanitization Utilities
 * Prevents sensitive information leakage through error messages
 */

import { logger } from "@/lib/logger";

/**
 * Sensitive patterns that should be removed from error messages
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /sk-[a-zA-Z0-9-_]{32,}/gi, // OpenAI API keys
  /sk_live_[a-zA-Z0-9]{24,}/gi, // Stripe live keys
  /sk_test_[a-zA-Z0-9]{24,}/gi, // Stripe test keys
  /Bearer\s+[a-zA-Z0-9-_=]+/gi, // Bearer tokens

  // Database connection strings
  /postgres:\/\/[^@]+@[^/]+/gi,
  /mysql:\/\/[^@]+@[^/]+/gi,
  /mongodb:\/\/[^@]+@[^/]+/gi,

  // Email addresses (in some contexts)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // IP addresses (internal)
  /\b(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,

  // File paths (system internals)
  /[A-Za-z]:\\[\w\\.-]+/g, // Windows paths
  /\/(?:home|root|usr|var)\/[\w\/.-]+/g, // Unix paths

  // Stack trace internal paths
  /at\s+[\w.]+\s+\([^)]+node_modules[^)]+\)/g,
];

/**
 * Generic error messages to use instead of exposing details
 */
const GENERIC_MESSAGES = {
  database: "Database operation failed",
  authentication: "Authentication failed",
  authorization: "Access denied",
  validation: "Invalid input",
  external_api: "External service unavailable",
  internal: "Internal server error",
  rate_limit: "Too many requests",
  not_found: "Resource not found",
} as const;

export type ErrorCategory = keyof typeof GENERIC_MESSAGES;

/**
 * Sanitize error message by removing sensitive information
 * @param message - Original error message
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return GENERIC_MESSAGES.internal;
  }

  let sanitized = message;

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Truncate very long messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  return sanitized;
}

/**
 * Get generic error message for a category
 * @param category - Error category
 * @param logOriginal - Original error to log (optional)
 * @returns Generic user-facing error message
 */
export function getGenericError(
  category: ErrorCategory,
  logOriginal?: unknown
): string {
  if (logOriginal) {
    // Log the original error for debugging
    logger.error(`[${category}] Original error:`, logOriginal);
  }

  return GENERIC_MESSAGES[category];
}

/**
 * Create a safe error response object
 * @param category - Error category
 * @param originalError - Original error object (for logging)
 * @param includeHint - Whether to include a hint in development mode
 * @returns Safe error response object
 */
export function createSafeErrorResponse(
  category: ErrorCategory,
  originalError?: unknown,
  includeHint = false
) {
  const isDev = process.env.NODE_ENV === 'development';
  const message = getGenericError(category, originalError);

  const response: {
    error: string;
    hint?: string;
  } = {
    error: message,
  };

  // In development, include a sanitized hint
  if (isDev && includeHint && originalError) {
    const originalMessage = originalError instanceof Error
      ? originalError.message
      : String(originalError);
    response.hint = sanitizeErrorMessage(originalMessage);
  }

  return response;
}

/**
 * Sanitize error for client response
 * @param error - Error object or message
 * @param category - Error category (default: internal)
 * @returns Sanitized error object for client
 */
export function sanitizeError(
  error: unknown,
  category: ErrorCategory = 'internal'
): { error: string; hint?: string } {
  const isDev = process.env.NODE_ENV === 'development';

  // Log the original error
  logger.error(`[${category}] Error occurred:`, error);

  // In production, only return generic message
  if (!isDev) {
    return { error: GENERIC_MESSAGES[category] };
  }

  // In development, include sanitized hint
  const originalMessage = error instanceof Error
    ? error.message
    : String(error);

  return {
    error: GENERIC_MESSAGES[category],
    hint: sanitizeErrorMessage(originalMessage),
  };
}
