/**
 * @file Tests for Profile Loader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  loadUserProfile,
  type ProfileLoadResult,
  type MemoryLoadResult,
} from '@/app/api/destiny-map/chat-stream/lib/profileLoader'
import { prisma } from '@/lib/db/prisma'

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    consultationSession: {
      findMany: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ProfileLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock to return null
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
  })

  describe('loadUserProfile', () => {
    it('should return gender even if all current data provided', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'M',
        birthCity: null,
        personaMemory: null,
      } as any)

      const result = await loadUserProfile(
        'user123',
        '1990-01-01',
        '12:00',
        37.5,
        127.0,
        { year: '1990', month: '01', day: '01', hour: '12' } as any,
        { sun: { sign: 'Capricorn' } } as any
      )

      // Gender is always returned if available
      expect(result).toHaveProperty('gender', 'male')
      expect(result.birthDate).toBeUndefined() // Not returned when provided
      expect(result.birthTime).toBeUndefined() // Not returned when provided
    })

    it('should load profile from database if data missing', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'M',
        birthCity: null,
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('user123')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: expect.objectContaining({
          birthDate: true,
          birthTime: true,
          gender: true,
          birthCity: true,
        }),
      })

      expect(result.birthDate).toBe('1990-01-01')
      expect(result.birthTime).toBe('12:00')
      expect(result.gender).toBe('male')
    })

    it('should handle user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await loadUserProfile('nonexistent')

      expect(result).toEqual({})
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'))

      const result = await loadUserProfile('user123')

      expect(result).toEqual({})
    })

    it('should not parse birthCity for coordinates', async () => {
      // Function does not parse birthCity - coordinates must be provided separately
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'M',
        birthCity: 'Seoul|37.5|127.0',
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('user123')

      expect(result.latitude).toBeUndefined()
      expect(result.longitude).toBeUndefined()
    })

    it('should load saju from persona memory if available', async () => {
      const mockSaju = {
        yearPillar: { stem: '庚', branch: '午' },
        monthPillar: { stem: '丁', branch: '丑' },
        dayPillar: { stem: '癸', branch: '卯' },
        hourPillar: { stem: '甲', branch: '寅' },
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        birthCity: null,
        personaMemory: {
          sajuProfile: mockSaju,
          birthChart: null,
        },
      } as any)

      const result = await loadUserProfile('user123')

      expect(result).toHaveProperty('saju')
      expect(result.saju).toEqual(mockSaju)
    })

    it('should load astro from persona memory if available', async () => {
      const mockAstro = {
        sun: { sign: 'Capricorn', degree: 10 },
        moon: { sign: 'Cancer', degree: 20 },
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        birthCity: null,
        personaMemory: {
          sajuProfile: null,
          birthChart: mockAstro,
        },
      } as any)

      const result = await loadUserProfile('user123')

      expect(result).toHaveProperty('astro')
      expect(result.astro).toEqual(mockAstro)
    })

    it('should prioritize current data over database data', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'M',
        birthCity: null,
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('user123', '1995-05-05', '14:30', 35.0, 125.0)

      // Gender is still returned, but date/time not since provided
      expect(result).toHaveProperty('gender', 'male')
      expect(result.birthDate).toBeUndefined()
      expect(result.birthTime).toBeUndefined()
    })
  })

  describe('Type Definitions', () => {
    it('should have correct ProfileLoadResult type', () => {
      const result: ProfileLoadResult = {
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        latitude: 37.5,
        longitude: 127.0,
      }

      expect(result).toBeDefined()
      expect(typeof result.birthDate).toBe('string')
      expect(typeof result.birthTime).toBe('string')
      expect(typeof result.gender).toBe('string')
      expect(typeof result.latitude).toBe('number')
      expect(typeof result.longitude).toBe('number')
    })

    it('should allow optional fields in ProfileLoadResult', () => {
      const result: ProfileLoadResult = {}

      expect(result).toBeDefined()
      expect(result.birthDate).toBeUndefined()
      expect(result.saju).toBeUndefined()
      expect(result.astro).toBeUndefined()
    })

    it('should have correct MemoryLoadResult type', () => {
      const result: MemoryLoadResult = {
        personaMemoryContext: 'Memory context',
        recentSessionSummaries: 'Session summaries',
      }

      expect(result).toBeDefined()
      expect(typeof result.personaMemoryContext).toBe('string')
      expect(typeof result.recentSessionSummaries).toBe('string')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null birthCity', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        birthCity: null,
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('user123')

      expect(result.latitude).toBeUndefined()
      expect(result.longitude).toBeUndefined()
    })

    it('should handle invalid birthCity format', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        birthCity: 'Invalid Format',
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('user123')

      expect(result.latitude).toBeUndefined()
      expect(result.longitude).toBeUndefined()
    })

    it('should handle null personaMemory', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user123',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        birthCity: null,
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('user123')

      expect(result.saju).toBeUndefined()
      expect(result.astro).toBeUndefined()
    })

    it('should handle empty string userId', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: '',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'M',
        birthCity: null,
        personaMemory: null,
      } as any)

      const result = await loadUserProfile('')

      expect(result).toHaveProperty('birthDate')
    })
  })
})
