/**
 * Zod Validation Tests
 * API 입력 검증 스키마 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  latitudeSchema,
  longitudeSchema,
  genderSchema,
  localeSchema,
  calendarTypeSchema,
  birthInfoSchema,
  astrologyRequestSchema,
  sajuRequestSchema,
  tarotCardSchema,
  tarotInterpretRequestSchema,
  dreamAnalysisSchema,
  compatibilityRequestSchema,
  iChingRequestSchema,
  chatMessageRequestSchema,
  paginationParamsSchema,
  sanitizeInput,
} from '@/lib/api/zodValidation'

describe('ZodValidation', () => {
  describe('dateSchema', () => {
    it('should accept valid date format YYYY-MM-DD', () => {
      expect(dateSchema.safeParse('2024-06-15').success).toBe(true)
      expect(dateSchema.safeParse('1990-01-01').success).toBe(true)
      expect(dateSchema.safeParse('2023-12-31').success).toBe(true)
    })

    it('should reject invalid date format', () => {
      expect(dateSchema.safeParse('06-15-2024').success).toBe(false)
      expect(dateSchema.safeParse('2024/06/15').success).toBe(false)
      expect(dateSchema.safeParse('20240615').success).toBe(false)
    })

    it('should reject invalid month values', () => {
      expect(dateSchema.safeParse('2024-00-15').success).toBe(false)
      expect(dateSchema.safeParse('2024-13-15').success).toBe(false)
    })

    it('should reject invalid day values', () => {
      expect(dateSchema.safeParse('2024-06-00').success).toBe(false)
      expect(dateSchema.safeParse('2024-06-32').success).toBe(false)
    })

    it('should reject impossible dates like Feb 30', () => {
      expect(dateSchema.safeParse('2024-02-30').success).toBe(false)
      expect(dateSchema.safeParse('2023-02-29').success).toBe(false) // Non-leap year
    })

    it('should accept Feb 29 on leap years', () => {
      expect(dateSchema.safeParse('2024-02-29').success).toBe(true)
      expect(dateSchema.safeParse('2000-02-29').success).toBe(true)
    })
  })

  describe('timeSchema', () => {
    it('should accept valid 24-hour time format', () => {
      expect(timeSchema.safeParse('00:00').success).toBe(true)
      expect(timeSchema.safeParse('12:30').success).toBe(true)
      expect(timeSchema.safeParse('23:59').success).toBe(true)
    })

    it('should accept valid 12-hour time format with AM/PM', () => {
      expect(timeSchema.safeParse('10:30 AM').success).toBe(true)
      expect(timeSchema.safeParse('12:00 PM').success).toBe(true)
      expect(timeSchema.safeParse('11:59PM').success).toBe(true)
    })

    it('should reject invalid time format', () => {
      expect(timeSchema.safeParse('24:00').success).toBe(false)
      expect(timeSchema.safeParse('12:60').success).toBe(false)
      expect(timeSchema.safeParse('1230').success).toBe(false)
    })

    it('should accept single digit hour', () => {
      expect(timeSchema.safeParse('9:30').success).toBe(true)
      expect(timeSchema.safeParse('5:00 AM').success).toBe(true)
    })
  })

  describe('timezoneSchema', () => {
    it('should accept valid timezone strings', () => {
      expect(timezoneSchema.safeParse('Asia/Seoul').success).toBe(true)
      expect(timezoneSchema.safeParse('America/New_York').success).toBe(true)
      expect(timezoneSchema.safeParse('UTC').success).toBe(true)
    })

    it('should reject empty timezone', () => {
      expect(timezoneSchema.safeParse('').success).toBe(false)
    })

    it('should reject timezone with invalid characters', () => {
      expect(timezoneSchema.safeParse('Asia/Seoul!').success).toBe(false)
      expect(timezoneSchema.safeParse('Asia Seoul').success).toBe(false)
    })
  })

  describe('latitudeSchema', () => {
    it('should accept valid latitude values', () => {
      expect(latitudeSchema.safeParse(0).success).toBe(true)
      expect(latitudeSchema.safeParse(37.5665).success).toBe(true)
      expect(latitudeSchema.safeParse(-33.8688).success).toBe(true)
      expect(latitudeSchema.safeParse(90).success).toBe(true)
      expect(latitudeSchema.safeParse(-90).success).toBe(true)
    })

    it('should reject out of range latitude', () => {
      expect(latitudeSchema.safeParse(91).success).toBe(false)
      expect(latitudeSchema.safeParse(-91).success).toBe(false)
    })
  })

  describe('longitudeSchema', () => {
    it('should accept valid longitude values', () => {
      expect(longitudeSchema.safeParse(0).success).toBe(true)
      expect(longitudeSchema.safeParse(126.978).success).toBe(true)
      expect(longitudeSchema.safeParse(-122.4194).success).toBe(true)
      expect(longitudeSchema.safeParse(180).success).toBe(true)
      expect(longitudeSchema.safeParse(-180).success).toBe(true)
    })

    it('should reject out of range longitude', () => {
      expect(longitudeSchema.safeParse(181).success).toBe(false)
      expect(longitudeSchema.safeParse(-181).success).toBe(false)
    })
  })

  describe('genderSchema', () => {
    it('should accept valid gender values', () => {
      expect(genderSchema.safeParse('Male').success).toBe(true)
      expect(genderSchema.safeParse('Female').success).toBe(true)
      expect(genderSchema.safeParse('Other').success).toBe(true)
      expect(genderSchema.safeParse('male').success).toBe(true)
      expect(genderSchema.safeParse('female').success).toBe(true)
    })

    it('should reject invalid gender values', () => {
      expect(genderSchema.safeParse('M').success).toBe(false)
      expect(genderSchema.safeParse('unknown').success).toBe(false)
    })
  })

  describe('localeSchema', () => {
    it('should accept supported locales', () => {
      expect(localeSchema.safeParse('ko').success).toBe(true)
      expect(localeSchema.safeParse('en').success).toBe(true)
      expect(localeSchema.safeParse('ja').success).toBe(true)
      expect(localeSchema.safeParse('zh').success).toBe(true)
    })

    it('should reject unsupported locales', () => {
      expect(localeSchema.safeParse('kr').success).toBe(false)
      expect(localeSchema.safeParse('us').success).toBe(false)
    })
  })

  describe('calendarTypeSchema', () => {
    it('should accept valid calendar types', () => {
      expect(calendarTypeSchema.safeParse('solar').success).toBe(true)
      expect(calendarTypeSchema.safeParse('lunar').success).toBe(true)
    })

    it('should reject invalid calendar types', () => {
      expect(calendarTypeSchema.safeParse('gregorian').success).toBe(false)
    })
  })

  describe('birthInfoSchema', () => {
    const validBirthInfo = {
      birthDate: '1990-05-15',
      birthTime: '10:30',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: 'Asia/Seoul',
    }

    it('should accept valid birth info', () => {
      const result = birthInfoSchema.safeParse(validBirthInfo)
      expect(result.success).toBe(true)
    })

    it('should accept birth info with optional fields', () => {
      const withOptional = {
        ...validBirthInfo,
        gender: 'Male',
        calendarType: 'solar',
        userTimezone: 'Asia/Seoul',
      }
      expect(birthInfoSchema.safeParse(withOptional).success).toBe(true)
    })

    it('should reject incomplete birth info', () => {
      const incomplete = {
        birthDate: '1990-05-15',
        birthTime: '10:30',
      }
      expect(birthInfoSchema.safeParse(incomplete).success).toBe(false)
    })
  })

  describe('astrologyRequestSchema', () => {
    const validRequest = {
      date: '2024-06-15',
      time: '10:30',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }

    it('should accept valid astrology request', () => {
      expect(astrologyRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept string latitude/longitude and transform', () => {
      const stringCoords = {
        ...validRequest,
        latitude: '37.5665',
        longitude: '126.978',
      }
      const result = astrologyRequestSchema.safeParse(stringCoords)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.latitude).toBe('number')
        expect(typeof result.data.longitude).toBe('number')
      }
    })

    it('should accept optional locale', () => {
      const withLocale = { ...validRequest, locale: 'ko' }
      expect(astrologyRequestSchema.safeParse(withLocale).success).toBe(true)
    })
  })

  describe('sajuRequestSchema', () => {
    const validRequest = {
      birthDate: '1990-05-15',
      birthTime: '10:30',
      gender: 'Male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
    }

    it('should accept valid saju request', () => {
      expect(sajuRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should reject missing required fields', () => {
      const missingGender = {
        birthDate: '1990-05-15',
        birthTime: '10:30',
        calendarType: 'solar',
        timezone: 'Asia/Seoul',
      }
      expect(sajuRequestSchema.safeParse(missingGender).success).toBe(false)
    })
  })

  describe('tarotCardSchema', () => {
    const validCard = {
      name: 'The Fool',
      isReversed: false,
      position: 'Past',
    }

    it('should accept valid tarot card', () => {
      expect(tarotCardSchema.safeParse(validCard).success).toBe(true)
    })

    it('should accept card with Korean names', () => {
      const koreanCard = {
        ...validCard,
        nameKo: '바보',
        positionKo: '과거',
        meaningKo: '새로운 시작',
        keywordsKo: ['시작', '순수'],
      }
      expect(tarotCardSchema.safeParse(koreanCard).success).toBe(true)
    })

    it('should reject empty name', () => {
      const emptyName = { ...validCard, name: '' }
      expect(tarotCardSchema.safeParse(emptyName).success).toBe(false)
    })
  })

  describe('tarotInterpretRequestSchema', () => {
    const validRequest = {
      categoryId: 'love',
      spreadId: 'three-card',
      spreadTitle: 'Three Card Spread',
      cards: [
        { name: 'The Fool', isReversed: false, position: 'Past' },
        { name: 'The Magician', isReversed: true, position: 'Present' },
        { name: 'The High Priestess', isReversed: false, position: 'Future' },
      ],
    }

    it('should accept valid tarot interpret request', () => {
      expect(tarotInterpretRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should default language to ko', () => {
      const result = tarotInterpretRequestSchema.safeParse(validRequest)
      if (result.success) {
        expect(result.data.language).toBe('ko')
      }
    })

    it('should reject empty cards array', () => {
      const emptyCards = { ...validRequest, cards: [] }
      expect(tarotInterpretRequestSchema.safeParse(emptyCards).success).toBe(false)
    })

    it('should reject too many cards', () => {
      const tooManyCards = {
        ...validRequest,
        cards: Array(16).fill({ name: 'Card', isReversed: false, position: 'Pos' }),
      }
      expect(tarotInterpretRequestSchema.safeParse(tooManyCards).success).toBe(false)
    })
  })

  describe('dreamAnalysisSchema', () => {
    it('should accept valid dream description', () => {
      const valid = { dream: 'I dreamed about flying over mountains' }
      expect(dreamAnalysisSchema.safeParse(valid).success).toBe(true)
    })

    it('should reject too short dream', () => {
      const tooShort = { dream: 'short' }
      expect(dreamAnalysisSchema.safeParse(tooShort).success).toBe(false)
    })

    it('should trim whitespace', () => {
      const withWhitespace = { dream: '   I dreamed about flying   ' }
      const result = dreamAnalysisSchema.safeParse(withWhitespace)
      if (result.success) {
        expect(result.data.dream).toBe('I dreamed about flying')
      }
    })

    it('should accept optional birthInfo', () => {
      const withBirthInfo = {
        dream: 'I dreamed about flying over mountains',
        birthInfo: {
          birthDate: '1990-05-15',
          birthTime: '10:30',
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        },
      }
      expect(dreamAnalysisSchema.safeParse(withBirthInfo).success).toBe(true)
    })
  })

  describe('compatibilityRequestSchema', () => {
    const validPerson1 = {
      date: '1990-05-15',
      time: '10:30',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }

    const validPerson2 = {
      date: '1992-08-20',
      time: '14:00',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      relationToP1: 'lover',
    }

    it('should accept valid compatibility request with persons array', () => {
      const valid = {
        persons: [validPerson1, validPerson2],
      }
      expect(compatibilityRequestSchema.safeParse(valid).success).toBe(true)
    })

    it('should reject when person after first is missing relationToP1', () => {
      const missingRelation = {
        persons: [validPerson1, { ...validPerson1, date: '1992-08-20' }],
      }
      expect(compatibilityRequestSchema.safeParse(missingRelation).success).toBe(false)
    })

    it('should reject fewer than 2 persons', () => {
      const tooFew = {
        persons: [validPerson1],
      }
      expect(compatibilityRequestSchema.safeParse(tooFew).success).toBe(false)
    })
  })

  describe('iChingRequestSchema', () => {
    it('should accept valid I Ching request', () => {
      const valid = { question: 'What should I focus on?' }
      expect(iChingRequestSchema.safeParse(valid).success).toBe(true)
    })

    it('should accept hexagram number 1-64', () => {
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 1 }).success).toBe(
        true
      )
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 64 }).success).toBe(
        true
      )
    })

    it('should reject hexagram number out of range', () => {
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 0 }).success).toBe(
        false
      )
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 65 }).success).toBe(
        false
      )
    })

    it('should accept changing lines 1-6', () => {
      const withLines = {
        question: 'Test',
        changingLines: [1, 3, 6],
      }
      expect(iChingRequestSchema.safeParse(withLines).success).toBe(true)
    })

    it('should trim question whitespace', () => {
      const withWhitespace = { question: '  What should I do?  ' }
      const result = iChingRequestSchema.safeParse(withWhitespace)
      if (result.success) {
        expect(result.data.question).toBe('What should I do?')
      }
    })
  })

  describe('chatMessageRequestSchema', () => {
    it('should accept valid chat message', () => {
      const valid = { message: 'Hello, how are you?' }
      expect(chatMessageRequestSchema.safeParse(valid).success).toBe(true)
    })

    it('should accept valid UUID for conversationId', () => {
      const withId = {
        message: 'Hello',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      }
      expect(chatMessageRequestSchema.safeParse(withId).success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const invalidId = {
        message: 'Hello',
        conversationId: 'not-a-uuid',
      }
      expect(chatMessageRequestSchema.safeParse(invalidId).success).toBe(false)
    })

    it('should reject empty message', () => {
      const empty = { message: '' }
      expect(chatMessageRequestSchema.safeParse(empty).success).toBe(false)
    })

    it('should trim message', () => {
      const withWhitespace = { message: '  Hello  ' }
      const result = chatMessageRequestSchema.safeParse(withWhitespace)
      if (result.success) {
        expect(result.data.message).toBe('Hello')
      }
    })
  })

  describe('paginationParamsSchema', () => {
    it('should use default values', () => {
      const result = paginationParamsSchema.safeParse({})
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept custom values', () => {
      const custom = { limit: 50, offset: 10, sortBy: 'createdAt', sortOrder: 'asc' as const }
      const result = paginationParamsSchema.safeParse(custom)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(10)
      }
    })

    it('should reject offset less than 0', () => {
      expect(paginationParamsSchema.safeParse({ offset: -1 }).success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      expect(paginationParamsSchema.safeParse({ limit: 101 }).success).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello')
    })

    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
    })

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
    })

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)')
      expect(sanitizeInput('onerror=malicious()')).toBe('malicious()')
    })

    it('should truncate to max length', () => {
      const longInput = 'a'.repeat(20000)
      expect(sanitizeInput(longInput).length).toBe(10000)
    })

    it('should respect custom max length', () => {
      const input = 'hello world'
      expect(sanitizeInput(input, 5)).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('')
    })

    it('should handle normal text without modification', () => {
      const normal = 'This is a normal message about my dream.'
      expect(sanitizeInput(normal)).toBe(normal)
    })
  })
})
