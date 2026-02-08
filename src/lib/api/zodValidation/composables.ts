/**
 * Zod Schema Composables
 * Reusable schema composition helpers to reduce duplication across validation files
 *
 * Instead of repeating the same field definitions in multiple schemas,
 * use these composable functions to build schemas with shared structures.
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
import { sajuChatContextSchema } from './domains/saju-domain'
import { astroChatContextSchema } from './domains/astro-domain'

// ============ Schema Composition Helpers ============

/**
 * Creates a schema with birth information fields
 * Replaces repeated birthDate, birthTime, gender, etc. patterns
 */
export function withBirthInfo<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    birthDate: dateSchema,
    birthTime: timeSchema,
    gender: genderSchema.optional(),
  })
}

/**
 * Creates a schema with location fields
 * Replaces repeated latitude, longitude, timezone patterns
 */
export function withLocation<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    timezone: timezoneSchema,
  })
}

/**
 * Creates a schema with optional location fields
 */
export function withOptionalLocation<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
}

/**
 * Creates a schema with full birth and location info
 * Combines birthInfo + location for complete birth data
 */
export function withFullBirthInfo<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    birthDate: dateSchema,
    birthTime: timeSchema,
    gender: genderSchema.optional(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    timezone: timezoneSchema,
    calendarType: z.enum(['solar', 'lunar']).optional(),
    userTimezone: timezoneSchema.optional(),
  })
}

/**
 * Creates a schema with chat message array
 * Replaces repeated messages array patterns
 */
export function withChatMessages<T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>,
  options: { min?: number; max?: number } = {}
) {
  const { min = 1, max = 50 } = options
  return baseSchema.extend({
    messages: z.array(chatMessageSchema).min(min).max(max),
  })
}

/**
 * Creates a schema with locale
 */
export function withLocale<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    locale: localeSchema.optional(),
  })
}

/**
 * Creates a schema with Saju context
 */
export function withSajuContext<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    saju: sajuChatContextSchema.optional(),
  })
}

/**
 * Creates a schema with Astro context
 */
export function withAstroContext<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    astro: astroChatContextSchema.optional(),
  })
}

/**
 * Creates a schema with both Saju and Astro context
 */
export function withDualContext<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    saju: sajuChatContextSchema.optional(),
    astro: astroChatContextSchema.optional(),
  })
}

/**
 * Creates a schema with pagination fields
 */
export function withPagination<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.extend({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
}

// ============ Pre-composed Common Schemas ============

/**
 * Base schema for birth data requests
 * Use this as a starting point for any request that needs birth info
 */
export const birthDataBaseSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  gender: genderSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type BirthDataBaseValidated = z.infer<typeof birthDataBaseSchema>

/**
 * Required birth data schema (for calculations that need all fields)
 */
export const requiredBirthDataSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  locale: localeSchema.optional(),
})

export type RequiredBirthDataValidated = z.infer<typeof requiredBirthDataSchema>

/**
 * Base schema for chat-based API requests
 * Note: Uses restricted locale ['ko', 'en'] as chat AI only supports these
 */
export const chatRequestBaseSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  locale: z.enum(['ko', 'en']).optional(), // Chat AI supports only ko/en
})

export type ChatRequestBaseValidated = z.infer<typeof chatRequestBaseSchema>

/**
 * Chat request with Saju/Astro context
 */
export const chatWithContextSchema = chatRequestBaseSchema.extend({
  saju: sajuChatContextSchema.optional(),
  astro: astroChatContextSchema.optional(),
})

export type ChatWithContextValidated = z.infer<typeof chatWithContextSchema>

/**
 * Base schema for save requests
 */
export const saveRequestBaseSchema = z.object({
  locale: localeSchema.optional(),
})

/**
 * Base schema for result responses
 */
export const resultResponseBaseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
})

// ============ Person Schema Factories ============

/**
 * Creates a person schema with customizable required fields
 */
export function createPersonSchema(options: {
  nameRequired?: boolean
  birthTimeRequired?: boolean
  locationRequired?: boolean
} = {}) {
  const { nameRequired = false, birthTimeRequired = false, locationRequired = false } = options

  return z.object({
    name: nameRequired ? z.string().min(1).max(120).trim() : z.string().max(120).trim().optional(),
    birthDate: dateSchema,
    birthTime: birthTimeRequired ? timeSchema : timeSchema.optional(),
    gender: genderSchema.optional(),
    latitude: locationRequired ? latitudeSchema : latitudeSchema.optional(),
    longitude: locationRequired ? longitudeSchema : longitudeSchema.optional(),
    timezone: locationRequired ? timezoneSchema : timezoneSchema.optional(),
  })
}

/**
 * Person schema with required location (for Saju/Astro calculations)
 */
export const personWithLocationSchema = createPersonSchema({
  nameRequired: true,
  birthTimeRequired: true,
  locationRequired: true,
})

export type PersonWithLocationValidated = z.infer<typeof personWithLocationSchema>

/**
 * Minimal person schema (just name and birthDate)
 */
export const minimalPersonSchema = z.object({
  name: z.string().max(120).trim().optional(),
  birthDate: dateSchema,
})

export type MinimalPersonValidated = z.infer<typeof minimalPersonSchema>

// ============ Utility Types ============

/**
 * Extracts the validated type from a composable result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferComposed<T extends z.ZodType<any>> = z.infer<T>
