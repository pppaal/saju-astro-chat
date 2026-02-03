/**
 * Zod-based API Input Validation
 *
 * Provides comprehensive, type-safe validation schemas using Zod
 * for all API routes. This enhances the existing validation.ts with
 * stronger type safety and better error messages.
 */

import { z } from 'zod'

// ============ Common Schemas ============

/**
 * Date validation (YYYY-MM-DD format)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  .refine(
    (date) => {
      const [year, month, day] = date.split('-').map(Number)
      const parsed = new Date(year, month - 1, day)
      // Check if the parsed date matches the input (catches invalid dates like 2023-02-29)
      return (
        parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
      )
    },
    { message: 'Invalid date' }
  )

/**
 * Time validation (HH:MM format, 24-hour or with AM/PM)
 */
export const timeSchema = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)(\s?(AM|PM))?$/i, {
  message: 'Time must be in HH:MM or HH:MM AM/PM format',
})

/**
 * Timezone validation
 */
export const timezoneSchema = z
  .string()
  .min(1, 'Timezone is required')
  .max(64, 'Timezone is too long')
  .regex(/^[A-Za-z/_+-]+$/, 'Invalid timezone format')

/**
 * Latitude validation
 */
export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be >= -90')
  .max(90, 'Latitude must be <= 90')

/**
 * Longitude validation
 */
export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be >= -180')
  .max(180, 'Longitude must be <= 180')

/**
 * Gender validation
 */
export const genderSchema = z.enum(['Male', 'Female', 'Other', 'male', 'female', 'other'])

/**
 * Language/Locale validation
 */
export const localeSchema = z.enum(['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ar'])

/**
 */
export const calendarTypeSchema = z.enum(['solar', 'lunar'])

// ============ Birth Information Schema ============

/**
 * Complete birth information for astrology/saju readings
 */
export const birthInfoSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  gender: genderSchema.optional(),
  calendarType: calendarTypeSchema.optional(),
  userTimezone: timezoneSchema.optional(),
})

export type BirthInfoValidated = z.infer<typeof birthInfoSchema>

// ============ Payment & Checkout Schemas ============

/**
 * Plan key validation (matches PlanKey type from prices.ts)
 */
export const planKeySchema = z.enum(['basic', 'premium', 'pro'])

/**
 * Billing cycle validation
 */
export const billingCycleSchema = z.enum(['monthly', 'yearly'])

/**
 * Credit pack key validation (matches CreditPackKey type from prices.ts)
 */
export const creditPackKeySchema = z.enum(['small', 'medium', 'large'])

/**
 * Checkout request validation - either plan subscription or credit pack
 */
export const checkoutRequestSchema = z
  .object({
    plan: planKeySchema.optional(),
    billingCycle: billingCycleSchema.optional(),
    creditPack: creditPackKeySchema.optional(),
  })
  .refine(
    (data) => {
      // Must have either plan or creditPack, but not both
      const hasPlan = !!data.plan
      const hasCreditPack = !!data.creditPack
      return (hasPlan && !hasCreditPack) || (!hasPlan && hasCreditPack)
    },
    {
      message: 'Must specify either plan (with optional billingCycle) or creditPack, but not both',
    }
  )
  .refine(
    (data) => {
      // If plan is specified, billingCycle should be specified
      if (data.plan && !data.billingCycle) {
        return false
      }
      return true
    },
    {
      message: 'billingCycle is required when plan is specified',
    }
  )

export type CheckoutRequestValidated = z.infer<typeof checkoutRequestSchema>

/**
 * Stripe webhook event validation
 */
export const stripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number().positive(),
  livemode: z.boolean(),
})

export type StripeWebhookEventValidated = z.infer<typeof stripeWebhookEventSchema>

// ============ Calendar Save Schemas ============

/**
 * Calendar date save request validation
 */
export const calendarSaveRequestSchema = z.object({
  date: dateSchema,
  year: z.number().int().min(1900).max(2100).optional(),
  grade: z.number().int().min(1).max(5), // Grade 1-5
  score: z.number().min(0).max(100), // Score 0-100
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  summary: z.string().max(1000).trim().optional(),
  categories: z.array(z.string().max(50)).optional(),
  bestTimes: z.array(z.string().max(100)).optional(),
  sajuFactors: z.record(z.any()).optional(),
  astroFactors: z.record(z.any()).optional(),
  recommendations: z.array(z.string().max(500)).optional(),
  warnings: z.array(z.string().max(500)).optional(),
  birthDate: dateSchema.optional(),
  birthTime: timeSchema.optional(),
  birthPlace: z.string().max(200).optional(),
  locale: localeSchema.optional(),
})

