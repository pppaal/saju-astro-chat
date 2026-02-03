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
/**
 * Tarot card schema for save endpoint
 */
export const tarotCardSaveSchema = z.object({
  cardId: z.string().max(100),
  name: z.string().min(1).max(120),
  image: z.string().max(500),
  isReversed: z.boolean(),
  position: z.string().min(1).max(100),
})

/**
 * Tarot card insight schema
 */
export const tarotCardInsightSchema = z.object({
  position: z.string().max(100),
  card_name: z.string().max(120),
  is_reversed: z.boolean(),
  interpretation: z.string().max(5000),
})

/**
 * Tarot reading save request validation
 */
export const tarotSaveRequestSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  theme: z.string().max(100).trim().optional(),
  spreadId: z.string().min(1).max(100),
  spreadTitle: z.string().min(1).max(200),
  cards: z.array(tarotCardSaveSchema).min(1).max(20),
  overallMessage: z.string().max(5000).optional(),
  cardInsights: z.array(tarotCardInsightSchema).optional(),
  guidance: z.string().max(2000).optional(),
  affirmation: z.string().max(500).optional(),
  source: z.enum(['standalone', 'counselor']).optional(),
  counselorSessionId: z.string().max(100).optional(),
  locale: localeSchema.optional(),
})

export type TarotSaveRequestValidated = z.infer<typeof tarotSaveRequestSchema>

/**
 * Tarot query parameters validation
 */
export const tarotQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Math.min(Math.max(1, Number(val)), 100))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Math.max(0, Number(val)))
    .optional(),
  theme: z.string().max(100).optional(),
})

export type TarotQueryValidated = z.infer<typeof tarotQuerySchema>

// ============ Life Prediction Schemas ============

/**
 * Life prediction request validation
 */
export const lifePredictionRequestSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  gender: genderSchema.optional(),
  locale: localeSchema.optional(),
  analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional(),
})

export type LifePredictionRequestValidated = z.infer<typeof lifePredictionRequestSchema>

/**
 * Life prediction multi-year save request validation
 */
export const lifePredictionMultiYearSaveSchema = z.object({
  multiYearTrend: z.object({
    startYear: z.number().int().min(1900).max(2100),
    endYear: z.number().int().min(1900).max(2100),
    overallTrend: z.string().max(2000),
    peakYears: z.array(z.number().int()).max(20),
    lowYears: z.array(z.number().int()).max(20),
    summary: z.string().max(3000),
    yearlyScores: z
      .array(
        z.object({
          year: z.number().int(),
          score: z.number().min(0).max(100),
          grade: z.string().max(10),
          themes: z.array(z.string().max(100)).optional(),
        })
      )
      .optional(),
    daeunTransitions: z
      .array(
        z.object({
          year: z.number().int(),
          description: z.string().max(1000),
        })
      )
      .optional(),
  }),
  saju: z.record(z.any()).optional(),
  astro: z.record(z.any()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
})

export type LifePredictionMultiYearSaveValidated = z.infer<typeof lifePredictionMultiYearSaveSchema>

/**
 * Life prediction save request validation
 */
export const lifePredictionSaveRequestSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  prediction: z.string().max(10000),
  category: z.string().max(100).optional(),
  birthInfo: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  locale: localeSchema.optional(),
})

export type LifePredictionSaveRequestValidated = z.infer<typeof lifePredictionSaveRequestSchema>

// ============ Destiny Matrix Schemas ============

/**
 * Destiny matrix request validation
 */
export const destinyMatrixRequestSchema = z.object({
  birthDate: dateSchema,
  name: z.string().min(1).max(120).trim().optional(),
  gender: genderSchema.optional(),
  locale: localeSchema.optional(),
})

export type DestinyMatrixRequestValidated = z.infer<typeof destinyMatrixRequestSchema>

/**
 * Destiny matrix save request validation
 */
