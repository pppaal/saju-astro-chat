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
