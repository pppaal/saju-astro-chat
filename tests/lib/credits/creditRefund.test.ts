/**
 * Tests for src/lib/credits/creditRefund.ts
 * 크레딧 환불 서비스 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refundCredits, getCreditRefundHistory, getRefundStatsByRoute } from '@/lib/credits/creditRefund';

// Use vi.hoisted to avoid hoisting issues with vi.mock factory
const { mockFindUnique, mockUpdate, mockCreate, mockFindMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
}));

const mockTx = {
  userCredits: {
    findUnique: mockFindUnique,
    update: mockUpdate,
  },
  creditRefundLog: {
    create: mockCreate,
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
    creditRefundLog: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('creditRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('refundCredits', () => {
    const baseParams = {
      userId: 'user_123',
      creditType: 'reading' as const,
      amount: 1,
      reason: 'ai_backend_timeout',
    };

    it('should refund reading credits successfully', async () => {
      mockFindUnique.mockResolvedValue({
        userId: 'user_123',
        usedCredits: 5,
        compatibilityUsed: 0,
        followUpUsed: 0,
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      const result = await refundCredits(baseParams);

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { userId: 'user_123' } });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: { usedCredits: 4 },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          creditType: 'reading',
          amount: 1,
          reason: 'ai_backend_timeout',
        }),
      });
    });

    it('should refund compatibility credits', async () => {
      mockFindUnique.mockResolvedValue({
        userId: 'user_123',
        usedCredits: 0,
        compatibilityUsed: 3,
        followUpUsed: 0,
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      const result = await refundCredits({
        ...baseParams,
        creditType: 'compatibility',
      });

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: { compatibilityUsed: 2 },
      });
    });

    it('should refund followUp credits', async () => {
      mockFindUnique.mockResolvedValue({
        userId: 'user_123',
        usedCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 2,
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      const result = await refundCredits({
        ...baseParams,
        creditType: 'followUp',
      });

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: { followUpUsed: 1 },
      });
    });

    it('should not go below 0 on refund', async () => {
      mockFindUnique.mockResolvedValue({
        userId: 'user_123',
        usedCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      await refundCredits({ ...baseParams, amount: 5 });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: { usedCredits: 0 },
      });
    });

    it('should throw if UserCredits not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(refundCredits(baseParams)).rejects.toThrow('UserCredits not found for user: user_123');
    });

    it('should include optional params in log', async () => {
      mockFindUnique.mockResolvedValue({
        userId: 'user_123',
        usedCredits: 5,
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      await refundCredits({
        ...baseParams,
        apiRoute: '/api/tarot/chat',
        errorMessage: 'OpenAI timeout',
        transactionId: 'tx_abc',
        metadata: { retries: 3 },
      });

      const createCallData = mockCreate.mock.calls[0][0].data;
      expect(createCallData.apiRoute).toBe('/api/tarot/chat');
      expect(createCallData.errorMessage).toBe('OpenAI timeout');
      expect(createCallData.transactionId).toBe('tx_abc');
      expect(createCallData.metadata).toEqual({ retries: 3 });
    });

    it('should truncate long errorMessage to 500 chars', async () => {
      mockFindUnique.mockResolvedValue({
        userId: 'user_123',
        usedCredits: 5,
      });
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      const longMessage = 'x'.repeat(1000);

      await refundCredits({
        ...baseParams,
        errorMessage: longMessage,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorMessage: 'x'.repeat(500),
        }),
      });
    });

    it('should re-throw errors from transaction', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB connection error'));

      await expect(refundCredits(baseParams)).rejects.toThrow('DB connection error');
    });
  });

  describe('getCreditRefundHistory', () => {
    it('should return refund history for a user', async () => {
      const mockHistory = [
        { id: '1', userId: 'user_123', creditType: 'reading', amount: 1 },
      ];
      mockFindMany.mockResolvedValue(mockHistory);

      const result = await getCreditRefundHistory('user_123');

      expect(result).toEqual(mockHistory);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by creditType', async () => {
      mockFindMany.mockResolvedValue([]);

      await getCreditRefundHistory('user_123', { creditType: 'compatibility' });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', creditType: 'compatibility' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should apply limit and offset', async () => {
      mockFindMany.mockResolvedValue([]);

      await getCreditRefundHistory('user_123', { limit: 10, offset: 20 });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getRefundStatsByRoute', () => {
    it('should return refund stats for a route', async () => {
      mockFindMany.mockResolvedValue([
        { amount: 1, creditType: 'reading' },
        { amount: 2, creditType: 'reading' },
        { amount: 1, creditType: 'compatibility' },
      ]);

      const result = await getRefundStatsByRoute('/api/tarot/chat');

      expect(result).toEqual({
        totalRefunds: 3,
        totalAmount: 4,
        byType: {
          reading: 3,
          compatibility: 1,
          followUp: 0,
        },
      });
    });

    it('should filter by date range', async () => {
      mockFindMany.mockResolvedValue([]);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await getRefundStatsByRoute('/api/tarot/chat', startDate, endDate);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          apiRoute: '/api/tarot/chat',
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { amount: true, creditType: true },
      });
    });

    it('should filter by startDate only', async () => {
      mockFindMany.mockResolvedValue([]);
      const startDate = new Date('2024-01-01');

      await getRefundStatsByRoute('/api/tarot/chat', startDate);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          apiRoute: '/api/tarot/chat',
          createdAt: { gte: startDate },
        },
        select: { amount: true, creditType: true },
      });
    });

    it('should return zeroes when no refunds', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getRefundStatsByRoute('/api/destiny');

      expect(result).toEqual({
        totalRefunds: 0,
        totalAmount: 0,
        byType: { reading: 0, compatibility: 0, followUp: 0 },
      });
    });
  });
});
