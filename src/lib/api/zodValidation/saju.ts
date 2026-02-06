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
import {
  sajuChatContextSchema,
  sajuResultSchema,
  fiveElementSchema,
  sibsinDistributionSchema,
  twelveStagesRecordSchema,
  ganjiSchema,
  advancedSajuAnalysisSchema,
} from './domains/saju-domain'
import {
  astroChatContextSchema,
  planetHousesSchema,
  planetSignsSchema,
  aspectHitSchema,
  transitAspectSchema,
  extraPointSchema,
} from './domains/astro-domain'

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
  saju: sajuChatContextSchema.optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: sajuChatContextSchema.optional(),
})

export type SajuChatStreamValidated = z.infer<typeof sajuChatStreamSchema>

// ============ Astrology Schemas ============

export const astrologyOptionsSchema = z.object({
  houseSystem: z.enum(['Placidus', 'WholeSign', 'Koch', 'Equal', 'Campanus']).optional(),
  includeAsteroids: z.boolean().optional(),
  includeFixedStars: z.boolean().optional(),
  includeChiron: z.boolean().optional(),
  includeLilith: z.boolean().optional(),
  aspectOrb: z.number().min(0).max(15).optional(),
})

export const astrologyRequestSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  latitude: z.union([latitudeSchema, z.string().transform((val) => parseFloat(val))]),
  longitude: z.union([longitudeSchema, z.string().transform((val) => parseFloat(val))]),
  timeZone: timezoneSchema,
  locale: localeSchema.optional(),
  options: astrologyOptionsSchema.optional(),
})

export type AstrologyRequest = z.infer<typeof astrologyRequestSchema>

export const advancedAstrologyOptionsSchema = z.object({
  harmonicNumber: z.number().int().min(1).max(360).optional(),
  progressionType: z.enum(['secondary', 'solarArc']).optional(),
  eclipseType: z.enum(['solar', 'lunar', 'both']).optional(),
  midpointStyle: z.enum(['direct', 'modulus90']).optional(),
  aspectsToInclude: z.array(z.string().max(20)).optional(),
})

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
  options: advancedAstrologyOptionsSchema.optional(),
  locale: localeSchema.optional(),
})

export type AdvancedAstrologyRequestValidated = z.infer<typeof advancedAstrologyRequestSchema>

export const astroBirthDataSchema = z.object({
  birthDate: dateSchema.optional(),
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  timezone: timezoneSchema.optional(),
})

export const astroChartDataSchema = z.object({
  sunSign: z.string().max(30).optional(),
  moonSign: z.string().max(30).optional(),
  ascendant: z.string().max(30).optional(),
  planetHouses: planetHousesSchema.optional(),
  planetSigns: planetSignsSchema.optional(),
  aspects: z.array(aspectHitSchema).optional(),
})

export const astrologyChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  birthData: astroBirthDataSchema.optional(),
  chartData: astroChartDataSchema.optional(),
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

export const destinyMapContextSchema = z.object({
  theme: z.string().max(50).optional(),
  sessionId: z.string().max(100).optional(),
  previousTopics: z.array(z.string().max(100)).optional(),
  userPreferences: z.object({
    detailLevel: z.enum(['brief', 'moderate', 'detailed']).optional(),
    focusArea: z.enum(['career', 'love', 'health', 'wealth', 'general']).optional(),
  }).optional(),
})

export const destinyMapChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: sajuChatContextSchema.optional(),
  astro: astroChatContextSchema.optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: destinyMapContextSchema.optional(),
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

export const destinyMatrixReportDataSchema = z.object({
  categories: z.array(z.object({
    name: z.string().max(50),
    score: z.number().min(0).max(100),
    description: z.string().max(1000).optional(),
  })).optional(),
  highlights: z.array(z.string().max(500)).optional(),
  warnings: z.array(z.string().max(500)).optional(),
  recommendations: z.array(z.string().max(500)).optional(),
  luckyFactors: z.object({
    colors: z.array(z.string().max(30)).optional(),
    numbers: z.array(z.number().int().min(0).max(99)).optional(),
    directions: z.array(z.string().max(30)).optional(),
  }).optional(),
})

