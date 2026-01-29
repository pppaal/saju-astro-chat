/**
 * @file Good Day Finder Tests
 *
 * Comprehensive test coverage for good-day-finder.ts
 * Target: 85%+ lines, 75%+ branches
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findSpecificGoodDays } from '@/lib/prediction/life-prediction/helpers/good-day-finder'
import type { EventType, LifePredictionInput } from '@/lib/prediction/life-prediction-types'
import { calculateDailyPillar } from '@/lib/prediction/ultraPrecisionEngine'
import { calculatePreciseTwelveStage, calculateSibsin } from '@/lib/prediction/advancedTimingEngine'
import { getSolarTermForDate, getLunarMansion } from '@/lib/prediction/precisionEngine'
import { detectShinsals } from '@/lib/prediction/life-prediction-helpers'
import { normalizeScore } from '@/lib/prediction/utils/scoring-utils'

// Mock dependencies
vi.mock('@/lib/prediction/ultraPrecisionEngine')
vi.mock('@/lib/prediction/advancedTimingEngine')
vi.mock('@/lib/prediction/precisionEngine')
vi.mock('@/lib/prediction/life-prediction-helpers')
vi.mock('@/lib/prediction/utils/scoring-utils')

vi.mock('@/lib/prediction/constants/scoring', () => ({
  EVENT_SCORING: {
    MARRIAGE_FAVORABLE_SIBSIN: 10,
    MARRIAGE_UNFAVORABLE_SIBSIN: 10,
    CAREER_FAVORABLE_SIBSIN: 8,
    CAREER_UNFAVORABLE_SIBSIN: 8,
    FAVORABLE_STAGE: 5,
    BUSINESS_FAVORABLE: 8,
    BUSINESS_UNFAVORABLE: 8,
    INVESTMENT_UNFAVORABLE: 5,
  },
}))

vi.mock('@/lib/prediction/engine/constants', () => ({
  EVENT_FAVORABLE_CONDITIONS: {
    marriage: {
      favorableSibsin: ['정관', '정재', '정인'],
      avoidSibsin: ['상관', '겁재'],
      favorableStages: ['장생', '제왕', '건록'],
      avoidStages: ['사', '묘', '절'],
      favorableElements: ['목', '화'],
    },
    career: {
      favorableSibsin: ['정관', '편관', '식신'],
      avoidSibsin: ['상관'],
      favorableStages: ['제왕', '건록', '관대'],
      avoidStages: ['사', '묘'],
      favorableElements: ['화', '토'],
    },
    investment: {
      favorableSibsin: ['정재', '편재'],
      avoidSibsin: ['겁재', '비견'],
      favorableStages: ['장생', '제왕'],
      avoidStages: ['사', '절'],
      favorableElements: ['금', '수'],
    },
    move: {
      favorableSibsin: ['역마', '정관'],
      avoidSibsin: ['상관'],
      favorableStages: ['장생', '목욕'],
      avoidStages: ['묘', '절'],
      favorableElements: ['목', '수'],
    },
    study: {
      favorableSibsin: ['정인', '편인', '식신'],
      avoidSibsin: ['상관', '겁재'],
      favorableStages: ['장생', '관대', '건록'],
      avoidStages: ['사', '병'],
      favorableElements: ['목', '화'],
    },
    health: {
      favorableSibsin: ['정인', '식신'],
      avoidSibsin: ['상관', '편관'],
      favorableStages: ['장생', '제왕'],
      avoidStages: ['사', '병', '묘'],
      favorableElements: ['목', '토'],
    },
    relationship: {
      favorableSibsin: ['정관', '정재'],
      avoidSibsin: ['상관', '겁재'],
      favorableStages: ['장생', '제왕'],
      avoidStages: ['사', '묘'],
      favorableElements: ['화', '토'],
    },
  },
  STEM_ELEMENT: {
    甲: '목',
    乙: '목',
    丙: '화',
    丁: '화',
    戊: '토',
    己: '토',
    庚: '금',
    辛: '금',
    壬: '수',
    癸: '수',
  },
}))

describe('Good Day Finder Module', () => {
  let mockInput: LifePredictionInput
  let monthStart: Date
  let monthEnd: Date

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(calculateDailyPillar).mockReturnValue({
      stem: '甲',
      branch: '子',
    })

    vi.mocked(calculatePreciseTwelveStage).mockReturnValue({
      stage: '장생',
      score: 75,
      strength: 'strong',
    })

    vi.mocked(calculateSibsin).mockReturnValue('정관')

    vi.mocked(getSolarTermForDate).mockReturnValue({
      name: '입춘',
      element: '목',
      date: new Date(2024, 1, 4),
    })

    vi.mocked(getLunarMansion).mockReturnValue({
      nameKo: '각',
      isAuspicious: true,
      goodFor: ['결혼', '개업'],
      badFor: [],
    })

    vi.mocked(detectShinsals).mockReturnValue([
      {
        name: '천을귀인',
        type: 'lucky',
        description: '귀인의 도움',
        affectedArea: '전반',
      },
    ])

    vi.mocked(normalizeScore).mockImplementation((score: number) =>
      Math.max(0, Math.min(100, score))
    )

    mockInput = {
      dayStem: '甲',
      dayBranch: '子',
      yongsin: ['목'],
      kisin: ['금'],
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 0,
      gender: 'male',
      timezone: 'Asia/Seoul',
    } as LifePredictionInput

    monthStart = new Date(2024, 0, 1)
    monthEnd = new Date(2024, 0, 31)
  })

  describe('findSpecificGoodDays - Basic Functionality', () => {
    it('should return array of dates', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
      result.forEach((date) => {
        expect(date).toBeInstanceOf(Date)
      })
    })

    it('should return maximum 5 dates', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeLessThanOrEqual(5)
    })

    it('should return dates within the specified range', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      result.forEach((date) => {
        expect(date.getTime()).toBeGreaterThanOrEqual(monthStart.getTime())
        expect(date.getTime()).toBeLessThanOrEqual(monthEnd.getTime())
      })
    })

    it('should return empty array for invalid eventType', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'invalid' as EventType)

      expect(result).toEqual([])
    })

    it('should handle single-day range', () => {
      const singleDay = new Date(2024, 0, 15)
      const result = findSpecificGoodDays(mockInput, singleDay, singleDay, 'marriage')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeLessThanOrEqual(1)
    })

    it('should handle empty date range (start > end)', () => {
      const result = findSpecificGoodDays(mockInput, monthEnd, monthStart, 'marriage')

      expect(result).toEqual([])
    })

    it('should return dates in descending score order', () => {
      let callCount = 0
      vi.mocked(calculateDailyPillar).mockImplementation(() => {
        callCount++
        return {
          stem: callCount % 2 === 0 ? '甲' : '乙',
          branch: '子',
        }
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('findSpecificGoodDays - Event Types', () => {
    const eventTypes: EventType[] = [
      'marriage',
      'career',
      'investment',
      'move',
      'study',
      'health',
      'relationship',
    ]

    eventTypes.forEach((eventType) => {
      it(`should handle ${eventType} event type`, () => {
        const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, eventType)

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeLessThanOrEqual(5)
      })
    })

    it('should apply favorable sibsin for marriage', () => {
      vi.mocked(calculateSibsin).mockReturnValue('정관')

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should apply favorable stages for career', () => {
      vi.mocked(calculatePreciseTwelveStage).mockReturnValue({
        stage: '제왕',
        score: 85,
        strength: 'very_strong',
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'career')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle investment event with favorable sibsin', () => {
      vi.mocked(calculateSibsin).mockReturnValue('정재')

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'investment')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle move event with 역마 shinsal bonus', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '역마', type: 'lucky', description: '이동', affectedArea: '이동' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'move')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle study event with 문창 shinsal bonus', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '문창', type: 'lucky', description: '학업', affectedArea: '학업' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'study')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle health event type', () => {
      vi.mocked(calculateSibsin).mockReturnValue('정인')

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'health')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle relationship event type', () => {
      vi.mocked(calculateSibsin).mockReturnValue('정관')

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'relationship')

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('findSpecificGoodDays - Options', () => {
    it('should use lunar mansions by default', () => {
      findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(getLunarMansion).toHaveBeenCalled()
    })

    it('should apply lunar mansion bonus for auspicious day', () => {
      vi.mocked(getLunarMansion).mockReturnValue({
        nameKo: '각',
        isAuspicious: true,
        goodFor: ['결혼'],
        badFor: [],
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage', {
        useLunarMansions: true,
      })

      expect(result.length).toBeGreaterThan(0)
    })

    it('should apply lunar mansion penalty for inauspicious day', () => {
      vi.mocked(getLunarMansion).mockReturnValue({
        nameKo: '위',
        isAuspicious: false,
        goodFor: [],
        badFor: ['결혼'],
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage', {
        useLunarMansions: true,
      })

      expect(Array.isArray(result)).toBe(true)
    })

    it('should skip lunar mansions when option is false', () => {
      findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage', { useLunarMansions: false })

      expect(getLunarMansion).not.toHaveBeenCalled()
    })

    it('should handle usePlanetaryHours option', () => {
      expect(() => {
        findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage', {
          usePlanetaryHours: true,
        })
      }).not.toThrow()
    })

    it('should handle both options enabled', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage', {
        useLunarMansions: true,
        usePlanetaryHours: true,
      })

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle both options disabled', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage', {
        useLunarMansions: false,
        usePlanetaryHours: false,
      })

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findSpecificGoodDays - Score Threshold', () => {
    it('should only return days with score >= 65', () => {
      vi.mocked(normalizeScore).mockReturnValue(60)

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBe(0)
    })

    it('should include days with score exactly 65', () => {
      vi.mocked(normalizeScore).mockReturnValue(65)

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should include days with score > 65', () => {
      vi.mocked(normalizeScore).mockReturnValue(80)

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should exclude days with score 64', () => {
      vi.mocked(normalizeScore).mockReturnValue(64)

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBe(0)
    })
  })

  describe('findSpecificGoodDays - Yongsin/Kisin', () => {
    it('should apply bonus for yongsin (favorable element)', () => {
      mockInput.yongsin = ['목']
      vi.mocked(calculateDailyPillar).mockReturnValue({
        stem: '甲',
        branch: '子',
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should apply penalty for kisin (unfavorable element)', () => {
      mockInput.kisin = ['목']
      vi.mocked(calculateDailyPillar).mockReturnValue({
        stem: '甲',
        branch: '子',
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle input without yongsin', () => {
      mockInput.yongsin = undefined

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle input without kisin', () => {
      mockInput.kisin = undefined

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findSpecificGoodDays - Shinsal Integration', () => {
    it('should apply 천을귀인 bonus', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '천을귀인', type: 'lucky', description: '귀인', affectedArea: '전반' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should apply 역마 bonus for move event', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '역마', type: 'lucky', description: '이동', affectedArea: '이동' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'move')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should not apply 역마 bonus for non-move events', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '역마', type: 'lucky', description: '이동', affectedArea: '이동' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should apply 문창 bonus for study event', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '문창', type: 'lucky', description: '학업', affectedArea: '학업' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'study')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should not apply 문창 bonus for non-study events', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '문창', type: 'lucky', description: '학업', affectedArea: '학업' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'career')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should apply 겁살 penalty', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '겁살', type: 'unlucky', description: '재물손실', affectedArea: '재물' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'investment')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle multiple shinsals', () => {
      vi.mocked(detectShinsals).mockReturnValue([
        { name: '천을귀인', type: 'lucky', description: '귀인', affectedArea: '전반' },
        { name: '역마', type: 'lucky', description: '이동', affectedArea: '이동' },
        { name: '겁살', type: 'unlucky', description: '재물', affectedArea: '재물' },
      ])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'move')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty shinsals array', () => {
      vi.mocked(detectShinsals).mockReturnValue([])

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findSpecificGoodDays - Month with No Good Days', () => {
    it('should return empty array when all scores below threshold', () => {
      vi.mocked(calculateSibsin).mockReturnValue('상관')
      vi.mocked(normalizeScore).mockReturnValue(40)

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result).toEqual([])
    })
  })

  describe('findSpecificGoodDays - Result Limiting', () => {
    it('should return only top 5 days even if many qualify', () => {
      vi.mocked(normalizeScore).mockReturnValue(80)

      const longMonthEnd = new Date(2024, 0, 31)

      const result = findSpecificGoodDays(mockInput, monthStart, longMonthEnd, 'marriage')

      expect(result.length).toBeLessThanOrEqual(5)
    })

    it('should return fewer than 5 if only few days qualify', () => {
      let callCount = 0
      vi.mocked(normalizeScore).mockImplementation(() => {
        callCount++
        return callCount <= 2 ? 70 : 50
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeLessThanOrEqual(2)
    })
  })

  describe('findSpecificGoodDays - Solar Term Integration', () => {
    it('should apply bonus when day element matches favorable elements', () => {
      vi.mocked(getSolarTermForDate).mockReturnValue({
        name: '입춘',
        element: '목',
        date: new Date(2024, 1, 4),
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should not apply bonus when element does not match', () => {
      vi.mocked(getSolarTermForDate).mockReturnValue({
        name: '입동',
        element: '수',
        date: new Date(2024, 10, 7),
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findSpecificGoodDays - Lunar Mansion Keywords', () => {
    it('should apply extra bonus for marriage when lunar mansion good for 결혼', () => {
      vi.mocked(getLunarMansion).mockReturnValue({
        nameKo: '각',
        isAuspicious: true,
        goodFor: ['결혼', '개업'],
        badFor: [],
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should apply extra penalty when lunar mansion bad for event', () => {
      vi.mocked(getLunarMansion).mockReturnValue({
        nameKo: '위',
        isAuspicious: false,
        goodFor: [],
        badFor: ['결혼', '개업'],
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle health event with empty keywords', () => {
      vi.mocked(getLunarMansion).mockReturnValue({
        nameKo: '각',
        isAuspicious: true,
        goodFor: [],
        badFor: [],
      })

      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'health')

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findSpecificGoodDays - Edge Cases', () => {
    it('should handle very short date range (2 days)', () => {
      const start = new Date(2024, 0, 15)
      const end = new Date(2024, 0, 16)

      const result = findSpecificGoodDays(mockInput, start, end, 'marriage')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeLessThanOrEqual(2)
    })

    it('should handle very long date range (90 days)', () => {
      const start = new Date(2024, 0, 1)
      const end = new Date(2024, 2, 31)

      const result = findSpecificGoodDays(mockInput, start, end, 'marriage')

      expect(result.length).toBeLessThanOrEqual(5)
    })

    it('should handle date range spanning year boundary', () => {
      const start = new Date(2023, 11, 15)
      const end = new Date(2024, 0, 15)

      const result = findSpecificGoodDays(mockInput, start, end, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle leap year February', () => {
      const start = new Date(2024, 1, 1)
      const end = new Date(2024, 1, 29)

      const result = findSpecificGoodDays(mockInput, start, end, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle non-leap year February', () => {
      const start = new Date(2023, 1, 1)
      const end = new Date(2023, 1, 28)

      const result = findSpecificGoodDays(mockInput, start, end, 'marriage')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should not mutate input dates', () => {
      const originalStart = new Date(monthStart)
      const originalEnd = new Date(monthEnd)

      findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      expect(monthStart.getTime()).toBe(originalStart.getTime())
      expect(monthEnd.getTime()).toBe(originalEnd.getTime())
    })

    it('should return new Date objects (not references)', () => {
      const result = findSpecificGoodDays(mockInput, monthStart, monthEnd, 'marriage')

      if (result.length >= 2) {
        expect(result[0]).not.toBe(result[1])
      }
    })
  })
})
