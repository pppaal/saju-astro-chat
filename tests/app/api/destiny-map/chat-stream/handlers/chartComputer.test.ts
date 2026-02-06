/**
 * @file Tests for Chart Computer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeCharts,
  type ChartComputeInput,
} from '@/app/api/destiny-map/chat-stream/handlers/chartComputer'
import { calculateSajuData } from '@/lib/Saju/saju'
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  toChart,
} from '@/lib/astrology'
import { toSajuDataStructure } from '@/lib/destiny-map/type-guards'

// Mock dependencies
vi.mock('@/lib/Saju/saju', () => ({
  calculateSajuData: vi.fn(() => ({
    dayMaster: { heavenlyStem: '甲', element: 'wood' },
    pillars: {
      year: { heavenlyStem: { name: '庚' }, earthlyBranch: { name: '午' } },
      month: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '丑' } },
      day: { heavenlyStem: { name: '癸' }, earthlyBranch: { name: '卯' } },
      time: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '寅' } },
    },
    unse: { daeun: [] },
  })),
}))

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(async () => ({
    planets: [
      { name: 'Sun', longitude: 0, sign: 'Aries' },
      { name: 'Moon', longitude: 90, sign: 'Cancer' },
      { name: 'Mercury', longitude: 120, sign: 'Leo' },
      { name: 'Venus', longitude: 150, sign: 'Virgo' },
      { name: 'Mars', longitude: 180, sign: 'Libra' },
      { name: 'Jupiter', longitude: 210, sign: 'Scorpio' },
      { name: 'Saturn', longitude: 240, sign: 'Sagittarius' },
    ],
    ascendant: { longitude: 30, sign: 'Taurus' },
  })),
  calculateTransitChart: vi.fn(async () => ({
    planets: [{ name: 'Sun', longitude: 10 }],
  })),
  findMajorTransits: vi.fn(() => [
    {
      transitPlanet: 'Jupiter',
      natalPoint: 'Sun',
      type: 'trine',
      orb: 2.5,
      isApplying: true,
    },
  ]),
  toChart: vi.fn((data: unknown) => data),
}))

vi.mock('@/lib/destiny-map/type-guards', () => ({
  toSajuDataStructure: vi.fn((data: unknown) => data),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Chart Computer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('computeCharts', () => {
    const baseInput: ChartComputeInput = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      gender: 'male',
      latitude: 37.5665,
      longitude: 126.978,
    }

    it('should compute saju when not provided', async () => {
      const result = await computeCharts(baseInput)

      expect(calculateSajuData).toHaveBeenCalledWith(
        '1990-01-01',
        '12:00',
        'male',
        'solar',
        expect.any(String)
      )
      expect(toSajuDataStructure).toHaveBeenCalled()
      expect(result.saju).toBeDefined()
      expect(result.saju?.dayMaster?.heavenlyStem).toBe('甲')
    })

    it('should compute astro when not provided', async () => {
      const result = await computeCharts(baseInput)

      expect(calculateNatalChart).toHaveBeenCalledWith({
        year: 1990,
        month: 1,
        date: 1,
        hour: 12,
        minute: 0,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
      })
      expect(result.astro).toBeDefined()
      expect(result.astro?.sun).toBeDefined()
    })

    it('should use existing saju when provided with valid dayMaster', async () => {
      const existingSaju = {
        dayMaster: { heavenlyStem: '乙', element: 'wood' },
        pillars: {},
      }

      const result = await computeCharts({
        ...baseInput,
        existingSaju,
      })

      expect(calculateSajuData).not.toHaveBeenCalled()
      expect(result.saju).toBe(existingSaju)
    })

    it('should compute saju when existing has no dayMaster', async () => {
      const existingSaju = {
        pillars: {},
      }

      await computeCharts({
        ...baseInput,
        existingSaju: existingSaju as any,
      })

      expect(calculateSajuData).toHaveBeenCalled()
    })

    it('should use existing astro when provided with valid sun', async () => {
      const existingAstro = {
        sun: { name: 'Sun', sign: 'Leo' },
        moon: { name: 'Moon', sign: 'Cancer' },
      }

      const result = await computeCharts({
        ...baseInput,
        existingAstro,
      })

      expect(calculateNatalChart).not.toHaveBeenCalled()
      expect(result.astro).toBe(existingAstro)
    })

    it('should compute astro when existing has no sun', async () => {
      const existingAstro = {
        moon: { name: 'Moon', sign: 'Cancer' },
      }

      await computeCharts({
        ...baseInput,
        existingAstro: existingAstro as any,
      })

      expect(calculateNatalChart).toHaveBeenCalled()
    })

    it('should compute current transits when natal chart available', async () => {
      const result = await computeCharts(baseInput)

      expect(calculateTransitChart).toHaveBeenCalled()
      expect(toChart).toHaveBeenCalled()
      expect(findMajorTransits).toHaveBeenCalled()
      expect(result.currentTransits.length).toBeGreaterThan(0)
    })

    it('should format transit data correctly', async () => {
      const result = await computeCharts(baseInput)

      expect(result.currentTransits.length).toBe(1)
      const transit = result.currentTransits[0] as {
        transitPlanet: string
        natalPoint: string
        aspectType: string
        orb: string
        isApplying: boolean
      }
      expect(transit.transitPlanet).toBe('Jupiter')
      expect(transit.natalPoint).toBe('Sun')
      expect(transit.aspectType).toBe('trine')
      expect(transit.orb).toBe('2.5')
      expect(transit.isApplying).toBe(true)
    })

    it('should return empty transits when no natal chart computed', async () => {
      const existingAstro = {
        sun: { name: 'Sun', sign: 'Leo' },
      }

      const result = await computeCharts({
        ...baseInput,
        existingAstro,
      })

      expect(result.currentTransits).toEqual([])
    })

    it('should handle saju computation failure gracefully', async () => {
      vi.mocked(calculateSajuData).mockImplementationOnce(() => {
        throw new Error('Saju computation failed')
      })

      const result = await computeCharts(baseInput)

      expect(result.saju).toBeUndefined()
      expect(result.astro).toBeDefined() // astro should still work
    })

    it('should handle astro computation failure gracefully', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValueOnce(new Error('Astro computation failed'))

      const result = await computeCharts(baseInput)

      expect(result.astro).toBeUndefined()
      expect(result.currentTransits).toEqual([])
    })

    it('should handle transit computation failure gracefully', async () => {
      vi.mocked(calculateTransitChart).mockRejectedValueOnce(
        new Error('Transit computation failed')
      )

      const result = await computeCharts(baseInput)

      expect(result.astro).toBeDefined() // astro was computed
      expect(result.currentTransits).toEqual([]) // but transits failed
    })

    it('should handle toSajuDataStructure returning null', async () => {
      vi.mocked(toSajuDataStructure).mockReturnValueOnce(null)

      const result = await computeCharts(baseInput)

      expect(result.saju).toBeUndefined()
    })

    it('should parse birth date and time correctly', async () => {
      await computeCharts({
        ...baseInput,
        birthDate: '1985-12-25',
        birthTime: '08:30',
      })

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 1985,
          month: 12,
          date: 25,
          hour: 8,
          minute: 30,
        })
      )
    })

    it('should extract planets correctly from natal chart', async () => {
      const result = await computeCharts(baseInput)

      expect(result.astro?.sun).toEqual({ name: 'Sun', longitude: 0, sign: 'Aries' })
      expect(result.astro?.moon).toEqual({ name: 'Moon', longitude: 90, sign: 'Cancer' })
      expect(result.astro?.mercury).toEqual({ name: 'Mercury', longitude: 120, sign: 'Leo' })
      expect(result.astro?.venus).toEqual({ name: 'Venus', longitude: 150, sign: 'Virgo' })
      expect(result.astro?.mars).toEqual({ name: 'Mars', longitude: 180, sign: 'Libra' })
      expect(result.astro?.jupiter).toEqual({ name: 'Jupiter', longitude: 210, sign: 'Scorpio' })
      expect(result.astro?.saturn).toEqual({ name: 'Saturn', longitude: 240, sign: 'Sagittarius' })
    })

    it('should include ascendant in astro result', async () => {
      const result = await computeCharts(baseInput)

      expect(result.astro?.ascendant).toEqual({ longitude: 30, sign: 'Taurus' })
    })

    it('should pass correct coordinates to natal chart', async () => {
      await computeCharts({
        ...baseInput,
        latitude: 35.6762,
        longitude: 139.6503,
      })

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 35.6762,
          longitude: 139.6503,
        })
      )
    })

    it('should handle female gender', async () => {
      await computeCharts({
        ...baseInput,
        gender: 'female',
      })

      expect(calculateSajuData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'female',
        expect.any(String),
        expect.any(String)
      )
    })

    it('should use both existing saju and astro when valid', async () => {
      const existingSaju = {
        dayMaster: { heavenlyStem: '丙' },
      }
      const existingAstro = {
        sun: { name: 'Sun', sign: 'Leo' },
      }

      const result = await computeCharts({
        ...baseInput,
        existingSaju,
        existingAstro,
      })

      expect(calculateSajuData).not.toHaveBeenCalled()
      expect(calculateNatalChart).not.toHaveBeenCalled()
      expect(result.saju).toBe(existingSaju)
      expect(result.astro).toBe(existingAstro)
      expect(result.currentTransits).toEqual([])
    })

    it('should return ChartComputeResult with correct structure', async () => {
      const result = await computeCharts(baseInput)

      expect(result).toHaveProperty('saju')
      expect(result).toHaveProperty('astro')
      expect(result).toHaveProperty('currentTransits')
      expect(Array.isArray(result.currentTransits)).toBe(true)
    })
  })
})
