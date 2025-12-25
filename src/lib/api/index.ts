/**
 * API Utilities
 * Central export for all API-related utilities
 */

export {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
  ErrorCodes,
  type ErrorCode,
  type APIErrorOptions,
} from "./errorHandler";

export {
  validateFields,
  validateDestinyMapInput,
  validateTarotInput,
  validateDreamInput,
  sanitizeString,
  parseJsonBody,
  Patterns,
  CommonValidators,
  type ValidationResult,
  type FieldRule,
} from "./validation";

export {
  ApiClient,
  apiClient,
  createApiClient,
  type ApiClientOptions,
  type ApiResponse,
} from "./ApiClient";

export {
  isRecord,
  cleanStringArray,
  normalizeMessages,
  sanitizeString as sanitizeStringValue,
  sanitizeNumber,
  sanitizeBoolean,
  type ChatRole,
  type ChatMessage,
} from "./sanitizers";
