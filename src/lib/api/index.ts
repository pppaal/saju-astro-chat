/**
 * API Utilities
 * Central export for all API-related utilities
 */

// Error handling
export {
  createErrorResponse,
  createSuccessResponse,
  jsonErrorResponse,
  withErrorHandler,
  ErrorCodes,
  type ErrorCode,
  type APIErrorOptions,
} from "./errorHandler";

// Validation (legacy - prefer Zod schemas for new code)
export {
  validateFields,
  validateDestinyMapInput,
  validateTarotInput,
  validateDreamInput,
  parseJsonBody,
  Patterns,
  CommonValidators,
  type ValidationResult,
  type FieldRule,
} from "./validation";

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
} from "./schemas";

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
} from "./ApiClient";

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
  type ChatMessage,
} from "./sanitizers";
