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
 * Gender validation (case-insensitive, normalizes to lowercase)
 */
export const genderSchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(z.enum(['male', 'female', 'other']))

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
export const planKeySchema = z.enum(['starter', 'pro', 'premium'])

/**
 * Billing cycle validation
 */
export const billingCycleSchema = z.enum(['monthly', 'yearly'])

/**
 * Credit pack key validation (matches CreditPackKey type from prices.ts)
 */
export const creditPackKeySchema = z.enum(['mini', 'standard', 'plus', 'mega', 'ultimate'])

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
    object: z.record(z.string(), z.unknown()),
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
  sajuFactors: z.record(z.string(), z.unknown()).optional(),
  astroFactors: z.record(z.string(), z.unknown()).optional(),
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
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(50),
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
 * Life prediction basic request validation
 */
export const lifePredictionBasicRequestSchema = z.object({
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

export type LifePredictionBasicRequestValidated = z.infer<typeof lifePredictionBasicRequestSchema>

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
  saju: z.record(z.string(), z.unknown()).optional(),
  astro: z.record(z.string(), z.unknown()).optional(),
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
  birthInfo: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
    reportData: z.record(z.string(), z.unknown()),
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
 * Relation type for compatibility
 */
export const relationTypeSchema = z.enum(['friend', 'lover', 'other'])

/**
 * Person input for /api/compatibility endpoint with relation data
 */
export const compatibilityPersonInputSchema = z
  .object({
    name: z.string().max(120).optional(),
    date: dateSchema,
    time: timeSchema,
    latitude: z
      .number()
      .refine((val) => val >= -90 && val <= 90, { message: 'Latitude must be between -90 and 90' }),
    longitude: z.number().refine((val) => val >= -180 && val <= 180, {
      message: 'Longitude must be between -180 and 180',
    }),
    timeZone: z.string().min(1).max(80).trim(),
    city: z.string().max(200).optional(),
    relationToP1: relationTypeSchema.optional(), // Required for person 2+
    relationNoteToP1: z.string().max(500).optional(), // Required when relationToP1 = 'other'
  })
  .refine(
    (data) => {
      // relationNoteToP1 must exist when relationToP1 is 'other'
      if (data.relationToP1 === 'other') {
        return !!data.relationNoteToP1?.trim()
      }
      return true
    },
    {
      message: 'relationNoteToP1 required when relationToP1 is "other"',
      path: ['relationNoteToP1'],
    }
  )

/**
 * Compatibility request validation for /api/compatibility (supports 2-4 people)
 */
export const compatibilityRequestSchema = z
  .object({
    persons: z.array(compatibilityPersonInputSchema).min(2).max(4),
    locale: localeSchema.optional(),
  })
  .refine(
    (data) => {
      // Persons after first must have relationToP1
      for (let i = 1; i < data.persons.length; i++) {
        if (!data.persons[i].relationToP1) {
          return false
        }
      }
      return true
    },
    {
      message: 'All persons after first must have relationToP1',
      path: ['persons'],
    }
  )

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

/**
 * Chat message schema (used in multiple places)
 */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
  timestamp: z.number().optional(),
})

/**
 * Compatibility chat request (follow-up questions after initial analysis)
 */
export const compatibilityChatRequestSchema = z.object({
  persons: z
    .array(
      z.object({
        name: z.string().max(120).optional(),
        date: dateSchema.optional(),
        time: timeSchema.optional(),
        relation: z.string().max(50).optional(),
      })
    )
    .min(2)
    .max(4),
  compatibilityResult: z.string().max(10000).optional(),
  messages: z.array(chatMessageSchema).max(20),
  lang: localeSchema.optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityChatRequestValidated = z.infer<typeof compatibilityChatRequestSchema>

/**
 * ICP (Interpersonal Circumplex) score data
 */
export const icpScoreSchema = z.object({
  primaryStyle: z.string().max(50),
  secondaryStyle: z.string().max(50).nullable().optional(),
  dominanceScore: z.number().min(-100).max(100),
  affiliationScore: z.number().min(-100).max(100),
  octantScores: z.record(z.string(), z.number()).optional(),
})

/**
 * Persona type data
 */
export const personaTypeSchema = z.object({
  typeCode: z.string().max(10),
  personaName: z.string().max(100),
  energyScore: z.number().min(0).max(100),
  cognitionScore: z.number().min(0).max(100),
  decisionScore: z.number().min(0).max(100),
  rhythmScore: z.number().min(0).max(100),
})

/**
 * Personality/ICP compatibility save request
 */
export const personalityCompatibilitySaveRequestSchema = z.object({
  person1: z.object({
    userId: z.string().optional(),
    name: z.string().max(120).optional(),
    icp: icpScoreSchema,
    persona: personaTypeSchema,
    icpAnswers: z.unknown().optional(), // ICPQuizAnswers type
    personaAnswers: z.unknown().optional(), // PersonaQuizAnswers type
  }),
  person2: z.object({
    userId: z.string().optional(),
    name: z.string().max(120).optional(),
    icp: icpScoreSchema,
    persona: personaTypeSchema,
    icpAnswers: z.unknown().optional(),
    personaAnswers: z.unknown().optional(),
  }),
  compatibility: z.object({
    icpScore: z.number().min(0).max(100),
    icpLevel: z.string().max(50),
    icpLevelKo: z.string().max(50).optional(),
    icpDescription: z.string().max(2000),
    icpDescriptionKo: z.string().max(2000).optional(),
    personaScore: z.number().min(0).max(100),
    personaLevel: z.string().max(50),
    personaLevelKo: z.string().max(50).optional(),
    personaDescription: z.string().max(2000),
    personaDescriptionKo: z.string().max(2000).optional(),
    crossSystemScore: z.number().min(0).max(100),
    crossSystemLevel: z.string().max(50),
    crossSystemLevelKo: z.string().max(50).optional(),
    crossSystemDescription: z.string().max(2000),
    crossSystemDescriptionKo: z.string().max(2000).optional(),
    synergies: z.array(z.string().max(500)).optional(),
    synergiesKo: z.array(z.string().max(500)).optional(),
    tensions: z.array(z.string().max(500)).optional(),
    tensionsKo: z.array(z.string().max(500)).optional(),
    insights: z.array(z.string().max(500)).optional(),
    insightsKo: z.array(z.string().max(500)).optional(),
  }),
  locale: localeSchema.optional(),
})

export type PersonalityCompatibilitySaveRequestValidated = z.infer<
  typeof personalityCompatibilitySaveRequestSchema
>

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
  resultData: z.record(z.string(), z.unknown()).optional(),
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
  options: z.record(z.string(), z.unknown()).optional(),
  locale: localeSchema.optional(),
})

