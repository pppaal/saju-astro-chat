import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/destiny-match/swipe/route'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock authOptions
vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock credits
vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    matchProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    matchSwipe: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    matchConnection: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/destiny-match/quickCompatibility', () => ({
  calculateDetailedCompatibility: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { calculateDetailedCompatibility } from '@/lib/destiny-match/quickCompatibility'
import { logger } from '@/lib/logger'

describe('Swipe API - POST', () => {
  const mockUserId = 'user-123'
  const mockMyProfileId = 'profile-123'
  const mockTargetProfileId = 'profile-456'

  const mockMyProfile = {
    id: mockMyProfileId,
    userId: mockUserId,
    superLikeCount: 3,
    superLikeResetAt: new Date(),
    likesGiven: 10,
    matchCount: 5,
    user: {
      birthDate: new Date('1990-01-01'),
      birthTime: '12:00',
      gender: 'MALE',
    },
  }

  const mockTargetProfile = {
    id: mockTargetProfileId,
    userId: 'user-456',
    likesReceived: 20,
    user: {
      birthDate: new Date('1992-05-15'),
      birthTime: '14:30',
      gender: 'FEMALE',
    },
  }

  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
    expires: '2025-12-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock session
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 if targetProfileId is missing', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({ action: 'like' }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('targetProfileId is required')
    })

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'invalid_action',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid action')
    })

    it('should accept valid actions: like, pass, super_like', async () => {
      const actions = ['like', 'pass', 'super_like']

      for (const action of actions) {
        vi.clearAllMocks()
        vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
        vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
          return callback({
            matchSwipe: {
              create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
            },
            matchProfile: {
              update: vi.fn(),
            },
          })
        })

        const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
          method: 'POST',
          body: JSON.stringify({
            targetProfileId: mockTargetProfileId,
            action,
          }),
        })

        const response = await POST(request, { userId: mockUserId })
        expect(response.status).not.toBe(400)
      }
    })
  })

  describe('Profile Checks', () => {
    it('should return 400 if user has no profile', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('매칭 프로필을 설정해주세요')
    })

    it('should return 404 if target profile not found', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('대상 프로필을 찾을 수 없습니다')
    })

    it('should prevent swiping on self', async () => {
      const selfProfile = { ...mockMyProfile, userId: mockUserId }
      const targetSelfProfile = { ...mockTargetProfile, userId: mockUserId }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(selfProfile as any)
        .mockResolvedValueOnce(targetSelfProfile as any)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('자신에게 스와이프할 수 없습니다')
    })
  })

  describe('Super Like Daily Reset', () => {
    it('should reset super likes if last reset was yesterday', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      const profileWithOldReset = {
        ...mockMyProfile,
        superLikeCount: 0,
        superLikeResetAt: yesterday,
      }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(profileWithOldReset as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchProfile.update).mockResolvedValue({
        ...profileWithOldReset,
        superLikeCount: 3,
        superLikeResetAt: new Date(),
      } as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        })
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'super_like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(prisma.matchProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            superLikeCount: 3,
          }),
        })
      )
    })

    it('should not reset if last reset was today', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const profileWithTodayReset = {
        ...mockMyProfile,
        superLikeCount: 2,
        superLikeResetAt: today,
      }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(profileWithTodayReset as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        })
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      // Should not call update for reset
      const updateCalls = vi.mocked(prisma.matchProfile.update).mock.calls
      const resetCall = updateCalls.find((call) => call[0].data?.superLikeCount === 3)
      expect(resetCall).toBeUndefined()
    })

    it('should reset if superLikeResetAt is null', async () => {
      const profileWithNoReset = {
        ...mockMyProfile,
        superLikeCount: 0,
        superLikeResetAt: null,
      }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(profileWithNoReset as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchProfile.update).mockResolvedValue({
        ...profileWithNoReset,
        superLikeCount: 3,
        superLikeResetAt: new Date(),
      } as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        })
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'super_like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(prisma.matchProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            superLikeCount: 3,
          }),
        })
      )
    })
  })

  describe('Super Like Count Validation', () => {
    it('should return 400 if super like count is 0', async () => {
      const profileNoSuperLikes = {
        ...mockMyProfile,
        superLikeCount: 0,
      }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(profileNoSuperLikes as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'super_like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('슈퍼라이크를 모두 사용했습니다')
    })

    it('should allow super like if count > 0', async () => {
      const profileWithSuperLikes = {
        ...mockMyProfile,
        superLikeCount: 1,
      }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(profileWithSuperLikes as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        })
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'super_like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      expect(response.status).toBe(200)
    })
  })

  describe('Duplicate Swipe Prevention', () => {
    it('should return 400 if already swiped', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValueOnce({
        id: 'existing-swipe',
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('이미 스와이프한 프로필입니다')
    })
  })

  describe('Match Detection', () => {
    it('should detect match when both swiped like', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      // No existing swipe from me
      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        // Reverse swipe exists (target liked me)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          swiperId: mockTargetProfileId,
          targetId: mockMyProfileId,
          action: 'like',
        } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isMatch).toBe(true)
      expect(data.connectionId).toBe('connection-123')
    })

    it('should detect match when I super_like and they liked', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          swiperId: mockTargetProfileId,
          targetId: mockMyProfileId,
          action: 'like',
        } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'super_like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isMatch).toBe(true)
    })

    it('should not match if I pass', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'like',
        } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'pass',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(data.isMatch).toBe(false)
    })

    it('should not match if they passed', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'pass',
        } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(data.isMatch).toBe(false)
    })
  })

  describe('Transaction Operations - Like', () => {
    it('should create swipe record', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const mockCreate = vi.fn().mockResolvedValue({ id: 'swipe-123' })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: mockCreate,
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
          compatibilityScore: 85,
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          swiperId: mockMyProfileId,
          targetId: mockTargetProfileId,
          action: 'like',
          compatibilityScore: 85,
        }),
      })
    })

    it('should increment likesGiven and likesReceived for like', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      // Check likesGiven increment
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMyProfileId },
          data: { likesGiven: { increment: 1 } },
        })
      )

      // Check likesReceived increment
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTargetProfileId },
          data: { likesReceived: { increment: 1 } },
        })
      )
    })

    it('should not increment stats for pass', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'pass',
        }),
      })

      await POST(request, { userId: mockUserId })

      // Should not call update for likes
      const likesGivenCall = mockUpdate.mock.calls.find((call) => call[0].data?.likesGiven)
      expect(likesGivenCall).toBeUndefined()
    })
  })

  describe('Transaction Operations - Super Like', () => {
    it('should decrement superLikeCount for super_like', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'super_like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMyProfileId },
          data: { superLikeCount: { decrement: 1 } },
        })
      )
    })

    it('should not decrement superLikeCount for like', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      const superLikeCall = mockUpdate.mock.calls.find((call) => call[0].data?.superLikeCount)
      expect(superLikeCall).toBeUndefined()
    })
  })

  describe('Match Connection Creation', () => {
    it('should create MatchConnection on match', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'like',
        } as any)

      const mockConnectionCreate = vi.fn().mockResolvedValue({ id: 'connection-123' })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: mockConnectionCreate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
          compatibilityScore: 90,
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(mockConnectionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          compatibilityScore: 90,
          isSuperLikeMatch: false,
        }),
      })
    })

    it('should mark isSuperLikeMatch if either used super_like', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'super_like',
        } as any)

      const mockConnectionCreate = vi.fn().mockResolvedValue({ id: 'connection-123' })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: mockConnectionCreate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(mockConnectionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSuperLikeMatch: true,
        }),
      })
    })

    it('should update reverse swipe to isMatched on match', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe-123',
          action: 'like',
        } as any)

      const mockSwipeUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: mockSwipeUpdate,
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(mockSwipeUpdate).toHaveBeenCalledWith({
        where: { id: 'reverse-swipe-123' },
        data: expect.objectContaining({
          isMatched: true,
        }),
      })
    })

    it('should increment matchCount for both profiles on match', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'like',
        } as any)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: mockUpdate,
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      // Should increment for both users
      const matchCountCalls = mockUpdate.mock.calls.filter((call) => call[0].data?.matchCount)
      expect(matchCountCalls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Detailed Compatibility Calculation', () => {
    it('should calculate detailed compatibility on match', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'like',
        } as any)

      vi.mocked(calculateDetailedCompatibility).mockResolvedValue({
        score: 92,
        summary: 'Excellent match',
      } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(calculateDetailedCompatibility).toHaveBeenCalledWith(
        expect.objectContaining({
          birthDate: mockMyProfile.user.birthDate,
          birthTime: mockMyProfile.user.birthTime,
          gender: mockMyProfile.user.gender,
        }),
        expect.objectContaining({
          birthDate: mockTargetProfile.user.birthDate,
          birthTime: mockTargetProfile.user.birthTime,
          gender: mockTargetProfile.user.gender,
        })
      )
    })

    it('should handle compatibility calculation failure gracefully', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'like',
        } as any)

      vi.mocked(calculateDetailedCompatibility).mockRejectedValue(
        new Error('Compatibility calculation failed')
      )

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })

      // Should still succeed
      expect(response.status).toBe(200)
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should skip compatibility if birthDate missing', async () => {
      const profileNoBirthDate = {
        ...mockMyProfile,
        user: { ...mockMyProfile.user, birthDate: null },
      }

      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(profileNoBirthDate as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'reverse-swipe',
          action: 'like',
        } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'new-swipe' }),
            update: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
          matchConnection: {
            create: vi.fn().mockResolvedValue({ id: 'connection-123' }),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      expect(calculateDetailedCompatibility).not.toHaveBeenCalled()
    })
  })

  describe('Last Active Update', () => {
    it('should update lastActiveAt', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      await POST(request, { userId: mockUserId })

      const lastActiveCall = mockUpdate.mock.calls.find((call) => call[0].data?.lastActiveAt)
      expect(lastActiveCall).toBeDefined()
    })
  })

  describe('Response Format', () => {
    it('should return success response with correct format', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'like',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        isMatch: expect.any(Boolean),
        swipeId: 'swipe-123',
        connectionId: expect.anything(),
      })
    })

    it('should return null connectionId when no match', async () => {
      vi.mocked(prisma.matchProfile.findUnique)
        .mockResolvedValueOnce(mockMyProfile as any)
        .mockResolvedValueOnce(mockTargetProfile as any)

      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            create: vi.fn().mockResolvedValue({ id: 'swipe-123' }),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'POST',
        body: JSON.stringify({
          targetProfileId: mockTargetProfileId,
          action: 'pass',
        }),
      })

      const response = await POST(request, { userId: mockUserId })
      const data = await response.json()

      expect(data.connectionId).toBeNull()
    })
  })
})

