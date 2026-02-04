/**
 * Saju, Astrology & Destiny Map Schemas
 */

import { z } from 'zod'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  latitudeSchema,
  longitudeSchema,
  genderSchema,
  localeSchema,
  chatMessageSchema,
} from './common'

// ============ Saju API Schema ============

export const sajuRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: z.enum(['solar', 'lunar']),
  timezone: timezoneSchema,
  userTimezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type SajuRequest = z.infer<typeof sajuRequestSchema>

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

export const sajuChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: z.record(z.string(), z.unknown()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

export type SajuChatStreamValidated = z.infer<typeof sajuChatStreamSchema>

// ============ Astrology Schemas ============

export const astrologyRequestSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  latitude: z.union([latitudeSchema, z.string().transform((val) => parseFloat(val))]),
  longitude: z.union([longitudeSchema, z.string().transform((val) => parseFloat(val))]),
  timeZone: timezoneSchema,
  locale: localeSchema.optional(),
  options: z.record(z.string(), z.unknown()).optional(),
})

export type AstrologyRequest = z.infer<typeof astrologyRequestSchema>

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

export const astrologyChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  birthData: z.record(z.string(), z.unknown()).optional(),
  chartData: z.record(z.string(), z.unknown()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
})

export type AstrologyChatStreamValidated = z.infer<typeof astrologyChatStreamSchema>

export const astrologyDetailsSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type AstrologyDetailsValidated = z.infer<typeof astrologyDetailsSchema>

export const precomputeChartRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  gender: z.string().max(20).optional(),
  timezone: timezoneSchema.optional(),
})

export type PrecomputeChartRequestValidated = z.infer<typeof precomputeChartRequestSchema>

// ============ Destiny Map Schemas ============

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

export const destinyMapChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: z.record(z.string(), z.unknown()).optional(),
  astro: z.record(z.string(), z.unknown()).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

export type DestinyMapChatValidated = z.infer<typeof destinyMapChatSchema>

// ============ Destiny Matrix Schemas ============

export const destinyMatrixRequestSchema = z.object({
  birthDate: dateSchema,
  name: z.string().min(1).max(120).trim().optional(),
  gender: genderSchema.optional(),
  locale: localeSchema.optional(),
})

export type DestinyMatrixRequestValidated = z.infer<typeof destinyMatrixRequestSchema>

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

export const fiveElementSchema = z.enum(['목', '화', '토', '금', '수'])

export const destinyMatrixCalculationSchema = z
  .object({
    birthDate: dateSchema.optional(),
    birthTime: timeSchema.optional(),
    gender: z.enum(['male', 'female']).optional(),
    timezone: timezoneSchema.optional(),
    dayMasterElement: fiveElementSchema.optional(),
    pillarElements: z.array(fiveElementSchema).optional(),
    sibsinDistribution: z.record(z.string(), z.number()).optional(),
    twelveStages: z.record(z.string(), z.unknown()).optional(),
    relations: z.array(z.string()).optional(),
    geokguk: z.string().max(100).optional(),
    yongsin: z.array(z.string()).optional(),
    currentDaeunElement: fiveElementSchema.optional(),
    currentSaeunElement: fiveElementSchema.optional(),
    shinsalList: z.array(z.string().max(50)).optional(),
    dominantWesternElement: z.string().max(50).optional(),
    planetHouses: z.record(z.string(), z.unknown()).optional(),
    planetSigns: z.record(z.string(), z.unknown()).optional(),
    aspects: z.array(z.unknown()).optional(),
    activeTransits: z.array(z.unknown()).optional(),
    asteroidHouses: z.record(z.string(), z.unknown()).optional(),
    extraPointSigns: z.record(z.string(), z.unknown()).optional(),
    lang: z.enum(['ko', 'en']).optional(),
  })
  .refine((data) => data.birthDate || data.dayMasterElement, {
    message: 'Either birthDate or dayMasterElement is required',
  })

export type DestinyMatrixCalculationValidated = z.infer<typeof destinyMatrixCalculationSchema>

