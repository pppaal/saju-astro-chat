/**
 * @file Tests for Chart Calculator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeSajuData,
  computeAstroData,
  computeCurrentTransits,
  calculateChartData,
  type ChartCalculationInput,
} from '@/app/api/destiny-map/chat-stream/lib/chart-calculator'

// Mock dependencies
vi.mock('@/lib/Saju/saju', () => ({
  calculateSajuData: vi.fn(() => ({
    dayMaster: { heavenlyStem: '甲', element: 'wood' },
    pillars: {},
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

vi.mock('@/lib/prediction/utils', () => ({
  parseDateComponents: vi.fn(() => ({ year: 1990, month: 1, day: 1 })),
  parseTimeComponents: vi.fn(() => ({ hour: 12, minute: 0 })),
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  CacheKeys: {
    saju: vi.fn((...args: string[]) => `saju:${args.join(':')}`),
    natalChart: vi.fn((...args: (string | number)[]) => `natal:${args.join(':')}`),
    transitChart: vi.fn((...args: number[]) => `transit:${args.join(':')}`),
  },
  CACHE_TTL: {
    SAJU: 604800,
    NATAL_CHART: 2592000,
    TRANSIT_CHART: 3600,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Chart Calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('computeSajuData', () => {
    it('should compute saju data successfully', async () => {
      const result = await computeSajuData('1990-01-01', '12:00', 'male')

      expect(result).toBeDefined()
      expect(result?.dayMaster).toBeDefined()
    })

    it('should use default timezone', async () => {
      const result = await computeSajuData('1990-01-01', '12:00', 'female')

      expect(result).toBeDefined()
    })

    it('should use custom timezone', async () => {
      const result = await computeSajuData('1990-01-01', '12:00', 'male', 'America/New_York')

      expect(result).toBeDefined()
    })

    it('should return undefined on failure', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')
      vi.mocked(calculateSajuData).mockImplementationOnce(() => {
        throw new Error('Saju error')
      })

      const result = await computeSajuData('1990-01-01', '12:00', 'male')

      expect(result).toBeUndefined()
    })

    it('should return undefined when validation fails', async () => {
      const { toSajuDataStructure } = await import('@/lib/destiny-map/type-guards')
      vi.mocked(toSajuDataStructure).mockReturnValueOnce(null as any)

      const result = await computeSajuData('1990-01-01', '12:00', 'male')

      expect(result).toBeUndefined()
    })

    it('should use cache for computation', async () => {
      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      await computeSajuData('1990-01-01', '12:00', 'male')

      expect(cacheOrCalculate).toHaveBeenCalled()
    })
  })

  describe('computeAstroData', () => {
    it('should compute astro data successfully', async () => {
      const result = await computeAstroData('1990-01-01', '12:00', 37.5665, 126.978)

      expect(result).toBeDefined()
      expect(result.astro).toBeDefined()
      expect(result.natalChartData).toBeDefined()
    })

    it('should map planets correctly', async () => {
      const result = await computeAstroData('1990-01-01', '12:00', 37.5665, 126.978)

      expect(result.astro?.sun).toBeDefined()
      expect(result.astro?.moon).toBeDefined()
      expect(result.astro?.mercury).toBeDefined()
      expect(result.astro?.venus).toBeDefined()
      expect(result.astro?.mars).toBeDefined()
      expect(result.astro?.jupiter).toBeDefined()
      expect(result.astro?.saturn).toBeDefined()
      expect(result.astro?.ascendant).toBeDefined()
    })

    it('should return empty on failure', async () => {
      const { calculateNatalChart } = await import('@/lib/astrology')
      vi.mocked(calculateNatalChart).mockRejectedValueOnce(new Error('Astro error'))

      const result = await computeAstroData('1990-01-01', '12:00', 37.5665, 126.978)

      expect(result.astro).toBeUndefined()
      expect(result.natalChartData).toBeUndefined()
    })

    it('should use custom timezone', async () => {
      const result = await computeAstroData(
        '1990-01-01',
        '12:00',
        37.5665,
        126.978,
        'America/New_York'
      )

      expect(result).toBeDefined()
    })

    it('should use cache for computation', async () => {
      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      await computeAstroData('1990-01-01', '12:00', 37.5665, 126.978)

      expect(cacheOrCalculate).toHaveBeenCalled()
    })
  })

  describe('computeCurrentTransits', () => {
    const mockNatalChartData = {
      planets: [{ name: 'Sun', longitude: 0, sign: 'Aries' }],
      ascendant: { longitude: 30, sign: 'Taurus' },
    }

    it('should compute current transits', async () => {
      const result = await computeCurrentTransits(mockNatalChartData as any, 37.5665, 126.978)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should format transit data correctly', async () => {
      const result = await computeCurrentTransits(mockNatalChartData as any, 37.5665, 126.978)

      if (result.length > 0) {
        const transit = result[0] as {
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
      }
    })

    it('should return empty array on failure', async () => {
      const { calculateTransitChart } = await import('@/lib/astrology')
      vi.mocked(calculateTransitChart).mockRejectedValueOnce(new Error('Transit error'))

      const result = await computeCurrentTransits(mockNatalChartData as any, 37.5665, 126.978)

      expect(result).toEqual([])
    })

    it('should use cache for computation', async () => {
      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      await computeCurrentTransits(mockNatalChartData as any, 37.5665, 126.978)

      expect(cacheOrCalculate).toHaveBeenCalled()
    })
  })

  describe('calculateChartData', () => {
    const baseInput: ChartCalculationInput = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      gender: 'male',
      latitude: 37.5665,
      longitude: 126.978,
    }

    it('should calculate all chart data', async () => {
      const result = await calculateChartData(baseInput)

      expect(result).toHaveProperty('saju')
      expect(result).toHaveProperty('astro')
      expect(result).toHaveProperty('natalChartData')
      expect(result).toHaveProperty('currentTransits')
    })

    it('should use existing saju when valid', async () => {
      const existingSaju = {
        dayMaster: { heavenlyStem: '乙' },
      } as any

      const result = await calculateChartData(baseInput, existingSaju)

      expect(result.saju).toBe(existingSaju)
    })

    it('should use existing astro when valid', async () => {
      const existingAstro = {
        sun: { name: 'Sun', sign: 'Leo' },
      } as any

      const result = await calculateChartData(baseInput, undefined, existingAstro)

      expect(result.astro).toBe(existingAstro)
    })

    it('should compute saju when not provided', async () => {
      const result = await calculateChartData(baseInput)

      expect(result.saju).toBeDefined()
      expect(result.saju?.dayMaster).toBeDefined()
    })

    it('should compute astro when not provided', async () => {
      const result = await calculateChartData(baseInput)

      expect(result.astro).toBeDefined()
      expect(result.natalChartData).toBeDefined()
    })

    it('should compute transits when natal chart available', async () => {
      const result = await calculateChartData(baseInput)

      expect(result.currentTransits.length).toBeGreaterThan(0)
    })

    it('should return empty transits when no natal chart', async () => {
      const existingAstro = { sun: { name: 'Sun' } } as any

      const result = await calculateChartData(baseInput, undefined, existingAstro)

      // No natalChartData when existing astro is used
      expect(result.currentTransits).toEqual([])
    })

    it('should skip saju computation with valid dayMaster', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')
      const existingSaju = { dayMaster: { heavenlyStem: '甲' } } as any

      await calculateChartData(baseInput, existingSaju)

      expect(calculateSajuData).not.toHaveBeenCalled()
    })

    it('should skip astro computation with valid sun', async () => {
      const { calculateNatalChart } = await import('@/lib/astrology')
      const existingAstro = { sun: { name: 'Sun', sign: 'Aries' } } as any

      await calculateChartData(baseInput, undefined, existingAstro)

      expect(calculateNatalChart).not.toHaveBeenCalled()
    })

    it('should use custom timezone', async () => {
      const result = await calculateChartData({
        ...baseInput,
        timeZone: 'America/New_York',
      })

      expect(result).toBeDefined()
    })

    it('should handle complete failure gracefully', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')
      const { calculateNatalChart } = await import('@/lib/astrology')

      vi.mocked(calculateSajuData).mockImplementationOnce(() => {
        throw new Error('Saju error')
      })
      vi.mocked(calculateNatalChart).mockRejectedValueOnce(new Error('Astro error'))

      const result = await calculateChartData(baseInput)

      expect(result).toBeDefined()
      expect(result.currentTransits).toEqual([])
    })
  })
})
