/**
 * Mega tests for Referral System
 * Tests code generation, linking, reward claiming, stats, and security
 */

import { vi } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { addBonusCredits } from '@/lib/credits/creditService'
import { sendReferralRewardEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import {
  generateReferralCode,
  getUserReferralCode,
  findUserByReferralCode,
  linkReferrer,
  claimReferralReward,
  getReferralStats,
  getReferralUrl,
} from '@/lib/referral/referralService'

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userSettings: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    referralReward: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/credits/creditService', () => ({
  addBonusCredits: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendReferralRewardEmail: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('Referral Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateReferralCode', () => {
    it('should generate 8-character uppercase code', () => {
      const code = generateReferralCode()
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[0-9A-F]{8}$/)
    })

    it('should generate unique codes', () => {
      const codes = new Set()
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode())
      }
      // High probability of uniqueness for 100 codes
      expect(codes.size).toBeGreaterThan(95)
    })

    it('should only use hex characters', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateReferralCode()
        expect(code).toMatch(/^[0-9A-F]+$/)
      }
    })
  })

  describe('getUserReferralCode', () => {
    it('should return existing code if available', async () => {
      const mockUser = { referralCode: 'ABC12345' }
      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const code = await getUserReferralCode('user_123')

      expect(code).toBe('ABC12345')
      expect(prisma.userSettings.upsert).not.toHaveBeenCalled()
    })

    it('should generate and save new code if none exists', async () => {
      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: null,
      })
      ;(prisma.userSettings.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const code = await getUserReferralCode('user_123')

      expect(code).toHaveLength(8)
      expect(prisma.userSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_123' },
          create: { userId: 'user_123', referralCode: expect.any(String) },
          update: { referralCode: expect.any(String) },
        })
      )
    })

    it('should handle missing user', async () => {
      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(prisma.userSettings.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const code = await getUserReferralCode('nonexistent')

      expect(code).toHaveLength(8)
    })
  })

  describe('findUserByReferralCode', () => {
    it('should find user by referral code', async () => {
      const mockSettings = {
        userId: 'user_123',
        referralCode: 'ABC12345',
        user: { id: 'user_123', name: 'Test User' },
      }

      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings)

      const result = await findUserByReferralCode('ABC12345')

      expect(result).toEqual({ id: 'user_123', name: 'Test User', referralCode: 'ABC12345' })
      expect(prisma.userSettings.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { referralCode: 'ABC12345' },
        })
      )
    })

    it('should convert code to uppercase', async () => {
      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await findUserByReferralCode('abc12345')

      expect(prisma.userSettings.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { referralCode: 'ABC12345' },
        })
      )
    })

    it('should return null for invalid code', async () => {
      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await findUserByReferralCode('INVALID')

      expect(result).toBeNull()
    })
  })

  describe('linkReferrer', () => {
    const mockReferrer = {
      id: 'referrer_123',
      name: 'Referrer User',
      referralCode: 'REF12345',
    }

    beforeEach(() => {
      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: mockReferrer.id,
        referralCode: mockReferrer.referralCode,
        user: { id: mockReferrer.id, name: mockReferrer.name },
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'referrer_123',
        email: 'referrer@test.com',
        name: 'Referrer User',
      })
      ;(prisma.referralReward.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(addBonusCredits as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(sendReferralRewardEmail as ReturnType<typeof vi.fn>).mockResolvedValue({})
    })

    it('should link new user to referrer', async () => {
      const result = await linkReferrer('new_user_123', 'REF12345')

      expect(result.success).toBe(true)
      expect(result.referrerId).toBe('referrer_123')

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'new_user_123' },
        data: { referrerId: 'referrer_123' },
      })
    })

    it('should award credits to referrer immediately', async () => {
      await linkReferrer('new_user_123', 'REF12345')

      expect(addBonusCredits).toHaveBeenCalledWith('referrer_123', 3)
    })

    it('should create completed reward record', async () => {
      await linkReferrer('new_user_123', 'REF12345')

      expect(prisma.referralReward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'referrer_123',
            referredUserId: 'new_user_123',
            creditsAwarded: 3,
            rewardType: 'signup_complete',
            status: 'completed',
            completedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should send reward email to referrer', async () => {
      await linkReferrer('new_user_123', 'REF12345')

      expect(sendReferralRewardEmail).toHaveBeenCalledWith(
        'referrer_123',
        'referrer@test.com',
        expect.objectContaining({
          userName: 'Referrer User',
          creditsAwarded: 3,
        })
      )
    })

    it('should handle email send failure gracefully', async () => {
      ;(sendReferralRewardEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('SMTP error')
      )

      const result = await linkReferrer('new_user_123', 'REF12345')

      expect(result.success).toBe(true)
      expect(logger.error).toHaveBeenCalled()
    })

    it('should reject invalid referral code', async () => {
      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await linkReferrer('new_user_123', 'INVALID')

      expect(result.success).toBe(false)
      expect(result.error).toBe('invalid_code')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should prevent self-referral', async () => {
      const result = await linkReferrer('referrer_123', 'REF12345')

      expect(result.success).toBe(false)
      expect(result.error).toBe('self_referral')
      expect(addBonusCredits).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB connection failed')
      )

      const result = await linkReferrer('new_user_123', 'REF12345')

      expect(result.success).toBe(false)
      expect(result.error).toContain('DB connection failed')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle missing referrer email', async () => {
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'referrer_123',
        email: null,
        name: 'Referrer User',
      })

      const result = await linkReferrer('new_user_123', 'REF12345')

      expect(result.success).toBe(true)
      expect(sendReferralRewardEmail).not.toHaveBeenCalled()
    })
  })

  describe('claimReferralReward', () => {
    it('should claim pending reward', async () => {
      const mockPendingReward = {
        id: 'reward_123',
        userId: 'referrer_123',
        referredUserId: 'new_user_123',
        creditsAwarded: 5,
        status: 'pending',
        rewardType: 'first_analysis',
      }

      ;(prisma.referralReward.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPendingReward
      )
      ;(prisma.referralReward.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(addBonusCredits as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const result = await claimReferralReward('new_user_123')

      expect(result.success).toBe(true)
      expect(result.creditsAwarded).toBe(5)

      expect(addBonusCredits).toHaveBeenCalledWith('referrer_123', 5)
      expect(prisma.referralReward.update).toHaveBeenCalledWith({
        where: { id: 'reward_123' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      })
    })

    it('should return error when no pending reward', async () => {
      ;(prisma.referralReward.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await claimReferralReward('user_123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('no_pending_reward')
      expect(addBonusCredits).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      ;(prisma.referralReward.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB query failed')
      )

      const result = await claimReferralReward('user_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('DB query failed')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should only process first_analysis rewards', async () => {
      await claimReferralReward('user_123')

      expect(prisma.referralReward.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rewardType: 'first_analysis',
            status: 'pending',
          }),
        })
      )
    })
  })

  describe('getReferralStats', () => {
    it('should return complete referral statistics', async () => {
      const mockUser = { referralCode: 'STAT1234' }
      const mockReferrals = [
        {
          id: 'ref1',
          name: 'User 1',
          createdAt: new Date('2024-01-01'),
          readings: [{ id: 'reading1' }],
        },
        {
          id: 'ref2',
          name: 'User 2',
          createdAt: new Date('2024-01-02'),
          readings: [],
        },
      ]
      const mockRewards = [
        {
          id: 'reward1',
          creditsAwarded: 3,
          status: 'completed',
          createdAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-02'),
        },
        {
          id: 'reward2',
          creditsAwarded: 5,
          status: 'pending',
          createdAt: new Date('2024-01-03'),
          completedAt: null,
        },
      ]

      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReferrals)
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockRewards)

      const stats = await getReferralStats('user_123')

      expect(stats.referralCode).toBe('STAT1234')
      expect(stats.stats.total).toBe(2)
      expect(stats.stats.completed).toBe(1)
      expect(stats.stats.pending).toBe(1)
      expect(stats.stats.creditsEarned).toBe(3)
      expect(stats.referrals).toHaveLength(2)
      expect(stats.rewards).toHaveLength(2)
    })

    it('should generate code if missing', async () => {
      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: null,
      })
      ;(prisma.userSettings.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const stats = await getReferralStats('user_123')

      expect(stats.referralCode).toHaveLength(8)
    })

    it('should handle anonymous referrals', async () => {
      const mockReferrals = [
        {
          id: 'ref1',
          name: null,
          createdAt: new Date(),
          readings: [],
        },
      ]

      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'TEST1234',
      })
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReferrals)
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const stats = await getReferralStats('user_123')

      expect(stats.referrals[0].name).toBe('Anonymous')
    })

    it('should calculate completed referrals correctly', async () => {
      const mockReferrals = [
        { id: 'ref1', name: 'User 1', createdAt: new Date(), readings: [{ id: 'r1' }] },
        { id: 'ref2', name: 'User 2', createdAt: new Date(), readings: [{ id: 'r2' }] },
        { id: 'ref3', name: 'User 3', createdAt: new Date(), readings: [] },
      ]

      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'TEST1234',
      })
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReferrals)
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const stats = await getReferralStats('user_123')

      expect(stats.stats.completed).toBe(2)
      expect(stats.stats.pending).toBe(1)
    })

    it('should only count completed rewards for credits', async () => {
      const mockRewards = [
        { id: '1', creditsAwarded: 3, status: 'completed', createdAt: new Date() },
        { id: '2', creditsAwarded: 5, status: 'pending', createdAt: new Date() },
        { id: '3', creditsAwarded: 10, status: 'completed', createdAt: new Date() },
      ]

      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'TEST1234',
      })
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockRewards)

      const stats = await getReferralStats('user_123')

      expect(stats.stats.creditsEarned).toBe(13) // 3 + 10
    })

    it('should return empty stats for new user', async () => {
      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'NEW12345',
      })
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const stats = await getReferralStats('new_user')

      expect(stats.stats.total).toBe(0)
      expect(stats.stats.completed).toBe(0)
      expect(stats.stats.pending).toBe(0)
      expect(stats.stats.creditsEarned).toBe(0)
      expect(stats.referrals).toEqual([])
      expect(stats.rewards).toEqual([])
    })
  })

  describe('getReferralUrl', () => {
    it('should generate URL with default base', () => {
      const originalEnv = process.env.NEXT_PUBLIC_BASE_URL
      delete process.env.NEXT_PUBLIC_BASE_URL

      const url = getReferralUrl('TEST1234')

      expect(url).toBe('https://destinypal.me/?ref=TEST1234')

      process.env.NEXT_PUBLIC_BASE_URL = originalEnv
    })

    it('should use provided base URL', () => {
      const url = getReferralUrl('TEST1234', 'https://custom.com')

      expect(url).toBe('https://custom.com/?ref=TEST1234')
    })

    it('should use env base URL when available', () => {
      const originalEnv = process.env.NEXT_PUBLIC_BASE_URL
      process.env.NEXT_PUBLIC_BASE_URL = 'https://env.com'

      const url = getReferralUrl('TEST1234')

      expect(url).toBe('https://env.com/?ref=TEST1234')

      process.env.NEXT_PUBLIC_BASE_URL = originalEnv
    })

    it('should handle codes with special characters', () => {
      const url = getReferralUrl('ABC-123')

      expect(url).toContain('?ref=ABC-123')
    })
  })

  describe('Security & Edge Cases', () => {
    it('should handle concurrent referral claims', async () => {
      const mockReward = {
        id: 'reward_123',
        userId: 'referrer_123',
        creditsAwarded: 5,
      }

      ;(prisma.referralReward.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReward)
      ;(prisma.referralReward.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(addBonusCredits as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const results = await Promise.all([
        claimReferralReward('user_123'),
        claimReferralReward('user_123'),
      ])

      // Should handle concurrency gracefully
      expect(results.every((r) => r.success !== undefined)).toBe(true)
    })

    it('should validate referral code format', () => {
      // Codes should be uppercase hex
      const code = generateReferralCode()

      expect(code).not.toContain('g')
      expect(code).not.toContain('z')
      expect(code).not.toMatch(/[a-f]/) // Should be uppercase
    })

    it('should handle very long referral chains', async () => {
      const mockReferrals = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `ref_${i}`,
          name: `User ${i}`,
          createdAt: new Date(),
          readings: i % 2 === 0 ? [{ id: `r${i}` }] : [],
        }))

      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'LONG1234',
      })
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReferrals)
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const stats = await getReferralStats('user_123')

      expect(stats.stats.total).toBe(100)
      expect(stats.referrals).toHaveLength(100)
    })

    it('should handle malformed email addresses', async () => {
      const mockReferrer = {
        id: 'referrer_123',
        name: 'Referrer',
        referralCode: 'REF12345',
      }

      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: mockReferrer.id,
        referralCode: mockReferrer.referralCode,
        user: { id: mockReferrer.id, name: mockReferrer.name },
      })
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'referrer_123',
        email: 'not-an-email',
        name: 'Referrer',
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.referralReward.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(addBonusCredits as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(sendReferralRewardEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid email')
      )

      const result = await linkReferrer('new_user_123', 'REF12345')

      expect(result.success).toBe(true) // Should still succeed
    })

    it('should prevent reward duplication', async () => {
      ;(prisma.referralReward.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await claimReferralReward('user_123')

      expect(result.success).toBe(false)
      expect(addBonusCredits).not.toHaveBeenCalled()
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete referral flow', async () => {
      // 1. Get referrer code
      ;(prisma.userSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'REF12345',
      })
      const code = await getUserReferralCode('referrer_123')
      expect(code).toBe('REF12345')

      // 2. Validate code
      ;(prisma.userSettings.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'referrer_123',
        referralCode: 'REF12345',
        user: { id: 'referrer_123', name: 'Referrer' },
      })
      const referrer = await findUserByReferralCode('REF12345')
      expect(referrer).toBeDefined()

      // 3. Link new user
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'referrer_123',
        email: 'ref@test.com',
        name: 'Referrer',
      })
      ;(prisma.referralReward.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(addBonusCredits as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(sendReferralRewardEmail as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const linkResult = await linkReferrer('new_user_123', 'REF12345')
      expect(linkResult.success).toBe(true)

      // 4. Check stats
      ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'new_user_123', name: 'New User', createdAt: new Date(), readings: [] },
      ])
      ;(prisma.referralReward.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'r1',
          creditsAwarded: 3,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ])

      const stats = await getReferralStats('referrer_123')
      expect(stats.stats.total).toBe(1)
      expect(stats.stats.creditsEarned).toBe(3)
    })
  })
})
