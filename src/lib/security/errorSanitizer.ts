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
  /pk_live_[a-zA-Z0-9]{24,}/gi, // Stripe publishable live keys
  /pk_test_[a-zA-Z0-9]{24,}/gi, // Stripe publishable test keys
  /Bearer\s+[a-zA-Z0-9-_=.]+/gi, // Bearer tokens (JWT included)
  /Basic\s+[a-zA-Z0-9+/=]+/gi, // Basic auth tokens
  /[a-zA-Z0-9_-]*(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)[a-zA-Z0-9_-]*\s*[:=]\s*['"]?[a-zA-Z0-9-_]{8,}['"]?/gi, // Generic secrets

  // Database connection strings
  /postgres(?:ql)?:\/\/[^\s@]*@[^\s]+/gi,
  /mysql:\/\/[^\s@]*@[^\s]+/gi,
  /mongodb(?:\+srv)?:\/\/[^\s@]*@[^\s]+/gi,
  /redis:\/\/[^\s@]*@[^\s]+/gi,

  // AWS and cloud credentials
  /AKIA[0-9A-Z]{16}/gi, // AWS Access Key ID
  /[a-zA-Z0-9+/]{40}/g, // Potential AWS Secret Access Key (generic base64)
  /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/gi, // GitHub tokens

  // Email addresses (in some contexts)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // IP addresses (internal)
  /\b(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,

  // File paths (system internals)
  /[A-Za-z]:\\[\w\\.-]+/g, // Windows paths
  /\/(?:home|root|usr|var|etc|opt)\/[\w\/.-]+/g, // Unix paths

  // Stack trace internal paths
  /at\s+[\w.]+\s+\([^)]+node_modules[^)]+\)/g,

  // Session/cookie values
  /(?:session|cookie|csrf)[_-]?(?:id|token|key)\s*[:=]\s*['"]?[a-zA-Z0-9-_]{16,}['"]?/gi,

  // JWT tokens (three base64 segments separated by dots)
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
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

  // In development, include a sanitized hint (but still be cautious)
  if (isDev && includeHint && originalError) {
    const originalMessage = originalError instanceof Error
      ? originalError.message
      : String(originalError);
    // Double-check that sanitization worked - if still contains sensitive patterns, don't include
    const sanitized = sanitizeErrorMessage(originalMessage);
    if (!containsSensitivePatterns(sanitized)) {
      response.hint = sanitized;
    }
  }

  return response;
}

/**
 * Check if a string still contains potential sensitive patterns after sanitization
 * Used as a secondary safety check
 */
function containsSensitivePatterns(text: string): boolean {
  const dangerousIndicators = [
    /secret/i,
    /password/i,
    /token.*[a-zA-Z0-9]{16,}/i,
    /key.*[a-zA-Z0-9]{16,}/i,
    /@.*:.*@/i, // connection strings with credentials
  ];
  return dangerousIndicators.some(pattern => pattern.test(text));
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
