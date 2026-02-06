/**
 * Saju, Astrology & Destiny Map Schema Tests
 * Comprehensive testing for saju.ts validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  sajuRequestSchema,
  sajuCalculationRequestSchema,
  sajuChatStreamSchema,
  astrologyOptionsSchema,
  astrologyRequestSchema,
  advancedAstrologyOptionsSchema,
  advancedAstrologyRequestSchema,
  astroBirthDataSchema,
  astroChartDataSchema,
  astrologyChatStreamSchema,
  astrologyDetailsSchema,
  precomputeChartRequestSchema,
  destinyMapRequestSchema,
  destinyMapContextSchema,
  destinyMapChatSchema,
  destinyMatrixRequestSchema,
  destinyMatrixReportDataSchema,
  destinyMatrixSaveRequestSchema,
  destinyMatrixCalculationSchema,
  destinyMatrixQuerySchema,
  matrixDataSchema,
  destinyMatrixAiReportSchema,
  destinyMatrixReportSchema,
  sajuFactorsSchema,
  astroFactorsSchema,
  calendarSaveRequestSchema,
  calendarQuerySchema,
  calendarMainQuerySchema,
  calendarPageQuerySchema,
  cacheChartSchema,
  cachedChartDataSchema,
  cacheChartSaveSchema,
  cacheChartDeleteSchema,
  cacheChartGetQuerySchema,
  personDataSchema,
  relationTypeSchema,
  compatibilityPersonInputSchema,
  compatibilityRequestSchema,
  compatibilitySaveRequestSchema,
  compatibilityChatRequestSchema,
  compatibilityAnalysisSchema,
  counselorPersonSchema,
  compatibilityCounselorRequestSchema,
  latlonToTimezoneSchema,
  citiesSearchQuerySchema,
} from '@/lib/api/zodValidation/saju'

describe('Saju Schema Tests', () => {
  describe('sajuRequestSchema', () => {
    const validRequest = {
      birthDate: '1990-05-15',
      birthTime: '10:30',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
    }

    it('should accept valid saju request', () => {
      expect(sajuRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept lunar calendar type', () => {
      expect(sajuRequestSchema.safeParse({ ...validRequest, calendarType: 'lunar' }).success).toBe(true)
    })

    it('should accept optional userTimezone', () => {
      expect(sajuRequestSchema.safeParse({ ...validRequest, userTimezone: 'America/New_York' }).success).toBe(true)
    })

    it('should accept optional locale', () => {
      expect(sajuRequestSchema.safeParse({ ...validRequest, locale: 'ko' }).success).toBe(true)
    })

    it('should reject missing required fields', () => {
      const { gender, ...rest } = validRequest
      expect(sajuRequestSchema.safeParse(rest).success).toBe(false)
    })

    it('should reject invalid calendar type', () => {
      expect(sajuRequestSchema.safeParse({ ...validRequest, calendarType: 'gregorian' }).success).toBe(false)
    })
  })

  describe('sajuCalculationRequestSchema', () => {
    const validRequest = {
      birthDate: '1990-05-15',
      birthTime: '10:30',
      gender: 'female',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
    }

    it('should accept valid calculation request', () => {
      expect(sajuCalculationRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept optional latitude/longitude', () => {
      expect(sajuCalculationRequestSchema.safeParse({
        ...validRequest,
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })
  })

  describe('sajuChatStreamSchema', () => {
    const validRequest = {
      messages: [{ role: 'user', content: 'Tell me about my fortune' }],
    }

    it('should accept valid chat stream request', () => {
      expect(sajuChatStreamSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept saju context', () => {
      expect(sajuChatStreamSchema.safeParse({
        ...validRequest,
        saju: { dayMaster: '갑' },
      }).success).toBe(true)
    })

    it('should accept locale', () => {
      expect(sajuChatStreamSchema.safeParse({ ...validRequest, locale: 'ko' }).success).toBe(true)
      expect(sajuChatStreamSchema.safeParse({ ...validRequest, locale: 'en' }).success).toBe(true)
    })

    it('should reject empty messages', () => {
      expect(sajuChatStreamSchema.safeParse({ messages: [] }).success).toBe(false)
    })

    it('should reject too many messages', () => {
      const tooMany = { messages: Array(101).fill({ role: 'user', content: 'test' }) }
      expect(sajuChatStreamSchema.safeParse(tooMany).success).toBe(false)
    })
  })
})

describe('Astrology Schema Tests', () => {
  describe('astrologyOptionsSchema', () => {
    it('should accept valid options', () => {
      expect(astrologyOptionsSchema.safeParse({
        houseSystem: 'Placidus',
        includeAsteroids: true,
        includeFixedStars: false,
        aspectOrb: 8,
      }).success).toBe(true)
    })

    it('should accept all house systems', () => {
      const systems = ['Placidus', 'WholeSign', 'Koch', 'Equal', 'Campanus']
      systems.forEach(system => {
        expect(astrologyOptionsSchema.safeParse({ houseSystem: system }).success).toBe(true)
      })
    })

    it('should reject invalid aspectOrb', () => {
      expect(astrologyOptionsSchema.safeParse({ aspectOrb: -1 }).success).toBe(false)
      expect(astrologyOptionsSchema.safeParse({ aspectOrb: 16 }).success).toBe(false)
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

    it('should accept valid request', () => {
      expect(astrologyRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should transform string coordinates to numbers', () => {
      const result = astrologyRequestSchema.safeParse({
        ...validRequest,
        latitude: '37.5665',
        longitude: '126.978',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.latitude).toBe('number')
        expect(typeof result.data.longitude).toBe('number')
      }
    })

    it('should accept optional options', () => {
      expect(astrologyRequestSchema.safeParse({
        ...validRequest,
        options: { houseSystem: 'WholeSign' },
      }).success).toBe(true)
    })
  })

  describe('advancedAstrologyRequestSchema', () => {
    const validRequest = {
      birthDate: '1990-05-15',
      birthTime: '10:30',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: 'Asia/Seoul',
      calculationType: 'progressions',
    }

    it('should accept valid advanced request', () => {
      expect(advancedAstrologyRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept all calculation types', () => {
      const types = [
        'asteroids', 'draconic', 'eclipses', 'electional', 'fixed-stars',
        'harmonics', 'lunar-return', 'midpoints', 'progressions', 'rectification',
      ]
      types.forEach(type => {
        expect(advancedAstrologyRequestSchema.safeParse({ ...validRequest, calculationType: type }).success).toBe(true)
      })
    })

    it('should accept optional targetDate', () => {
      expect(advancedAstrologyRequestSchema.safeParse({
        ...validRequest,
        targetDate: '2025-01-01',
      }).success).toBe(true)
    })

    it('should accept optional advanced options', () => {
      expect(advancedAstrologyRequestSchema.safeParse({
        ...validRequest,
        options: { harmonicNumber: 7, progressionType: 'secondary' },
      }).success).toBe(true)
    })
  })

  describe('astrologyChatStreamSchema', () => {
    it('should accept valid chat stream', () => {
      expect(astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'What does my chart say?' }],
      }).success).toBe(true)
    })

    it('should accept birthData', () => {
      expect(astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'test' }],
        birthData: { birthDate: '1990-05-15', birthTime: '10:30' },
      }).success).toBe(true)
    })

    it('should accept chartData', () => {
      expect(astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'test' }],
        chartData: { sunSign: 'Aries', moonSign: 'Taurus' },
      }).success).toBe(true)
    })
  })

  describe('astrologyDetailsSchema', () => {
    it('should accept valid details request', () => {
      expect(astrologyDetailsSchema.safeParse({
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })

    it('should accept optional birthTime', () => {
      expect(astrologyDetailsSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })
  })

  describe('precomputeChartRequestSchema', () => {
    it('should accept valid precompute request', () => {
      expect(precomputeChartRequestSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })

    it('should accept optional gender and timezone', () => {
      expect(precomputeChartRequestSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        gender: 'male',
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })
  })
})

describe('Destiny Map Schema Tests', () => {
  describe('destinyMapRequestSchema', () => {
    const validRequest = {
      birthDate: '1990-05-15',
      birthTime: '10:30',
      gender: 'male',
      timezone: 'Asia/Seoul',
    }

    it('should accept valid request', () => {
      expect(destinyMapRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should default calendarType to solar', () => {
      const result = destinyMapRequestSchema.safeParse(validRequest)
      if (result.success) {
        expect(result.data.calendarType).toBe('solar')
      }
    })

    it('should accept optional coordinates', () => {
      expect(destinyMapRequestSchema.safeParse({
        ...validRequest,
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })
  })

  describe('destinyMapContextSchema', () => {
    it('should accept valid context', () => {
      expect(destinyMapContextSchema.safeParse({
        theme: 'career',
        sessionId: 'session-123',
        previousTopics: ['love', 'health'],
      }).success).toBe(true)
    })

    it('should accept userPreferences', () => {
      expect(destinyMapContextSchema.safeParse({
        userPreferences: {
          detailLevel: 'detailed',
          focusArea: 'career',
        },
      }).success).toBe(true)
    })
  })

  describe('destinyMapChatSchema', () => {
    it('should accept valid chat request', () => {
      expect(destinyMapChatSchema.safeParse({
        messages: [{ role: 'user', content: 'Tell me about my destiny' }],
      }).success).toBe(true)
    })

    it('should accept saju and astro context', () => {
      expect(destinyMapChatSchema.safeParse({
        messages: [{ role: 'user', content: 'test' }],
        saju: { dayMaster: '갑' },
        astro: { sunSign: 'Aries' },
      }).success).toBe(true)
    })
  })
})

describe('Destiny Matrix Schema Tests', () => {
  describe('destinyMatrixRequestSchema', () => {
    it('should accept valid request', () => {
      expect(destinyMatrixRequestSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should accept optional name and gender', () => {
      expect(destinyMatrixRequestSchema.safeParse({
        birthDate: '1990-05-15',
        name: 'John Doe',
        gender: 'male',
      }).success).toBe(true)
    })
  })

  describe('destinyMatrixReportDataSchema', () => {
    it('should accept valid report data', () => {
      expect(destinyMatrixReportDataSchema.safeParse({
        categories: [{ name: 'Career', score: 85 }],
        highlights: ['Strong leadership'],
        warnings: ['Watch for burnout'],
        recommendations: ['Take breaks'],
      }).success).toBe(true)
    })

    it('should accept luckyFactors', () => {
      expect(destinyMatrixReportDataSchema.safeParse({
        luckyFactors: {
          colors: ['blue', 'green'],
          numbers: [7, 9],
          directions: ['East', 'North'],
        },
      }).success).toBe(true)
    })
  })

  describe('destinyMatrixSaveRequestSchema', () => {
    it('should accept valid timing report', () => {
      expect(destinyMatrixSaveRequestSchema.safeParse({
        reportType: 'timing',
        period: 'monthly',
        reportData: {},
        title: 'Monthly Fortune Report',
      }).success).toBe(true)
    })

    it('should accept valid themed report', () => {
      expect(destinyMatrixSaveRequestSchema.safeParse({
        reportType: 'themed',
        theme: 'love',
        reportData: {},
        title: 'Love Compatibility Report',
      }).success).toBe(true)
    })

    it('should reject timing report without period', () => {
      expect(destinyMatrixSaveRequestSchema.safeParse({
        reportType: 'timing',
        reportData: {},
        title: 'Report',
      }).success).toBe(false)
    })

    it('should reject themed report without theme', () => {
      expect(destinyMatrixSaveRequestSchema.safeParse({
        reportType: 'themed',
        reportData: {},
        title: 'Report',
      }).success).toBe(false)
    })
  })

  describe('destinyMatrixCalculationSchema', () => {
    it('should accept with birthDate', () => {
      expect(destinyMatrixCalculationSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should accept with dayMasterElement', () => {
      expect(destinyMatrixCalculationSchema.safeParse({
        dayMasterElement: '목',
      }).success).toBe(true)
    })

    it('should reject without birthDate or dayMasterElement', () => {
      expect(destinyMatrixCalculationSchema.safeParse({
        birthTime: '10:30',
      }).success).toBe(false)
    })

    it('should accept complex calculation data', () => {
      expect(destinyMatrixCalculationSchema.safeParse({
        birthDate: '1990-05-15',
        pillarElements: ['목', '화', '토', '금'],
        yongsin: ['수', '금'],
        dominantWesternElement: 'fire',
      }).success).toBe(true)
    })
  })

  describe('matrixDataSchema', () => {
    it('should accept valid matrix data', () => {
      expect(matrixDataSchema.safeParse({
        lifePathNumber: 7,
        destinyNumber: 9,
        soulUrge: 3,
        personality: 5,
        birthday: 15,
      }).success).toBe(true)
    })

    it('should accept matrixGrid and challenges', () => {
      expect(matrixDataSchema.safeParse({
        matrixGrid: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        challenges: [3, 1, 2, 4],
        pinnacles: [5, 6, 7, 8],
      }).success).toBe(true)
    })
  })
})

describe('Calendar Schema Tests', () => {
  describe('sajuFactorsSchema', () => {
    it('should accept valid saju factors', () => {
      expect(sajuFactorsSchema.safeParse({
        dayMaster: '갑',
        currentDaeun: '을미',
        favorableElements: ['수', '목'],
        unfavorableElements: ['화'],
      }).success).toBe(true)
    })
  })

  describe('astroFactorsSchema', () => {
    it('should accept valid astro factors', () => {
      expect(astroFactorsSchema.safeParse({
        sunSign: 'Aries',
        moonPhase: 'Full Moon',
        mercuryRetrograde: true,
        voidOfCourseMoon: false,
      }).success).toBe(true)
    })
  })

  describe('calendarSaveRequestSchema', () => {
    it('should accept valid save request', () => {
      expect(calendarSaveRequestSchema.safeParse({
        date: '2024-06-15',
        grade: 4,
        score: 85,
        title: 'Good Day for Career',
      }).success).toBe(true)
    })

    it('should accept full data', () => {
      expect(calendarSaveRequestSchema.safeParse({
        date: '2024-06-15',
        grade: 5,
        score: 95,
        title: 'Excellent Day',
        description: 'Very auspicious day',
        summary: 'Great for new beginnings',
        categories: ['career', 'love'],
        bestTimes: ['09:00', '14:00'],
        sajuFactors: { dayMaster: '갑' },
        astroFactors: { sunSign: 'Leo' },
        recommendations: ['Start new projects'],
        warnings: ['Avoid conflicts'],
      }).success).toBe(true)
    })
  })

  describe('calendarQuerySchema', () => {
    it('should accept valid query', () => {
      expect(calendarQuerySchema.safeParse({
        date: '2024-06-15',
      }).success).toBe(true)
    })

    it('should transform year string to number', () => {
      const result = calendarQuerySchema.safeParse({ year: '2024' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.year).toBe(2024)
      }
    })
  })

  describe('calendarMainQuerySchema', () => {
    it('should accept valid main query', () => {
      expect(calendarMainQuerySchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should use defaults', () => {
      const result = calendarMainQuerySchema.safeParse({ birthDate: '1990-05-15' })
      if (result.success) {
        expect(result.data.birthTime).toBe('12:00')
        expect(result.data.birthPlace).toBe('Seoul')
        expect(result.data.gender).toBe('male')
        expect(result.data.locale).toBe('ko')
      }
    })
  })
})

describe('Cache Chart Schema Tests', () => {
  describe('cacheChartSchema', () => {
    it('should accept valid cache chart request', () => {
      expect(cacheChartSchema.safeParse({
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })
  })

  describe('cacheChartSaveSchema', () => {
    it('should accept valid save request', () => {
      expect(cacheChartSaveSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        data: {
          calculatedAt: '2024-06-15T10:30:00Z',
        },
      }).success).toBe(true)
    })
  })
})

describe('Compatibility Schema Tests', () => {
  describe('personDataSchema', () => {
    it('should accept valid person data', () => {
      expect(personDataSchema.safeParse({
        name: 'John',
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })
  })

  describe('relationTypeSchema', () => {
    it('should accept valid relation types', () => {
      expect(relationTypeSchema.safeParse('friend').success).toBe(true)
      expect(relationTypeSchema.safeParse('lover').success).toBe(true)
      expect(relationTypeSchema.safeParse('other').success).toBe(true)
    })

    it('should reject invalid relation type', () => {
      expect(relationTypeSchema.safeParse('enemy').success).toBe(false)
    })
  })

  describe('compatibilityPersonInputSchema', () => {
    const validPerson = {
      date: '1990-05-15',
      time: '10:30',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }

    it('should accept valid person', () => {
      expect(compatibilityPersonInputSchema.safeParse(validPerson).success).toBe(true)
    })

    it('should require relationNoteToP1 when relationToP1 is other', () => {
      expect(compatibilityPersonInputSchema.safeParse({
        ...validPerson,
        relationToP1: 'other',
      }).success).toBe(false)

      expect(compatibilityPersonInputSchema.safeParse({
        ...validPerson,
        relationToP1: 'other',
        relationNoteToP1: 'Business partner',
      }).success).toBe(true)
    })
  })

  describe('compatibilityRequestSchema', () => {
    const person1 = {
      date: '1990-05-15',
      time: '10:30',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }
    const person2 = {
      ...person1,
      date: '1992-08-20',
      relationToP1: 'lover',
    }

    it('should accept valid request', () => {
      expect(compatibilityRequestSchema.safeParse({
        persons: [person1, person2],
      }).success).toBe(true)
    })

    it('should reject single person', () => {
      expect(compatibilityRequestSchema.safeParse({
        persons: [person1],
      }).success).toBe(false)
    })

    it('should reject more than 4 persons', () => {
      const persons = Array(5).fill(null).map((_, i) => ({
        ...person1,
        date: `199${i}-01-01`,
        relationToP1: i > 0 ? 'friend' : undefined,
      }))
      expect(compatibilityRequestSchema.safeParse({ persons }).success).toBe(false)
    })
  })

  describe('compatibilitySaveRequestSchema', () => {
    it('should accept valid save request', () => {
      expect(compatibilitySaveRequestSchema.safeParse({
        people: [
          { name: 'John', birthDate: '1990-05-15', birthTime: '10:30', latitude: 37.5, longitude: 126.9, timezone: 'Asia/Seoul' },
          { name: 'Jane', birthDate: '1992-08-20', birthTime: '14:00', latitude: 37.5, longitude: 126.9, timezone: 'Asia/Seoul' },
        ],
        report: 'Compatibility analysis report content',
        compatibilityScore: 85,
      }).success).toBe(true)
    })
  })

  describe('compatibilityChatRequestSchema', () => {
    it('should accept valid chat request', () => {
      expect(compatibilityChatRequestSchema.safeParse({
        persons: [
          { name: 'John', date: '1990-05-15' },
          { name: 'Jane', date: '1992-08-20' },
        ],
        messages: [{ role: 'user', content: 'How compatible are we?' }],
      }).success).toBe(true)
    })
  })

  describe('compatibilityAnalysisSchema', () => {
    it('should accept valid analysis request', () => {
      expect(compatibilityAnalysisSchema.safeParse({
        person1: {
          birthDate: '1990-05-15',
          birthTime: '10:30',
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        },
        person2: {
          birthDate: '1992-08-20',
          birthTime: '14:00',
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        },
        analysisType: 'romantic',
      }).success).toBe(true)
    })
  })

  describe('counselorPersonSchema', () => {
    it('should accept valid counselor person', () => {
      expect(counselorPersonSchema.safeParse({
        name: 'John',
        birthDate: '1990-05-15',
        gender: 'male',
        relation: 'self',
      }).success).toBe(true)
    })
  })

  describe('compatibilityCounselorRequestSchema', () => {
    it('should accept valid counselor request', () => {
      expect(compatibilityCounselorRequestSchema.safeParse({
        persons: [
          { name: 'John', birthDate: '1990-05-15' },
          { name: 'Jane', birthDate: '1992-08-20' },
        ],
        lang: 'ko',
      }).success).toBe(true)
    })

    it('should accept saju/astro context', () => {
      expect(compatibilityCounselorRequestSchema.safeParse({
        persons: [{ name: 'John' }, { name: 'Jane' }],
        person1Saju: { dayMaster: '갑' },
        person1Astro: { sunSign: 'Aries' },
      }).success).toBe(true)
    })
  })
})

describe('Utility Schema Tests', () => {
  describe('latlonToTimezoneSchema', () => {
    it('should accept valid coordinates', () => {
      expect(latlonToTimezoneSchema.safeParse({
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      expect(latlonToTimezoneSchema.safeParse({
        latitude: 100,
        longitude: 200,
      }).success).toBe(false)
    })
  })

  describe('citiesSearchQuerySchema', () => {
    it('should accept valid query', () => {
      expect(citiesSearchQuerySchema.safeParse({
        q: 'Seoul',
      }).success).toBe(true)
    })

    it('should use default limit', () => {
      const result = citiesSearchQuerySchema.safeParse({ q: 'Tokyo' })
      if (result.success) {
        expect(result.data.limit).toBe(10)
      }
    })

    it('should reject empty query', () => {
      expect(citiesSearchQuerySchema.safeParse({ q: '' }).success).toBe(false)
    })

    it('should reject too long query', () => {
      expect(citiesSearchQuerySchema.safeParse({ q: 'a'.repeat(101) }).success).toBe(false)
    })
  })
})
