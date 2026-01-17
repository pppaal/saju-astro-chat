/**
 * Input Validation Utilities for API Routes
 * Provides type-safe validation with descriptive errors
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FieldRule<T> {
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array" | "object";
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: T[];
  custom?: (value: T) => string | null;
}

type FieldRules<T> = {
  [K in keyof T]?: FieldRule<T[K]>;
};

/**
 * Validate object against field rules
 */
export function validateFields<T extends Record<string, unknown>>(
  data: T,
  rules: FieldRules<T>
): ValidationResult {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    if (!rule) continue;

    const value = data[field];
    const fieldRule = rule as FieldRule<unknown>;

    // Required check
    if (fieldRule.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip validation if value is empty and not required
    if (value === undefined || value === null) continue;

    // Type check
    if (fieldRule.type) {
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== fieldRule.type) {
        errors.push(`${field} must be a ${fieldRule.type}`);
        continue;
      }
    }

    // Numeric range
    if (typeof value === "number") {
      if (fieldRule.min !== undefined && value < fieldRule.min) {
        errors.push(`${field} must be at least ${fieldRule.min}`);
      }
      if (fieldRule.max !== undefined && value > fieldRule.max) {
        errors.push(`${field} must be at most ${fieldRule.max}`);
      }
    }

    // String length
    if (typeof value === "string") {
      if (fieldRule.minLength !== undefined && value.length < fieldRule.minLength) {
        errors.push(`${field} must be at least ${fieldRule.minLength} characters`);
      }
      if (fieldRule.maxLength !== undefined && value.length > fieldRule.maxLength) {
        errors.push(`${field} must be at most ${fieldRule.maxLength} characters`);
      }
      if (fieldRule.pattern && !fieldRule.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
    }

    // Array length
    if (Array.isArray(value)) {
      if (fieldRule.min !== undefined && value.length < fieldRule.min) {
        errors.push(`${field} must have at least ${fieldRule.min} items`);
      }
      if (fieldRule.max !== undefined && value.length > fieldRule.max) {
        errors.push(`${field} must have at most ${fieldRule.max} items`);
      }
    }

    // Enum check
    if (fieldRule.enum && !fieldRule.enum.includes(value as unknown)) {
      errors.push(`${field} must be one of: ${fieldRule.enum.join(", ")}`);
    }

    // Custom validation
    if (fieldRule.custom) {
      const customError = fieldRule.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Common validation patterns
export const Patterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^\d{2}:\d{2}(:\d{2})?$/,
  TIMEZONE: /^[A-Za-z_\/]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SAFE_TEXT: /^[^<>{}]*$/, // No HTML/script injection
};

// Pre-built validators for common use cases
export const CommonValidators = {
  birthDate: {
    required: true,
    type: "string" as const,
    pattern: Patterns.DATE,
    custom: (value: unknown) => {
      if (typeof value !== "string") return "Birth date must be a string";
      const date = new Date(value);
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        return "Birth year must be between 1900 and 2100";
      }
      return null;
    },
  },

  birthTime: {
    required: true,
    type: "string" as const,
    pattern: Patterns.TIME,
  },

  latitude: {
    required: true,
    type: "number" as const,
    min: -90,
    max: 90,
  },

  longitude: {
    required: true,
    type: "number" as const,
    min: -180,
    max: 180,
  },

  timezone: {
    type: "string" as const,
    pattern: Patterns.TIMEZONE,
  },

  language: {
    type: "string" as const,
    enum: ["ko", "en", "ja", "zh", "es", "fr", "de", "pt", "ru", "ar"],
  },

  dreamText: {
    required: true,
    type: "string" as const,
    minLength: 10,
    maxLength: 10000,
    custom: (value: unknown) => {
      if (typeof value !== "string") return "Dream text must be a string";
      if (/<script/i.test(value)) {
        return "Invalid content detected";
      }
      return null;
    },
  },

  tarotCards: {
    required: true,
    type: "array" as const,
    min: 1,
    max: 10,
  },
};

/**
 * Validate destiny map input
 */
export function validateDestinyMapInput(data: Record<string, unknown>): ValidationResult {
  return validateFields(data, {
    birthDate: CommonValidators.birthDate,
    birthTime: CommonValidators.birthTime,
    latitude: CommonValidators.latitude,
    longitude: CommonValidators.longitude,
    theme: {
      type: "string",
      enum: ["life", "love", "career", "wealth", "health", "relationship", "year", "month", "today"],
    },
    lang: CommonValidators.language,
  });
}

/**
 * Validate tarot input
 */
export function validateTarotInput(data: Record<string, unknown>): ValidationResult {
  return validateFields(data, {
    category: {
      required: true,
      type: "string",
      minLength: 1,
    },
    spreadId: {
      required: true,
      type: "string",
      minLength: 1,
    },
    cards: {
      required: true,
      type: "array",
      min: 1,
      max: 10,
    },
    language: CommonValidators.language,
  });
}

/**
 * Validate dream input
 */
export function validateDreamInput(data: Record<string, unknown>): ValidationResult {
  return validateFields(data, {
    dream: CommonValidators.dreamText,
    locale: CommonValidators.language,
  });
}

/**
 * Validate birth data (Saju, Astrology, Compatibility)
 */
export function validateBirthData(data: Record<string, unknown>): ValidationResult {
  return validateFields(data, {
    birthDate: CommonValidators.birthDate,
    birthTime: CommonValidators.birthTime,
    latitude: CommonValidators.latitude,
    longitude: CommonValidators.longitude,
    timezone: CommonValidators.timezone,
    language: CommonValidators.language,
  });
}

/**
 * Validate compatibility input
 */
export function validateCompatibilityInput(data: Record<string, unknown>): ValidationResult {
  const baseValidation = validateFields(data, {
    person1: {
      required: true,
      type: "object",
    },
    person2: {
      required: true,
      type: "object",
    },
  });

  if (!baseValidation.valid) {
    return baseValidation;
  }

  // Validate person1 and person2 birth data
  const person1 = data.person1 as Record<string, unknown>;
  const person2 = data.person2 as Record<string, unknown>;

  const person1Validation = validateBirthData(person1);
  const person2Validation = validateBirthData(person2);

  return {
    valid: person1Validation.valid && person2Validation.valid,
    errors: [
      ...person1Validation.errors.map(e => `person1.${e}`),
      ...person2Validation.errors.map(e => `person2.${e}`),
    ],
  };
}

// sanitizeString moved to sanitizers.ts - import from there
// import { sanitizeString } from './sanitizers';

/**
 * Parse and validate JSON body safely
 */
export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request
): Promise<{ data: T | null; error: string | null }> {
  try {
    const text = await request.text();

    // Check content length
    if (text.length > 1_000_000) {
      return { data: null, error: "Request body too large" };
    }

    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: "Invalid JSON" };
  }
}
