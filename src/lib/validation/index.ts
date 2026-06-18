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
  
  
  
  
  
  
  // Common schemas
  
  
  
  
  
  
  
  
  
  // Composite schemas
  
  
  
  // Service-specific schemas
  
  
  
  
  
  
  
  
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
  
} from "@/lib/api/validator";
