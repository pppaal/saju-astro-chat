/**
 * Common Zod schemas for Astrology API routes
 * Provides consistent validation across all astrology endpoints
 */

import { z } from 'zod'

/**
 * Base schema for astrology calculations
 * Validates birth data with proper coordinate bounds
 */
export const AstrologyBirthDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  latitude: z
    .number()
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90')
    .refine((val) => !isNaN(val), 'Latitude must be a valid number'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180')
    .refine((val) => !isNaN(val), 'Longitude must be a valid number'),
  timeZone: z.string().min(1, 'Timezone is required'),
})

export type AstrologyBirthData = z.infer<typeof AstrologyBirthDataSchema>

/**
 * Schema for advanced astrology endpoints (asteroids, fixed stars, etc.)
 */
export const AdvancedAstrologyRequestSchema = AstrologyBirthDataSchema.extend({
  includeAspects: z.boolean().optional().default(true),
})

export type AdvancedAstrologyRequest = z.infer<typeof AdvancedAstrologyRequestSchema>

/**
 * Schema for transit calculations
 */
export const TransitRequestSchema = AstrologyBirthDataSchema.extend({
  transitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Transit date must be in YYYY-MM-DD format'),
  transitTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Transit time must be in HH:MM format')
    .optional(),
})

export type TransitRequest = z.infer<typeof TransitRequestSchema>

/**
 * Helper function to validate astrology request with proper error formatting
 */
export function validateAstrologyRequest<T>(
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
export const CoordinateValidation = {
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
