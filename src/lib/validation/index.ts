// src/lib/validation/index.ts
// Re-export the pattern-based validation utilities

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
} from './patterns'

// Zod-based request schemas live in @/lib/api/validator and @/lib/api/zodValidation
// (server-side); this module only exposes the dependency-free patterns.