export const destinyMatrixSaveRequestSchema = z
  .object({
    reportType: z.enum(['timing', 'themed']),
    period: z.enum(['daily', 'monthly', 'yearly', 'comprehensive']).optional(),
    theme: z.enum(['love', 'career', 'wealth', 'health', 'family']).optional(),
    reportData: destinyMatrixReportDataSchema,
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

// fiveElementSchema is imported from './domains/saju-domain'
// Re-export for backwards compatibility
export { fiveElementSchema } from './domains/saju-domain'

export const destinyMatrixCalculationSchema = z
  .object({
    birthDate: dateSchema.optional(),
    birthTime: timeSchema.optional(),
    gender: z.enum(['male', 'female']).optional(),
    timezone: timezoneSchema.optional(),
    dayMasterElement: fiveElementSchema.optional(),
    pillarElements: z.array(fiveElementSchema).optional(),
    sibsinDistribution: sibsinDistributionSchema.optional(),
    twelveStages: twelveStagesRecordSchema.optional(),
    relations: z.array(z.string().max(50)).optional(),
    geokguk: z.string().max(100).optional(),
    yongsin: z.array(fiveElementSchema).optional(),
    currentDaeunElement: fiveElementSchema.optional(),
    currentSaeunElement: fiveElementSchema.optional(),
    shinsalList: z.array(z.string().max(50)).optional(),
    dominantWesternElement: z.enum(['fire', 'earth', 'air', 'water']).optional(),
    planetHouses: planetHousesSchema.optional(),
    planetSigns: planetSignsSchema.optional(),
    aspects: z.array(aspectHitSchema).optional(),
    activeTransits: z.array(transitAspectSchema).optional(),
    asteroidHouses: planetHousesSchema.optional(),
    extraPointSigns: planetSignsSchema.optional(),
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

export const matrixDataSchema = z.object({
  lifePathNumber: z.number().int().min(1).max(33).optional(),
  destinyNumber: z.number().int().min(1).max(33).optional(),
  soulUrge: z.number().int().min(1).max(33).optional(),
  personality: z.number().int().min(1).max(33).optional(),
  birthday: z.number().int().min(1).max(31).optional(),
  matrixGrid: z.array(z.array(z.number().int())).optional(),
  challenges: z.array(z.number().int()).optional(),
  pinnacles: z.array(z.number().int()).optional(),
})

export const destinyMatrixAiReportSchema = z.object({
  birthDate: dateSchema,
  matrixData: matrixDataSchema,
  locale: localeSchema.optional(),
  reportType: z.enum(['personality', 'career', 'relationship', 'yearly', 'comprehensive']).optional(),
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

export const sajuFactorsSchema = z.object({
  dayMaster: z.string().max(10).optional(),
  currentDaeun: z.string().max(20).optional(),
  currentSaeun: z.string().max(20).optional(),
  dailyGanji: z.string().max(10).optional(),
  favorableElements: z.array(fiveElementSchema).optional(),
  unfavorableElements: z.array(fiveElementSchema).optional(),
  activeRelations: z.array(z.string().max(30)).optional(),
  activeShinsal: z.array(z.string().max(30)).optional(),
})

export const astroFactorsSchema = z.object({
  sunSign: z.string().max(30).optional(),
  moonPhase: z.string().max(30).optional(),
  mercuryRetrograde: z.boolean().optional(),
  activeTransits: z.array(z.string().max(100)).optional(),
  majorAspects: z.array(z.string().max(100)).optional(),
  voidOfCourseMoon: z.boolean().optional(),
})

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
  sajuFactors: sajuFactorsSchema.optional(),
  astroFactors: astroFactorsSchema.optional(),
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
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(365)).optional().default(50),
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

export const cachedChartDataSchema = z.object({
  saju: sajuResultSchema.optional(),
  astro: z.object({
    sunSign: z.string().max(30).optional(),
    moonSign: z.string().max(30).optional(),
    ascendant: z.string().max(30).optional(),
    houses: z.array(z.number().int().min(1).max(12)).optional(),
    aspects: z.array(aspectHitSchema).optional(),
  }).optional(),
  calculatedAt: z.string().max(50),
  version: z.string().max(20).optional(),
})

export const cacheChartSaveSchema = cacheChartSchema.extend({
  birthTime: timeSchema,
  data: cachedChartDataSchema,
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

export const counselorPersonSchema = z.object({
  name: z.string().max(120).optional(),
  birthDate: dateSchema.optional(),
  birthTime: timeSchema.optional(),
  gender: genderSchema.optional(),
  relation: z.string().max(50).optional(),
})

export const compatibilityCounselorRequestSchema = z.object({
  persons: z.array(counselorPersonSchema).min(2).max(4),
  person1Saju: sajuChatContextSchema.nullable().optional(),
  person2Saju: sajuChatContextSchema.nullable().optional(),
  person1Astro: astroChatContextSchema.nullable().optional(),
  person2Astro: astroChatContextSchema.nullable().optional(),
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
