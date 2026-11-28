/**
 * API Utilities (server-only)
 * Central export for the server-side API helpers used by route handlers.
 *
 * Client code must not import this barrel: it re-exports server helpers
 * (errorHandler pulls in metrics, validator types reach the API middleware).
 * Client code imports apiFetch and the credit events from '@/lib/api/client';
 * an ESLint no-restricted-imports rule enforces this.
 */

// Error handling
export {
  createErrorResponse,
  createSuccessResponse,
  jsonErrorResponse,
  ErrorCodes,
  type ErrorCode,
  type APIErrorOptions,
} from './errorHandler'

// Sanitizers (use these for input sanitization)
export {
  isRecord,
  cleanStringArray,
  normalizeMessages,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeHtml,
  sanitizeEnum,
  type ChatRole,
} from './sanitizers'

// Validator exports (preferred for new code)
export { ChatMessageSchema, ChatMessagesSchema, type ChatMessage } from './validator'
