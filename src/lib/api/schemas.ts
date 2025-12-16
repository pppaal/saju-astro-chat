/**
 * Zod schemas for API request/response validation
 * Provides runtime type validation with TypeScript type inference
 */

import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const LocaleSchema = z.enum([
  "ko",
  "en",
  "ja",
  "zh",
  "es",
  "vi",
  "th",
  "id",
  "de",
  "fr",
]);
export type Locale = z.infer<typeof LocaleSchema>;

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const TimeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format");

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

// ==========================================
// Birth Data Schemas
// ==========================================

export const BirthDataSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: TimezoneSchema.optional(),
});
export type BirthData = z.infer<typeof BirthDataSchema>;

export const GenderSchema = z.enum(["male", "female"]);
export type Gender = z.infer<typeof GenderSchema>;

// ==========================================
// Destiny Map Schemas
// ==========================================

export const DestinyMapRequestSchema = z.object({
  birthDate: DateStringSchema,
  birthTime: TimeStringSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: TimezoneSchema,
  language: LocaleSchema.default("ko"),
  gender: GenderSchema.optional(),
  theme: z.string().optional(),
});
export type DestinyMapRequest = z.infer<typeof DestinyMapRequestSchema>;

// ==========================================
// Tarot Schemas
// ==========================================

export const TarotCardSchema = z.object({
  name: z.string().min(1),
  is_reversed: z.boolean().default(false),
  position: z.string().optional(),
});
export type TarotCard = z.infer<typeof TarotCardSchema>;

export const TarotInterpretRequestSchema = z.object({
  category: z.string().default("general"),
  spread_id: z.string().default("three_card"),
  spread_title: z.string().optional(),
  cards: z.array(TarotCardSchema).min(1).max(10),
  user_question: z.string().max(500).optional(),
  language: LocaleSchema.default("ko"),
  // Optional personalization
  birthdate: DateStringSchema.optional(),
  saju_context: z.record(z.unknown()).optional(),
  astro_context: z.record(z.unknown()).optional(),
});
export type TarotInterpretRequest = z.infer<typeof TarotInterpretRequestSchema>;

// ==========================================
// Dream Schemas
// ==========================================

export const DreamRequestSchema = z.object({
  dream: z.string().min(10).max(2000),
  symbols: z.array(z.string()).optional(),
  emotions: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  context: z.array(z.string()).optional(),
  locale: LocaleSchema.default("ko"),
  birth: BirthDataSchema.optional(),
});
export type DreamRequest = z.infer<typeof DreamRequestSchema>;

// ==========================================
// I Ching Schemas
// ==========================================

export const IChingReadingRequestSchema = z.object({
  question: z.string().max(500).optional(),
  theme: z.string().default("general"),
  locale: LocaleSchema.default("ko"),
  sajuElement: z.string().optional(),
  birth: BirthDataSchema.optional(),
});
export type IChingReadingRequest = z.infer<typeof IChingReadingRequestSchema>;

// ==========================================
// API Response Schemas
// ==========================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.record(z.unknown()).optional(),
  });

export const ApiFailureSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([ApiSuccessSchema(dataSchema), ApiFailureSchema]);

// ==========================================
// Feedback Schemas
// ==========================================

export const FeedbackRequestSchema = z.object({
  record_id: z.string().min(1),
  user_id: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  theme: z.string().optional(),
  locale: LocaleSchema.default("ko"),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

// ==========================================
// Consultation Schemas
// ==========================================

export const ConsultationThemeSchema = z.enum([
  "daily",
  "love",
  "career",
  "health",
  "wealth",
  "life_path",
  "spiritual",
  "family",
  "dream",
  "iching",
]);
export type ConsultationTheme = z.infer<typeof ConsultationThemeSchema>;

// ==========================================
// Helper Functions
// ==========================================

/**
 * Safely parse request body with Zod schema
 * Returns typed data or throws validation error
 */
export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}

/**
 * Safe parse that returns null on failure instead of throwing
 */
export function safeParseBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
