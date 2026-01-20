/**
 * Unified API Validator
 *
 * Provides Zod-based validation with consistent error handling
 * and integration with the API middleware system.
 */

import { z, ZodError, ZodSchema } from "zod";
import { NextRequest } from "next/server";
import { LIMITS } from "@/lib/validation/patterns";
import { ErrorCodes, type ErrorCode } from "./errorHandler";
import type { ApiHandlerResult } from "./middleware";

// ============================================================
// Core Validation Types
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// ============================================================
// Common Zod Schemas
// ============================================================

/** ISO date format: YYYY-MM-DD */
export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (date) => {
      const parsed = Date.parse(date);
      if (Number.isNaN(parsed)) return false;
      const year = new Date(parsed).getFullYear();
      return year >= 1900 && year <= 2100;
    },
    { message: "Invalid date or year out of range (1900-2100)" }
  );

/** Time format: HH:MM */
export const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format");

/** IANA timezone */
export const TimezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid timezone" }
);

/** Supported locales */
export const LocaleSchema = z.enum([
  "ko", "en", "ja", "zh", "vi", "th", "id", "de", "fr", "es"
]);
export type Locale = z.infer<typeof LocaleSchema>;

/** Latitude coordinate */
export const LatitudeSchema = z.number().min(-90).max(90);

/** Longitude coordinate */
export const LongitudeSchema = z.number().min(-180).max(180);

/** Safe text (no HTML/script injection) */
export const SafeTextSchema = z.string().refine(
  (text) => !/<script|<\/script|javascript:|on\w+\s*=/i.test(text),
  { message: "Invalid characters detected" }
);

/** Email address */
export const EmailSchema = z.string().email();

/** UUID v4 */
export const UuidSchema = z.string().uuid();

// ============================================================
// Common Composite Schemas
// ============================================================

/** Birth data for saju/astrology calculations */
export const BirthDataSchema = z.object({
  birthDate: DateSchema,
  birthTime: TimeSchema,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  timezone: TimezoneSchema.optional(),
  city: z.string().max(LIMITS.CITY).optional(),
  name: z.string().max(LIMITS.NAME).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not"]).optional(),
});
export type BirthData = z.infer<typeof BirthDataSchema>;

/** Standard API pagination */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type Pagination = z.infer<typeof PaginationSchema>;

/** Common query parameters */
export const QueryParamsSchema = z.object({
  locale: LocaleSchema.default("en"),
  ...PaginationSchema.shape,
});

// ============================================================
// Service-Specific Schemas
// ============================================================

/** Destiny Map request */
export const DestinyMapRequestSchema = BirthDataSchema.extend({
  theme: z.string().max(LIMITS.THEME).default("life"),
  lang: LocaleSchema.default("ko"),
  prompt: z.string().max(LIMITS.PROMPT).optional(),
  userTimezone: TimezoneSchema.optional(),
});
export type DestinyMapRequest = z.infer<typeof DestinyMapRequestSchema>;

/** Tarot request */
export const TarotRequestSchema = z.object({
  categoryId: z.string().min(1).max(64),
  spreadId: z.string().min(1).max(64),
  question: z.string().max(LIMITS.QUESTION).optional(),
  language: LocaleSchema.default("ko"),
});
export type TarotRequest = z.infer<typeof TarotRequestSchema>;

/** Tarot interpretation request */
export const TarotInterpretSchema = z.object({
  category: z.string().max(64).default("general"),
  spreadId: z.string().max(64).default("three_card"),
  spreadTitle: z.string().max(LIMITS.TITLE_TEXT).optional(),
  cards: z.array(z.object({
    name: z.string().min(1).max(LIMITS.CARD_TEXT),
    isReversed: z.boolean().default(false),
    position: z.string().max(LIMITS.POSITION).optional(),
  })).min(1).max(LIMITS.CARDS),
  userQuestion: z.string().max(LIMITS.QUESTION).optional(),
  language: LocaleSchema.default("ko"),
  birthDate: DateSchema.optional(),
  sajuContext: z.record(z.unknown()).optional(),
  astroContext: z.record(z.unknown()).optional(),
});
export type TarotInterpretRequest = z.infer<typeof TarotInterpretSchema>;

