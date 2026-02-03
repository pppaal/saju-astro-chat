/**
 * @file Tests for Data Loader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadOrComputeAllData } from '@/app/api/destiny-map/chat-stream/handlers/dataLoader'

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

vi.mock('@/lib/prediction/utils', () => ({
  parseDateComponents: vi.fn((date: string) => ({
    year: 1990,
    month: 1,
    day: 1,
  })),
  parseTimeComponents: vi.fn((time: string) => ({
    hour: 12,
    minute: 0,
  })),
}))

vi.mock('@/app/api/destiny-map/chat-stream/lib/profileLoader', () => ({
  loadUserProfile: vi.fn(async () => ({
    saju: null,
    astro: null,
    birthDate: null,
    birthTime: null,
    gender: null,
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Data Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadOrComputeAllData', () => {
    const baseData = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      gender: 'male' as const,
      latitude: 37.5665,
      longitude: 126.978,
    }

    it('should compute all data when no existing data', async () => {
      const result = await loadOrComputeAllData(undefined, baseData)

      expect(result).toHaveProperty('saju')
      expect(result).toHaveProperty('astro')
      expect(result).toHaveProperty('birthDate')
      expect(result).toHaveProperty('birthTime')
      expect(result).toHaveProperty('gender')
      expect(result).toHaveProperty('latitude')
      expect(result).toHaveProperty('longitude')
      expect(result).toHaveProperty('currentTransits')
      expect(result).toHaveProperty('natalChartData')
    })

    it('should use existing saju when provided and valid', async () => {
      const existingSaju = {
        dayMaster: { heavenlyStem: '乙', element: 'wood' },
      } as any

      const result = await loadOrComputeAllData(undefined, {
        ...baseData,
        saju: existingSaju,
      })

      expect(result.saju).toBe(existingSaju)
    })

    it('should use existing astro when provided and valid', async () => {
      const existingAstro = {
        sun: { name: 'Sun', sign: 'Leo' },
      } as any

      const result = await loadOrComputeAllData(undefined, {
        ...baseData,
        astro: existingAstro,
      })

      expect(result.astro).toBe(existingAstro)
    })

    it('should load user profile when userId is provided', async () => {
      const { loadUserProfile } = await import('../lib/profileLoader')

      await loadOrComputeAllData('user-123', baseData)

      expect(loadUserProfile).toHaveBeenCalledWith(
        'user-123',
        baseData.birthDate,
        baseData.birthTime,
        baseData.latitude,
        baseData.longitude,
        undefined,
        undefined
      )
    })

    it('should use profile data when returned', async () => {
      const { loadUserProfile } = await import('../lib/profileLoader')
      vi.mocked(loadUserProfile).mockResolvedValueOnce({
        saju: { dayMaster: { heavenlyStem: '丙' } } as any,
        astro: { sun: { name: 'Sun' } } as any,
        birthDate: '1985-06-15',
        birthTime: '08:30',
        gender: 'female',
      } as any)

      const result = await loadOrComputeAllData('user-123', baseData)

      expect(result.birthDate).toBe('1985-06-15')
      expect(result.birthTime).toBe('08:30')
      expect(result.gender).toBe('female')
    })

    it('should handle profile load failure gracefully', async () => {
      const { loadUserProfile } = await import('../lib/profileLoader')
      vi.mocked(loadUserProfile).mockRejectedValueOnce(new Error('DB error'))

      const result = await loadOrComputeAllData('user-123', baseData)

      expect(result).toBeDefined()
      expect(result.birthDate).toBe('1990-01-01')
    })

    it('should compute current transits when natal chart available', async () => {
      const result = await loadOrComputeAllData(undefined, baseData)

      expect(result.currentTransits).toBeDefined()
      expect(Array.isArray(result.currentTransits)).toBe(true)
    })

    it('should return empty transits when no natal chart', async () => {
      const existingAstro = {
        sun: { name: 'Sun', sign: 'Leo' },
      } as any

      const result = await loadOrComputeAllData(undefined, {
        ...baseData,
        astro: existingAstro,
      })

      // Existing astro doesn't produce natalChartData
      expect(result.currentTransits).toEqual([])
    })

    it('should handle saju computation failure', async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')
      vi.mocked(calculateSajuData).mockImplementationOnce(() => {
        throw new Error('Saju error')
      })

      const result = await loadOrComputeAllData(undefined, baseData)

      expect(result).toBeDefined()
    })

    it('should handle astro computation failure', async () => {
      const { calculateNatalChart } = await import('@/lib/astrology')
      vi.mocked(calculateNatalChart).mockRejectedValueOnce(new Error('Astro error'))

      const result = await loadOrComputeAllData(undefined, baseData)

      expect(result).toBeDefined()
    })

    it('should handle transit computation failure', async () => {
      const { calculateTransitChart } = await import('@/lib/astrology')
      vi.mocked(calculateTransitChart).mockRejectedValueOnce(new Error('Transit error'))

      const result = await loadOrComputeAllData(undefined, baseData)

      expect(result).toBeDefined()
      expect(result.currentTransits).toEqual([])
    })

    it('should return correct data types', async () => {
      const result = await loadOrComputeAllData(undefined, baseData)

      expect(typeof result.birthDate).toBe('string')
      expect(typeof result.birthTime).toBe('string')
      expect(typeof result.gender).toBe('string')
      expect(typeof result.latitude).toBe('number')
      expect(typeof result.longitude).toBe('number')
      expect(Array.isArray(result.currentTransits)).toBe(true)
    })

    it('should format transit data correctly', async () => {
      const result = await loadOrComputeAllData(undefined, baseData)

      if (result.currentTransits.length > 0) {
        const transit = result.currentTransits[0] as {
          transitPlanet: string
          natalPoint: string
          aspectType: string
          orb: string
          isApplying: boolean
        }
        expect(transit).toHaveProperty('transitPlanet')
        expect(transit).toHaveProperty('natalPoint')
        expect(transit).toHaveProperty('aspectType')
        expect(transit).toHaveProperty('orb')
        expect(transit).toHaveProperty('isApplying')
      }
    })

    it('should pass correct coordinates through', async () => {
      const result = await loadOrComputeAllData(undefined, {
        ...baseData,
        latitude: 35.6762,
        longitude: 139.6503,
      })

      expect(result.latitude).toBe(35.6762)
      expect(result.longitude).toBe(139.6503)
    })
  })
})
