// src/lib/validation/index.ts
// Re-export all validation utilities

// Pattern-based validation (legacy, for backward compatibility)
export {
  // Patterns
  DATE_RE,
  TIME_RE,
  TIMEZONE_RE,
  EMAIL_RE,
  // Limits
  LIMITS,
  // Functions
  isValidDate,
  isValidTime,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isWithinLimit,
  isRequired,
  truncate,
  validateBirthInfo,
  validateProfile,
  validateMessages,
  // Types
  type BirthInfoValidation,
} from "./patterns";

// Zod-based validation (recommended)
export {
  // Core validators
  validate,
  safeValidate,
  parseAndValidate,
  parseQueryParams,
  formatValidationErrors,
  validationError,
  // Common schemas
  DateSchema,
  TimeSchema,
  TimezoneSchema,
  LocaleSchema,
  LatitudeSchema,
  LongitudeSchema,
  SafeTextSchema,
  EmailSchema,
  UuidSchema,
  // Composite schemas
  BirthDataSchema,
  PaginationSchema,
  QueryParamsSchema,
  // Service-specific schemas
  DestinyMapRequestSchema,
  TarotRequestSchema,
  TarotInterpretSchema,
  DreamRequestSchema,
  IChingRequestSchema,
  CalendarQuerySchema,
  CompatibilityRequestSchema,
  FeedbackRequestSchema,
  // Types
  type ValidationError,
  type ValidationResult,
  type Locale,
  type BirthData,
  type Pagination,
  type DestinyMapRequest,
  type TarotRequest,
  type TarotInterpretRequest,
  type DreamRequest,
  type IChingRequest,
  type CalendarQuery,
  type CompatibilityRequest,
  type FeedbackRequest,
  // Zod re-export
  z,
} from "@/lib/api/validator";