/** Dream analysis request */
export const DreamRequestSchema = z.object({
  dream: SafeTextSchema.pipe(z.string().min(10).max(LIMITS.DREAM_TEXT)),
  symbols: z.array(z.string().max(LIMITS.LIST_ITEM_LEN)).max(LIMITS.LIST_ITEMS).optional(),
  emotions: z.array(z.string().max(LIMITS.LIST_ITEM_LEN)).max(LIMITS.LIST_ITEMS).optional(),
  themes: z.array(z.string().max(LIMITS.LIST_ITEM_LEN)).max(LIMITS.LIST_ITEMS).optional(),
  context: z.array(z.string().max(LIMITS.LIST_ITEM_LEN)).max(LIMITS.LIST_ITEMS).optional(),
  locale: LocaleSchema.default("en"),
  birth: BirthDataSchema.optional(),
});
export type DreamRequest = z.infer<typeof DreamRequestSchema>;

/** I-Ching request */
export const IChingRequestSchema = z.object({
  question: z.string().max(LIMITS.QUESTION).optional(),
  theme: z.string().max(LIMITS.THEME).default("general"),
  locale: LocaleSchema.default("ko"),
  sajuElement: z.string().max(20).optional(),
  birth: BirthDataSchema.optional(),
});
export type IChingRequest = z.infer<typeof IChingRequestSchema>;

/** Calendar query */
export const CalendarQuerySchema = z.object({
  birthDate: DateSchema,
  birthTime: TimeSchema,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  timezone: TimezoneSchema,
  category: z.enum(["wealth", "career", "love", "health", "travel", "study", "all"]).default("all"),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  locale: LocaleSchema.default("ko"),
});
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

/** Compatibility request */
export const CompatibilityRequestSchema = z.object({
  person1: BirthDataSchema,
  person2: BirthDataSchema,
  language: LocaleSchema.default("ko"),
  detailLevel: z.enum(["basic", "detailed", "comprehensive"]).default("detailed"),
});
export type CompatibilityRequest = z.infer<typeof CompatibilityRequestSchema>;

/** Feedback request */
export const FeedbackRequestSchema = z.object({
  recordId: z.string().min(1).max(LIMITS.ID),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  theme: z.string().max(LIMITS.THEME).optional(),
  locale: LocaleSchema.default("ko"),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

// ============================================================
// Validation Functions
// ============================================================

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
        code: e.code,
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: "unknown", message: "Validation failed" }],
    };
  }
}

/**
 * Safe validate - returns null on failure instead of throwing
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Parse request body with validation
 */
export async function parseAndValidate<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  options: { maxSize?: number } = {}
): Promise<ApiHandlerResult<T>> {
  const { maxSize = LIMITS.MAX_BODY } = options;

  try {
    // Check content length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        error: {
          code: ErrorCodes.PAYLOAD_TOO_LARGE,
          message: `Request body exceeds ${maxSize} bytes`,
        },
      };
    }

    // Parse JSON
    const text = await req.text();
    if (text.length > maxSize) {
      return {
        error: {
          code: ErrorCodes.PAYLOAD_TOO_LARGE,
          message: `Request body exceeds ${maxSize} bytes`,
        },
      };
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return {
        error: {
          code: ErrorCodes.BAD_REQUEST,
          message: "Invalid JSON body",
        },
      };
    }

    // Validate against schema
    const result = validate(schema, body);

    if (!result.success) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Validation failed",
          details: result.errors,
        },
      };
    }

    return { data: result.data };
  } catch {
    return {
      error: {
        code: ErrorCodes.BAD_REQUEST,
        message: "Failed to parse request body",
      },
    };
  }
}

/**
 * Parse and validate query parameters
 */
export function parseQueryParams<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): ApiHandlerResult<T> {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = validate(schema, params);

  if (!result.success) {
    return {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Invalid query parameters",
        details: result.errors,
      },
    };
  }

  return { data: result.data };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.field}: ${e.message}`).join(", ");
}

/**
 * Create a validation error result for API handlers
 */
export function validationError(
  errors: ValidationError[]
): ApiHandlerResult<never> {
  return {
    error: {
      code: ErrorCodes.VALIDATION_ERROR as ErrorCode,
      message: formatValidationErrors(errors),
      details: errors,
    },
  };
}

// ============================================================
// Re-exports for convenience
// ============================================================

export { z } from "zod";
export type { ZodSchema, ZodError } from "zod";
