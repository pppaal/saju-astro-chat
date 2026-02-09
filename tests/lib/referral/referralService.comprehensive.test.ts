/**
 * Comprehensive tests for Referral System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
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
      findMany: vi.fn(),
      update: vi.fn(),
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
  addBonusCredits: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email', () => ({
  sendReferralRewardEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { prisma } from '@/lib/db/prisma'
import { addBonusCredits } from '@/lib/credits/creditService'

const mockedPrisma = vi.mocked(prisma)

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

    it('should generate unique codes on multiple calls', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode())
      }
      // All 100 codes should be unique (statistically)
      expect(codes.size).toBe(100)
    })

    it('should only contain valid hexadecimal characters', () => {
      const code = generateReferralCode()
      const validChars = '0123456789ABCDEF'
      for (const char of code) {
        expect(validChars).toContain(char)
      }
    })

    it('should never contain lowercase characters', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateReferralCode()
        expect(code).toBe(code.toUpperCase())
      }
    })
  })

  describe('getUserReferralCode', () => {
    it('should return existing referral code if user has one', async () => {
      mockedPrisma.userSettings.findUnique.mockResolvedValue({
        referralCode: 'EXISTING1',
      } as never)

      const code = await getUserReferralCode('user-123')
      expect(code).toBe('EXISTING1')
      expect(mockedPrisma.userSettings.upsert).not.toHaveBeenCalled()
    })

    it('should generate and save new code if user has none', async () => {
      mockedPrisma.userSettings.findUnique.mockResolvedValue({
        referralCode: null,
      } as never)
      mockedPrisma.userSettings.upsert.mockResolvedValue({} as never)

      const code = await getUserReferralCode('user-123')

      expect(code).toHaveLength(8)
      expect(mockedPrisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: { userId: 'user-123', referralCode: expect.any(String) },
        update: { referralCode: expect.any(String) },
      })
    })

    it('should handle user not found', async () => {
      mockedPrisma.userSettings.findUnique.mockResolvedValue(null)
      mockedPrisma.userSettings.upsert.mockResolvedValue({} as never)

      const code = await getUserReferralCode('nonexistent')
      expect(code).toHaveLength(8)
    })
  })

  describe('findUserByReferralCode', () => {
    it('should find user by referral code', async () => {
      const mockSettings = {
        userId: 'user-1',
        referralCode: 'ABC12345',
        user: { id: 'user-1', name: 'Test User' },
      }
      mockedPrisma.userSettings.findFirst.mockResolvedValue(mockSettings as never)

      const result = await findUserByReferralCode('abc12345')

      expect(mockedPrisma.userSettings.findFirst).toHaveBeenCalledWith({
        where: { referralCode: 'ABC12345' },
        select: { userId: true, referralCode: true, user: { select: { id: true, name: true } } },
      })
      expect(result).toEqual({ id: 'user-1', name: 'Test User', referralCode: 'ABC12345' })
    })

    it('should return null for non-existent code', async () => {
      mockedPrisma.userSettings.findFirst.mockResolvedValue(null)

      const result = await findUserByReferralCode('INVALID')
      expect(result).toBeNull()
    })

    it('should normalize code to uppercase', async () => {
      mockedPrisma.userSettings.findFirst.mockResolvedValue(null)

      await findUserByReferralCode('lowercase')

      expect(mockedPrisma.userSettings.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { referralCode: 'LOWERCASE' },
        })
      )
    })
  })

  describe('linkReferrer', () => {
    it('should successfully link referrer and award credits', async () => {
      const referrerSettings = {
        userId: 'referrer-1',
        referralCode: 'REF12345',
        user: { id: 'referrer-1', name: 'Referrer' },
      }
      mockedPrisma.userSettings.findFirst.mockResolvedValue(referrerSettings as never)
      mockedPrisma.user.update.mockResolvedValue({} as never)
      mockedPrisma.referralReward.create.mockResolvedValue({} as never)
      mockedPrisma.user.findUnique.mockResolvedValue({
        email: 'ref@test.com',
        name: 'Referrer',
      } as never)

      const result = await linkReferrer('new-user', 'REF12345')

      expect(result.success).toBe(true)
      expect(result.referrerId).toBe('referrer-1')
      expect(addBonusCredits).toHaveBeenCalledWith('referrer-1', 3)
    })

    it('should reject invalid referral code', async () => {
      mockedPrisma.userSettings.findFirst.mockResolvedValue(null)

      const result = await linkReferrer('new-user', 'INVALID')

      expect(result.success).toBe(false)
      expect(result.error).toBe('invalid_code')
    })

    it('should prevent self-referral', async () => {
      mockedPrisma.userSettings.findFirst.mockResolvedValue({
        userId: 'user-1',
        referralCode: 'SELF1234',
        user: { id: 'user-1', name: 'Self' },
      } as never)

      const result = await linkReferrer('user-1', 'SELF1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('self_referral')
    })

    it('should handle database errors gracefully', async () => {
      mockedPrisma.userSettings.findFirst.mockRejectedValue(new Error('DB error'))

      const result = await linkReferrer('new-user', 'CODE1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('DB error')
    })
  })

  describe('claimReferralReward', () => {
    it('should claim pending reward and award credits', async () => {
      const pendingReward = {
        id: 'reward-1',
        userId: 'referrer-1',
        referredUserId: 'referred-1',
        creditsAwarded: 5,
        status: 'pending',
        rewardType: 'first_analysis',
      }
      mockedPrisma.referralReward.findFirst.mockResolvedValue(pendingReward as never)
      mockedPrisma.referralReward.update.mockResolvedValue({} as never)

      const result = await claimReferralReward('referred-1')

      expect(result.success).toBe(true)
      expect(result.creditsAwarded).toBe(5)
      expect(addBonusCredits).toHaveBeenCalledWith('referrer-1', 5)
    })

    it('should return error when no pending reward', async () => {
      mockedPrisma.referralReward.findFirst.mockResolvedValue(null)

      const result = await claimReferralReward('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('no_pending_reward')
    })

    it('should handle database errors', async () => {
      mockedPrisma.referralReward.findFirst.mockRejectedValue(new Error('Connection lost'))

      const result = await claimReferralReward('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection lost')
    })
  })

  describe('getReferralStats', () => {
    it('should return complete referral statistics', async () => {
      mockedPrisma.userSettings.findUnique.mockResolvedValue({
        referralCode: 'CODE1234',
      } as never)
      mockedPrisma.user.findMany.mockResolvedValue([
        { id: 'ref-1', name: 'User 1', createdAt: new Date(), readings: [{ id: 'r1' }] },
        { id: 'ref-2', name: 'User 2', createdAt: new Date(), readings: [] },
      ] as never)
      mockedPrisma.referralReward.findMany.mockResolvedValue([
        { id: 'rw-1', creditsAwarded: 3, status: 'completed', createdAt: new Date() },
        { id: 'rw-2', creditsAwarded: 3, status: 'pending', createdAt: new Date() },
      ] as never)

      const stats = await getReferralStats('user-1')

      expect(stats.referralCode).toBe('CODE1234')
      expect(stats.stats.total).toBe(2)
      expect(stats.stats.completed).toBe(1)
      expect(stats.stats.pending).toBe(1)
      expect(stats.stats.creditsEarned).toBe(3)
      expect(stats.referrals).toHaveLength(2)
      expect(stats.rewards).toHaveLength(2)
    })

    it('should generate code if user has none', async () => {
      mockedPrisma.userSettings.findUnique.mockResolvedValueOnce({ referralCode: null } as never)
      mockedPrisma.user.findMany.mockResolvedValue([])
      mockedPrisma.referralReward.findMany.mockResolvedValue([])
      mockedPrisma.userSettings.upsert.mockResolvedValue({} as never)

      const stats = await getReferralStats('user-1')

      expect(stats.referralCode).toHaveLength(8)
    })

    it('should handle empty referrals', async () => {
      mockedPrisma.userSettings.findUnique.mockResolvedValue({ referralCode: 'CODE1234' } as never)
      mockedPrisma.user.findMany.mockResolvedValue([])
      mockedPrisma.referralReward.findMany.mockResolvedValue([])

      const stats = await getReferralStats('user-1')

      expect(stats.stats.total).toBe(0)
      expect(stats.stats.completed).toBe(0)
      expect(stats.stats.creditsEarned).toBe(0)
    })
  })

  describe('getReferralUrl', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    it('should generate URL with provided base', () => {
      const url = getReferralUrl('CODE1234', 'https://example.com')
      expect(url).toBe('https://example.com/?ref=CODE1234')
    })

    it('should use environment variable when no base provided', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://myapp.com'
      const url = getReferralUrl('CODE1234')
      expect(url).toBe('https://myapp.com/?ref=CODE1234')
    })

    it('should use default URL when no base or env', () => {
      delete process.env.NEXT_PUBLIC_BASE_URL
      const url = getReferralUrl('CODE1234')
      expect(url).toBe('https://destinypal.me/?ref=CODE1234')
    })

    it('should handle special characters in code', () => {
      const url = getReferralUrl('ABC123XY', 'https://test.com')
      expect(url).toBe('https://test.com/?ref=ABC123XY')
    })
  })
})
