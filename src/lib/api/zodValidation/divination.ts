/**
 * Divination Schemas - I Ching, Dream, Numerology, Past Life, Life Prediction
 */

import { z } from 'zod'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  latitudeSchema,
  longitudeSchema,
  localeSchema,
  genderSchema,
  birthInfoSchema,
  chatMessageSchema,
} from './common'

// ============ I Ching Schemas ============

export const iChingRequestSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  method: z.enum(['coins', 'yarrow', 'digital']).optional(),
  hexagramNumber: z.number().int().min(1).max(64).optional(),
  changingLines: z.array(z.number().int().min(1).max(6)).max(6).optional(),
  locale: localeSchema.optional(),
})

export type IChingRequestValidated = z.infer<typeof iChingRequestSchema>

export const iChingChangingLineSchema = z.object({
  index: z.number().int().min(1).max(6),
  text: z.string().max(1000),
})

export const iChingResultingHexagramSchema = z.object({
  number: z.number().int().min(1).max(64),
  name: z.string().max(200),
  symbol: z.string().max(20),
  judgment: z.string().max(2000).optional(),
})

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

// ============ Dream Schemas ============

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

export const dreamChatSaveRequestSchema = z.object({
  dreamId: z.string().max(100).optional(),
  dreamText: z.string().min(1).max(5000).trim(),
  messages: z.array(chatMessageSchema).min(1).max(100),
  summary: z.string().max(1000).trim().optional(),
  locale: localeSchema.optional(),
})

export type DreamChatSaveRequestValidated = z.infer<typeof dreamChatSaveRequestSchema>

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
  sajuInfluence: z.record(z.string(), z.unknown()).optional(),
})

export type DreamStreamValidated = z.infer<typeof dreamStreamSchema>

export const dreamHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const dreamHistoryDeleteQuerySchema = z.object({
  id: z.string().min(1).max(100),
})

export const dreamChatSaveGetQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

// ============ Numerology Schemas ============

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

export const numerologyGetQuerySchema = z.object({
  birthDate: dateSchema,
  name: z.string().max(100).optional(),
  englishName: z.string().max(100).optional(),
  koreanName: z.string().max(100).optional(),
  locale: localeSchema.optional().default('ko'),
})

// ============ Past Life Schemas ============

export const pastLifeRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type PastLifeRequestValidated = z.infer<typeof pastLifeRequestSchema>

export const pastLifeSaveRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  timezone: timezoneSchema.optional(),
  karmaScore: z.number().min(0).max(100),
  analysisData: z.object({
    soulPattern: z.record(z.string(), z.unknown()),
    pastLife: z.record(z.string(), z.unknown()),
    soulJourney: z.record(z.string(), z.unknown()),
    karmicDebts: z.array(z.record(z.string(), z.unknown())),
    thisLifeMission: z.record(z.string(), z.unknown()),
    talentsCarried: z.array(z.string().max(200)),
    saturnLesson: z.record(z.string(), z.unknown()),
  }),
  locale: localeSchema.optional(),
})

export type PastLifeSaveRequestValidated = z.infer<typeof pastLifeSaveRequestSchema>

// ============ Life Prediction Schemas ============

export const eventTypeSchema = z.enum([
  'marriage',
  'career',
  'investment',
  'move',
  'study',
  'health',
  'relationship',
])

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

export const pastAnalysisPredictionRequestSchema = basePredictionInputSchema
  .extend({
    type: z.literal('past-analysis'),
    targetDate: dateSchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
  })
  .refine(
    (data) => {
      const hasTarget = !!data.targetDate
      const hasRange = !!data.startDate && !!data.endDate
      return hasTarget || hasRange
    },
    {
      message: 'Either targetDate or both startDate and endDate are required',
      path: ['targetDate'],
    }
  )

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

export const weeklyTimingPredictionRequestSchema = basePredictionInputSchema.extend({
  type: z.literal('weekly-timing'),
  eventType: eventTypeSchema,
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
})

export const comprehensivePredictionRequestSchema = basePredictionInputSchema.extend({
  type: z.literal('comprehensive'),
  yearsRange: z.number().int().min(1).max(30).optional().default(10),
})

export const lifePredictionRequestSchema = z.discriminatedUnion('type', [
  multiYearPredictionRequestSchema,
  pastAnalysisPredictionRequestSchema,
  eventTimingPredictionRequestSchema,
  weeklyTimingPredictionRequestSchema,
  comprehensivePredictionRequestSchema,
])

export type LifePredictionRequestValidated = z.infer<typeof lifePredictionRequestSchema>

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

export const lifePredictionSaveRequestSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  prediction: z.string().max(10000),
  category: z.string().max(100).optional(),
  birthInfo: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  locale: localeSchema.optional(),
})

export type LifePredictionSaveRequestValidated = z.infer<typeof lifePredictionSaveRequestSchema>

export const timingResultSchema = z.object({
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20),
  score: z.number().min(0).max(100),
  grade: z.string().min(1).max(10),
  reasons: z.array(z.string().max(500)),
})

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

export const optimalPeriodSchema = z.object({
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20),
  score: z.number().min(0).max(100),
  grade: z.string().min(1).max(10),
  reasons: z.array(z.string().max(500)),
})

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

export const lifePredictionAnalyzeQuestionSchema = z.object({
  question: z.string().min(1).max(500).trim(),
  locale: localeSchema.optional(),
})

export type LifePredictionAnalyzeQuestionValidated = z.infer<
  typeof lifePredictionAnalyzeQuestionSchema
>

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