describe('Swipe API - DELETE (Undo)', () => {
  const mockUserId = 'user-123'
  const mockMyProfileId = 'profile-123'
  const mockSwipeId = 'swipe-123'
  const mockTargetProfileId = 'profile-456'

  const mockMyProfile = {
    id: mockMyProfileId,
    userId: mockUserId,
    likesGiven: 10,
    superLikeCount: 3,
  }

  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
    expires: '2025-12-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock session
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Validation', () => {
    it('should return 400 if swipeId is missing', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('swipeId is required')
    })

    it('should return 400 if user has no profile', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('매칭 프로필을 찾을 수 없습니다')
    })

    it('should return 404 if swipe not found', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('스와이프를 찾을 수 없습니다')
    })
  })

  describe('Permission Checks', () => {
    it('should return 403 if swipe belongs to different user', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue({
        id: mockSwipeId,
        swiperId: 'different-profile-id',
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(),
        isMatched: false,
      } as any)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('본인의 스와이프만 되돌릴 수 있습니다')
    })
  })

  describe('Time Window Validation', () => {
    it('should allow undo within 5 minutes', async () => {
      const recentSwipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(recentSwipe as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })

      expect(response.status).toBe(200)
    })

    it('should reject undo after 5 minutes', async () => {
      const oldSwipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(oldSwipe as any)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('5분 이내의 스와이프만 되돌릴 수 있습니다')
    })

    it('should accept undo at exactly 5 minute boundary', async () => {
      const boundarySwipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // Exactly 5 minutes
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(boundarySwipe as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })

      expect(response.status).toBe(200)
    })
  })

  describe('Match Status Check', () => {
    it('should reject undo for matched swipes', async () => {
      const matchedSwipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(),
        isMatched: true,
        matchedAt: new Date(),
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(matchedSwipe as any)

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('이미 매칭된 스와이프는 되돌릴 수 없습니다')
    })
  })

  describe('Rollback Operations - Like', () => {
    it('should delete swipe record', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      const mockDelete = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: mockDelete,
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      await DELETE(request, { userId: mockUserId })

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: mockSwipeId },
      })
    })

    it('should decrement likesGiven and likesReceived for like', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      await DELETE(request, { userId: mockUserId })

      // Check likesGiven decrement
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockMyProfileId },
        data: { likesGiven: { decrement: 1 } },
      })

      // Check likesReceived decrement
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockTargetProfileId },
        data: { likesReceived: { decrement: 1 } },
      })
    })

    it('should not rollback stats for pass', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'pass',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      await DELETE(request, { userId: mockUserId })

      // Should not update for pass action
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Rollback Operations - Super Like', () => {
    it('should restore superLikeCount for super_like', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'super_like',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      await DELETE(request, { userId: mockUserId })

      // Should restore superLikeCount
      const superLikeCall = mockUpdate.mock.calls.find((call: any) => call[0].data?.superLikeCount)
      expect(superLikeCall).toBeDefined()
      expect(superLikeCall[0]).toEqual({
        where: { id: mockMyProfileId },
        data: { superLikeCount: { increment: 1 } },
      })
    })

    it('should rollback both stats and superLike for super_like', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'super_like',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      const mockUpdate = vi.fn()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: mockUpdate,
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      await DELETE(request, { userId: mockUserId })

      // Should have 3 updates: likesGiven, likesReceived, superLikeCount
      expect(mockUpdate).toHaveBeenCalledTimes(3)
    })
  })

  describe('Logging', () => {
    it('should log undo operation', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      await DELETE(request, { userId: mockUserId })

      expect(logger.info).toHaveBeenCalledWith(
        '[destiny-match/swipe] Undo swipe',
        expect.objectContaining({
          userId: mockUserId,
          swipeId: mockSwipeId,
          action: 'like',
        })
      )
    })
  })

  describe('Response Format', () => {
    it('should return success response', async () => {
      const swipe = {
        id: mockSwipeId,
        swiperId: mockMyProfileId,
        targetId: mockTargetProfileId,
        action: 'like',
        createdAt: new Date(),
        isMatched: false,
      }

      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockMyProfile as any)
      vi.mocked(prisma.matchSwipe.findUnique).mockResolvedValue(swipe as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          matchSwipe: {
            delete: vi.fn(),
          },
          matchProfile: {
            update: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const request = new NextRequest('http://localhost/api/destiny-match/swipe', {
        method: 'DELETE',
        body: JSON.stringify({ swipeId: mockSwipeId }),
      })

      const response = await DELETE(request, { userId: mockUserId })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })
})
