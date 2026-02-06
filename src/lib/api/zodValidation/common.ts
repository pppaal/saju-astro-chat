/**
 * Common Zod Schemas - shared primitives and helpers
 */

import { z } from 'zod'

// ============ Timezone Validation Cache ============

const validTimezoneCache = new Set<string>()
const invalidTimezoneCache = new Set<string>()

function isValidTimezone(tz: string): boolean {
  if (validTimezoneCache.has(tz)) return true
  if (invalidTimezoneCache.has(tz)) return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    validTimezoneCache.add(tz)
    return true
  } catch {
    invalidTimezoneCache.add(tz)
    return false
  }
}

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
  .refine(isValidTimezone, { message: 'Invalid timezone' })

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

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type PaginationQueryValidated = z.infer<typeof paginationQuerySchema>

/** @deprecated Use paginationQuerySchema instead */
export const paginationSchema = paginationQuerySchema
/** @deprecated Use paginationQuerySchema instead */
export const paginationParamsSchema = paginationQuerySchema
export type PaginationValidated = PaginationQueryValidated
export type PaginationParams = PaginationQueryValidated

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

// ============ Zod Error to API Error Mapping ============

import { createErrorResponse, ErrorCodes, type ErrorCode } from '../errorHandler'

/**
 * Zod 검증 에러 상세 정보
 */
export interface ValidationErrorDetail {
  path: string
  message: string
  code?: string
}

// Zod v4 compatible issue type
type ZodIssue = z.core.$ZodIssue

/**
 * Zod 에러를 표준화된 검증 에러 상세로 변환
 */
export function formatZodErrors(zodError: z.ZodError): ValidationErrorDetail[] {
  return zodError.issues.map((issue: ZodIssue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
    code: issue.code,
  }))
}

/**
 * Zod 에러를 ErrorCode로 매핑
 * 첫 번째 이슈 기반으로 적절한 ErrorCode 반환
 */
export function mapZodErrorToCode(zodError: z.ZodError): ErrorCode {
  const firstIssue = zodError.issues[0]
  if (!firstIssue) return ErrorCodes.VALIDATION_ERROR

  const path = firstIssue.path.map(String).join('.').toLowerCase()
  const msg = firstIssue.message.toLowerCase()
  const issueCode = firstIssue.code

  // 특정 필드에 따른 에러 코드 매핑
  if (path.includes('date') || msg.includes('date')) {
    return ErrorCodes.INVALID_DATE
  }
  if (path.includes('time') || msg.includes('time')) {
    return ErrorCodes.INVALID_TIME
  }
  if (path.includes('lat') || path.includes('lon') || path.includes('coord')) {
    return ErrorCodes.INVALID_COORDINATES
  }
  // Check for missing/undefined fields
  if (issueCode === 'invalid_type') {
    // Zod v4 uses 'input' property for the actual received value
    const issue = firstIssue as { input?: unknown }
    if (issue.input === undefined) {
      return ErrorCodes.MISSING_FIELD
    }
  }
  if (msg.includes('format') || issueCode === 'invalid_format') {
    return ErrorCodes.INVALID_FORMAT
  }

  return ErrorCodes.VALIDATION_ERROR
}

/**
 * Zod 검증 결과를 표준 API 에러 응답으로 변환
 * 일관된 에러 형식을 보장
 */
export function createValidationErrorResponse(
  zodError: z.ZodError,
  options: {
    locale?: string
    route?: string
  } = {}
) {
  const code = mapZodErrorToCode(zodError)
  const details = formatZodErrors(zodError)

  return createErrorResponse({
    code,
    details,
    locale: options.locale || 'en',
    route: options.route,
  })
}

/**
 * Zod safeParse 결과를 처리하는 헬퍼
 * 성공 시 데이터 반환, 실패 시 표준화된 에러 응답 반환
 */
export function handleZodValidation<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError },
  options: {
    locale?: string
    route?: string
  } = {}
): { success: true; data: T } | { success: false; response: ReturnType<typeof createErrorResponse> } {
  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    response: createValidationErrorResponse(result.error, options),
  }
}