export type AdvancedAstrologyRequestValidated = z.infer<typeof advancedAstrologyRequestSchema>

// ============ Chat History & Counselor Schemas ============

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

/**
 * Dream chat save request validation
 */
export const dreamChatSaveRequestSchema = z.object({
  dreamId: z.string().max(100).optional(),
  dreamText: z.string().min(1).max(5000).trim(),
  messages: z.array(chatMessageSchema).min(1).max(100),
  summary: z.string().max(1000).trim().optional(),
  locale: localeSchema.optional(),
})

export type DreamChatSaveRequestValidated = z.infer<typeof dreamChatSaveRequestSchema>

// ============ Past Life Schemas ============

/**
 * Past life result save request validation
 */
export const pastLifeSaveRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  timezone: timezoneSchema.optional(),
  karmaScore: z.number().min(0).max(100),
  analysisData: z.object({
    soulPattern: z.unknown(),
    pastLife: z.unknown(),
    soulJourney: z.unknown(),
    karmicDebts: z.array(z.unknown()),
    thisLifeMission: z.unknown(),
    talentsCarried: z.array(z.string().max(200)),
    saturnLesson: z.unknown(),
  }),
  locale: localeSchema.optional(),
})

export type PastLifeSaveRequestValidated = z.infer<typeof pastLifeSaveRequestSchema>

// ============ Counselor Session Schemas ============

/**
 * Counselor session save request validation
 */
export const counselorSessionSaveRequestSchema = z.object({
  sessionId: z.string().min(1).max(100).trim(),
  theme: z.string().max(100).trim().optional(),
  messages: z.array(chatMessageSchema).min(1).max(200),
  locale: localeSchema.optional(),
})

export type CounselorSessionSaveRequestValidated = z.infer<typeof counselorSessionSaveRequestSchema>

// ============ User Profile Schemas ============

/**
 * User profile update request validation
 */
export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  image: z.string().url().max(500).optional().nullable(),
  emailNotifications: z.boolean().optional(),
  preferredLanguage: localeSchema.optional(),
  notificationSettings: z.record(z.string(), z.unknown()).optional(),
  tonePreference: z.string().max(50).optional(),
  readingLength: z.string().max(50).optional(),
  birthDate: dateSchema.optional().nullable(),
  birthTime: timeSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  birthCity: z.string().max(200).trim().optional().nullable(),
  tzId: timezoneSchema.optional().nullable(),
})

export type UserProfileUpdateValidated = z.infer<typeof userProfileUpdateSchema>

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
    .default(20),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Math.max(0, Number(val)))
    .optional()
    .default(0),
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

// ============ Compatibility Schema (Alternative) ============

export const compatibilityAnalysisSchema = z.object({
  person1: birthInfoSchema,
  person2: birthInfoSchema,
  analysisType: z.enum(['romantic', 'friendship', 'business', 'family']).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityAnalysis = z.infer<typeof compatibilityAnalysisSchema>

// ============ I Ching Schema (Alternative) ============

export const iChingAnalysisSchema = z.object({
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

export type IChingAnalysis = z.infer<typeof iChingAnalysisSchema>

// ============ Chat Message Schema (Alternative) ============

export const chatMessageRequestSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(5000)
    .transform((str) => str.trim()),
  conversationId: z.string().uuid().optional(),
  context: z.object({}).passthrough().optional(),
  locale: localeSchema.optional(),
})

export type ChatMessageRequestValidated = z.infer<typeof chatMessageRequestSchema>

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

// ============ Life Prediction Schemas ============

/**
 * Event type for timing predictions
 */
export const eventTypeSchema = z.enum([
  'marriage',
  'career',
  'investment',
  'move',
  'study',
  'health',
  'relationship',
])

/**
 * Base prediction input (common fields for all prediction types)
 */
export const basePredictionInputSchema = z.object({
  birthYear: z.number().int().min(1900).max(2100),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31),
  birthHour: z.number().int().min(0).max(23).optional(),
  gender: z.enum(['male', 'female', 'M', 'F']),
  dayStem: z.string().max(10),
  dayBranch: z.string().max(10),
  monthBranch: z.string().max(10),
  yearBranch: z.string().max(10),
  allStems: z.array(z.string().max(10)).length(4).optional(),
  allBranches: z.array(z.string().max(10)).length(4).optional(),
  daeunList: z
    .array(
      z.object({
        start: z.number().int(),
        end: z.number().int(),
        stem: z.string().max(10),
        branch: z.string().max(10),
      })
    )
    .optional(),
  yongsin: z.array(z.string().max(50)).optional(),
  kisin: z.array(z.string().max(50)).optional(),
  locale: localeSchema.optional(),
})

/**
 * Multi-year trend prediction request
 */
export const multiYearPredictionRequestSchema = basePredictionInputSchema
  .extend({
    type: z.literal('multi-year'),
    startYear: z.number().int().min(1900).max(2200),
    endYear: z.number().int().min(1900).max(2200),
  })
  .refine((data) => data.endYear > data.startYear, {
    message: 'endYear must be greater than startYear',
    path: ['endYear'],
  })

/**
 * Past analysis prediction request
 */
export const pastAnalysisPredictionRequestSchema = basePredictionInputSchema
  .extend({
    type: z.literal('past-analysis'),
    targetDate: dateSchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
  })
  .refine(
    (data) => {
      // Either targetDate OR (startDate AND endDate)
      const hasTarget = !!data.targetDate
      const hasRange = !!data.startDate && !!data.endDate
      return hasTarget || hasRange
    },
    {
      message: 'Either targetDate or both startDate and endDate are required',
      path: ['targetDate'],
    }
  )

/**
 * Event timing prediction request
 */
export const eventTimingPredictionRequestSchema = basePredictionInputSchema
  .extend({
    type: z.literal('event-timing'),
    eventType: eventTypeSchema,
    startYear: z.number().int().min(1900).max(2200),
    endYear: z.number().int().min(1900).max(2200),
  })
  .refine((data) => data.endYear > data.startYear, {
    message: 'endYear must be greater than startYear',
    path: ['endYear'],
  })

/**
 * Weekly timing prediction request
 */
export const weeklyTimingPredictionRequestSchema = basePredictionInputSchema.extend({
  type: z.literal('weekly-timing'),
  eventType: eventTypeSchema,
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
})

/**
 * Comprehensive prediction request
 */
export const comprehensivePredictionRequestSchema = basePredictionInputSchema.extend({
  type: z.literal('comprehensive'),
  yearsRange: z.number().int().min(1).max(30).optional().default(10),
})

/**
 * Union of all prediction request types
 */
export const lifePredictionRequestSchema = z.discriminatedUnion('type', [
  multiYearPredictionRequestSchema,
  pastAnalysisPredictionRequestSchema,
  eventTimingPredictionRequestSchema,
  weeklyTimingPredictionRequestSchema,
  comprehensivePredictionRequestSchema,
])

export type LifePredictionRequestValidated = z.infer<typeof lifePredictionRequestSchema>

/**
 * Life prediction advisor chat request
 */
export const lifePredictionAdvisorChatRequestSchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  sessionId: z.string().max(200).optional(),
  context: z.object({
    question: z.string().max(500),
    eventType: z.string().max(100),
    results: z
      .array(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
          score: z.number().min(0).max(100),
          grade: z.string().max(10),
          reasons: z.array(z.string().max(500)),
        })
      )
      .max(20),
    birthDate: z.string().max(50),
    gender: z.enum(['M', 'F']),
    sipsin: z.string().max(100).optional(),
    daeun: z.string().max(100).optional(),
    yongsin: z.array(z.string().max(50)).optional(),
  }),
  history: z.array(chatMessageSchema).max(50),
  locale: z.enum(['ko', 'en']),
})