export type CalendarSaveRequestValidated = z.infer<typeof calendarSaveRequestSchema>

/**
 * Calendar query parameters validation
 */
export const calendarQuerySchema = z.object({
  date: dateSchema.optional(),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
})

export type CalendarQueryValidated = z.infer<typeof calendarQuerySchema>

// ============ Astrology API Schema ============

export const astrologyRequestSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  latitude: z.union([latitudeSchema, z.string().transform((val) => parseFloat(val))]),
  longitude: z.union([longitudeSchema, z.string().transform((val) => parseFloat(val))]),
  timeZone: timezoneSchema,
  locale: localeSchema.optional(),
  options: z.object({}).passthrough().optional(),
})

export type AstrologyRequest = z.infer<typeof astrologyRequestSchema>

// ============ Saju API Schema ============

export const sajuRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: calendarTypeSchema,
  timezone: timezoneSchema,
  userTimezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type SajuRequest = z.infer<typeof sajuRequestSchema>

// ============ Tarot API Schemas ============

export const tarotCardSchema = z.object({
  name: z.string().min(1).max(120),
  nameKo: z.string().min(1).max(120).optional(),
  isReversed: z.boolean(),
  position: z.string().min(1).max(80),
  positionKo: z.string().max(80).optional(),
  meaning: z.string().max(500).optional(),
  meaningKo: z.string().max(500).optional(),
  keywords: z.array(z.string()).max(8).optional(),
  keywordsKo: z.array(z.string()).max(8).optional(),
})

export const tarotInterpretRequestSchema = z.object({
  categoryId: z.string().min(1).max(120),
  spreadId: z.string().min(1).max(120),
  spreadTitle: z.string().min(1).max(120),
  cards: z.array(tarotCardSchema).min(1).max(15),
  userQuestion: z.string().max(600).optional(),
  language: z.enum(['ko', 'en']).default('ko'),
  birthdate: dateSchema.optional(),
  moonPhase: z.string().min(2).max(40).optional(),
})

export type TarotInterpretRequest = z.infer<typeof tarotInterpretRequestSchema>

// ============ Dream Analysis Schema ============

export const dreamAnalysisSchema = z.object({
  dream: z
    .string()
    .min(10, 'Dream description too short (min 10 characters)')
    .max(10000, 'Dream description too long (max 10000 characters)')
    .transform((str) => str.trim()),
  locale: localeSchema.optional(),
  birthInfo: birthInfoSchema.optional(),
})

export type DreamAnalysisRequest = z.infer<typeof dreamAnalysisSchema>

// ============ Compatibility Schema ============

export const compatibilityRequestSchema = z.object({
  person1: birthInfoSchema,
  person2: birthInfoSchema,
  analysisType: z.enum(['romantic', 'friendship', 'business', 'family']).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityRequest = z.infer<typeof compatibilityRequestSchema>

// ============ I Ching Schema ============

export const iChingRequestSchema = z.object({
  question: z
    .string()
    .min(1)
    .max(5000)
    .transform((str) => str.trim()),
  hexagramNumber: z.number().int().min(1).max(64).optional(),
  changingLines: z.array(z.number().int().min(1).max(6)).optional(),
  birthInfo: birthInfoSchema.optional(),
  locale: localeSchema.optional(),
})

export type IChingRequest = z.infer<typeof iChingRequestSchema>

// ============ Chat Message Schema ============

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(5000)
    .transform((str) => str.trim()),
  conversationId: z.string().uuid().optional(),
  context: z.object({}).passthrough().optional(),
  locale: localeSchema.optional(),
})

export type ChatMessageRequest = z.infer<typeof chatMessageSchema>

// ============ Pagination Schema ============

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationParams = z.infer<typeof paginationSchema>

// ============ Validation Helper Functions ============

/**
 * Validate request body with a Zod schema
 * Returns validated data or error details
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Array<{ path: string; message: string }> }
> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }))

      return { success: false, errors }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: 'body',
          message: error instanceof Error ? error.message : 'Invalid JSON body',
        },
      ],
    }
  }
}

/**
 * Validate query parameters with a Zod schema
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Array<{ path: string; message: string }> } {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())

    // Convert numeric strings to numbers
    const converted = Object.entries(params).reduce(
      (acc, [key, value]) => {
        const numValue = Number(value)
        acc[key] = !isNaN(numValue) && value !== '' ? numValue : value
        return acc
      },
      {} as Record<string, unknown>
    )

    const result = schema.safeParse(converted)

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }))

      return { success: false, errors }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: 'query',
          message: error instanceof Error ? error.message : 'Invalid query parameters',
        },
      ],
    }
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string, maxLength = 10000): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, maxLength)
}
