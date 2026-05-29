/**
 * Tests for src/lib/credits/creditRefund.ts
 * 크레딧 환불 서비스 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refundCredits, getCreditRefundHistory, getRefundStatsByRoute } from '@/lib/credits/creditRefund';

// Use vi.hoisted to avoid hoisting issues with vi.mock factory
const {
  mockFindUnique,
  mockUpdate,
  mockCreate,
  mockFindMany,
  mockBonusFindMany,
  mockBonusUpdateMany,
  mockExecuteRaw,
  mockCreditTxnCreate,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockBonusFindMany: vi.fn(),
  mockBonusUpdateMany: vi.fn(),
  mockExecuteRaw: vi.fn(),
  // CreditTransaction (REFUND/*) 한 줄을 같은 tx 안에서 emit.
  mockCreditTxnCreate: vi.fn(),
}));

const mockTx = {
  userCredits: {
    findUnique: mockFindUnique,
    update: mockUpdate,
  },
  bonusCreditPurchase: {
    findMany: mockBonusFindMany,
    updateMany: mockBonusUpdateMany,
  },
  creditRefundLog: {
    create: mockCreate,
  },
  creditTransaction: {
    create: mockCreditTxnCreate,
  },
  $executeRaw: mockExecuteRaw,
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
    // 기본: 환불 대상 사용자 row 만 존재, bonus purchase 없음 → reading 환불은
    // usedCredits raw SQL 한 줄로 끝남.
    mockFindUnique.mockResolvedValue({ userId: 'user_123' });
    mockBonusFindMany.mockResolvedValue([]);
    mockBonusUpdateMany.mockResolvedValue({ count: 0 });
    mockExecuteRaw.mockResolvedValue(1);
    mockCreate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});
  });

  describe('refundCredits', () => {
    const baseParams = {
      userId: 'user_123',
      creditType: 'reading' as const,
      amount: 1,
      reason: 'ai_backend_timeout',
    };

    it('should refund reading credits via raw SQL (GREATEST floor 0) when no bonus pool', async () => {
      const result = await refundCredits(baseParams);

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: { userId: true },
      });
      // bonus 풀이 비어 있으면 usedCredits 만 raw SQL 로 차감.
      expect(mockExecuteRaw).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          creditType: 'reading',
          amount: 1,
          reason: 'ai_backend_timeout',
        }),
      });
    });

    it('should refund compatibility credits via raw SQL', async () => {
      const result = await refundCredits({
        ...baseParams,
        creditType: 'compatibility',
      });

      expect(result).toBe(true);
      // compat 은 update() 대신 GREATEST raw SQL (atomic floor).
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should refund followUp credits via raw SQL', async () => {
      const result = await refundCredits({
        ...baseParams,
        creditType: 'followUp',
      });

      expect(result).toBe(true);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should rely on SQL GREATEST to floor at 0 (no client-side clamp)', async () => {
      // amount > 현재 used 라도 client side Math.max 가 아니라 SQL GREATEST 가
      // 직접 처리 — race-safe.
      await refundCredits({ ...baseParams, amount: 5 });

      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should throw if UserCredits not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(refundCredits(baseParams)).rejects.toThrow('UserCredits not found for user: user_123');
    });

    it('should include optional params in log', async () => {
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

    it('should restore bonus pool first when bonus purchase has capacity (B2)', async () => {
      // remaining=4, amount=5 → capacity 1. 1 단위 reading 환불 → 보너스 풀로
      // 복원. usedCredits raw SQL 은 호출되지 않아야 함.
      mockBonusFindMany.mockResolvedValue([
        { id: 'purchase_1', amount: 5, remaining: 4 },
      ]);
      mockBonusUpdateMany.mockResolvedValue({ count: 1 });

      await refundCredits(baseParams);

      expect(mockBonusFindMany).toHaveBeenCalled();
      expect(mockBonusUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'purchase_1', expired: false }),
          data: { remaining: { increment: 1 } },
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: { bonusCredits: { increment: 1 } },
      });
      // 보너스 풀로 다 복원했으면 usedCredits raw SQL 은 호출되지 않음.
      expect(mockExecuteRaw).not.toHaveBeenCalled();
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