export type LifePredictionAdvisorChatRequestValidated = z.infer<
  typeof lifePredictionAdvisorChatRequestSchema
>

// ============ Personality & ICP Schemas ============

/**
 * Personality type save request
 */
export const personalitySaveRequestSchema = z.object({
  typeCode: z
    .string()
    .regex(/^[RG][VS][LH][AF]$/, 'Invalid typeCode format: expected [R|G][V|S][L|H][A|F]'),
  personaName: z.string().min(1).max(100).trim(),
  avatarGender: z.enum(['M', 'F']),
  energyScore: z.number().min(0).max(100),
  cognitionScore: z.number().min(0).max(100),
  decisionScore: z.number().min(0).max(100),
  rhythmScore: z.number().min(0).max(100),
  consistencyScore: z.number().min(0).max(100).nullable().optional(),
  analysisData: z.object({}).passthrough(),
  answers: z.unknown().optional(),
})

export type PersonalitySaveRequestValidated = z.infer<typeof personalitySaveRequestSchema>

/**
 * ICP octant type
 */
export const icpOctantSchema = z.enum(['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'])

/**
 * ICP save request
 */
export const icpSaveRequestSchema = z.object({
  primaryStyle: icpOctantSchema,
  secondaryStyle: icpOctantSchema.nullable().optional(),
  dominanceScore: z.number().min(-100).max(100),
  affiliationScore: z.number().min(-100).max(100),
  octantScores: z.record(z.string(), z.number()),
  analysisData: z.object({
    description: z.string().max(5000),
    descriptionKo: z.string().max(5000).optional(),
    strengths: z.array(z.string().max(500)),
    strengthsKo: z.array(z.string().max(500)).optional(),
    challenges: z.array(z.string().max(500)),
    challengesKo: z.array(z.string().max(500)).optional(),
    tips: z.array(z.string().max(500)).optional(),
    tipsKo: z.array(z.string().max(500)).optional(),
    compatibleStyles: z.array(z.string()).optional(),
  }),
  answers: z.unknown().optional(),
  locale: localeSchema.optional(),
})

export type ICPSaveRequestValidated = z.infer<typeof icpSaveRequestSchema>

// ============ Credits & Subscription Schemas ============

/**
 * Credit type enum
 */
export const creditTypeSchema = z.enum(['reading', 'compatibility', 'followUp'])

/**
 * Feature type enum
 */
export const featureTypeSchema = z.enum([
  'advancedAstrology',
  'counselor',
  'dreamAnalysis',
  'compatibility',
  'calendar',
  'pastLife',
  'lifeReading',
])

/**
 * Credit check request
 */
export const creditCheckRequestSchema = z.object({
  type: creditTypeSchema.optional(),
  amount: z.number().int().min(1).max(1000).optional(),
  feature: featureTypeSchema.optional(),
})

export type CreditCheckRequestValidated = z.infer<typeof creditCheckRequestSchema>

/**
 * Admin refund subscription request
 */
export const adminRefundSubscriptionRequestSchema = z
  .object({
    subscriptionId: z.string().min(1).max(200).trim().optional(),
    email: z.string().email().max(200).trim().optional(),
  })
  .refine((data) => data.subscriptionId || data.email, {
    message: 'Either subscriptionId or email must be provided',
  })

export type AdminRefundSubscriptionRequestValidated = z.infer<
  typeof adminRefundSubscriptionRequestSchema
>

// ============ Webhook Schemas ============

/**
 * Stripe webhook event type enum
 */
export const stripeWebhookEventTypeSchema = z.enum([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

/**
 * Stripe webhook metadata schema
 */
export const stripeWebhookMetadataSchema = z
  .object({
    type: z.enum(['credit_pack', 'subscription']).optional(),
    creditPack: z.enum(['mini', 'standard', 'plus', 'mega', 'ultimate']).optional(),
    userId: z.string().max(200).optional(),
  })
  .passthrough()

// ============ User Profile & Birth Info Schemas ============

/**
 * User birth info update request
 */
export const userBirthInfoUpdateSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  birthCity: z.string().max(200).trim().optional().nullable(),
  tzId: timezoneSchema.optional().nullable(),
})

export type UserBirthInfoUpdateValidated = z.infer<typeof userBirthInfoUpdateSchema>

/**
 * Persona memory update request
 */
export const personaMemoryUpdateSchema = z.object({
  sessionId: z.string().min(1).max(200).trim(),
  theme: z.string().min(1).max(100).trim(),
  locale: localeSchema,
  messages: z.array(chatMessageSchema).min(1).max(200),
  saju: z.record(z.string(), z.unknown()).optional(),
  astro: z.record(z.string(), z.unknown()).optional(),
})

export type PersonaMemoryUpdateValidated = z.infer<typeof personaMemoryUpdateSchema>

// ============ Auth Schemas ============

/**
 * User registration request
 */
export const userRegistrationRequestSchema = z.object({
  email: z.string().email().max(254).trim(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim().optional(),
  referralCode: z.string().max(50).trim().optional(),
})

export type UserRegistrationRequestValidated = z.infer<typeof userRegistrationRequestSchema>

// ============ Tarot Schemas ============

/**
 * Tarot card schema (detailed)
 */
export const tarotCardDetailedSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  nameKo: z.string().max(120).trim().optional(),
  isReversed: z.boolean(),
  position: z.string().min(1).max(80).trim(),
  positionKo: z.string().max(80).trim().optional(),
  meaning: z.string().max(120).optional(),
  meaningKo: z.string().max(120).optional(),
  keywords: z.array(z.string().max(50)).max(8).optional(),
  keywordsKo: z.array(z.string().max(50)).max(8).optional(),
})

