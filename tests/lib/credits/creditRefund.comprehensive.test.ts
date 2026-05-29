/**
 * Comprehensive tests for Credit Refund Service
 * Tests automatic refunds on API failures, transaction atomicity, and audit logging
 *
 * NOTE: refundCredits 가 atomic SQL ($executeRaw GREATEST(0, col - amount))
 * 로 전환되었으므로 update mock 대신 $executeRaw 호출을 검증한다.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import {
  refundCredits,
  getCreditRefundHistory,
  getRefundStatsByRoute,
  type CreditRefundParams,
} from '@/lib/credits/creditRefund'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    userCredits: {
      findUnique: vi.fn(),
    },
    creditRefundLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

function rawSql(call: unknown[]): string {
  const strings = call[0] as ReadonlyArray<string> & { raw?: ReadonlyArray<string> }
  return (strings.raw ?? strings).join('?')
}

interface MockTx {
  userCredits: { findUnique: ReturnType<typeof vi.fn> }
  creditRefundLog: { create: ReturnType<typeof vi.fn> }
  $executeRaw: ReturnType<typeof vi.fn>
}

function makeTx(opts: {
  user?: { userId: string } | null
  createImpl?: (args: { data: Record<string, unknown> }) => Promise<unknown>
  executeRawImpl?: (...args: unknown[]) => Promise<unknown>
}): MockTx {
  // null 을 명시적으로 구분해야 함 — null 은 "유저 없음" 시나리오라
  // 기본값 fallback (?? { userId: ... }) 을 쓰면 null 케이스가 사라진다.
  const user = 'user' in opts ? opts.user : { userId: 'user_123' }
  return {
    userCredits: {
      findUnique: vi.fn().mockResolvedValue(user),
    },
    creditRefundLog: {
      create: opts.createImpl
        ? vi.fn().mockImplementation(opts.createImpl)
        : vi.fn().mockResolvedValue({}),
    },
    $executeRaw: opts.executeRawImpl
      ? vi.fn().mockImplementation(opts.executeRawImpl)
      : vi.fn().mockResolvedValue(1),
  }
}

describe('Credit Refund Service', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('refundCredits', () => {
    describe('Reading Credits Refund', () => {
      it('should refund reading credits via atomic SQL', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const params: CreditRefundParams = {
          userId: mockUserId,
          creditType: 'reading',
          amount: 2,
          reason: 'ai_backend_timeout',
          apiRoute: '/api/tarot/chat',
          errorMessage: 'OpenAI timeout after 60s',
        }

        const result = await refundCredits(params)

        expect(result).toBe(true)
        expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
        const sql = rawSql(tx.$executeRaw.mock.calls[0])
        expect(sql).toContain('"usedCredits"')
        expect(sql).toContain('GREATEST(0,')
        expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual([2, mockUserId])
        expect(logger.info).toHaveBeenCalledWith(
          '[CreditRefund] Success',
          expect.objectContaining({
            userId: mockUserId,
            creditType: 'reading',
            amount: 2,
          })
        )
      })

      it('floors at 0 via Postgres GREATEST (no JS read-then-write)', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 5, // 잔량보다 큰 환불 — DB 가 floor 처리
          reason: 'test',
        })

        // tx.userCredits.findUnique 는 존재 확인용 select(userId) 만 — usedCredits 미독출
        expect(tx.userCredits.findUnique).toHaveBeenCalledWith({
          where: { userId: mockUserId },
          select: { userId: true },
        })
        const sql = rawSql(tx.$executeRaw.mock.calls[0])
        expect(sql).toContain('GREATEST(0,')
        expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual([5, mockUserId])
      })
    })

    describe('Compatibility Credits Refund', () => {
      it('should refund compatibility credits', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'calculation_error',
          apiRoute: '/api/compatibility',
        })

        expect(result).toBe(true)
        const sql = rawSql(tx.$executeRaw.mock.calls[0])
        expect(sql).toContain('"compatibilityUsed"')
        expect(sql).toContain('GREATEST(0,')
      })
    })

    describe('FollowUp Credits Refund', () => {
      it('should refund followUp credits', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'followUp',
          amount: 2,
          reason: 'api_error',
          apiRoute: '/api/chat/followup',
        })

        expect(result).toBe(true)
        const sql = rawSql(tx.$executeRaw.mock.calls[0])
        expect(sql).toContain('"followUpUsed"')
      })
    })

    describe('Audit Logging', () => {
      it('should create refund log entry', async () => {
        let capturedLogData: Record<string, unknown> | undefined
        const tx = makeTx({
          user: { userId: mockUserId },
          createImpl: async (args) => {
            capturedLogData = args.data
            return {}
          },
        })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'timeout',
          apiRoute: '/api/test',
          errorMessage: 'Request timeout',
          transactionId: 'txn_123',
          metadata: { foo: 'bar' },
        })

        expect(capturedLogData).toEqual({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'timeout',
          apiRoute: '/api/test',
          errorMessage: 'Request timeout',
          transactionId: 'txn_123',
          metadata: { foo: 'bar' },
        })
      })

      it('should truncate long error messages', async () => {
        let capturedLogData: Record<string, unknown> | undefined
        const tx = makeTx({
          user: { userId: mockUserId },
          createImpl: async (args) => {
            capturedLogData = args.data
            return {}
          },
        })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const longError = 'A'.repeat(1000)

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'error',
          errorMessage: longError,
        })

        expect(capturedLogData?.errorMessage as string).toHaveLength(500)
      })

      it('should reject metadata with circular references (fail before tx)', async () => {
        // JSON.parse(JSON.stringify(...)) 가 circular 에서 throw. tx 진입 전
        // 직렬화 단계에서 잡혀 catch 블록이 re-throw 한다.
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const circular: Record<string, unknown> = { a: 1 }
        circular.self = circular

        await expect(
          refundCredits({
            userId: mockUserId,
            creditType: 'reading',
            amount: 1,
            reason: 'test',
            metadata: circular,
          })
        ).rejects.toThrow()
      })
    })

    describe('Error Handling', () => {
      it('should throw when user not found', async () => {
        const tx = makeTx({ user: null })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        await expect(
          refundCredits({
            userId: 'nonexistent',
            creditType: 'reading',
            amount: 1,
            reason: 'test',
          })
        ).rejects.toThrow('UserCredits not found')
        // existence check fails → no SQL update issued
        expect(tx.$executeRaw).not.toHaveBeenCalled()
      })

      it('should throw on database error', async () => {
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('DB connection failed')
        )

        await expect(
          refundCredits({
            userId: mockUserId,
            creditType: 'reading',
            amount: 1,
            reason: 'test',
          })
        ).rejects.toThrow('DB connection failed')

        expect(logger.error).toHaveBeenCalledWith('[CreditRefund] Failed', expect.any(Object))
      })

      it('should propagate executeRaw failure to caller', async () => {
        const tx = makeTx({
          user: { userId: mockUserId },
          executeRawImpl: async () => {
            throw new Error('Update failed')
          },
        })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        await expect(
          refundCredits({
            userId: mockUserId,
            creditType: 'reading',
            amount: 1,
            reason: 'test',
          })
        ).rejects.toThrow('Update failed')
      })
    })

    describe('Edge Cases', () => {
      it('should handle zero refund amount', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 0,
          reason: 'test',
        })

        expect(result).toBe(true)
        expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual([0, mockUserId])
      })

      it('should handle very large refund amounts', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 999999,
          reason: 'test',
        })

        expect(result).toBe(true)
      })

      it('should handle missing optional fields', async () => {
        const tx = makeTx({ user: { userId: mockUserId } })
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'test',
          // No apiRoute, errorMessage, transactionId, metadata
        })

        expect(result).toBe(true)
      })
    })
  })

  describe('getCreditRefundHistory', () => {
    it('should fetch refund history for user', async () => {
      const mockHistory = [
        {
          id: 'log1',
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'timeout',
          createdAt: new Date(),
        },
        {
          id: 'log2',
          userId: mockUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'error',
          createdAt: new Date(),
        },
      ]

      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockHistory)

      const result = await getCreditRefundHistory(mockUserId)

      expect(result).toEqual(mockHistory)
      expect(prisma.creditRefundLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          skip: 0,
        })
      )
    })

    it('should filter by credit type', async () => {
      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await getCreditRefundHistory(mockUserId, { creditType: 'reading' })

      expect(prisma.creditRefundLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, creditType: 'reading' },
        })
      )
    })

    it('should support pagination', async () => {
      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await getCreditRefundHistory(mockUserId, { limit: 10, offset: 20 })

      expect(prisma.creditRefundLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      )
    })
  })

  describe('getRefundStatsByRoute', () => {
    it('should calculate refund statistics', async () => {
      const mockRefunds = [
        { amount: 2, creditType: 'reading' },
        { amount: 3, creditType: 'reading' },
        { amount: 1, creditType: 'compatibility' },
      ]

      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockRefunds)

      const stats = await getRefundStatsByRoute('/api/tarot/chat')

      expect(stats).toEqual({
        totalRefunds: 3,
        totalAmount: 6,
        byType: {
          reading: 5,
          compatibility: 1,
          followUp: 0,
        },
      })
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await getRefundStatsByRoute('/api/test', startDate, endDate)

      expect(prisma.creditRefundLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            apiRoute: '/api/test',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      )
    })

    it('should handle empty results', async () => {
      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const stats = await getRefundStatsByRoute('/api/nonexistent')

      expect(stats).toEqual({
        totalRefunds: 0,
        totalAmount: 0,
        byType: {
          reading: 0,
          compatibility: 0,
          followUp: 0,
        },
      })
    })

    it('should aggregate multiple refund types', async () => {
      const mockRefunds = [
        { amount: 10, creditType: 'reading' },
        { amount: 5, creditType: 'reading' },
        { amount: 3, creditType: 'compatibility' },
        { amount: 2, creditType: 'followUp' },
        { amount: 1, creditType: 'followUp' },
      ]

      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockRefunds)

      const stats = await getRefundStatsByRoute('/api/test')

      expect(stats.totalRefunds).toBe(5)
      expect(stats.totalAmount).toBe(21)
      expect(stats.byType).toEqual({
        reading: 15,
        compatibility: 3,
        followUp: 3,
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete refund workflow', async () => {
      const tx = makeTx({ user: { userId: mockUserId } })
      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

      // 1. Refund credits
      const refundResult = await refundCredits({
        userId: mockUserId,
        creditType: 'reading',
        amount: 2,
        reason: 'api_timeout',
        apiRoute: '/api/tarot/chat',
      })

      expect(refundResult).toBe(true)

      // 2. Check history
      ;(prisma.creditRefundLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'log1', amount: 2, creditType: 'reading' },
      ])

      const history = await getCreditRefundHistory(mockUserId)
      expect(history).toHaveLength(1)
    })

    it('should handle concurrent refunds — no lost update (Bug #1 regression guard)', async () => {
      // 같은 유저에게 동시에 들어온 두 환불이 모두 적용되는지. 이전엔 findUnique
      // → JS-side compute → update 패턴이라 두 호출이 같은 snapshot 을 보고 같은
      // 값으로 덮어써서 한 건이 사라졌음. 새 구현은 둘 다 GREATEST(0, col - X)
      // 한 줄짜리 UPDATE 로 row-level lock 안에서 직렬화된다.
      const tx = makeTx({ user: { userId: mockUserId } })
      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(tx))

      const refund1 = refundCredits({
        userId: mockUserId,
        creditType: 'reading',
        amount: 1,
        reason: 'test1',
      })

      const refund2 = refundCredits({
        userId: mockUserId,
        creditType: 'reading',
        amount: 1,
        reason: 'test2',
      })

      const results = await Promise.all([refund1, refund2])

      expect(results).toEqual([true, true])
      expect(tx.$executeRaw).toHaveBeenCalledTimes(2)
      // 두 호출 모두 amount=1 그대로 전달
      const amounts = tx.$executeRaw.mock.calls.map((c) => c[1])
      expect(amounts).toEqual([1, 1])
      expect(tx.creditRefundLog.create).toHaveBeenCalledTimes(2)
    })
  })
})
