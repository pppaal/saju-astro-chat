// src/lib/validation/patterns.ts
// Shared validation patterns and limits for API routes

// ============================================================
// Regex Patterns
// ============================================================

/** Date format: YYYY-MM-DD */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Time format: HH:MM */
export const TIME_RE = /^\d{2}:\d{2}$/;

/** Timezone format: e.g., Asia/Seoul, America/New_York */
export const TIMEZONE_RE = /^[A-Za-z_/]+$/;

/** Email format */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// Validation Limits
// ============================================================

export const LIMITS = {
  // Names
  NAME: 80,
  NAME_LONG: 120,

  // Locations
  CITY: 120,
  TIMEZONE: 80,
  PLACE: 64,

  // Content
  THEME: 40,
  PROMPT: 2000,
  MESSAGE: 2000,
  NOTE: 240,
  QUESTION: 600,

  // Messages
  MAX_MESSAGES: 20,
  MAX_MESSAGES_SHORT: 10,

  // CV/Documents
  CV_TEXT: 6000,
  CV_TEXT_SHORT: 1200,

  // IDs
  ID: 64,
  REFERRAL_CODE: 32,
  PASSWORD: 128,

  // Tarot
  CARDS: 15,
  CARD_TEXT: 400,
  TITLE_TEXT: 200,
  GUIDANCE_TEXT: 1200,
  KEYWORD_LEN: 60,
  KEYWORDS: 8,
  POSITION: 80,

  // Dream
  DREAM_TEXT: 4000,
  LIST_ITEMS: 20,
  LIST_ITEM_LEN: 200,

  // Body size
  MAX_BODY: 64 * 1024,
  MAX_BODY_LARGE: 96 * 1024,

  // Coordinates
  LATITUDE: { min: -90, max: 90 },
  LONGITUDE: { min: -180, max: 180 },

  // Credits
  CREDIT_AMOUNT: 10,
} as const;

// ============================================================
// Validation Functions
// ============================================================

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDate(date: string | null | undefined): boolean {
  if (!date) return false;
  if (!DATE_RE.test(date)) return false;
  const parsed = Date.parse(date);
  return !Number.isNaN(parsed);
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTime(time: string | null | undefined): boolean {
  if (!time) return false;
  return TIME_RE.test(time);
}

/**
 * Validate latitude (-90 to 90)
 */
export function isValidLatitude(lat: number | null | undefined): boolean {
  if (lat === null || lat === undefined) return false;
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude (-180 to 180)
 */
export function isValidLongitude(lon: number | null | undefined): boolean {
  if (lon === null || lon === undefined) return false;
  return Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/**
 * Validate coordinates (lat/lon pair)
 */
export function isValidCoordinates(
  lat: number | null | undefined,
  lon: number | null | undefined
): boolean {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

/**
 * Validate string length within limit
 */
export function isWithinLimit(
  value: string | null | undefined,
  maxLength: number
): boolean {
  if (!value) return true; // Empty is valid (use required check separately)
  return value.length <= maxLength;
}

/**
 * Validate required string
 */
export function isRequired(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/**
 * Truncate string to max length
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength);
}

/**
 * Validate birth info (date, time, coordinates)
 */
export interface BirthInfoValidation {
  valid: boolean;
  errors: string[];
}

export function validateBirthInfo(params: {
  birthDate?: string | null;
  birthTime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): BirthInfoValidation {
  const errors: string[] = [];

  if (!isValidDate(params.birthDate)) {
    errors.push("Invalid birth date format (YYYY-MM-DD required)");
  }

  if (!isValidTime(params.birthTime)) {
    errors.push("Invalid birth time format (HH:MM required)");
  }

  if (!isValidLatitude(params.latitude)) {
    errors.push("Invalid latitude (must be between -90 and 90)");
  }

  if (!isValidLongitude(params.longitude)) {
    errors.push("Invalid longitude (must be between -180 and 180)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate profile data with all common fields
 */
export function validateProfile(params: {
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  timezone?: string | null;
}): BirthInfoValidation {
  const birthValidation = validateBirthInfo(params);
  const errors = [...birthValidation.errors];

  if (params.name && !isWithinLimit(params.name, LIMITS.NAME)) {
    errors.push(`Name too long (max ${LIMITS.NAME} chars)`);
  }

  if (params.city && !isWithinLimit(params.city, LIMITS.CITY)) {
    errors.push(`City too long (max ${LIMITS.CITY} chars)`);
  }

  if (params.timezone && !isWithinLimit(params.timezone, LIMITS.TIMEZONE)) {
    errors.push(`Timezone too long (max ${LIMITS.TIMEZONE} chars)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate message array
 */
export function validateMessages(
  messages: unknown,
  maxCount: number = LIMITS.MAX_MESSAGES,
  maxLength: number = LIMITS.MESSAGE
): BirthInfoValidation {
  const errors: string[] = [];

  if (!Array.isArray(messages)) {
    errors.push("Messages must be an array");
    return { valid: false, errors };
  }

  if (messages.length > maxCount) {
    errors.push(`Too many messages (max ${maxCount})`);
  }

  for (let i = 0; i < Math.min(messages.length, maxCount); i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") {
      errors.push(`Message ${i} is invalid`);
      continue;
    }

    const content = (msg as { content?: string }).content;
    if (content && content.length > maxLength) {
      errors.push(`Message ${i} too long (max ${maxLength} chars)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