/**
 * Tarot interpretation request (enhanced)
 */
export const tarotInterpretEnhancedRequestSchema = z.object({
  categoryId: z.string().min(1).max(120).trim(),
  spreadId: z.string().min(1).max(120).trim(),
  spreadTitle: z.string().min(1).max(120).trim(),
  cards: z.array(tarotCardDetailedSchema).min(1).max(15),
  userQuestion: z.string().max(600).trim().optional(),
  language: z.enum(['ko', 'en']).optional(),
  birthdate: dateSchema.optional(),
  moonPhase: z.string().min(2).max(40).trim().optional(),
})

export type TarotInterpretEnhancedRequestValidated = z.infer<
  typeof tarotInterpretEnhancedRequestSchema
>

/**
 * Couple tarot reading POST request
 */
export const coupleTarotReadingPostSchema = z.object({
  connectionId: z.string().min(1).max(200).trim(),
  spreadId: z.string().min(1).max(120).trim(),
  spreadTitle: z.string().max(120).trim().optional(),
  cards: z.unknown(), // JSON array
  question: z.string().max(600).trim().optional(),
  theme: z.string().max(100).trim().optional(),
  overallMessage: z.string().max(10000).optional(),
  cardInsights: z.unknown().optional(),
  guidance: z.string().max(5000).optional(),
  affirmation: z.string().max(500).optional(),
})

export type CoupleTarotReadingPostValidated = z.infer<typeof coupleTarotReadingPostSchema>

/**
 * Couple tarot reading DELETE request
 */
export const coupleTarotReadingDeleteSchema = z.object({
  readingId: z.string().min(1).max(200).trim(),
})

export type CoupleTarotReadingDeleteValidated = z.infer<typeof coupleTarotReadingDeleteSchema>

/**
 * Couple tarot reading GET query params
 */
export const coupleTarotReadingQuerySchema = z.object({
  connectionId: z.string().min(1).max(200).trim().optional(),
})

export type CoupleTarotReadingQueryValidated = z.infer<typeof coupleTarotReadingQuerySchema>

// ============ Destiny Matrix Schemas ============

/**
 * Five element enum schema
 */
export const fiveElementSchema = z.enum(['목', '화', '토', '금', '수'])

/**
 * Destiny matrix calculation request (POST)
 */
export const destinyMatrixCalculationSchema = z
  .object({
    // Birth data (new simpler input)
    birthDate: dateSchema.optional(),
    birthTime: timeSchema.optional(),
    gender: z.enum(['male', 'female']).optional(),
    timezone: timezoneSchema.optional(),

    // Saju data (legacy direct input)
    dayMasterElement: fiveElementSchema.optional(),
    pillarElements: z.array(fiveElementSchema).optional(),
    sibsinDistribution: z.record(z.string(), z.number()).optional(),
    twelveStages: z.record(z.string(), z.unknown()).optional(),
    relations: z.array(z.string()).optional(),
    geokguk: z.string().max(100).optional(),
    yongsin: z.array(z.string()).optional(),
    currentDaeunElement: fiveElementSchema.optional(),
    currentSaeunElement: fiveElementSchema.optional(),

    // Shinsal data (Layer 8)
    shinsalList: z.array(z.string().max(50)).optional(),

    // Astrology data
    dominantWesternElement: z.string().max(50).optional(),
    planetHouses: z.record(z.string(), z.unknown()).optional(),
    planetSigns: z.record(z.string(), z.unknown()).optional(),
    aspects: z.array(z.unknown()).optional(),
    activeTransits: z.array(z.unknown()).optional(),

    // Asteroid data (Layer 9)
    asteroidHouses: z.record(z.string(), z.unknown()).optional(),

    // Extra Point data (Layer 10)
    extraPointSigns: z.record(z.string(), z.unknown()).optional(),

    // Options
    lang: z.enum(['ko', 'en']).optional(),
  })
  .refine((data) => data.birthDate || data.dayMasterElement, {
    message: 'Either birthDate or dayMasterElement is required',
  })

export type DestinyMatrixCalculationValidated = z.infer<typeof destinyMatrixCalculationSchema>

/**
 * Destiny matrix GET query params
 */
export const destinyMatrixQuerySchema = z.object({
  format: z.enum(['summary', 'full']).optional(),
})

export type DestinyMatrixQueryValidated = z.infer<typeof destinyMatrixQuerySchema>

// ============ Life Prediction Extended Schemas ============

/**
 * Event type enum for life predictions (extended)
 */
export const eventTypeExtendedSchema = z.enum([
  'marriage',
  'career',
  'investment',
  'move',
  'study',
  'health',
  'relationship',
  'general',
])

export type EventTypeExtendedValidated = z.infer<typeof eventTypeExtendedSchema>

/**
 * Timing result schema
 */
export const timingResultSchema = z.object({
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20),
  score: z.number().min(0).max(100),
  grade: z.string().min(1).max(10),
  reasons: z.array(z.string().max(500)),
})

/**
 * Life prediction save-timing request (detailed)
 */
export const lifePredictionSaveTimingDetailedSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  eventType: z.string().min(1).max(50).trim(),
  results: z.array(timingResultSchema).min(1).max(20),
  birthDate: dateSchema,
  gender: z.enum(['M', 'F']),
  locale: localeSchema.optional(),
})

export type LifePredictionSaveTimingDetailedValidated = z.infer<
  typeof lifePredictionSaveTimingDetailedSchema
>

/**
 * Optimal period schema (for explain-results)
 */
export const optimalPeriodSchema = z.object({
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20),
  score: z.number().min(0).max(100),
  grade: z.string().min(1).max(10),
  reasons: z.array(z.string().max(500)),
})

/**
 * Life prediction explain-results request
 */
export const lifePredictionExplainResultsSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  eventType: z.string().min(1).max(50).trim(),
  eventLabel: z.string().min(1).max(100).trim(),
  optimalPeriods: z.array(optimalPeriodSchema).min(1).max(20),
  locale: localeSchema.optional(),
  sipsin: z.string().max(200).optional(),
  useRag: z.boolean().optional(),
})

export type LifePredictionExplainResultsValidated = z.infer<
  typeof lifePredictionExplainResultsSchema
>

/**
 * Life prediction analyze-question request
 */
export const lifePredictionAnalyzeQuestionSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  locale: localeSchema.optional(),
})

