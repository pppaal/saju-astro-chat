/**
 * Composables Schema Tests
 * Comprehensive testing for composables.ts validation schemas and helpers
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  withBirthInfo,
  withLocation,
  withOptionalLocation,
  withFullBirthInfo,
  withChatMessages,
  withLocale,
  withSajuContext,
  withAstroContext,
  withDualContext,
  withPagination,
  birthDataBaseSchema,
  requiredBirthDataSchema,
  chatRequestBaseSchema,
  chatWithContextSchema,
  saveRequestBaseSchema,
  resultResponseBaseSchema,
  createPersonSchema,
  personWithLocationSchema,
  minimalPersonSchema,
} from '@/lib/api/zodValidation/composables'

describe('Schema Composition Helper Tests', () => {
  describe('withBirthInfo', () => {
    it('should add birth info fields to base schema', () => {
      const baseSchema = z.object({ name: z.string() })
      const extended = withBirthInfo(baseSchema)

      expect(extended.safeParse({
        name: 'John',
        birthDate: '1990-05-15',
        birthTime: '10:30',
      }).success).toBe(true)
    })

    it('should make gender optional', () => {
      const baseSchema = z.object({ id: z.number() })
      const extended = withBirthInfo(baseSchema)

      expect(extended.safeParse({
        id: 1,
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'male',
      }).success).toBe(true)

      expect(extended.safeParse({
        id: 1,
        birthDate: '1990-05-15',
        birthTime: '10:30',
      }).success).toBe(true)
    })
  })

  describe('withLocation', () => {
    it('should add location fields to base schema', () => {
      const baseSchema = z.object({ name: z.string() })
      const extended = withLocation(baseSchema)

      expect(extended.safeParse({
        name: 'Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      const baseSchema = z.object({ name: z.string() })
      const extended = withLocation(baseSchema)

      expect(extended.safeParse({
        name: 'Test',
        latitude: 91,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(false)
    })
  })

  describe('withOptionalLocation', () => {
    it('should add optional location fields', () => {
      const baseSchema = z.object({ name: z.string() })
      const extended = withOptionalLocation(baseSchema)

      expect(extended.safeParse({
        name: 'Test',
      }).success).toBe(true)

      expect(extended.safeParse({
        name: 'Test',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })
  })

  describe('withFullBirthInfo', () => {
    it('should add complete birth and location info', () => {
      const baseSchema = z.object({ name: z.string() })
      const extended = withFullBirthInfo(baseSchema)

      expect(extended.safeParse({
        name: 'John',
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should include optional calendarType and userTimezone', () => {
      const baseSchema = z.object({ id: z.number() })
      const extended = withFullBirthInfo(baseSchema)

      expect(extended.safeParse({
        id: 1,
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        calendarType: 'lunar',
        userTimezone: 'America/New_York',
      }).success).toBe(true)
    })
  })

  describe('withChatMessages', () => {
    it('should add messages array with defaults', () => {
      const baseSchema = z.object({ theme: z.string() })
      const extended = withChatMessages(baseSchema)

      expect(extended.safeParse({
        theme: 'career',
        messages: [{ role: 'user', content: 'Hello' }],
      }).success).toBe(true)
    })

    it('should respect min/max options', () => {
      const baseSchema = z.object({})
      const extended = withChatMessages(baseSchema, { min: 2, max: 5 })

      expect(extended.safeParse({
        messages: [{ role: 'user', content: 'One' }],
      }).success).toBe(false)

      expect(extended.safeParse({
        messages: [
          { role: 'user', content: 'One' },
          { role: 'assistant', content: 'Two' },
        ],
      }).success).toBe(true)

      expect(extended.safeParse({
        messages: Array(6).fill({ role: 'user', content: 'test' }),
      }).success).toBe(false)
    })
  })

  describe('withLocale', () => {
    it('should add optional locale', () => {
      const baseSchema = z.object({ name: z.string() })
      const extended = withLocale(baseSchema)

      expect(extended.safeParse({ name: 'Test' }).success).toBe(true)
      expect(extended.safeParse({ name: 'Test', locale: 'ko' }).success).toBe(true)
      expect(extended.safeParse({ name: 'Test', locale: 'en' }).success).toBe(true)
    })
  })

  describe('withSajuContext', () => {
    it('should add optional saju context', () => {
      const baseSchema = z.object({ theme: z.string() })
      const extended = withSajuContext(baseSchema)

      expect(extended.safeParse({
        theme: 'career',
      }).success).toBe(true)

      expect(extended.safeParse({
        theme: 'career',
        saju: { dayMaster: '갑', dayMasterElement: '목' },
      }).success).toBe(true)
    })
  })

  describe('withAstroContext', () => {
    it('should add optional astro context', () => {
      const baseSchema = z.object({ theme: z.string() })
      const extended = withAstroContext(baseSchema)

      expect(extended.safeParse({
        theme: 'love',
        astro: { sunSign: 'Aries', moonSign: 'Cancer' },
      }).success).toBe(true)
    })
  })

  describe('withDualContext', () => {
    it('should add both saju and astro context', () => {
      const baseSchema = z.object({ question: z.string() })
      const extended = withDualContext(baseSchema)

      expect(extended.safeParse({
        question: 'What is my fortune?',
        saju: { dayMaster: '갑' },
        astro: { sunSign: 'Leo' },
      }).success).toBe(true)
    })
  })

  describe('withPagination', () => {
    it('should add pagination fields with defaults', () => {
      const baseSchema = z.object({ filter: z.string().optional() })
      const extended = withPagination(baseSchema)

      const result = extended.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept custom pagination values', () => {
      const baseSchema = z.object({})
      const extended = withPagination(baseSchema)

      const result = extended.safeParse({ limit: 50, offset: 100 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(100)
      }
    })

    it('should reject invalid pagination', () => {
      const baseSchema = z.object({})
      const extended = withPagination(baseSchema)

      expect(extended.safeParse({ limit: 0 }).success).toBe(false)
      expect(extended.safeParse({ limit: 101 }).success).toBe(false)
      expect(extended.safeParse({ offset: -1 }).success).toBe(false)
    })
  })
})

describe('Pre-composed Schema Tests', () => {
  describe('birthDataBaseSchema', () => {
    it('should accept valid birth data', () => {
      expect(birthDataBaseSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should accept full birth data', () => {
      expect(birthDataBaseSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'female',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        locale: 'ko',
      }).success).toBe(true)
    })

    it('should make most fields optional', () => {
      const result = birthDataBaseSchema.safeParse({
        birthDate: '1990-05-15',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('requiredBirthDataSchema', () => {
    it('should require all fields except locale', () => {
      expect(requiredBirthDataSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'male',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should reject missing required fields', () => {
      expect(requiredBirthDataSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
      }).success).toBe(false)
    })
  })

  describe('chatRequestBaseSchema', () => {
    it('should accept valid chat request', () => {
      expect(chatRequestBaseSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      }).success).toBe(true)
    })

    it('should reject empty messages', () => {
      expect(chatRequestBaseSchema.safeParse({
        messages: [],
      }).success).toBe(false)
    })

    it('should reject too many messages', () => {
      expect(chatRequestBaseSchema.safeParse({
        messages: Array(51).fill({ role: 'user', content: 'test' }),
      }).success).toBe(false)
    })

    it('should accept locale ko or en', () => {
      expect(chatRequestBaseSchema.safeParse({
        messages: [{ role: 'user', content: 'test' }],
        locale: 'ko',
      }).success).toBe(true)

      expect(chatRequestBaseSchema.safeParse({
        messages: [{ role: 'user', content: 'test' }],
        locale: 'en',
      }).success).toBe(true)
    })
  })

  describe('chatWithContextSchema', () => {
    it('should accept chat with saju/astro context', () => {
      expect(chatWithContextSchema.safeParse({
        messages: [{ role: 'user', content: 'Tell me about my fortune' }],
        saju: { dayMaster: '갑', geokguk: '건록격' },
        astro: { sunSign: 'Aries', moonSign: 'Cancer' },
      }).success).toBe(true)
    })
  })

  describe('saveRequestBaseSchema', () => {
    it('should accept empty object', () => {
      expect(saveRequestBaseSchema.safeParse({}).success).toBe(true)
    })

    it('should accept locale', () => {
      expect(saveRequestBaseSchema.safeParse({ locale: 'ko' }).success).toBe(true)
    })
  })

  describe('resultResponseBaseSchema', () => {
    it('should accept success response', () => {
      expect(resultResponseBaseSchema.safeParse({
        success: true,
        data: { result: 'test' },
      }).success).toBe(true)
    })

    it('should accept error response', () => {
      expect(resultResponseBaseSchema.safeParse({
        success: false,
        error: 'Something went wrong',
      }).success).toBe(true)
    })
  })
})

describe('Person Schema Factory Tests', () => {
  describe('createPersonSchema', () => {
    it('should create schema with all optional by default', () => {
      const schema = createPersonSchema()

      expect(schema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should require name when nameRequired is true', () => {
      const schema = createPersonSchema({ nameRequired: true })

      expect(schema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(false)

      expect(schema.safeParse({
        name: 'John',
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should require birthTime when birthTimeRequired is true', () => {
      const schema = createPersonSchema({ birthTimeRequired: true })

      expect(schema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(false)

      expect(schema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
      }).success).toBe(true)
    })

    it('should require location when locationRequired is true', () => {
      const schema = createPersonSchema({ locationRequired: true })

      expect(schema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(false)

      expect(schema.safeParse({
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should work with all requirements', () => {
      const schema = createPersonSchema({
        nameRequired: true,
        birthTimeRequired: true,
        locationRequired: true,
      })

      expect(schema.safeParse({
        name: 'Jane',
        birthDate: '1992-08-20',
        birthTime: '14:00',
        latitude: 35.1796,
        longitude: 129.0756,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })
  })

  describe('personWithLocationSchema', () => {
    it('should require name, birthTime, and location', () => {
      expect(personWithLocationSchema.safeParse({
        name: 'John Doe',
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should reject missing required fields', () => {
      expect(personWithLocationSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(false)
    })
  })

  describe('minimalPersonSchema', () => {
    it('should accept just birthDate', () => {
      expect(minimalPersonSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should accept optional name', () => {
      expect(minimalPersonSchema.safeParse({
        name: 'John',
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should trim name', () => {
      const result = minimalPersonSchema.safeParse({
        name: '  John  ',
        birthDate: '1990-05-15',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John')
      }
    })
  })
})
