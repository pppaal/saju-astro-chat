import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    matchProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    matchSwipe: {
      findMany: vi.fn(),
    },
    userBlock: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/destiny-match/quickCompatibility', () => ({
  getCompatibilitySummary: vi.fn(),
}))

vi.mock('@/lib/destiny-match/personalityCompatibility', () => ({
  quickPersonalityScore: vi.fn(),
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  CACHE_TTL: {
    COMPATIBILITY: 604800,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/middleware', () => {
  const actual = vi.importActual('@/lib/api/middleware')
  return {
    ...actual,
    withApiMiddleware: (handler: any, guard: any) => {
      // Simple wrapper that calls handler with mock context
      return async (req: NextRequest) => {
        const context = {
          userId: 'user-123',
          rateLimitInfo: { success: true, remaining: 10 },
        }
        return handler(req, context)
      }
    },
    createAuthenticatedGuard: vi.fn(() => ({})),
  }
})

import { GET } from '@/app/api/destiny-match/discover/route'
import { prisma } from '@/lib/db/prisma'
import { getCompatibilitySummary } from '@/lib/destiny-match/quickCompatibility'
import { quickPersonalityScore } from '@/lib/destiny-match/personalityCompatibility'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'

describe('/api/destiny-match/discover', () => {
  const mockMyProfile = {
    id: 'profile-123',
    userId: 'user-123',
    displayName: 'Test User',
    bio: 'Test bio',
    city: 'Seoul',
    ageMin: 25,
    ageMax: 35,
    maxDistance: 50,
    genderPreference: 'female',
    latitude: 37.5665,
    longitude: 126.978,
    personalityScores: {
      energy: 70,
      cognition: 60,
      decision: 80,
      rhythm: 50,
    },
    user: {
      birthDate: '1990-05-15',
      birthTime: '14:30',
      birthCity: 'Seoul',
      gender: 'male',
    },
  }

  const createMockProfile = (overrides = {}) => ({
    id: 'profile-456',
    userId: 'user-456',
    displayName: 'Match User',
    bio: 'Match bio',
    occupation: 'Engineer',
    photos: ['photo1.jpg'],
    city: 'Seoul',
    interests: ['music', 'travel'],
    verified: true,
    personalityType: 'INFP',
    personalityName: 'Mediator',
    personalityScores: {
      energy: 65,
      cognition: 55,
      decision: 75,
      rhythm: 45,
    },
    latitude: 37.5700,
    longitude: 126.980,
    ageMin: 27,
    ageMax: 37,
    genderPreference: 'male',
    lastActiveAt: new Date('2024-01-15'),
    user: {
      birthDate: '1992-08-20',
      birthTime: '10:00',
      birthCity: 'Seoul',
      gender: 'female',
      image: 'avatar.jpg',
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Profile Requirements', () => {
    it('should require user to have a match profile', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('먼저 매칭 프로필을 설정해주세요')
    })

    it('should fetch user match profile', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      await GET(req)

      expect(prisma.matchProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: expect.any(Object),
      })
    })
  })

  describe('Profile Filtering', () => {
    it('should exclude already swiped profiles', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([
        { targetId: 'profile-1' } as any,
        { targetId: 'profile-2' } as any,
      ])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      await GET(req)

      expect(prisma.matchProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              notIn: expect.arrayContaining(['profile-1', 'profile-2']),
            }),
          }),
        })
      )
    })

    it('should exclude blocked users', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([
        { blockerId: 'user-123', blockedId: 'blocked-user-1' } as any,
      ])

      // First call returns blocked profiles for lookup, second call returns empty result
      vi.mocked(prisma.matchProfile.findMany)
        .mockResolvedValueOnce([{ id: 'blocked-profile-1', userId: 'blocked-user-1' }] as any)
        .mockResolvedValueOnce([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles).toEqual([])
    })

    it('should exclude users who blocked me', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([
        { blockerId: 'blocker-user', blockedId: 'user-123' } as any,
      ])

      // First call returns blocker profiles for lookup, second call returns empty result
      vi.mocked(prisma.matchProfile.findMany)
        .mockResolvedValueOnce([{ id: 'blocker-profile', userId: 'blocker-user' }] as any)
        .mockResolvedValueOnce([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles).toEqual([])
    })

    it('should filter by gender preference', async () => {
      const myProfileMale = { ...mockMyProfile, genderPreference: 'female' }
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(myProfileMale as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      await GET(req)

      expect(prisma.matchProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { gender: 'female' },
          }),
        })
      )
    })

    it('should not filter by gender if preference is all', async () => {
      const myProfileAll = { ...mockMyProfile, genderPreference: 'all' }
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(myProfileAll as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      await GET(req)

      // Check that the where condition doesn't include user filter
      const findManyCalls = vi.mocked(prisma.matchProfile.findMany).mock.calls
      const mainSearchCall = findManyCalls[findManyCalls.length - 1]
      expect(mainSearchCall[0].where.user).toBeUndefined()
    })

    it('should only show active and visible profiles', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      await GET(req)

      expect(prisma.matchProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            isVisible: true,
          }),
        })
      )
    })
  })

  describe('Age Filtering', () => {
    it('should filter profiles by my age preferences', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const tooYoung = createMockProfile({
        user: { ...createMockProfile().user, birthDate: '2010-01-01' }, // Too young
      })
      const tooOld = createMockProfile({
        user: { ...createMockProfile().user, birthDate: '1970-01-01' }, // Too old
      })
      const justRight = createMockProfile({
        user: { ...createMockProfile().user, birthDate: '1992-08-20' }, // Age ~32
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([
        tooYoung,
        tooOld,
        justRight,
      ] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 80,
        grade: 'A',
        emoji: '💖',
        tagline: 'Great match',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].id).toBe('profile-456')
    })

    it('should filter by bidirectional age preferences', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      // Their age range doesn't include my age
      const profile = createMockProfile({
        ageMin: 40, // My age (~34) is below their minimum
        ageMax: 50,
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profile] as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(0)
    })

    it('should handle null birth dates', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profile = createMockProfile({
        user: { ...createMockProfile().user, birthDate: null },
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profile] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good match',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].age).toBeNull()
    })
  })

  describe('Distance Filtering', () => {
    it('should filter profiles by distance', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const nearbyProfile = createMockProfile({
        latitude: 37.5700, // ~3km from my location
        longitude: 126.980,
      })
      const farProfile = createMockProfile({
        id: 'profile-far',
        latitude: 35.1796, // ~400km away (Busan)
        longitude: 129.0756,
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([
        nearbyProfile,
        farProfile,
      ] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 80,
        grade: 'A',
        emoji: '💖',
        tagline: 'Great',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      // Only nearby profile should be included
      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].distance).toBeLessThan(50)
    })

    it('should handle null coordinates', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profile = createMockProfile({
        latitude: null,
        longitude: null,
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profile] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].distance).toBeNull()
    })
  })

  describe('City Filtering', () => {
    it('should filter by city (case-insensitive)', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const seoulProfile = createMockProfile({ city: 'SEOUL' }) // Different case
      const busanProfile = createMockProfile({ id: 'profile-busan', city: 'Busan' })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([
        seoulProfile,
        busanProfile,
      ] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].city).toBe('SEOUL')
    })

    it('should handle whitespace in city names', async () => {
      const myProfile = { ...mockMyProfile, city: ' Seoul ' }
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(myProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profile = createMockProfile({ city: 'Seoul  ' })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profile] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
    })
  })

  describe('Compatibility Scoring', () => {
    it('should calculate compatibility using cached results', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([createMockProfile()] as any)

      const cachedScore = {
        score: 85,
        grade: 'A',
        emoji: '💖',
        tagline: 'Perfect match',
      }
      vi.mocked(cacheGet).mockResolvedValue(cachedScore)
      vi.mocked(quickPersonalityScore).mockReturnValue(80)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      // Combined score: 85 * 0.6 + 80 * 0.4 = 51 + 32 = 83
      expect(data.profiles[0].compatibilityScore).toBe(83)
      expect(data.profiles[0].compatibilityGrade).toBe('A')
      expect(getCompatibilitySummary).not.toHaveBeenCalled()
    })

    it('should calculate and cache compatibility when not cached', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([createMockProfile()] as any)

      vi.mocked(cacheGet).mockResolvedValue(null)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 90,
        grade: 'A+',
        emoji: '💕',
        tagline: 'Soul mate',
      } as any)
      vi.mocked(quickPersonalityScore).mockReturnValue(85)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(getCompatibilitySummary).toHaveBeenCalled()
      expect(cacheSet).toHaveBeenCalled()
      // Combined: 90 * 0.6 + 85 * 0.4 = 54 + 34 = 88
      expect(data.profiles[0].compatibilityScore).toBe(88)
    })

    it('should combine saju and personality scores', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([createMockProfile()] as any)

      vi.mocked(cacheGet).mockResolvedValue(null)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 80, // Saju score
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)
      vi.mocked(quickPersonalityScore).mockReturnValue(60) // Personality score

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      // Combined: 80 * 0.6 + 60 * 0.4 = 48 + 24 = 72
      expect(data.profiles[0].compatibilityScore).toBe(72)
    })

    it('should use only saju score if personality scores missing', async () => {
      const profileNoPersonality = createMockProfile({
        personalityScores: null,
      })

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profileNoPersonality] as any)

      vi.mocked(cacheGet).mockResolvedValue(null)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 85,
        grade: 'A',
        emoji: '💖',
        tagline: 'Great',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles[0].compatibilityScore).toBe(85)
      expect(quickPersonalityScore).not.toHaveBeenCalled()
    })

    it('should handle compatibility calculation errors gracefully', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([createMockProfile()] as any)

      vi.mocked(cacheGet).mockResolvedValue(null)
      vi.mocked(getCompatibilitySummary).mockRejectedValue(new Error('Calculation failed'))

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      // Should fallback to default score
      expect(data.profiles[0].compatibilityScore).toBe(75)
    })
  })

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profiles = Array.from({ length: 50 }, (_, i) =>
        createMockProfile({ id: `profile-${i}` })
      )
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue(profiles as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover?limit=10')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBeLessThanOrEqual(10)
    })

    it('should use default limit of 20', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      await GET(req)

      expect(prisma.matchProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 60, // limit * 3
        })
      )
    })

    it('should support offset parameter', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover?offset=20')

      await GET(req)

      expect(prisma.matchProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
        })
      )
    })

    it('should indicate hasMore correctly', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profiles = Array.from({ length: 50 }, (_, i) =>
        createMockProfile({ id: `profile-${i}` })
      )
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue(profiles as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover?limit=10')

      const response = await GET(req)
      const data = await response.json()

      expect(data.hasMore).toBe(true)
    })
  })

  describe('Sorting', () => {
    it('should sort profiles by compatibility score', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profiles = [
        createMockProfile({ id: 'profile-1' }),
        createMockProfile({ id: 'profile-2' }),
        createMockProfile({ id: 'profile-3' }),
      ]
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue(profiles as any)

      // Return different scores
      vi.mocked(cacheGet).mockResolvedValue(null)
      vi.mocked(getCompatibilitySummary)
        .mockResolvedValueOnce({ score: 60, grade: 'C', emoji: '🌟', tagline: 'OK' } as any)
        .mockResolvedValueOnce({ score: 90, grade: 'A', emoji: '💖', tagline: 'Great' } as any)
        .mockResolvedValueOnce({ score: 75, grade: 'B', emoji: '✨', tagline: 'Good' } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      // Should be sorted: 90, 75, 60
      expect(data.profiles[0].compatibilityScore).toBe(90)
      expect(data.profiles[1].compatibilityScore).toBe(75)
      expect(data.profiles[2].compatibilityScore).toBe(60)
    })
  })

  describe('Response Format', () => {
    it('should return complete profile information', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([createMockProfile()] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 85,
        grade: 'A',
        emoji: '💖',
        tagline: 'Great match',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      const profile = data.profiles[0]
      expect(profile).toHaveProperty('id')
      expect(profile).toHaveProperty('displayName')
      expect(profile).toHaveProperty('bio')
      expect(profile).toHaveProperty('occupation')
      expect(profile).toHaveProperty('photos')
      expect(profile).toHaveProperty('city')
      expect(profile).toHaveProperty('interests')
      expect(profile).toHaveProperty('verified')
      expect(profile).toHaveProperty('age')
      expect(profile).toHaveProperty('distance')
      expect(profile).toHaveProperty('zodiacSign')
      expect(profile).toHaveProperty('sajuElement')
      expect(profile).toHaveProperty('personalityType')
      expect(profile).toHaveProperty('compatibilityScore')
      expect(profile).toHaveProperty('compatibilityGrade')
    })

    it('should calculate zodiac sign correctly', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profile = createMockProfile({
        user: { ...createMockProfile().user, birthDate: '1992-08-20' }, // Leo
      })
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profile] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles[0].zodiacSign).toBe('Leo')
    })

    it('should calculate saju element correctly', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const profile = createMockProfile({
        user: { ...createMockProfile().user, birthDate: '1992-08-20' },
      })
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([profile] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles[0].sajuElement).toBeTruthy()
      expect(['Wood', 'Fire', 'Earth', 'Metal', 'Water']).toContain(
        data.profiles[0].sajuElement
      )
    })
  })

  describe('Additional Filters', () => {
    it('should filter by zodiac sign', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const leo = createMockProfile({
        id: 'profile-leo',
        user: { ...createMockProfile().user, birthDate: '1992-08-20' }, // Leo
      })
      const aries = createMockProfile({
        id: 'profile-aries',
        user: { ...createMockProfile().user, birthDate: '1992-04-10' }, // Aries
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([leo, aries] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover?zodiac=Leo')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].zodiacSign).toBe('Leo')
    })

    it('should filter by saju element', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findMany).mockResolvedValue([])
      vi.mocked(prisma.userBlock.findMany).mockResolvedValue([])

      const wood = createMockProfile({
        id: 'profile-wood',
        user: { ...createMockProfile().user, birthDate: '1984-01-01' }, // Wood
      })
      const fire = createMockProfile({
        id: 'profile-fire',
        user: { ...createMockProfile().user, birthDate: '1986-01-01' }, // Fire
      })

      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([wood, fire] as any)
      vi.mocked(getCompatibilitySummary).mockResolvedValue({
        score: 75,
        grade: 'B',
        emoji: '✨',
        tagline: 'Good',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/destiny-match/discover?element=Wood')

      const response = await GET(req)
      const data = await response.json()

      expect(data.profiles.length).toBe(1)
      expect(data.profiles[0].sajuElement).toBe('Wood')
    })
  })
})
