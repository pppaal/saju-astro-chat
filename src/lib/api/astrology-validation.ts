/**
 * Common Zod schemas for Astrology API routes
 * Provides consistent validation across all astrology endpoints
 */

import { z } from 'zod'
import { dateSchema, timezoneSchema, latitudeSchema, longitudeSchema } from './zodValidation/common'

// 출생 시각 — 점성 엔진은 엄격한 HH:MM 만 파싱한다(AM/PM·한자리 시 불가).
const strictTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')

// 트랜짓/프로그레션 타깃 날짜용 — 실제 달력일(2024-13-40 같은 불가능 날짜 거부)
// 이되 출생일과 달리 *미래*를 허용한다(트랜짓 시점은 앞날일 수 있다). 맨 정규식은
// 0000~9999 와 13월/40일을 그대로 통과시켜 Swiss Ephemeris 에 쓰레기를 흘렸다.
const futureOkCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const [y, m, d] = date.split('-').map(Number)
    const parsed = new Date(y, m - 1, d)
    return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
  }, 'Invalid date')
  .refine((date) => {
    const y = Number(date.slice(0, 4))
    return y >= 1900 && y <= 2200
  }, 'Date out of supported range (1900–2200)')

/**
 * Base schema for astrology calculations
 * Validates birth data with proper coordinate bounds.
 *
 * date/timeZone/lat/long 은 saju 와 공유하는 canonical 검증기(zodValidation/common)
 * 를 재사용한다 — 라우트마다 맨 정규식을 복붙하던 탓에 13월/연도 0000 같은 쓰레기가
 * 통과해 엔진까지 흘렀다(검증 경계가 6벌로 갈라진 게 근본 원인).
 */
const AstrologyBirthDataSchema = z.object({
  date: dateSchema,
  time: strictTimeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timeZone: timezoneSchema,
})

export type AstrologyBirthData = z.infer<typeof AstrologyBirthDataSchema>

/**
 * Schema for advanced astrology endpoints (asteroids, fixed stars, etc.)
 */
const AdvancedAstrologyRequestSchema = AstrologyBirthDataSchema.extend({
  includeAspects: z.boolean().optional().default(true),
})

export type AdvancedAstrologyRequest = z.infer<typeof AdvancedAstrologyRequestSchema>

/**
 * Schema for transit calculations
 */
const TransitRequestSchema = AstrologyBirthDataSchema.extend({
  transitDate: futureOkCalendarDateSchema,
  transitTime: strictTimeSchema.optional(),
})

export type TransitRequest = z.infer<typeof TransitRequestSchema>

/**
 * Helper function to validate astrology request with proper error formatting
 */
function validateAstrologyRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(body)

  if (!result.success) {
    const errorMessages = result.error.issues.map(
      (e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`
    )
    return {
      success: false,
      error: errorMessages.join(', '),
      issues: result.error.issues,
    }
  }

  return { success: true, data: result.data }
}

/**
 * Coordinate validation helpers
 */
const CoordinateValidation = {
  /**
   * Check if latitude is valid (between -90 and 90)
   */
  isValidLatitude: (lat: number): boolean => {
    return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
  },

  /**
   * Check if longitude is valid (between -180 and 180)
   */
  isValidLongitude: (lon: number): boolean => {
    return typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180
  },

  /**
   * Validate coordinate pair
   */
  validateCoordinates: (
    lat: number,
    lon: number
  ): { valid: true } | { valid: false; error: string } => {
    if (!CoordinateValidation.isValidLatitude(lat)) {
      return { valid: false, error: `Invalid latitude: ${lat}. Must be between -90 and 90.` }
    }
    if (!CoordinateValidation.isValidLongitude(lon)) {
      return { valid: false, error: `Invalid longitude: ${lon}. Must be between -180 and 180.` }
    }
    return { valid: true }
  },
}

// ============ Advanced Astrology Endpoint Schemas ============

/** Asteroids request schema */
export const AsteroidsRequestSchema = z.object({
  date: dateSchema,
  time: strictTimeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timeZone: timezoneSchema,
  includeAspects: z.boolean().optional().default(true),
})

/** Rectification request schema */
const RectificationRequestSchema = z.object({
  birthDate: dateSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timeZone: timezoneSchema,
  events: z
    .array(
      z.object({
        date: z.string(),
        type: z.string(),
        description: z.string().optional(),
        importance: z.enum(['minor', 'moderate', 'major']).optional(),
      })
    )
    .min(1, 'At least one event is required'),
  approximateTimeRange: z
    .object({
      startHour: z.number().int().min(0).max(23).optional(),
      endHour: z.number().int().min(0).max(23).optional(),
      intervalMinutes: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
  appearanceProfile: z.record(z.string(), z.unknown()).optional(),
  sajuSijin: z.string().optional(),
})

/** Solar return request schema */
export const SolarReturnRequestSchema = AdvancedAstrologyRequestSchema.extend({
  // 다른 날짜 필드와 동일 경계 — 무경계면 극단값이 ephemeris 범위 밖 계산을
  // 강제해 매 요청 헛된 swisseph 호출 후 500 을 유발한다.
  year: z.number().int().min(1900).max(2200).optional(),
})

/** Lunar return request schema */
export const LunarReturnRequestSchema = AdvancedAstrologyRequestSchema.extend({
  year: z.number().int().min(1900).max(2200).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

/** Midpoints request schema */
export const MidpointsRequestSchema = AdvancedAstrologyRequestSchema.extend({
  orb: z.number().min(0).max(5).optional().default(1.5),
})

/** Harmonics request schema */
export const HarmonicsRequestSchema = AdvancedAstrologyRequestSchema.extend({
  harmonic: z.number().int().min(1).max(144).optional(),
  currentAge: z.number().int().min(0).max(150).optional(),
  fullProfile: z.boolean().optional().default(false),
})

/** Fixed stars request schema */
export const FixedStarsRequestSchema = AdvancedAstrologyRequestSchema.extend({
  orb: z.number().min(0).max(5).optional().default(1.0),
})

/** Electional request schema */
const ElectionalRequestSchema = AdvancedAstrologyRequestSchema.extend({
  eventType: z.string().optional(),
  basicOnly: z.boolean().optional(),
})

/** Eclipses request schema */
export const EclipsesRequestSchema = AdvancedAstrologyRequestSchema.extend({
  orb: z.number().min(0).max(10).optional().default(3.0),
})

/** Draconic request schema */
export const DraconicRequestSchema = AdvancedAstrologyRequestSchema.extend({
  compareToNatal: z.boolean().optional().default(true),
})

/** Progressions request schema */
export const ProgressionsRequestSchema = AdvancedAstrologyRequestSchema.extend({
  targetDate: futureOkCalendarDateSchema.optional(),
})