export const destinyMatrixSaveRequestSchema = z
  .object({
    reportType: z.enum(['timing', 'themed']),
    period: z.enum(['daily', 'monthly', 'yearly', 'comprehensive']).optional(),
    theme: z.enum(['love', 'career', 'wealth', 'health', 'family']).optional(),
    reportData: z.record(z.any()),
    title: z.string().min(1).max(300).trim(),
    summary: z.string().max(2000).optional(),
    overallScore: z.number().min(0).max(100).optional(),
    grade: z.string().max(10).optional(),
    locale: localeSchema.optional(),
  })
  .refine(
    (data) => {
      // If reportType is 'timing', period is required
      if (data.reportType === 'timing' && !data.period) {
        return false
      }
      return true
    },
    {
      message: 'period is required for timing reports',
      path: ['period'],
    }
  )
  .refine(
    (data) => {
      // If reportType is 'themed', theme is required
      if (data.reportType === 'themed' && !data.theme) {
        return false
      }
      return true
    },
    {
      message: 'theme is required for themed reports',
      path: ['theme'],
    }
  )

export type DestinyMatrixSaveRequestValidated = z.infer<typeof destinyMatrixSaveRequestSchema>

// ============ Compatibility Schemas ============

/**
 * Person data for compatibility
 */
export const personDataSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  gender: genderSchema.optional(),
})

/**
 * Compatibility request validation (supports 2-4 people)
 */
export const compatibilityRequestSchema = z.object({
  people: z.array(personDataSchema).min(2).max(4),
  analysisType: z.enum(['romantic', 'friendship', 'business', 'family']).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityRequestValidated = z.infer<typeof compatibilityRequestSchema>

/**
 * Compatibility save request validation
 */
export const compatibilitySaveRequestSchema = z.object({
  people: z.array(personDataSchema).min(2).max(4),
  analysisType: z.string().max(50).optional(),
  compatibilityScore: z.number().min(0).max(100).optional(),
  report: z.string().max(15000),
  insights: z.array(z.string().max(1000)).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilitySaveRequestValidated = z.infer<typeof compatibilitySaveRequestSchema>

// ============ I Ching Schemas ============

/**
 * I Ching request validation
 */
export const iChingRequestSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  method: z.enum(['coins', 'yarrow', 'digital']).optional(),
  hexagramNumber: z.number().int().min(1).max(64).optional(),
  changingLines: z.array(z.number().int().min(1).max(6)).max(6).optional(),
  locale: localeSchema.optional(),
})

export type IChingRequestValidated = z.infer<typeof iChingRequestSchema>

/**
 * I Ching changing line schema
 */
export const iChingChangingLineSchema = z.object({
  index: z.number().int().min(1).max(6),
  text: z.string().max(1000),
})

/**
 * I Ching resulting hexagram schema
 */
export const iChingResultingHexagramSchema = z.object({
  number: z.number().int().min(1).max(64),
  name: z.string().max(200),
  symbol: z.string().max(20),
  judgment: z.string().max(2000).optional(),
})

/**
 * I Ching stream request validation (for streaming interpretation)
 */
export const iChingStreamRequestSchema = z.object({
  hexagramNumber: z.number().int().min(1).max(64),
  hexagramName: z.string().min(1).max(200),
  hexagramSymbol: z.string().max(20),
  judgment: z.string().max(2000),
  image: z.string().max(2000),
  coreMeaning: z.string().max(1000).optional(),
  changingLines: z.array(iChingChangingLineSchema).max(6).optional(),
  resultingHexagram: iChingResultingHexagramSchema.optional(),
  question: z.string().max(500).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  themes: z
    .object({
      career: z.string().max(500).optional(),
      love: z.string().max(500).optional(),
      health: z.string().max(500).optional(),
      wealth: z.string().max(500).optional(),
      timing: z.string().max(500).optional(),
    })
    .optional(),
})

export type IChingStreamRequestValidated = z.infer<typeof iChingStreamRequestSchema>

// ============ Referral System Schemas ============

/**
 * Referral claim request validation
 */
export const referralClaimRequestSchema = z.object({
  code: z.string().min(1).max(50).trim(),
})

export type ReferralClaimRequestValidated = z.infer<typeof referralClaimRequestSchema>

/**
 * Referral link generation request
 */
export const referralLinkRequestSchema = z.object({
  customCode: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
})

export type ReferralLinkRequestValidated = z.infer<typeof referralLinkRequestSchema>

// ============ Notification Schemas ============

/**
 * Notification send request validation
 */
export const notificationSendRequestSchema = z.object({
  userId: z.string().max(100).optional(),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  link: z.string().max(500).url().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
})

export type NotificationSendRequestValidated = z.infer<typeof notificationSendRequestSchema>

// ============ Share & Image Generation Schemas ============

/**
 * Share image generation request
 */
export const shareImageRequestSchema = z.object({
  type: z.enum(['tarot', 'astrology', 'saju', 'compatibility', 'dream']),
  title: z.string().min(1).max(200).trim(),
  content: z.string().max(2000).trim(),
  theme: z.enum(['light', 'dark']).optional(),
  locale: localeSchema.optional(),
})

export type ShareImageRequestValidated = z.infer<typeof shareImageRequestSchema>

/**
 * Share result generation request (for database storage)
 */
export const shareResultRequestSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  resultType: z.string().min(1).max(50).trim(),
  resultData: z.record(z.any()).optional(),
})

