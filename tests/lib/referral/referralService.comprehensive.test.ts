/**
 * Comprehensive Tests for Referral Service
 * src/lib/referral/referralService.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateReferralCode,
  getUserReferralCode,
  findUserByReferralCode,
  linkReferrer,
  claimReferralReward,
  getReferralStats,
  getReferralUrl,
} from '@/lib/referral/referralService';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
}));

vi.mock('@/lib/credits/creditService', () => ({
  addBonusCredits: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendReferralRewardEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';
import { addBonusCredits } from '@/lib/credits/creditService';
import { sendReferralRewardEmail } from '@/lib/email';

const mockPrisma = vi.mocked(prisma);
const mockAddBonusCredits = vi.mocked(addBonusCredits);
const mockSendReferralRewardEmail = vi.mocked(sendReferralRewardEmail);

describe('referralService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateReferralCode', () => {
    it('should generate 8-character uppercase code', () => {
      const code = generateReferralCode();

      expect(code).toHaveLength(8);
      expect(code).toBe(code.toUpperCase());
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode());
      }

      expect(codes.size).toBe(100);
    });

    it('should only contain hex characters', () => {
      const code = generateReferralCode();

      expect(code).toMatch(/^[0-9A-F]{8}$/);
    });
  });

  describe('getUserReferralCode', () => {
    it('should return existing code', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        referralCode: 'EXISTING1',
      } as any);

      const code = await getUserReferralCode('user-123');

      expect(code).toBe('EXISTING1');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should generate new code if none exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        referralCode: null,
      } as any);

      const code = await getUserReferralCode('user-123');

      expect(code).toHaveLength(8);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { referralCode: expect.any(String) },
      });
    });

    it('should generate code for user without referralCode field', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const code = await getUserReferralCode('user-123');

      expect(code).toHaveLength(8);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('findUserByReferralCode', () => {
    it('should find user by uppercase code', async () => {
      const mockUser = { id: 'user-456', name: 'John', referralCode: 'ABC12345' };
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser as any);

      const user = await findUserByReferralCode('abc12345');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { referralCode: 'ABC12345' },
        select: { id: true, name: true, referralCode: true },
      });
      expect(user).toEqual(mockUser);
    });

    it('should return null for invalid code', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      const user = await findUserByReferralCode('INVALID');

      expect(user).toBeNull();
    });
  });

  describe('linkReferrer', () => {
    it('should link referrer and award credits', async () => {
      const referrer = { id: 'referrer-123', name: 'Jane', referralCode: 'REF12345' };
      mockPrisma.user.findFirst.mockResolvedValueOnce(referrer as any);
      mockPrisma.user.update.mockResolvedValueOnce({} as any);
      mockPrisma.referralReward.create.mockResolvedValueOnce({} as any);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'jane@example.com',
        name: 'Jane',
      } as any);

      const result = await linkReferrer('new-user-456', 'REF12345');

      expect(result.success).toBe(true);
      expect(result.referrerId).toBe('referrer-123');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'new-user-456' },
        data: { referrerId: 'referrer-123' },
      });
      expect(mockAddBonusCredits).toHaveBeenCalledWith('referrer-123', 3);
      expect(mockPrisma.referralReward.create).toHaveBeenCalled();
    });

    it('should reject invalid referral code', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      const result = await linkReferrer('new-user-456', 'INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_code');
    });

    it('should prevent self-referral', async () => {
      const referrer = { id: 'user-123', name: 'John', referralCode: 'SELF1234' };
      mockPrisma.user.findFirst.mockResolvedValueOnce(referrer as any);

      const result = await linkReferrer('user-123', 'SELF1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('self_referral');
    });

    it('should send referral reward email', async () => {
      const referrer = { id: 'referrer-123', name: 'Jane', referralCode: 'REF12345' };
      mockPrisma.user.findFirst.mockResolvedValueOnce(referrer as any);
      mockPrisma.user.update.mockResolvedValueOnce({} as any);
      mockPrisma.referralReward.create.mockResolvedValueOnce({} as any);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'jane@example.com',
        name: 'Jane',
      } as any);

      await linkReferrer('new-user-456', 'REF12345');

      expect(mockSendReferralRewardEmail).toHaveBeenCalledWith(
        'referrer-123',
        'jane@example.com',
        { userName: 'Jane', creditsAwarded: 3 }
      );
    });

    it('should handle database error', async () => {
      mockPrisma.user.findFirst.mockRejectedValueOnce(new Error('DB error'));

      const result = await linkReferrer('user-456', 'CODE1234');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('claimReferralReward', () => {
    it('should claim pending reward', async () => {
      const pendingReward = {
        id: 'reward-123',
        userId: 'referrer-456',
        referredUserId: 'user-789',
        creditsAwarded: 3,
        status: 'pending',
        rewardType: 'first_analysis',
      };
      mockPrisma.referralReward.findFirst.mockResolvedValueOnce(pendingReward as any);
      mockPrisma.referralReward.update.mockResolvedValueOnce({} as any);

      const result = await claimReferralReward('user-789');

      expect(result.success).toBe(true);
      expect(result.creditsAwarded).toBe(3);
      expect(mockAddBonusCredits).toHaveBeenCalledWith('referrer-456', 3);
      expect(mockPrisma.referralReward.update).toHaveBeenCalledWith({
        where: { id: 'reward-123' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should return error when no pending reward', async () => {
      mockPrisma.referralReward.findFirst.mockResolvedValueOnce(null);

      const result = await claimReferralReward('user-789');

      expect(result.success).toBe(false);
      expect(result.error).toBe('no_pending_reward');
    });

    it('should handle database error', async () => {
      mockPrisma.referralReward.findFirst.mockRejectedValueOnce(new Error('DB error'));

      const result = await claimReferralReward('user-789');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('getReferralStats', () => {
    it('should return comprehensive stats', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        referralCode: 'USER1234',
      } as any);
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'ref-1', name: 'User 1', createdAt: new Date(), readings: [{ id: '1' }] },
        { id: 'ref-2', name: 'User 2', createdAt: new Date(), readings: [] },
      ] as any);
      mockPrisma.referralReward.findMany.mockResolvedValueOnce([
        { id: 'r1', creditsAwarded: 3, status: 'completed', createdAt: new Date() },
        { id: 'r2', creditsAwarded: 3, status: 'pending', createdAt: new Date() },
      ] as any);

      const stats = await getReferralStats('user-123');

      expect(stats.referralCode).toBe('USER1234');
      expect(stats.stats.total).toBe(2);
      expect(stats.stats.completed).toBe(1);
      expect(stats.stats.pending).toBe(1);
      expect(stats.stats.creditsEarned).toBe(3);
      expect(stats.referrals).toHaveLength(2);
      expect(stats.rewards).toHaveLength(2);
    });

    it('should generate code if user has none', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ referralCode: null } as any)
        .mockResolvedValueOnce({ referralCode: null } as any);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      mockPrisma.referralReward.findMany.mockResolvedValueOnce([]);
      mockPrisma.user.update.mockResolvedValueOnce({} as any);

      const stats = await getReferralStats('user-123');

      expect(stats.referralCode).toHaveLength(8);
    });

    it('should handle user with no referrals', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        referralCode: 'CODE1234',
      } as any);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      mockPrisma.referralReward.findMany.mockResolvedValueOnce([]);

      const stats = await getReferralStats('user-123');

      expect(stats.stats.total).toBe(0);
      expect(stats.stats.completed).toBe(0);
      expect(stats.stats.pending).toBe(0);
      expect(stats.stats.creditsEarned).toBe(0);
    });
  });

  describe('getReferralUrl', () => {
    it('should generate URL with code', () => {
      const url = getReferralUrl('ABC12345', 'https://example.com');

      expect(url).toBe('https://example.com/?ref=ABC12345');
    });

    it('should use environment variable for base URL', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://myapp.com';

      const url = getReferralUrl('CODE1234');

      expect(url).toBe('https://myapp.com/?ref=CODE1234');
    });

    it('should fallback to default URL', () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      const url = getReferralUrl('CODE1234');

      expect(url).toBe('https://destinypal.me/?ref=CODE1234');
    });

    it('should handle different codes', () => {
      const url1 = getReferralUrl('AAA11111', 'https://test.com');
      const url2 = getReferralUrl('BBB22222', 'https://test.com');

      expect(url1).toBe('https://test.com/?ref=AAA11111');
      expect(url2).toBe('https://test.com/?ref=BBB22222');
    });
  });
});
