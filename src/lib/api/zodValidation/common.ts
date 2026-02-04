/**
 * Common Zod Schemas - shared primitives and helpers
 */

import { z } from 'zod'

// ============ Primitive Schemas ============

export const dateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  .refine(
    (date) => {
      const [year, month, day] = date.split('-').map(Number)
      const parsed = new Date(year, month - 1, day)
      return (
        parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
      )
    },
    { message: 'Invalid date' }
  )

export const timeSchema = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)(\s?(AM|PM))?$/i, {
  message: 'Time must be in HH:MM or HH:MM AM/PM format',
})

export const timezoneSchema = z
  .string()
  .min(1, 'Timezone is required')
  .max(64, 'Timezone is too long')
  .regex(/^[A-Za-z/_+-]+$/, 'Invalid timezone format')

export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be >= -90')
  .max(90, 'Latitude must be <= 90')

export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be >= -180')
  .max(180, 'Longitude must be <= 180')

export const genderSchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(z.enum(['male', 'female', 'other']))

export const localeSchema = z.enum(['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ar'])

export const calendarTypeSchema = z.enum(['solar', 'lunar'])

// ============ Birth Information Schema ============

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

// ============ Chat Message Schema ============

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
  timestamp: z.number().optional(),
})

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

// ============ Pagination Schemas ============

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

export const paginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationParams = z.infer<typeof paginationParamsSchema>

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// ============ Common Param Schemas ============

export const idParamSchema = z.object({
  id: z.string().min(1).max(100),
})

export const readingIdParamSchema = z.object({
  readingId: z.string().min(1).max(100),
})

// ============ Validation Helper Functions ============

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

export function validateQueryParams<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Array<{ path: string; message: string }> } {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())

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

export function sanitizeInput(input: string, maxLength = 10000): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .slice(0, maxLength)
}
