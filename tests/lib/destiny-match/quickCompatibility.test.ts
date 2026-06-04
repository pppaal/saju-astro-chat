import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/saju/saju', () => ({
  calculateSajuData: vi.fn().mockReturnValue({
    pillars: {
      year: { stem: 'Jia', branch: 'Zi' },
      month: { stem: 'Yi', branch: 'Chou' },
      day: { stem: 'Bing', branch: 'Yin' },
      time: { stem: 'Ding', branch: 'Mao' },
    },
  }),
}))

vi.mock('@/lib/saju/compatibility', () => ({
  analyzeComprehensiveCompatibility: vi.fn().mockReturnValue({
    overallScore: 78,
    grade: 'B',
    strengths: ['strength'],
    challenges: ['challenge'],
    dayMasterRelation: { dynamics: 'steady' },
    elementCompatibility: { harmony: ['balanced'] },
    recommendations: ['recommendation'],
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  calculateQuickCompatibility,
  calculateDetailedCompatibility,
  getCompatibilitySummary,
} from '@/lib/destiny-match/quickCompatibility'
import { calculateSajuData } from '@/lib/saju/saju'
import { analyzeComprehensiveCompatibility } from '@/lib/saju/compatibility'

describe('quickCompatibility', () => {
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    randomSpy.mockReturnValue(1)
  })

  describe('calculateQuickCompatibility', () => {
    it('should calculate compatibility score for two people', async () => {
      const person1 = { birthDate: '1990-05-15', birthTime: '14:30', gender: 'M' }
      const person2 = { birthDate: '1992-08-20', birthTime: '09:00', gender: 'F' }

      const score = await calculateQuickCompatibility(person1, person2)

      expect(score).toBe(78)
      expect(calculateSajuData).toHaveBeenCalledTimes(2)
      expect(analyzeComprehensiveCompatibility).toHaveBeenCalled()
    })

    it('should use default time and timezone when not provided', async () => {
      const person1 = { birthDate: '1991-01-01', gender: 'F' }
      const person2 = { birthDate: '1993-02-02' }

      await calculateQuickCompatibility(person1, person2)

      // 마지막 두 인자: lunarLeap(undefined) + longitude(undefined — 좌표 미제공 시
      // 한국 LMT 폴백). 다른 화면과 동일한 진태양시 보정 시그니처.
      expect(calculateSajuData).toHaveBeenCalledWith(
        '1991-01-01',
        '00:00',
        'female',
        'solar',
        'Asia/Seoul',
        undefined,
        undefined
      )
      expect(calculateSajuData).toHaveBeenCalledWith(
        '1993-02-02',
        '00:00',
        'male',
        'solar',
        'Asia/Seoul',
        undefined,
        undefined
      )
    })

    it('should use custom timezone when provided', async () => {
      const person1 = { birthDate: '1994-03-03', birthTime: '10:00', timezone: 'America/New_York' }
      const person2 = { birthDate: '1995-04-04', birthTime: '18:00', timezone: 'Europe/London' }

      await calculateQuickCompatibility(person1, person2)

      expect(calculateSajuData).toHaveBeenCalledWith(
        '1994-03-03',
        '10:00',
        'male',
        'solar',
        'America/New_York',
        undefined,
        undefined
      )
      expect(calculateSajuData).toHaveBeenCalledWith(
        '1995-04-04',
        '18:00',
        'male',
        'solar',
        'Europe/London',
        undefined,
        undefined
      )
    })

    it('should return default score on error', async () => {
      vi.mocked(calculateSajuData).mockImplementationOnce(() => {
        throw new Error('Calculation error')
      })

      const person1 = { birthDate: '1996-05-05' }
      const person2 = { birthDate: '1997-06-06' }

      const score = await calculateQuickCompatibility(person1, person2)

      expect(score).toBe(75)
    })

    it('should use cache for repeated calculations', async () => {
      const person1 = { birthDate: '1985-03-10', birthTime: '10:00', gender: 'M' }
      const person2 = { birthDate: '1987-07-25', birthTime: '16:00', gender: 'F' }

      const score1 = await calculateQuickCompatibility(person1, person2)
      const score2 = await calculateQuickCompatibility(person1, person2)

      expect(score1).toBe(score2)
      expect(calculateSajuData).toHaveBeenCalledTimes(2)
    })
  })

  describe('calculateDetailedCompatibility', () => {
    it('should return detailed compatibility analysis', async () => {
      const person1 = { birthDate: '1998-07-07', birthTime: '08:00', gender: 'M' }
      const person2 = { birthDate: '1999-08-08', birthTime: '20:00', gender: 'F' }

      const result = await calculateDetailedCompatibility(person1, person2)

      expect(result.score).toBe(78)
      expect(result.grade).toBe('B')
      expect(result.strengths.length).toBeGreaterThan(0)
      expect(result.challenges.length).toBeGreaterThan(0)
      expect(typeof result.advice).toBe('string')
      expect(result.dayMasterRelation).toBe('steady')
      expect(result.elementHarmony.length).toBeGreaterThan(0)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('should include love and friendship categories', async () => {
      const person1 = { birthDate: '2000-09-09' }
      const person2 = { birthDate: '2001-10-10' }

      await calculateDetailedCompatibility(person1, person2)

      expect(analyzeComprehensiveCompatibility).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { categories: ['love', 'friendship'] }
      )
    })
  })

  describe('getCompatibilitySummary', () => {
    it('should map score to grade and include text', async () => {
      const result = await getCompatibilitySummary(
        { birthDate: '2002-11-11' },
        { birthDate: '2003-12-12' }
      )

      expect(result.score).toBe(78)
      expect(result.grade).toBe('B')
      expect(typeof result.emoji).toBe('string')
      expect(typeof result.tagline).toBe('string')
    })
  })
})
