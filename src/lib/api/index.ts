/**
 * API Utilities
 * Central export for all API-related utilities
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

// Zod schemas (preferred for new code)
export {
  // Common
  LocaleSchema,
  DateStringSchema,
  TimeStringSchema,
  TimezoneSchema,
  BirthDataSchema,
  GenderSchema,
  // Request schemas
  DestinyMapRequestSchema,
  TarotInterpretRequestSchema,
  DreamRequestSchema,
  IChingReadingRequestSchema,
  FeedbackRequestSchema,
  ConsultationThemeSchema,
  // Response schemas
  ApiErrorSchema,
  ApiSuccessSchema,
  ApiFailureSchema,
  ApiResponseSchema,
  // Helpers
  parseBody,
  safeParseBody,
  LIMITS,
  // Types
  type Locale,
  type BirthData,
  type Gender,
  type DestinyMapRequest,
  type TarotInterpretRequest,
  type DreamRequest,
  type IChingReadingRequest,
  type FeedbackRequest,
  type ConsultationTheme,
  type ApiError,
} from './schemas'

// API Client
export {
  // Simple fetch wrapper for internal API calls
  apiFetch,
  type ApiFetchOptions,
  // Backend API client class
  ApiClient,
  apiClient,
  createApiClient,
  type ApiClientOptions,
  type ApiResponse,
} from './ApiClient'

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

// Validation Wrapper (for API routes)
export {
  validateAndParse,
  validateQueryParams as validateQueryParamsWrapper,
  formatValidationErrors,
  createValidationErrorResponse as createZodValidationErrorResponse,
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  HTTP_STATUS,
  type HttpStatus,
  type ValidationError as ZodValidationError,
  type ValidationResult as ZodValidationResult,
  type ValidationFailure,
} from './validation-wrapper'