export type LifePredictionAnalyzeQuestionValidated = z.infer<
  typeof lifePredictionAnalyzeQuestionSchema
>

/**
 * Life prediction backend-predict request
 */
export const lifePredictionBackendPredictSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  birthYear: z.number().int().min(1900).max(2100),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31).optional(),
  birthHour: z.number().int().min(0).max(23).optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  locale: localeSchema.optional(),
  type: z.enum(['timing', 'forecast', 'luck']).optional(),
})

export type LifePredictionBackendPredictValidated = z.infer<
  typeof lifePredictionBackendPredictSchema
>

// ============ Push Notification Schemas ============

/**
 * Push notification send request
 */
export const pushSendRequestSchema = z.object({
  targetUserId: z.string().max(200).optional(),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  icon: z.string().max(500).optional(),
  url: z.string().max(500).optional(),
  tag: z.string().max(100).optional(),
  test: z.boolean().optional(),
})

export type PushSendRequestValidated = z.infer<typeof pushSendRequestSchema>

// ============ Destiny Match Schemas ============

/**
 * Destiny match swipe request
 */
export const destinyMatchSwipeSchema = z.object({
  targetProfileId: z.string().min(1).max(200).trim(),
  action: z.enum(['like', 'pass', 'super_like']),
  compatibilityScore: z.number().min(0).max(100).optional().nullable(),
})

export type DestinyMatchSwipeValidated = z.infer<typeof destinyMatchSwipeSchema>

/**
 * Destiny match swipe undo request
 */
export const destinyMatchSwipeUndoSchema = z.object({
  swipeId: z.string().min(1).max(200).trim(),
})

export type DestinyMatchSwipeUndoValidated = z.infer<typeof destinyMatchSwipeUndoSchema>

/**
 * Destiny match block request
 */
export const destinyMatchBlockSchema = z.object({
  blockedUserId: z.string().min(1).max(200).trim(),
  reason: z.string().max(500).trim().optional(),
})

export type DestinyMatchBlockValidated = z.infer<typeof destinyMatchBlockSchema>

/**
 * Destiny match profile create/update request
 */
export const destinyMatchProfileSchema = z.object({
  displayName: z.string().min(2).max(64).trim(),
  bio: z.string().max(500).trim().optional().nullable(),
  occupation: z.string().max(100).trim().optional().nullable(),
  photos: z.array(z.string().max(500)).max(10).optional(),
  city: z.string().max(200).trim().optional().nullable(),
  latitude: latitudeSchema.optional().nullable(),
  longitude: longitudeSchema.optional().nullable(),
  interests: z.array(z.string().max(100)).max(30).optional(),
  ageMin: z.number().int().min(18).max(100).optional(),
  ageMax: z.number().int().min(18).max(100).optional(),
  maxDistance: z.number().int().min(1).max(500).optional(),
  genderPreference: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
})

export type DestinyMatchProfileValidated = z.infer<typeof destinyMatchProfileSchema>

/**
 * Life prediction save-timing request
 */
export const lifePredictionSaveTimingSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  eventType: z.string().min(1).max(50).trim(),
  results: z
    .array(
      z.object({
        startDate: z.string().min(1).max(30),
        endDate: z.string().min(1).max(30),
        score: z.number().min(0).max(100),
        grade: z.string().min(1).max(10),
        reasons: z.array(z.string().max(500)).max(20),
      })
    )
    .min(1)
    .max(50),
  birthDate: dateSchema,
  gender: genderSchema,
  locale: localeSchema.optional(),
})

export type LifePredictionSaveTimingValidated = z.infer<typeof lifePredictionSaveTimingSchema>

/**
 * Push subscribe request
 */
export const pushSubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
})

export type PushSubscribeValidated = z.infer<typeof pushSubscribeSchema>

/**
 * Push unsubscribe request
 */
export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2000),
})

export type PushUnsubscribeValidated = z.infer<typeof pushUnsubscribeSchema>

/**
 * Destiny match chat message request
 */
export const destinyMatchChatSchema = z.object({
  connectionId: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(2000).trim(),
  messageType: z.enum(['text', 'image', 'emoji']).optional().default('text'),
})

export type DestinyMatchChatValidated = z.infer<typeof destinyMatchChatSchema>

/**
 * Destiny match report request
 */
export const destinyMatchReportSchema = z.object({
  reportedUserId: z.string().min(1).max(200).trim(),
  category: z.enum(['inappropriate', 'spam', 'fake', 'harassment', 'other']),
  description: z.string().max(1000).trim().optional(),
})

export type DestinyMatchReportValidated = z.infer<typeof destinyMatchReportSchema>

/**
 * Destiny match matches query
 */
export const destinyMatchMatchesQuerySchema = z.object({
  status: z.enum(['active', 'blocked', 'all']).optional().default('active'),
  connectionId: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
})

export type DestinyMatchMatchesQueryValidated = z.infer<typeof destinyMatchMatchesQuerySchema>

// ============ Fortune & Daily Fortune Schemas ============

/**
 * Fortune save request
 */
export const fortuneSaveSchema = z.object({
  date: z.string().min(1).max(30),
  kind: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().default('daily'),
  title: z.string().max(200).trim().optional().nullable(),
  content: z.string().min(1).max(10000),
})

export type FortuneSaveValidated = z.infer<typeof fortuneSaveSchema>

/**
 * Daily fortune request
 */
export const dailyFortuneSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  sendEmail: z.boolean().optional().default(false),
  userTimezone: timezoneSchema.optional(),
})

export type DailyFortuneValidated = z.infer<typeof dailyFortuneSchema>

// ============ Numerology Schemas ============

/**
 * Numerology analyze request
 */
export const numerologyRequestSchema = z.object({
  action: z.enum(['analyze', 'compatibility']).optional().default('analyze'),
  birthDate: dateSchema,
  englishName: z.string().max(200).trim().optional(),
  koreanName: z.string().max(100).trim().optional(),
  locale: localeSchema.optional(),
  person1: z
    .object({
      birthDate: dateSchema,
      name: z.string().max(200).trim().optional(),
    })
    .optional(),
  person2: z
    .object({
      birthDate: dateSchema,
      name: z.string().max(200).trim().optional(),
    })
    .optional(),
})

export type NumerologyRequestValidated = z.infer<typeof numerologyRequestSchema>

// ============ Consultation Schemas ============

/**
 * Consultation save request
 */
export const consultationSaveSchema = z.object({
  theme: z.string().max(100).trim().optional(),
  summary: z.string().max(3000).trim().optional(),
  fullReport: z.string().max(30000).optional(),
  jungQuotes: z.unknown().optional(),
  signals: z.unknown().optional(),
  userQuestion: z.string().max(1000).trim().optional(),
  locale: localeSchema.optional(),
})

