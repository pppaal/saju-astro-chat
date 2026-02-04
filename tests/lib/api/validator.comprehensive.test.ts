/**
 * Comprehensive tests for API Validator
 * Tests Zod schemas, validation functions, request parsing, and query parameter handling
 */

import { NextRequest } from 'next/server'
import {
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
  QueryParamsSchema,
  DestinyMapRequestSchema,
  TarotRequestSchema,
  TarotInterpretSchema,
  DreamRequestSchema,
  IChingRequestSchema,
  CalendarQuerySchema,
  CompatibilityRequestSchema,
  FeedbackRequestSchema,
  ChatMessageSchema,
  ChatMessagesSchema,
  validate,
  safeValidate,
  parseAndValidate,
  parseQueryParams,
  formatValidationErrors,
  validationError,
} from '@/lib/api/validator'
import { ErrorCodes } from '@/lib/api/errorHandler'

describe('API Validator', () => {
  describe('DateSchema', () => {
    it('should validate correct date format', () => {
      const result = DateSchema.safeParse('2024-01-15')
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      expect(DateSchema.safeParse('2024/01/15').success).toBe(false)
      expect(DateSchema.safeParse('15-01-2024').success).toBe(false)
      expect(DateSchema.safeParse('2024-1-5').success).toBe(false)
    })

    it('should reject dates outside 1900-2100 range', () => {
      expect(DateSchema.safeParse('1899-12-31').success).toBe(false)
      expect(DateSchema.safeParse('2101-01-01').success).toBe(false)
    })

    it('should validate edge years', () => {
      expect(DateSchema.safeParse('1900-01-01').success).toBe(true)
      expect(DateSchema.safeParse('2100-12-31').success).toBe(true)
    })

    it('should reject clearly invalid dates', () => {
      // Date.parse('2024-13-01') returns NaN, so the refine check rejects it
      expect(DateSchema.safeParse('2024-13-01').success).toBe(false)
      // Date.parse('2024-00-01') returns NaN as well
      expect(DateSchema.safeParse('2024-00-01').success).toBe(false)
    })

    it('should accept Feb 30 (JS Date.parse rolls over to March 1)', () => {
      // Date.parse('2024-02-30') is valid in JS (rolls to March 1)
      // The schema only validates format + parsability + year range
      expect(DateSchema.safeParse('2024-02-30').success).toBe(true)
    })

    it('should handle leap years', () => {
      expect(DateSchema.safeParse('2024-02-29').success).toBe(true)
      // Date.parse('2023-02-29') rolls over to March 1 (still valid in JS)
      expect(DateSchema.safeParse('2023-02-29').success).toBe(true)
    })
  })

  describe('TimeSchema', () => {
    it('should validate correct time format', () => {
      expect(TimeSchema.safeParse('14:30').success).toBe(true)
      expect(TimeSchema.safeParse('00:00').success).toBe(true)
      expect(TimeSchema.safeParse('23:59').success).toBe(true)
    })

    it('should reject invalid time format', () => {
      expect(TimeSchema.safeParse('14:30:00').success).toBe(false)
      expect(TimeSchema.safeParse('2:30').success).toBe(false)
      expect(TimeSchema.safeParse('14:5').success).toBe(false)
    })

    it('should allow invalid time values (no range validation)', () => {
      // Schema only validates format, not range
      expect(TimeSchema.safeParse('25:99').success).toBe(true)
    })
  })

  describe('TimezoneSchema', () => {
    it('should validate valid IANA timezones', () => {
      const validTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Asia/Seoul',
        'UTC',
      ]

      for (const tz of validTimezones) {
        expect(TimezoneSchema.safeParse(tz).success).toBe(true)
      }
    })

    it('should reject invalid timezones', () => {
      expect(TimezoneSchema.safeParse('Invalid/Timezone').success).toBe(false)
      expect(TimezoneSchema.safeParse('GMT+9').success).toBe(false)
      expect(TimezoneSchema.safeParse('').success).toBe(false)
    })
  })

  describe('LocaleSchema', () => {
    it('should validate supported locales', () => {
      const supportedLocales = ['ko', 'en', 'ja', 'zh', 'vi', 'th', 'id', 'de', 'fr', 'es']

      for (const locale of supportedLocales) {
        expect(LocaleSchema.safeParse(locale).success).toBe(true)
      }
    })

    it('should reject unsupported locales', () => {
      expect(LocaleSchema.safeParse('ru').success).toBe(false)
      expect(LocaleSchema.safeParse('pt').success).toBe(false)
      expect(LocaleSchema.safeParse('KO').success).toBe(false)
    })
  })

  describe('LatitudeSchema', () => {
    it('should validate valid latitudes', () => {
      expect(LatitudeSchema.safeParse(0).success).toBe(true)
      expect(LatitudeSchema.safeParse(37.5665).success).toBe(true)
      expect(LatitudeSchema.safeParse(-33.8688).success).toBe(true)
      expect(LatitudeSchema.safeParse(90).success).toBe(true)
      expect(LatitudeSchema.safeParse(-90).success).toBe(true)
    })

    it('should reject out of range latitudes', () => {
      expect(LatitudeSchema.safeParse(91).success).toBe(false)
      expect(LatitudeSchema.safeParse(-91).success).toBe(false)
    })

    it('should reject non-numeric values', () => {
      expect(LatitudeSchema.safeParse('37.5665').success).toBe(false)
      expect(LatitudeSchema.safeParse(null).success).toBe(false)
    })
  })

  describe('LongitudeSchema', () => {
    it('should validate valid longitudes', () => {
      expect(LongitudeSchema.safeParse(0).success).toBe(true)
      expect(LongitudeSchema.safeParse(126.978).success).toBe(true)
      expect(LongitudeSchema.safeParse(-122.4194).success).toBe(true)
      expect(LongitudeSchema.safeParse(180).success).toBe(true)
      expect(LongitudeSchema.safeParse(-180).success).toBe(true)
    })

    it('should reject out of range longitudes', () => {
      expect(LongitudeSchema.safeParse(181).success).toBe(false)
      expect(LongitudeSchema.safeParse(-181).success).toBe(false)
    })
  })

  describe('SafeTextSchema', () => {
    it('should allow safe text', () => {
      expect(SafeTextSchema.safeParse('Hello world').success).toBe(true)
      expect(SafeTextSchema.safeParse('안녕하세요').success).toBe(true)
      expect(SafeTextSchema.safeParse('Test 123').success).toBe(true)
    })

    it('should reject script tags', () => {
      expect(SafeTextSchema.safeParse('<script>alert(1)</script>').success).toBe(false)
      expect(SafeTextSchema.safeParse('Hello<script>bad</script>world').success).toBe(false)
    })

    it('should reject javascript: URLs', () => {
      expect(SafeTextSchema.safeParse('javascript:alert(1)').success).toBe(false)
    })

    it('should reject event handlers', () => {
      expect(SafeTextSchema.safeParse('onclick=alert(1)').success).toBe(false)
      expect(SafeTextSchema.safeParse('onerror=alert(1)').success).toBe(false)
      expect(SafeTextSchema.safeParse('onload=bad()').success).toBe(false)
    })

    it('should reject closing script tags', () => {
      expect(SafeTextSchema.safeParse('</script>').success).toBe(false)
    })

    it('should allow HTML entities', () => {
      expect(SafeTextSchema.safeParse('&lt;script&gt;').success).toBe(true)
    })
  })

  describe('EmailSchema', () => {
    it('should validate correct email formats', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.kr', 'admin+tag@company.org']

      for (const email of validEmails) {
        expect(EmailSchema.safeParse(email).success).toBe(true)
      }
    })

    it('should reject too-short domains', () => {
      // Zod email validator rejects single-char TLDs like a@b.c
      expect(EmailSchema.safeParse('a@b.c').success).toBe(false)
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user name@example.com',
        'user@domain',
      ]

      for (const email of invalidEmails) {
        expect(EmailSchema.safeParse(email).success).toBe(false)
      }
    })
  })

  describe('UuidSchema', () => {
    it('should validate UUID v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ]

      for (const uuid of validUuids) {
        expect(UuidSchema.safeParse(uuid).success).toBe(true)
      }
    })

    it('should reject invalid UUIDs', () => {
      expect(UuidSchema.safeParse('not-a-uuid').success).toBe(false)
      expect(UuidSchema.safeParse('12345678').success).toBe(false)
    })
  })

  describe('BirthDataSchema', () => {
    it('should validate complete birth data', () => {
      const birthData = {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        city: 'Seoul',
        name: 'Test User',
        gender: 'male',
      }

      const result = BirthDataSchema.safeParse(birthData)
      expect(result.success).toBe(true)
    })

    it('should validate minimal birth data', () => {
      const birthData = {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
      }

      const result = BirthDataSchema.safeParse(birthData)
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      expect(
        BirthDataSchema.safeParse({
          birthTime: '14:30',
          latitude: 37.5665,
          longitude: 126.978,
        }).success
      ).toBe(false)
    })

    it('should validate all gender options', () => {
      const genders = ['male', 'female', 'other', 'prefer_not']

      for (const gender of genders) {
        const result = BirthDataSchema.safeParse({
          birthDate: '1990-01-15',
          birthTime: '14:30',
          latitude: 37.5665,
          longitude: 126.978,
          gender,
        })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('PaginationSchema', () => {
    it('should parse pagination with defaults', () => {
      const result = PaginationSchema.parse({})

      // Schema uses offset (default 0) and limit (default 20), not page
      expect(result.offset).toBe(0)
      expect(result.limit).toBe(20)
    })

    it('should coerce string numbers', () => {
      const result = PaginationSchema.parse({
        offset: '5',
        limit: '50',
      })

      expect(result.offset).toBe(5)
      expect(result.limit).toBe(50)
    })

    it('should enforce limits', () => {
      // offset min is 0, so -1 fails
      expect(PaginationSchema.safeParse({ offset: -1 }).success).toBe(false)
      expect(PaginationSchema.safeParse({ limit: 0 }).success).toBe(false)
      expect(PaginationSchema.safeParse({ limit: 101 }).success).toBe(false)
    })

    it('should validate sort order', () => {
      expect(PaginationSchema.parse({ sortOrder: 'asc' }).sortOrder).toBe('asc')
      expect(PaginationSchema.parse({ sortOrder: 'desc' }).sortOrder).toBe('desc')
      expect(PaginationSchema.safeParse({ sortOrder: 'invalid' }).success).toBe(false)
    })
  })

  describe('ChatMessageSchema', () => {
    it('should validate chat messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'system', content: 'You are a helpful assistant' },
      ]

      for (const message of messages) {
        expect(ChatMessageSchema.safeParse(message).success).toBe(true)
      }
    })

    it('should reject empty content', () => {
      expect(ChatMessageSchema.safeParse({ role: 'user', content: '' }).success).toBe(false)
    })

    it('should reject invalid roles', () => {
      expect(ChatMessageSchema.safeParse({ role: 'invalid', content: 'test' }).success).toBe(false)
    })

    it('should enforce content length limit', () => {
      const longContent = 'a'.repeat(10001)
      expect(ChatMessageSchema.safeParse({ role: 'user', content: longContent }).success).toBe(
        false
      )
    })
  })

  describe('ChatMessagesSchema', () => {
    it('should validate message array', () => {
      const messages = [
        { role: 'user', content: 'Question 1' },
        { role: 'assistant', content: 'Answer 1' },
      ]

      expect(ChatMessagesSchema.safeParse(messages).success).toBe(true)
    })

    it('should reject empty array', () => {
      expect(ChatMessagesSchema.safeParse([]).success).toBe(false)
    })

    it('should enforce max messages limit', () => {
      const manyMessages = Array(51)
        .fill(null)
        .map(() => ({ role: 'user', content: 'test' }))

      expect(ChatMessagesSchema.safeParse(manyMessages).success).toBe(false)
    })
  })

  describe('validate()', () => {
    it('should return success for valid data', () => {
      const result = validate(EmailSchema, 'test@example.com')

      expect(result.success).toBe(true)
      expect(result.data).toBe('test@example.com')
      expect(result.errors).toBeUndefined()
    })

    it('should return errors for invalid data', () => {
      const result = validate(EmailSchema, 'invalid-email')

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should format error fields correctly', () => {
      const result = validate(BirthDataSchema, {
        birthDate: 'invalid',
        birthTime: '14:30',
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.some((e) => e.field === 'birthDate')).toBe(true)
    })

    it('should handle nested field errors', () => {
      const schema = BirthDataSchema
      const result = validate(schema, {
        birthDate: '2024-01-15',
        birthTime: 'invalid',
        latitude: 37.5665,
        longitude: 126.978,
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('safeValidate()', () => {
    it('should return data on success', () => {
      const result = safeValidate(EmailSchema, 'test@example.com')

      expect(result).toBe('test@example.com')
    })

    it('should return null on failure', () => {
      const result = safeValidate(EmailSchema, 'invalid')

      expect(result).toBeNull()
    })
  })

  describe('parseAndValidate()', () => {
    it('should parse and validate JSON request body', async () => {
      const body = {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
      }
      const req = new NextRequest('https://api.test.com/endpoint', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await parseAndValidate(req, BirthDataSchema)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
    })

    it('should reject invalid JSON', async () => {
      const req = new NextRequest('https://api.test.com/endpoint', {
        method: 'POST',
        body: 'invalid json{',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await parseAndValidate(req, EmailSchema)

      expect(result.error).toBeDefined()
      expect(result.error!.code).toBe(ErrorCodes.BAD_REQUEST)
    })

    it('should reject payload too large', async () => {
      const largeBody = 'a'.repeat(2000000)
      const req = new NextRequest('https://api.test.com/endpoint', {
        method: 'POST',
        body: largeBody,
      })

      const result = await parseAndValidate(req, EmailSchema, { maxSize: 1000 })

      expect(result.error).toBeDefined()
      expect(result.error!.code).toBe(ErrorCodes.PAYLOAD_TOO_LARGE)
    })

    it('should return validation errors', async () => {
      const body = { email: 'invalid-email' }
      const req = new NextRequest('https://api.test.com/endpoint', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const result = await parseAndValidate(
        req,
        EmailSchema.transform((email) => ({ email }))
      )

      expect(result.error).toBeDefined()
    })
  })

  describe('parseQueryParams()', () => {
    it('should parse query parameters', () => {
      const req = new NextRequest('https://api.test.com/endpoint?offset=2&limit=50')

      const result = parseQueryParams(req, PaginationSchema)

      expect(result.error).toBeUndefined()
      expect(result.data!.offset).toBe(2)
      expect(result.data!.limit).toBe(50)
    })

    it('should apply defaults', () => {
      const req = new NextRequest('https://api.test.com/endpoint')

      const result = parseQueryParams(req, PaginationSchema)

      expect(result.error).toBeUndefined()
      expect(result.data!.offset).toBe(0)
      expect(result.data!.limit).toBe(20)
    })

    it('should return validation errors', () => {
      const req = new NextRequest('https://api.test.com/endpoint?offset=-1&limit=200')

      const result = parseQueryParams(req, PaginationSchema)

      expect(result.error).toBeDefined()
      expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })
  })

  describe('formatValidationErrors()', () => {
    it('should format errors as string', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ]

      const formatted = formatValidationErrors(errors)

      expect(formatted).toBe('email: Invalid email, password: Too short')
    })

    it('should handle single error', () => {
      const errors = [{ field: 'name', message: 'Required' }]

      const formatted = formatValidationErrors(errors)

      expect(formatted).toBe('name: Required')
    })
  })

  describe('validationError()', () => {
    it('should create validation error result', () => {
      const errors = [{ field: 'email', message: 'Invalid' }]

      const result = validationError(errors)

      expect(result.error).toBeDefined()
      expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(result.error!.details).toEqual(errors)
    })
  })

  describe('Complex Schema Tests', () => {
    describe('TarotInterpretSchema', () => {
      it('should validate tarot interpretation request', () => {
        const request = {
          category: 'love',
          spreadId: 'three_card',
          cards: [
            { name: 'The Fool', isReversed: false, position: 'past' },
            { name: 'The Magician', isReversed: true, position: 'present' },
          ],
          language: 'ko',
        }

        const result = TarotInterpretSchema.safeParse(request)
        expect(result.success).toBe(true)
      })

      it('should reject empty cards array', () => {
        const result = TarotInterpretSchema.safeParse({
          cards: [],
          language: 'en',
        })

        expect(result.success).toBe(false)
      })

      it('should enforce card limit', () => {
        const manyCards = Array(100)
          .fill(null)
          .map(() => ({ name: 'Card', isReversed: false }))

        const result = TarotInterpretSchema.safeParse({
          cards: manyCards,
        })

        expect(result.success).toBe(false)
      })
    })

    describe('DreamRequestSchema', () => {
      it('should validate dream analysis request', () => {
        const request = {
          dream: 'I dreamed about flying over a city',
          symbols: ['bird', 'sky', 'city'],
          emotions: ['freedom', 'joy'],
          locale: 'en',
        }

        const result = DreamRequestSchema.safeParse(request)
        expect(result.success).toBe(true)
      })

      it('should reject dreams with XSS attempts', () => {
        const result = DreamRequestSchema.safeParse({
          dream: '<script>alert(1)</script> I had a dream',
          locale: 'en',
        })

        expect(result.success).toBe(false)
      })
    })

    describe('CompatibilityRequestSchema', () => {
      it('should validate compatibility request', () => {
        const request = {
          person1: {
            birthDate: '1990-01-15',
            birthTime: '14:30',
            latitude: 37.5665,
            longitude: 126.978,
          },
          person2: {
            birthDate: '1992-05-20',
            birthTime: '09:15',
            latitude: 35.1796,
            longitude: 129.0756,
          },
          language: 'ko',
          detailLevel: 'detailed',
        }

        const result = CompatibilityRequestSchema.safeParse(request)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null and undefined', () => {
      expect(EmailSchema.safeParse(null).success).toBe(false)
      expect(EmailSchema.safeParse(undefined).success).toBe(false)
    })

    it('should handle numbers for string schemas', () => {
      expect(EmailSchema.safeParse(123).success).toBe(false)
    })

    it('should handle objects for primitive schemas', () => {
      expect(EmailSchema.safeParse({ email: 'test@test.com' }).success).toBe(false)
    })

    it('should handle arrays for object schemas', () => {
      expect(BirthDataSchema.safeParse([]).success).toBe(false)
    })
  })
})
