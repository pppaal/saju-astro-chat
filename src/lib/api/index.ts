/**
 * API Utilities
 * Central export for all API-related utilities
 */

// Error handling
export {
  createErrorResponse,
  createSuccessResponse,
  jsonErrorResponse,
  /** @deprecated Use withApiMiddleware from @/lib/api/middleware instead */
  withErrorHandler,
  ErrorCodes,
  type ErrorCode,
  type APIErrorOptions,
} from './errorHandler'

// Validation (legacy - prefer Zod schemas for new code)
export {
  /** @deprecated Use Zod schemas from @/lib/api/validator instead */
  validateFields,
  /** @deprecated Use DestinyMapSchema from @/lib/api/validator instead */
  validateDestinyMapInput,
  /** @deprecated Use TarotInterpretSchema from @/lib/api/validator instead */
  validateTarotInput,
  /** @deprecated Use DreamSchema from @/lib/api/validator instead */
  validateDreamInput,
  parseJsonBody,
  Patterns,
  CommonValidators,
  type ValidationResult,
  type FieldRule,
} from './validation'

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
  /** @deprecated Use ChatMessage from @/lib/api/validator instead for better type safety */
  type ChatMessage as ChatMessageLegacy,
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

// Backend API Wrapper
export {
  callBackendWithFallback,
  callBackendGet,
  transformBackendResponse,
  type BackendCallOptions,
  type BackendResponse,
  type BackendCallResult,
  type BackendCallFailure,
} from './backend-wrapper'