export type ConsultationSaveValidated = z.infer<typeof consultationSaveSchema>

// ============ Content Access Schemas ============

/**
 * Content access request
 */
export const contentAccessSchema = z.object({
  service: z.string().min(1).max(100).trim(),
  contentType: z.string().min(1).max(100).trim(),
  contentId: z.string().max(200).trim().optional().nullable(),
  locale: localeSchema.optional(),
  metadata: z.unknown().optional(),
  creditUsed: z.number().int().min(0).max(100).optional(),
})

export type ContentAccessValidated = z.infer<typeof contentAccessSchema>

// ============ Saju Request Schema ============

/**
 * Saju calculation request (extended)
 */
export const sajuCalculationRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: z.enum(['solar', 'lunar']),
  timezone: timezoneSchema,
  userTimezone: timezoneSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
})

export type SajuCalculationRequestValidated = z.infer<typeof sajuCalculationRequestSchema>

// ============ Precompute Chart Schema ============

/**
 * Precompute chart request
 */
export const precomputeChartRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  gender: z.string().max(20).optional(),
  timezone: timezoneSchema.optional(),
})

export type PrecomputeChartRequestValidated = z.infer<typeof precomputeChartRequestSchema>

// ============ Chat Schemas ============

/**
 * Tarot chat request
 */
export const tarotChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  context: z.object({
    spread_title: z.string().max(200).trim(),
    category: z.string().max(100).trim(),
    cards: z
      .array(
        z.object({
          position: z.string().max(200).trim(),
          name: z.string().max(200).trim(),
          isReversed: z.boolean().optional(),
          is_reversed: z.boolean().optional(),
          meaning: z.string().max(2000).trim(),
          keywords: z.array(z.string().max(100)).max(20).optional(),
        })
      )
      .max(15),
    overall_message: z.string().max(10000),
    guidance: z.string().max(5000),
  }),
  language: z.enum(['ko', 'en']).optional(),
})

export type TarotChatRequestValidated = z.infer<typeof tarotChatRequestSchema>

/**
 * Dream chat request - uses dreamContext (not context)
 */
export const dreamChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  dreamContext: z.object({
    dreamText: z.string().min(5).max(10000),
    summary: z.string().max(5000).optional(),
    symbols: z.array(z.string().max(200)).max(30).optional(),
    emotions: z.array(z.string().max(200)).max(30).optional(),
    themes: z.array(z.string().max(200)).max(30).optional(),
    recommendations: z.array(z.string().max(500)).max(20).optional(),
    cultural_notes: z.record(z.string(), z.string().max(500)).optional(),
    celestial: z.record(z.string(), z.unknown()).optional(),
    saju: z.record(z.string(), z.unknown()).optional(),
    previous_consultations: z.array(z.record(z.string(), z.unknown())).max(5).optional(),
    persona_memory: z.record(z.string(), z.unknown()).optional(),
  }),
  locale: z.enum(['ko', 'en']).optional(),
})

export type DreamChatRequestValidated = z.infer<typeof dreamChatRequestSchema>

/**
 * Compatibility counselor chat request
 */
export const compatibilityCounselorRequestSchema = z.object({
  persons: z.array(z.record(z.string(), z.unknown())).min(2).max(4),
  person1Saju: z.record(z.string(), z.unknown()).nullable().optional(),
  person2Saju: z.record(z.string(), z.unknown()).nullable().optional(),
  person1Astro: z.record(z.string(), z.unknown()).nullable().optional(),
  person2Astro: z.record(z.string(), z.unknown()).nullable().optional(),
  lang: z.enum(['ko', 'en']).optional(),
  messages: z.array(chatMessageSchema).max(50).optional(),
  theme: z.enum(['general', 'love', 'business', 'family']).optional(),
})

export type CompatibilityCounselorRequestValidated = z.infer<
  typeof compatibilityCounselorRequestSchema
>

// ============ Tarot Additional Schemas ============

/**
 * Tarot draw request (main tarot route POST)
 */
export const tarotDrawSchema = z.object({
  categoryId: z.string().min(1).max(200).trim(),
  spreadId: z.string().min(1).max(200).trim(),
})

export type TarotDrawValidated = z.infer<typeof tarotDrawSchema>

/**
 * Tarot interpret-stream request
 */
export const tarotInterpretStreamSchema = z.object({
  categoryId: z.string().min(1).max(200).trim(),
  spreadId: z.string().max(200).trim().optional(),
  spreadTitle: z.string().max(200).trim().optional(),
  cards: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        nameKo: z.string().max(200).optional(),
        isReversed: z.boolean(),
        position: z.string().min(1).max(200),
        positionKo: z.string().max(200).optional(),
        keywords: z.array(z.string().max(100)).max(20).optional(),
        keywordsKo: z.array(z.string().max(100)).max(20).optional(),
      })
    )
    .min(1)
    .max(15),
  userQuestion: z.string().max(600).trim().optional(),
  language: z.enum(['ko', 'en']).optional(),
  birthdate: z.string().max(12).optional(),
  zodiacSign: z.string().max(50).optional(),
  previousReadings: z.array(z.string().max(200)).max(3).optional(),
  questionMood: z.enum(['worried', 'curious', 'hopeful', 'urgent', 'neutral']).optional(),
})

export type TarotInterpretStreamValidated = z.infer<typeof tarotInterpretStreamSchema>

/**
 * Tarot chat-stream request (extends tarotChatRequestSchema with counselor)
 */
export const tarotChatStreamRequestSchema = tarotChatRequestSchema.extend({
  counselor_id: z.string().max(200).trim().optional(),
  counselor_style: z.string().max(200).trim().optional(),
})

export type TarotChatStreamRequestValidated = z.infer<typeof tarotChatStreamRequestSchema>

// ============ Dream Stream Schema ============

/**
 * Dream stream interpretation request
 */
export const dreamStreamSchema = z.object({
  dreamText: z.string().min(5).max(5000).trim(),
  symbols: z.array(z.string().max(120)).max(50).optional(),
  emotions: z.array(z.string().max(120)).max(50).optional(),
  themes: z.array(z.string().max(120)).max(50).optional(),
  context: z.array(z.string().max(120)).max(50).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  koreanTypes: z.array(z.string().max(120)).max(50).optional(),
  koreanLucky: z.array(z.string().max(120)).max(50).optional(),
  chinese: z.array(z.string().max(120)).max(50).optional(),
  islamicTypes: z.array(z.string().max(120)).max(50).optional(),
  western: z.array(z.string().max(120)).max(50).optional(),
  hindu: z.array(z.string().max(120)).max(50).optional(),
  japanese: z.array(z.string().max(120)).max(50).optional(),
  birth: z
    .object({
      date: dateSchema.optional(),
      time: timeSchema.optional(),
      timezone: timezoneSchema.optional(),
      latitude: latitudeSchema.optional(),
      longitude: longitudeSchema.optional(),
      gender: z.string().max(20).optional(),
    })
    .optional(),
  sajuInfluence: z.record(z.string(), z.any()).optional(),
})

