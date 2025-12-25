// src/lib/validation/index.ts
// Re-export all validation utilities

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