export const destinyMatrixQuerySchema = z.object({
  format: z.enum(['summary', 'full']).optional(),
})

export type DestinyMatrixQueryValidated = z.infer<typeof destinyMatrixQuerySchema>

export const destinyMatrixAiReportSchema = z.object({
  birthDate: dateSchema,
  matrixData: z.record(z.string(), z.unknown()),
  locale: localeSchema.optional(),
  reportType: z.string().max(50).optional(),
})

export type DestinyMatrixAiReportValidated = z.infer<typeof destinyMatrixAiReportSchema>

export const destinyMatrixReportSchema = z.object({
  birthDate: dateSchema,
  locale: localeSchema.optional(),
})

export type DestinyMatrixReportValidated = z.infer<typeof destinyMatrixReportSchema>

export const destinyMatrixSaveGetQuerySchema = z.object({
  id: z.string().max(100).optional(),
})

// ============ Calendar Schemas ============

export const calendarSaveRequestSchema = z.object({
  date: dateSchema,
  year: z.number().int().min(1900).max(2100).optional(),
  grade: z.number().int().min(1).max(5),
  score: z.number().min(0).max(100),
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

export const calendarMainQuerySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional().default('12:00'),
  birthPlace: z.string().max(100).trim().optional().default('Seoul'),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  gender: genderSchema.optional().default('male'),
  locale: localeSchema.optional().default('ko'),
  category: z.enum(['wealth', 'career', 'love', 'health', 'travel', 'study', 'general']).optional(),
})

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

// ============ Cache Chart Schemas ============

export const cacheChartSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
})

export type CacheChartValidated = z.infer<typeof cacheChartSchema>

export const cacheChartSaveSchema = cacheChartSchema.extend({
  birthTime: timeSchema,
  data: z.record(z.string(), z.unknown()),
})

export type CacheChartSaveValidated = z.infer<typeof cacheChartSaveSchema>

export const cacheChartDeleteSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
})

export type CacheChartDeleteValidated = z.infer<typeof cacheChartDeleteSchema>

export const cacheChartGetQuerySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

// ============ Compatibility Schemas ============

export const personDataSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  gender: genderSchema.optional(),
})

export const relationTypeSchema = z.enum(['friend', 'lover', 'other'])

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
    relationToP1: relationTypeSchema.optional(),
    relationNoteToP1: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
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

export const compatibilityRequestSchema = z
  .object({
    persons: z.array(compatibilityPersonInputSchema).min(2).max(4),
    locale: localeSchema.optional(),
  })
  .refine(
    (data) => {
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

export const compatibilitySaveRequestSchema = z.object({
  people: z.array(personDataSchema).min(2).max(4),
  analysisType: z.string().max(50).optional(),
  compatibilityScore: z.number().min(0).max(100).optional(),
  report: z.string().max(15000),
  insights: z.array(z.string().max(1000)).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilitySaveRequestValidated = z.infer<typeof compatibilitySaveRequestSchema>

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

export const compatibilityAnalysisSchema = z.object({
  person1: z.lazy(() =>
    z.object({
      birthDate: dateSchema,
      birthTime: timeSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      timezone: timezoneSchema,
      gender: genderSchema.optional(),
      calendarType: z.enum(['solar', 'lunar']).optional(),
      userTimezone: timezoneSchema.optional(),
    })
  ),
  person2: z.lazy(() =>
    z.object({
      birthDate: dateSchema,
      birthTime: timeSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      timezone: timezoneSchema,
      gender: genderSchema.optional(),
      calendarType: z.enum(['solar', 'lunar']).optional(),
      userTimezone: timezoneSchema.optional(),
    })
  ),
  analysisType: z.enum(['romantic', 'friendship', 'business', 'family']).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityAnalysis = z.infer<typeof compatibilityAnalysisSchema>

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

// ============ Utility Schemas ============

export const latlonToTimezoneSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
})

export type LatlonToTimezoneValidated = z.infer<typeof latlonToTimezoneSchema>

export const citiesSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})