export type DreamStreamValidated = z.infer<typeof dreamStreamSchema>

// ============ Saju Chat Stream Schema ============

/**
 * Saju chat-stream request
 */
export const sajuChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: z.record(z.string(), z.any()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: z.record(z.string(), z.any()).optional(),
})

export type SajuChatStreamValidated = z.infer<typeof sajuChatStreamSchema>

// ============ Astrology Schemas ============

/**
 * Astrology chat-stream request
 */
export const astrologyChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  birthData: z.record(z.string(), z.any()).optional(),
  chartData: z.record(z.string(), z.any()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
})

export type AstrologyChatStreamValidated = z.infer<typeof astrologyChatStreamSchema>

/**
 * Astrology details request
 */
export const astrologyDetailsSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type AstrologyDetailsValidated = z.infer<typeof astrologyDetailsSchema>

// ============ Destiny Map Schemas ============

/**
 * Destiny map main request
 */
export const destinyMapRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: z.enum(['solar', 'lunar']).optional().default('solar'),
  timezone: timezoneSchema,
  locale: localeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
})

export type DestinyMapRequestValidated = z.infer<typeof destinyMapRequestSchema>

/**
 * Destiny map chat request
 */
export const destinyMapChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: z.record(z.string(), z.any()).optional(),
  astro: z.record(z.string(), z.any()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: z.record(z.string(), z.any()).optional(),
})

export type DestinyMapChatValidated = z.infer<typeof destinyMapChatSchema>

// ============ Utility Route Schemas ============

/**
 * Latlon to timezone request
 */
export const latlonToTimezoneSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
})

export type LatlonToTimezoneValidated = z.infer<typeof latlonToTimezoneSchema>

/**
 * Past life request
 */
export const pastLifeRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type PastLifeRequestValidated = z.infer<typeof pastLifeRequestSchema>

/**
 * Cache chart request
 */
export const cacheChartSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
})

export type CacheChartValidated = z.infer<typeof cacheChartSchema>

/**
 * Cache chart save request (POST) - extends cacheChartSchema with data
 */
export const cacheChartSaveSchema = cacheChartSchema.extend({
  birthTime: timeSchema, // required for POST
  data: z.record(z.string(), z.unknown()),
})

export type CacheChartSaveValidated = z.infer<typeof cacheChartSaveSchema>

/**
 * Cache chart delete request
 */
export const cacheChartDeleteSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
})

export type CacheChartDeleteValidated = z.infer<typeof cacheChartDeleteSchema>

/**
 * Readings save request
 */
export const readingsSaveSchema = z.object({
  type: z.string().min(1).max(50).trim(),
  title: z.string().max(200).trim().optional(),
  content: z.string().min(1).max(50000),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type ReadingsSaveValidated = z.infer<typeof readingsSaveSchema>

/**
 * Personality compatibility request
 */
export const personalityCompatibilitySchema = z.object({
  person1: z.object({
    typeCode: z.string().min(1).max(10),
    personaName: z.string().max(100).optional(),
    energyScore: z.number().min(0).max(100),
    cognitionScore: z.number().min(0).max(100),
    decisionScore: z.number().min(0).max(100),
    rhythmScore: z.number().min(0).max(100),
  }),
  person2: z.object({
    typeCode: z.string().min(1).max(10),
    personaName: z.string().max(100).optional(),
    energyScore: z.number().min(0).max(100),
    cognitionScore: z.number().min(0).max(100),
    decisionScore: z.number().min(0).max(100),
    rhythmScore: z.number().min(0).max(100),
  }),
  locale: localeSchema.optional(),
})

export type PersonalityCompatibilityValidated = z.infer<typeof personalityCompatibilitySchema>

/**
 * Destiny matrix AI report request
 */
export const destinyMatrixAiReportSchema = z.object({
  birthDate: dateSchema,
  matrixData: z.record(z.string(), z.any()),
  locale: localeSchema.optional(),
  reportType: z.string().max(50).optional(),
})

export type DestinyMatrixAiReportValidated = z.infer<typeof destinyMatrixAiReportSchema>

/**
 * Destiny matrix report request
 */
export const destinyMatrixReportSchema = z.object({
  birthDate: dateSchema,
  locale: localeSchema.optional(),
})

export type DestinyMatrixReportValidated = z.infer<typeof destinyMatrixReportSchema>

/**
 * ICP request
 */
export const icpRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  gender: genderSchema.optional(),
  locale: localeSchema.optional(),
  analysisType: z.string().max(50).optional(),
})

export type IcpRequestValidated = z.infer<typeof icpRequestSchema>

/**
 * ICP result save request
 */
const icpOctantStyle = z.enum(['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'])

export const icpSaveSchema = z.object({
  primaryStyle: icpOctantStyle,
  secondaryStyle: icpOctantStyle.optional(),
  dominanceScore: z.number().min(-100).max(100),
  affiliationScore: z.number().min(-100).max(100),
  octantScores: z.record(z.string(), z.number()).optional(),
  analysisData: z.record(z.string(), z.unknown()).optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
  locale: localeSchema.optional(),
})

export type IcpSaveValidated = z.infer<typeof icpSaveSchema>

// ============================================================
// Phase 7: Additional route schemas
// ============================================================

/**
 * Destiny Match - unmatch (DELETE body)
 */
export const destinyMatchUnmatchSchema = z.object({
  connectionId: z.string().min(1).max(100),
})

export type DestinyMatchUnmatchValidated = z.infer<typeof destinyMatchUnmatchSchema>

/**
 * Cron notifications - manual trigger (POST body)
 */
export const cronNotificationsTriggerSchema = z.object({
  hour: z.number().int().min(0).max(23).optional(),
})

export type CronNotificationsTriggerValidated = z.infer<typeof cronNotificationsTriggerSchema>

/**
 * Query param schemas for GET/DELETE endpoints
 */

/** Pagination query params (limit, offset) */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/** Dream history GET query params */
export const dreamHistoryQuerySchema = paginationQuerySchema.extend({
  // inherits limit, offset
})