export type ShareResultRequestValidated = z.infer<typeof shareResultRequestSchema>

// ============ Cron Job Schemas ============

/**
 * Cron job authentication token
 */
export const cronAuthSchema = z.object({
  token: z.string().min(1),
})

export type CronAuthValidated = z.infer<typeof cronAuthSchema>

// ============ Advanced Astrology Schemas ============

/**
 * Advanced astrology request (for specialized calculations)
 */
export const advancedAstrologyRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  calculationType: z.enum([
    'asteroids',
    'draconic',
    'eclipses',
    'electional',
    'fixed-stars',
    'harmonics',
    'lunar-return',
    'midpoints',
    'progressions',
    'rectification',
  ]),
  targetDate: dateSchema.optional(),
  options: z.record(z.any()).optional(),
  locale: localeSchema.optional(),
})

export type AdvancedAstrologyRequestValidated = z.infer<typeof advancedAstrologyRequestSchema>

// ============ Chat History & Counselor Schemas ============

/**
 * Chat message schema
 */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
  timestamp: z.number().optional(),
})

/**
 * Chat history save request
 */
export const chatHistorySaveRequestSchema = z.object({
  sessionId: z.string().max(100),
  theme: z.string().max(100).optional(),
  messages: z.array(chatMessageSchema).min(1).max(100),
  summary: z.string().max(1000).optional(),
  keyTopics: z.array(z.string().max(100)).max(20).optional(),
  locale: localeSchema.optional(),
})

export type ChatHistorySaveRequestValidated = z.infer<typeof chatHistorySaveRequestSchema>

// ============ Feedback Schemas ============

/**
 * Feedback request validation
 */
export const feedbackRequestSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  subject: z.string().min(1).max(200).trim(),
  message: z.string().min(10).max(5000).trim(),
  email: z.string().email().max(254).optional(),
  page: z.string().max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

export type FeedbackRequestValidated = z.infer<typeof feedbackRequestSchema>

/**
 * Section feedback request validation (for specific service sections)
 */
export const sectionFeedbackRequestSchema = z.object({
  service: z.string().min(1).max(64).trim(),
  theme: z.string().min(1).max(64).trim(),
  sectionId: z.string().min(1).max(80).trim(),
  helpful: z.boolean(),
  dayMaster: z.string().max(32).trim().optional(),
  sunSign: z.string().max(32).trim().optional(),
  locale: localeSchema.optional(),
  userHash: z.string().max(128).trim().optional(),
  // Extended fields for RLHF
  recordId: z.string().max(120).trim().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  feedbackText: z.string().max(600).trim().optional(),
  userQuestion: z.string().max(600).trim().optional(),
  consultationSummary: z.string().max(600).trim().optional(),
  contextUsed: z.string().max(600).trim().optional(),
})

export type SectionFeedbackRequestValidated = z.infer<typeof sectionFeedbackRequestSchema>

// ============ Pagination Schema ============

/**
 * Standard pagination query parameters
 */
export const paginationSchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Math.min(Math.max(1, Number(val)), 100))
    .optional()
    .default('20'),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Math.max(0, Number(val)))
    .optional()
    .default('0'),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type PaginationValidated = z.infer<typeof paginationSchema>

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

export const paginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationParams = z.infer<typeof paginationParamsSchema>

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
