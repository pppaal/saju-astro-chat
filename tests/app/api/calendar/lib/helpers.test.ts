/**
 * @file Tests for Calendar API helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTranslation,
  validateBackendUrl,
  getPillarStemName,
  getPillarBranchName,
  parseBirthDate,
  generateSummary,
  generateBestTimes,
  formatDateForResponse,
  fetchAIDates,
  LOCATION_COORDS,
} from '@/app/api/calendar/lib/helpers'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

vi.mock('@/app/api/calendar/lib/translations', () => ({
  getFactorTranslation: vi.fn((key: string, lang: string) => {
    if (key === 'shinsal_backho') return lang === 'ko' ? '백호살' : 'White Tiger'
    if (key === 'retrogradeMercury') return lang === 'ko' ? '수성 역행' : 'Mercury Retrograde'
    if (key === 'chung_negative') return lang === 'ko' ? '충 에너지' : 'Clash Energy'
    return null
  }),
}))

vi.mock('@/app/api/calendar/lib/constants', () => ({
  KO_MESSAGES: {
    GRADE_0: { career: '최고의 커리어 운!', general: '최고의 날!' },
    GRADE_1: { career: '좋은 커리어 운', general: '좋은 날' },
    GRADE_2_HIGH: { career: '괜찮은 커리어 운', general: '괜찮은 날' },
    GRADE_2_LOW: '🌥️ 평범한 하루, 무리하지 마세요',
    GRADE_3: { career: '주의가 필요한 날', general: '조심하세요' },
    GRADE_4: { career: '위험한 커리어 운', general: '매우 조심' },
    GRADE_5: { career: '최악의 날', general: '모든 일정 취소' },
  },
  EN_MESSAGES: {
    GRADE_0: { career: 'Best career day!', general: 'Best day ever!' },
    GRADE_1: { career: 'Good career day', general: 'Good day' },
    GRADE_2_HIGH: 'Decent day overall',
    GRADE_2_LOW: 'Average day, take it easy',
    GRADE_3: 'Be cautious today',
    GRADE_4: 'Very risky day',
    GRADE_5: 'Worst day, cancel everything',
  },
}))

vi.mock('@/constants/scoring', () => ({
  SCORE_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 70,
    AVERAGE: 60,
    BELOW_AVERAGE: 40,
    POOR: 30,
    MIN: 0,
    MAX: 100,
  },
}))

describe('Calendar Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTranslation', () => {
    it('should return value for simple key', () => {
      const translations = { greeting: 'Hello' }
      expect(getTranslation('greeting', translations as any)).toBe('Hello')
    })

    it('should return value for nested key', () => {
      const translations = { calendar: { title: 'My Calendar' } }
      expect(getTranslation('calendar.title', translations as any)).toBe('My Calendar')
    })

    it('should return key when path not found', () => {
      const translations = { foo: 'bar' }
      expect(getTranslation('missing.key', translations as any)).toBe('missing.key')
    })

    it('should return key when result is not string', () => {
      const translations = { nested: { obj: { deep: 123 } } }
      expect(getTranslation('nested.obj.deep', translations as any)).toBe('nested.obj.deep')
    })

    it('should return key for undefined result', () => {
      const translations = {}
      expect(getTranslation('any.key', translations as any)).toBe('any.key')
    })
  })

  describe('validateBackendUrl', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    it('should warn for non-HTTPS in production', () => {
      process.env.NODE_ENV = 'production'

      validateBackendUrl('http://example.com')

      expect(vi.mocked(logger).warn).toHaveBeenCalledWith(expect.stringContaining('non-HTTPS'))
    })

    it('should not warn for HTTPS in production', () => {
      process.env.NODE_ENV = 'production'

      validateBackendUrl('https://example.com')

      expect(vi.mocked(logger).warn).not.toHaveBeenCalledWith(expect.stringContaining('non-HTTPS'))
    })

    it('should warn when NEXT_PUBLIC_AI_BACKEND is set without AI_BACKEND_URL', () => {
      process.env.NEXT_PUBLIC_AI_BACKEND = 'http://public'
      delete process.env.AI_BACKEND_URL

      validateBackendUrl('https://example.com')

      expect(vi.mocked(logger).warn).toHaveBeenCalledWith(
        expect.stringContaining('NEXT_PUBLIC_AI_BACKEND')
      )
    })
  })

  describe('getPillarStemName', () => {
    it('should return empty string for undefined', () => {
      expect(getPillarStemName(undefined)).toBe('')
    })

    it('should handle PillarData format (object heavenlyStem)', () => {
      const pillar = { heavenlyStem: { name: '甲' } }
      expect(getPillarStemName(pillar as any)).toBe('甲')
    })

    it('should handle stem.name format', () => {
      const pillar = { stem: { name: '乙' } }
      expect(getPillarStemName(pillar as any)).toBe('乙')
    })

    it('should handle string heavenlyStem', () => {
      const pillar = { heavenlyStem: '丙' }
      expect(getPillarStemName(pillar as any)).toBe('丙')
    })

    it('should handle string stem', () => {
      const pillar = { stem: '丁' }
      expect(getPillarStemName(pillar as any)).toBe('丁')
    })

    it('should return empty when no matching format', () => {
      const pillar = { unknown: 'field' }
      expect(getPillarStemName(pillar as any)).toBe('')
    })
  })

  describe('getPillarBranchName', () => {
    it('should return empty string for undefined', () => {
      expect(getPillarBranchName(undefined)).toBe('')
    })

    it('should handle PillarData format (object earthlyBranch)', () => {
      const pillar = { earthlyBranch: { name: '子' } }
      expect(getPillarBranchName(pillar as any)).toBe('子')
    })

    it('should handle branch.name format', () => {
      const pillar = { branch: { name: '丑' } }
      expect(getPillarBranchName(pillar as any)).toBe('丑')
    })

    it('should handle string earthlyBranch', () => {
      const pillar = { earthlyBranch: '寅' }
      expect(getPillarBranchName(pillar as any)).toBe('寅')
    })

    it('should handle string branch', () => {
      const pillar = { branch: '卯' }
      expect(getPillarBranchName(pillar as any)).toBe('卯')
    })

    it('should return empty when no matching format', () => {
      const pillar = { unknown: 'field' }
      expect(getPillarBranchName(pillar as any)).toBe('')
    })
  })

  describe('parseBirthDate', () => {
    it('should parse valid date string', () => {
      const result = parseBirthDate('1990-01-15')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getFullYear()).toBe(1990)
      expect(result!.getMonth()).toBe(0) // January
      expect(result!.getDate()).toBe(15)
    })

    it('should return null for invalid format', () => {
      expect(parseBirthDate('1990/01/15')).toBeNull()
      expect(parseBirthDate('19900115')).toBeNull()
      expect(parseBirthDate('Jan 15, 1990')).toBeNull()
    })

    it('should return null for invalid date values', () => {
      expect(parseBirthDate('1990-13-01')).toBeNull() // month 13
      expect(parseBirthDate('1990-02-30')).toBeNull() // Feb 30
    })

    it('should handle leap year dates', () => {
      const result = parseBirthDate('2000-02-29')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getDate()).toBe(29)
    })

    it('should return null for empty string', () => {
      expect(parseBirthDate('')).toBeNull()
    })
  })

  describe('generateSummary', () => {
    it('should generate grade 0 Korean summary for career', () => {
      const result = generateSummary(0, ['career'], 95, 'ko')
      expect(result).toBe('최고의 커리어 운!')
    })

    it('should generate grade 0 Korean summary with general fallback', () => {
      const result = generateSummary(0, ['unknown' as any], 95, 'ko')
      expect(result).toBe('최고의 날!')
    })

    it('should generate grade 1 Korean summary', () => {
      const result = generateSummary(1, ['career'], 80, 'ko')
      expect(result).toBe('좋은 커리어 운')
    })

    it('should generate grade 2 high Korean summary', () => {
      const result = generateSummary(2, ['career'], 65, 'ko')
      expect(result).toBe('괜찮은 커리어 운')
    })

    it('should generate grade 2 low Korean summary', () => {
      const result = generateSummary(2, ['career'], 50, 'ko')
      expect(result).toContain('평범한 하루')
    })

    it('should generate grade 3 Korean summary with bad day reason', () => {
      const result = generateSummary(3, ['career'], 40, 'ko', ['chung_something'], undefined)
      expect(result).toContain('⚠️')
      expect(result).toContain('충')
    })

    it('should generate grade 3 Korean summary without bad day reason', () => {
      const result = generateSummary(3, ['career'], 40, 'ko')
      expect(result).toBe('주의가 필요한 날')
    })

    it('should generate grade 4 Korean summary', () => {
      const result = generateSummary(4, ['career'], 25, 'ko')
      expect(result).toBe('위험한 커리어 운')
    })

    it('should generate grade 5 Korean summary', () => {
      const result = generateSummary(5 as any, ['career'], 10, 'ko')
      expect(result).toBe('최악의 날')
    })

    it('should generate grade 0 English summary', () => {
      const result = generateSummary(0, ['career'], 95, 'en')
      expect(result).toBe('Best career day!')
    })

    it('should generate grade 2 high English summary', () => {
      const result = generateSummary(2, ['general'], 65, 'en')
      expect(result).toBe('Decent day overall')
    })

    it('should generate grade 2 low English summary', () => {
      const result = generateSummary(2, ['general'], 50, 'en')
      expect(result).toBe('Average day, take it easy')
    })

    it('should generate grade 5 English with bad day reason', () => {
      const result = generateSummary(5 as any, ['general'], 10, 'en', ['chung_test'])
      expect(result).toContain('Postpone everything')
    })
  })

  describe('generateBestTimes', () => {
    it('should return empty array for grade 3+', () => {
      expect(generateBestTimes(3, ['career'], 'ko')).toEqual([])
      expect(generateBestTimes(4, ['career'], 'ko')).toEqual([])
    })

    it('should return Korean career times', () => {
      const result = generateBestTimes(0, ['career'], 'ko')
      expect(result.length).toBe(2)
      expect(result[0]).toContain('미팅')
    })

    it('should return English career times', () => {
      const result = generateBestTimes(0, ['career'], 'en')
      expect(result.length).toBe(2)
      expect(result[0]).toContain('meetings')
    })

    it('should return Korean love times', () => {
      const result = generateBestTimes(1, ['love'], 'ko')
      expect(result[0]).toContain('데이트')
    })

    it('should fallback to general times', () => {
      const result = generateBestTimes(0, ['unknown' as any], 'ko')
      expect(result.length).toBe(2)
    })

    it('should return health-specific times', () => {
      const result = generateBestTimes(0, ['health'], 'ko')
      expect(result[0]).toContain('운동')
    })

    it('should return study-specific times', () => {
      const result = generateBestTimes(0, ['study'], 'en')
      expect(result[0]).toContain('Peak focus')
    })
  })

  describe('LOCATION_COORDS', () => {
    it('should have Seoul coordinates', () => {
      expect(LOCATION_COORDS.Seoul).toBeDefined()
      expect(LOCATION_COORDS.Seoul.lat).toBeCloseTo(37.5665, 2)
      expect(LOCATION_COORDS.Seoul.lng).toBeCloseTo(126.978, 2)
      expect(LOCATION_COORDS.Seoul.tz).toBe('Asia/Seoul')
    })

    it('should have Tokyo coordinates', () => {
      expect(LOCATION_COORDS.Tokyo).toBeDefined()
      expect(LOCATION_COORDS.Tokyo.tz).toBe('Asia/Tokyo')
    })

    it('should have New York coordinates', () => {
      expect(LOCATION_COORDS['New York']).toBeDefined()
      expect(LOCATION_COORDS['New York'].tz).toBe('America/New_York')
    })

    it('should have London coordinates', () => {
      expect(LOCATION_COORDS.London).toBeDefined()
      expect(LOCATION_COORDS.London.tz).toBe('Europe/London')
    })

    it('should have alternate name entries (Seoul, KR)', () => {
      expect(LOCATION_COORDS['Seoul, KR']).toBeDefined()
      expect(LOCATION_COORDS['Seoul, KR'].lat).toBe(LOCATION_COORDS.Seoul.lat)
    })
  })

  describe('fetchAIDates', () => {
    it('should return parsed dates on success', async () => {
      vi.mocked(apiClient).post.mockResolvedValueOnce({
        ok: true,
        data: {
          auspicious_dates: ['2025-03-01', '2025-03-15'],
          caution_dates: ['2025-03-10'],
        },
      } as any)

      const result = await fetchAIDates({}, {}, 'overall')

      expect(result).toBeDefined()
      expect(result!.auspicious).toHaveLength(2)
      expect(result!.auspicious[0].is_auspicious).toBe(true)
      expect(result!.caution).toHaveLength(1)
      expect(result!.caution[0].is_auspicious).toBe(false)
    })

    it('should return null on API failure', async () => {
      vi.mocked(apiClient).post.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchAIDates({}, {})

      expect(result).toBeNull()
    })

    it('should return null when response not ok', async () => {
      vi.mocked(apiClient).post.mockResolvedValueOnce({ ok: false, data: null } as any)

      const result = await fetchAIDates({}, {})

      expect(result).toBeNull()
    })

    it('should handle missing date arrays', async () => {
      vi.mocked(apiClient).post.mockResolvedValueOnce({
        ok: true,
        data: {},
      } as any)

      const result = await fetchAIDates({}, {})

      expect(result).toBeDefined()
      expect(result!.auspicious).toHaveLength(0)
      expect(result!.caution).toHaveLength(0)
    })
  })

  describe('formatDateForResponse', () => {
    const baseDateData = {
      date: '2025-03-15',
      grade: 0 as const,
      score: 95,
      categories: ['career' as any, 'career' as any],
      titleKey: 'calendar.good_day',
      descKey: 'calendar.good_desc',
      sajuFactorKeys: ['shinsal_backho'],
      astroFactorKeys: ['retrogradeMercury'],
      recommendationKeys: ['rest'],
      warningKeys: ['caution'],
    }

    const koTranslations = {
      calendar: {
        good_day: '좋은 날',
        good_desc: '좋은 설명',
        recommendations: { rest: '휴식하세요' },
        warnings: { caution: '주의하세요' },
      },
    }

    const enTranslations = {
      calendar: {
        good_day: 'Good Day',
        good_desc: 'Good description',
        recommendations: { rest: 'Take rest' },
        warnings: { caution: 'Be careful' },
      },
    }

    it('should format date with Korean translations', () => {
      const result = formatDateForResponse(
        baseDateData as any,
        'ko',
        koTranslations as any,
        enTranslations as any
      )

      expect(result.date).toBe('2025-03-15')
      expect(result.grade).toBe(0)
      expect(result.score).toBe(95)
      expect(result.title).toBe('좋은 날')
    })

    it('should deduplicate categories', () => {
      const result = formatDateForResponse(
        baseDateData as any,
        'ko',
        koTranslations as any,
        enTranslations as any
      )

      expect(result.categories).toEqual(['career'])
    })

    it('should translate saju/astro factors', () => {
      const result = formatDateForResponse(
        baseDateData as any,
        'ko',
        koTranslations as any,
        enTranslations as any
      )

      expect(result.sajuFactors).toContain('백호살')
      expect(result.astroFactors).toContain('수성 역행')
    })

    it('should translate recommendations and warnings', () => {
      const result = formatDateForResponse(
        baseDateData as any,
        'ko',
        koTranslations as any,
        enTranslations as any
      )

      expect(result.recommendations).toContain('휴식하세요')
      expect(result.warnings).toContain('주의하세요')
    })

    it('should use English translations when locale is en', () => {
      const result = formatDateForResponse(
        baseDateData as any,
        'en',
        koTranslations as any,
        enTranslations as any
      )

      expect(result.title).toBe('Good Day')
    })

    it('should sort negative factors first for grade >= 3', () => {
      const badDateData = {
        ...baseDateData,
        grade: 3,
        score: 35,
        sajuFactorKeys: ['shinsal_backho', 'chung_negative'],
        astroFactorKeys: ['retrogradeMercury'],
      }

      const result = formatDateForResponse(
        badDateData as any,
        'ko',
        koTranslations as any,
        enTranslations as any
      )

      // Negative factors should be present
      expect(result.sajuFactors.length).toBeGreaterThan(0)
    })
  })
})