/** Dream history DELETE query params */
export const dreamHistoryDeleteQuerySchema = z.object({
  id: z.string().min(1).max(100),
})

/** Counselor session list GET query params */
export const counselorSessionListQuerySchema = z.object({
  theme: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

/** Counselor session DELETE query params */
export const counselorSessionDeleteQuerySchema = z.object({
  sessionId: z.string().min(1).max(100),
})

/** Destiny match discover GET query params */
export const destinyMatchDiscoverQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  gender: z.enum(['M', 'F', 'all']).optional(),
  ageMin: z.coerce.number().int().min(18).max(100).optional(),
  ageMax: z.coerce.number().int().min(18).max(100).optional(),
  city: z.string().max(100).optional(),
})

/** Destiny match matches GET query params (extended with connectionId) */
export const destinyMatchMatchesExtendedQuerySchema = z.object({
  status: z.string().max(50).optional().default('active'),
  connectionId: z.string().max(100).optional(),
})

/** Reports/[id] - URL param validation */
export const idParamSchema = z.object({
  id: z.string().min(1).max(100),
})

/** Calendar page GET query params (for calendar main page with birth info) */
export const calendarPageQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

/** Cities search GET query params */
export const citiesSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

/** Me history GET query params */
export const meHistoryQuerySchema = paginationQuerySchema.extend({
  type: z.string().max(50).optional(),
  theme: z.string().max(50).optional(),
})

/** Referral validate GET query params */
export const referralValidateQuerySchema = z.object({
  code: z.string().min(1).max(50),
})

/** Weekly fortune GET query params */
export const weeklyFortuneQuerySchema = z.object({
  locale: localeSchema.optional(),
  birthDate: dateSchema.optional(),
})

/** Counselor session load GET query params */
export const counselorSessionLoadQuerySchema = z.object({
  theme: z.string().max(50).optional().default('chat'),
  sessionId: z.string().max(100).optional(),
})

// ============================================================
// Phase 8: GET query param schemas for remaining routes
// ============================================================

/** Calendar main GET query params */
export const calendarMainQuerySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional().default('12:00'),
  birthPlace: z.string().max(100).trim().optional().default('Seoul'),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  gender: genderSchema.optional().default('male'),
  locale: localeSchema.optional().default('ko'),
  category: z.enum(['wealth', 'career', 'love', 'health', 'travel', 'study', 'general']).optional(),
})

/** Numerology GET query params */
export const numerologyGetQuerySchema = z.object({
  birthDate: dateSchema,
  name: z.string().max(100).optional(),
  englishName: z.string().max(100).optional(),
  koreanName: z.string().max(100).optional(),
  locale: localeSchema.optional().default('ko'),
})

/** Readings GET query params */
export const readingsGetQuerySchema = z.object({
  type: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

/** Cache chart GET query params */
export const cacheChartGetQuerySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

/** Fortune GET query params */
export const fortuneGetQuerySchema = z.object({
  date: dateSchema,
  kind: z.string().max(50).optional().default('daily'),
})

/** Content access GET query params */
export const contentAccessGetQuerySchema = paginationQuerySchema.extend({
  service: z.string().max(50).optional(),
})

/** Consultation GET query params */
export const consultationGetQuerySchema = z.object({
  theme: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/** Destiny match chat GET query params */
export const destinyMatchChatGetQuerySchema = z.object({
  connectionId: z.string().min(1).max(100),
  cursor: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

/** Feedback GET query params */
export const feedbackGetQuerySchema = z.object({
  service: z.string().max(50).optional(),
  theme: z.string().max(50).optional(),
})

/** Dream chat save GET query params */
export const dreamChatSaveGetQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

/** Destiny matrix save GET query params */
export const destinyMatrixSaveGetQuerySchema = z.object({
  id: z.string().max(100).optional(),
})

/** Personality compatibility save GET query params */
export const personalityCompatibilitySaveGetQuerySchema = z.object({
  id: z.string().max(100).optional(),
})

/** Personality ICP save GET query params */
export const personalityIcpSaveGetQuerySchema = z.object({
  id: z.string().max(100).optional(),
})

/** Persona memory PATCH action schema */
export const personaMemoryPatchSchema = z.object({
  action: z.enum([
    'add_insight',
    'add_growth_area',
    'add_recurring_issue',
    'update_emotional_tone',
    'increment_session',
    'update_birth_chart',
    'update_saju_profile',
  ]),
  data: z.record(z.string(), z.any()).optional(),
})

// ============ Phase 9: Consolidated Local Schemas ============

/** Persona memory POST schema (from persona-memory/route.ts) */
export const personaMemoryPostSchema = z.object({
  dominantThemes: z.array(z.string().max(200)).max(50).optional(),
  keyInsights: z.array(z.string().max(1000)).max(50).optional(),
  emotionalTone: z.string().max(200).optional(),
  growthAreas: z.array(z.string().max(200)).max(50).optional(),
  lastTopics: z.array(z.string().max(200)).max(50).optional(),
  recurringIssues: z.array(z.string().max(500)).max(50).optional(),
  birthChart: z.record(z.string(), z.any()).optional(),
  sajuProfile: z.record(z.string(), z.any()).optional(),
})

/** Notification send schema (from notifications/send/route.ts) */
export const notificationSendSchema = z.object({
  targetUserId: z.string().min(1).max(200),
  type: z.enum(['like', 'comment', 'reply', 'mention', 'system']),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  link: z.string().max(500).optional(),
  avatar: z.string().max(500).optional(),
})

/** Tarot analyze question schema (from tarot/analyze-question/route.ts) */
export const tarotAnalyzeQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long (max 500)'),
  language: z.enum(['ko', 'en']).default('ko'),
})

/** CSP violation report schema (from csp-report/route.ts) */
export const cspReportSchema = z.object({
  'csp-report': z
    .object({
      'document-uri': z.string().optional(),
      referrer: z.string().optional(),
      'violated-directive': z.string().optional(),
      'effective-directive': z.string().optional(),
      'original-policy': z.string().optional(),
      disposition: z.string().optional(),
      'blocked-uri': z.string().optional(),
      'line-number': z.number().optional(),
      'column-number': z.number().optional(),
      'source-file': z.string().optional(),
      'status-code': z.number().optional(),
      'script-sample': z.string().optional(),
    })
    .optional(),
})

/** Feedback records GET query schema (from feedback/records/route.ts) */
export const feedbackRecordsQuerySchema = z.object({
  service: z.string().optional(),
  theme: z.string().optional(),
  helpful: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/** Visitors today metrics token schema (from visitors-today/route.ts) */
export const metricsTokenSchema = z.object({
  'x-metrics-token': z.string().optional(),
})
