/**
 * Tests for API Validator
 * src/lib/api/validator.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  validate,
  safeValidate,
  formatValidationErrors,
  validationError,
  DateSchema,
  TimeSchema,
  TimezoneSchema,
  LocaleSchema,
  LatitudeSchema,
  LongitudeSchema,
  SafeTextSchema,
  EmailSchema,
  UuidSchema,
  BirthDataSchema,
  PaginationSchema,
  TarotRequestSchema,
  DreamRequestSchema,
  FeedbackRequestSchema,
  type ValidationError,
} from '@/lib/api/validator'

describe('API Validator', () => {
  describe('DateSchema', () => {
    it('should accept valid date format', () => {
      const result = DateSchema.safeParse('2024-01-15')
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const result = DateSchema.safeParse('01-15-2024')
      expect(result.success).toBe(false)
    })

    it('should accept year before 1900 (no year range validation)', () => {
      // dateSchema only validates format, not year range
      const result = DateSchema.safeParse('1899-01-01')
      expect(result.success).toBe(true)
    })

    it('should accept year after 2100 (no year range validation)', () => {
      // dateSchema only validates format, not year range
      const result = DateSchema.safeParse('2101-01-01')
      expect(result.success).toBe(true)
    })

    it('should reject non-date string', () => {
      const result = DateSchema.safeParse('not-a-date')
      expect(result.success).toBe(false)
    })
  })

  describe('TimeSchema', () => {
    it('should accept valid time format', () => {
      const result = TimeSchema.safeParse('14:30')
      expect(result.success).toBe(true)
    })

    it('should accept midnight', () => {
      const result = TimeSchema.safeParse('00:00')
      expect(result.success).toBe(true)
    })

    it('should accept time with AM/PM format', () => {
      // timeSchema allows HH:MM AM/PM format
      const result = TimeSchema.safeParse('2:30 PM')
      expect(result.success).toBe(true)
    })

    it('should accept single digit hour', () => {
      // timeSchema allows [01]?\d which includes single digit hours
      const result = TimeSchema.safeParse('2:30')
      expect(result.success).toBe(true)
    })
  })

  describe('TimezoneSchema', () => {
    it('should accept valid timezone', () => {
      const result = TimezoneSchema.safeParse('Asia/Seoul')
      expect(result.success).toBe(true)
    })

    it('should accept UTC', () => {
      const result = TimezoneSchema.safeParse('UTC')
      expect(result.success).toBe(true)
    })

    it('should reject invalid timezone', () => {
      const result = TimezoneSchema.safeParse('Invalid/Timezone')
      expect(result.success).toBe(false)
    })
  })

  describe('LocaleSchema', () => {
    it('should accept supported locales', () => {
      // All locales from localeValues in common.ts
      const locales = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'vi', 'th', 'id']
      locales.forEach((locale) => {
        const result = LocaleSchema.safeParse(locale)
        expect(result.success).toBe(true)
      })
    })

    it('should reject unsupported locale', () => {
      const result = LocaleSchema.safeParse('xyz')
      expect(result.success).toBe(false)
    })
  })

  describe('LatitudeSchema', () => {
    it('should accept valid latitude', () => {
      expect(LatitudeSchema.safeParse(37.5665).success).toBe(true)
      expect(LatitudeSchema.safeParse(-33.8688).success).toBe(true)
      expect(LatitudeSchema.safeParse(0).success).toBe(true)
    })

    it('should accept boundary values', () => {
      expect(LatitudeSchema.safeParse(90).success).toBe(true)
      expect(LatitudeSchema.safeParse(-90).success).toBe(true)
    })

    it('should reject out of range values', () => {
      expect(LatitudeSchema.safeParse(91).success).toBe(false)
      expect(LatitudeSchema.safeParse(-91).success).toBe(false)
    })
  })

  describe('LongitudeSchema', () => {
    it('should accept valid longitude', () => {
      expect(LongitudeSchema.safeParse(126.978).success).toBe(true)
      expect(LongitudeSchema.safeParse(-122.4194).success).toBe(true)
      expect(LongitudeSchema.safeParse(0).success).toBe(true)
    })

    it('should accept boundary values', () => {
      expect(LongitudeSchema.safeParse(180).success).toBe(true)
      expect(LongitudeSchema.safeParse(-180).success).toBe(true)
    })

    it('should reject out of range values', () => {
      expect(LongitudeSchema.safeParse(181).success).toBe(false)
      expect(LongitudeSchema.safeParse(-181).success).toBe(false)
    })
  })

  describe('SafeTextSchema', () => {
    it('should accept normal text', () => {
      const result = SafeTextSchema.safeParse('Hello, this is a normal text!')
      expect(result.success).toBe(true)
    })

    it('should accept Korean text', () => {
      const result = SafeTextSchema.safeParse('안녕하세요, 반갑습니다!')
      expect(result.success).toBe(true)
    })

    it('should reject script tags', () => {
      const result = SafeTextSchema.safeParse('<script>alert("xss")</script>')
      expect(result.success).toBe(false)
    })

    it('should reject javascript: protocol', () => {
      const result = SafeTextSchema.safeParse('javascript:alert(1)')
      expect(result.success).toBe(false)
    })

    it('should reject event handlers', () => {
      const result = SafeTextSchema.safeParse('onclick=alert(1)')
      expect(result.success).toBe(false)
    })
  })

  describe('EmailSchema', () => {
    it('should accept valid email', () => {
      const result = EmailSchema.safeParse('test@example.com')
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = EmailSchema.safeParse('not-an-email')
      expect(result.success).toBe(false)
    })
  })

  describe('UuidSchema', () => {
    it('should accept valid UUID', () => {
      const result = UuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = UuidSchema.safeParse('not-a-uuid')
      expect(result.success).toBe(false)
    })
  })

  describe('BirthDataSchema', () => {
    const validBirthData = {
      birthDate: '1990-05-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
    }

    it('should accept valid birth data', () => {
      const result = BirthDataSchema.safeParse(validBirthData)
      expect(result.success).toBe(true)
    })

    it('should accept with optional fields', () => {
      const result = BirthDataSchema.safeParse({
        ...validBirthData,
        timezone: 'Asia/Seoul',
        city: 'Seoul',
        name: 'Test User',
        gender: 'male',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid gender', () => {
      const result = BirthDataSchema.safeParse({
        ...validBirthData,
        gender: 'invalid',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const result = BirthDataSchema.safeParse({
        birthDate: '1990-05-15',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('PaginationSchema', () => {
    it('should use defaults when no values provided', () => {
      const result = PaginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should coerce string numbers', () => {
      const result = PaginationSchema.safeParse({
        offset: '10',
        limit: '50',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.offset).toBe(10)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject offset less than 0', () => {
      const result = PaginationSchema.safeParse({ offset: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = PaginationSchema.safeParse({ limit: 101 })
      expect(result.success).toBe(false)
    })
  })

  describe('TarotRequestSchema', () => {
    it('should accept valid tarot request', () => {
      const result = TarotRequestSchema.safeParse({
        categoryId: 'love',
        spreadId: 'three_card',
      })
      expect(result.success).toBe(true)
    })

    it('should use default language', () => {
      const result = TarotRequestSchema.safeParse({
        categoryId: 'love',
        spreadId: 'three_card',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.language).toBe('ko')
      }
    })

    it('should reject empty categoryId', () => {
      const result = TarotRequestSchema.safeParse({
        categoryId: '',
        spreadId: 'three_card',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('DreamRequestSchema', () => {
    it('should accept valid dream request', () => {
      const result = DreamRequestSchema.safeParse({
        dream: 'I had a dream about flying over mountains and seeing beautiful landscapes below.',
      })
      expect(result.success).toBe(true)
    })

    it('should reject dream too short', () => {
      const result = DreamRequestSchema.safeParse({
        dream: 'short',
      })
      expect(result.success).toBe(false)
    })

    it('should accept with optional arrays', () => {
      const result = DreamRequestSchema.safeParse({
        dream: 'I had a dream about flying over mountains and seeing beautiful landscapes below.',
        symbols: ['flying', 'mountains'],
        emotions: ['joy', 'freedom'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject script in dream text', () => {
      const result = DreamRequestSchema.safeParse({
        dream: 'I had a dream about <script>alert("xss")</script> flying',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('FeedbackRequestSchema', () => {
    it('should accept valid feedback', () => {
      const result = FeedbackRequestSchema.safeParse({
        recordId: 'record-123',
        rating: 5,
      })
      expect(result.success).toBe(true)
    })

    it('should reject rating below 1', () => {
      const result = FeedbackRequestSchema.safeParse({
        recordId: 'record-123',
        rating: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject rating above 5', () => {
      const result = FeedbackRequestSchema.safeParse({
        recordId: 'record-123',
        rating: 6,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validate function', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
    })

    it('should return success true for valid data', () => {
      const result = validate(testSchema, { name: 'John', age: 30 })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
    })

    it('should return success false for invalid data', () => {
      const result = validate(testSchema, { name: '', age: -1 })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should return field names in errors', () => {
      const result = validate(testSchema, { name: 123, age: 'not a number' })
      expect(result.success).toBe(false)
      const fieldNames = result.errors!.map((e) => e.field)
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('age')
    })

    it('should handle non-ZodError exceptions', () => {
      const badSchema = {
        parse: () => {
          throw new Error('Not a ZodError')
        },
      } as unknown as z.ZodSchema

      const result = validate(badSchema, {})
      expect(result.success).toBe(false)
      expect(result.errors![0].field).toBe('unknown')
    })
  })

  describe('safeValidate function', () => {
    const testSchema = z.object({
      value: z.number(),
    })

    it('should return data for valid input', () => {
      const result = safeValidate(testSchema, { value: 42 })
      expect(result).toEqual({ value: 42 })
    })

    it('should return null for invalid input', () => {
      const result = safeValidate(testSchema, { value: 'not a number' })
      expect(result).toBeNull()
    })
  })

  describe('formatValidationErrors', () => {
    it('should format single error', () => {
      const errors: ValidationError[] = [{ field: 'name', message: 'Required' }]
      const result = formatValidationErrors(errors)
      expect(result).toBe('name: Required')
    })

    it('should format multiple errors', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Required' },
        { field: 'age', message: 'Must be positive' },
      ]
      const result = formatValidationErrors(errors)
      expect(result).toBe('name: Required, age: Must be positive')
    })

    it('should handle empty errors array', () => {
      const result = formatValidationErrors([])
      expect(result).toBe('')
    })
  })

  describe('validationError function', () => {
    it('should create error result with validation error code', () => {
      const errors: ValidationError[] = [{ field: 'email', message: 'Invalid email format' }]
      const result = validationError(errors)

      expect(result.error).toBeDefined()
      expect(result.error!.code).toBe('VALIDATION_ERROR')
      expect(result.error!.details).toEqual(errors)
    })

    it('should format message from errors', () => {
      const errors: ValidationError[] = [
        { field: 'field1', message: 'Error 1' },
        { field: 'field2', message: 'Error 2' },
      ]
      const result = validationError(errors)

      expect(result.error!.message).toBe('field1: Error 1, field2: Error 2')
    })
  })

  describe('Complex Nested Schema Validation', () => {
    it('should validate nested objects', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      })

      const result = validate(nestedSchema, {
        user: {
          profile: {
            name: 'Test',
          },
        },
      })

      expect(result.success).toBe(true)
    })

    it('should report nested field path in errors', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      })

      const result = validate(nestedSchema, {
        user: {
          profile: {
            name: '',
          },
        },
      })

      expect(result.success).toBe(false)
      expect(result.errors![0].field).toBe('user.profile.name')
    })
  })
})
