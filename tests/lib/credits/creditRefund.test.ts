/**
 * Tests for src/lib/credits/creditRefund.ts
 * 크레딧 환불 서비스 테스트
 *
 * NOTE: refundCredits 가 atomic SQL (GREATEST(0, col - amount)) 로 전환되며
 * findUnique → Math.max → update 패턴이 사라졌다. 테스트도 tx.$executeRaw
 * 호출 시그니처를 검증하는 방향으로 갱신.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  refundCredits,
  getCreditRefundHistory,
  getRefundStatsByRoute,
} from '@/lib/credits/creditRefund'

// Use vi.hoisted to avoid hoisting issues with vi.mock factory
const { mockFindUnique, mockExecuteRaw, mockCreate, mockFindMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockExecuteRaw: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
}))

const mockTx = {
  userCredits: {
    findUnique: mockFindUnique,
  },
  creditRefundLog: {
    create: mockCreate,
  },
  $executeRaw: mockExecuteRaw,
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
    creditRefundLog: {
      findMany: mockFindMany,
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

/**
 * tagged template literal helper — tx.$executeRaw 가 tagged template 인자로
 * 호출되었는지 raw string 합쳐 확인. parameter 는 별도 args.
 */
function execRawSqlOf(call: unknown[]): string {
  const strings = call[0] as ReadonlyArray<string> & { raw?: ReadonlyArray<string> }
  return (strings.raw ?? strings).join('?')
}

describe('creditRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteRaw.mockResolvedValue(1)
    mockCreate.mockResolvedValue({})
  })

  describe('refundCredits', () => {
    const baseParams = {
      userId: 'user_123',
      creditType: 'reading' as const,
      amount: 1,
      reason: 'ai_backend_timeout',
    }

    it('should refund reading credits via atomic SQL', async () => {
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })

      const result = await refundCredits(baseParams)

      expect(result).toBe(true)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: { userId: true },
      })
      expect(mockExecuteRaw).toHaveBeenCalledTimes(1)
      const sql = execRawSqlOf(mockExecuteRaw.mock.calls[0])
      expect(sql).toContain('"usedCredits"')
      expect(sql).toContain('GREATEST(0,')
      // amount and userId are passed as bound parameters
      expect(mockExecuteRaw.mock.calls[0].slice(1)).toEqual([1, 'user_123'])
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          creditType: 'reading',
          amount: 1,
          reason: 'ai_backend_timeout',
        }),
      })
    })

    it('should refund compatibility credits via atomic SQL', async () => {
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })

      const result = await refundCredits({ ...baseParams, creditType: 'compatibility' })

      expect(result).toBe(true)
      const sql = execRawSqlOf(mockExecuteRaw.mock.calls[0])
      expect(sql).toContain('"compatibilityUsed"')
      expect(sql).toContain('GREATEST(0,')
    })

    it('should refund followUp credits via atomic SQL', async () => {
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })

      const result = await refundCredits({ ...baseParams, creditType: 'followUp' })

      expect(result).toBe(true)
      const sql = execRawSqlOf(mockExecuteRaw.mock.calls[0])
      expect(sql).toContain('"followUpUsed"')
      expect(sql).toContain('GREATEST(0,')
    })

    it('floors at 0 via SQL (GREATEST) — no JS Math.max read-then-write', async () => {
      // Even for amount=5 the function does NOT read current value first;
      // 음수 방지는 Postgres GREATEST(0, ...) 가 담당한다. 호출 시그니처만 확인.
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })

      await refundCredits({ ...baseParams, amount: 5 })

      // No read of usedCredits / no JS-side compare:
      expect(mockFindUnique).toHaveBeenCalledTimes(1)
      // Only userId was selected — the snapshot of usedCredits is NOT read.
      expect(mockFindUnique.mock.calls[0][0].select).toEqual({ userId: true })
      const sql = execRawSqlOf(mockExecuteRaw.mock.calls[0])
      expect(sql).toContain('GREATEST(0,')
      expect(mockExecuteRaw.mock.calls[0].slice(1)).toEqual([5, 'user_123'])
    })

    it('two parallel refunds both submit decrement statements (no lost update)', async () => {
      // 회귀 가드 (Bug #1). 이전 구현은 두 호출이 같은 snapshot 을 읽고 같은
      // 값으로 update — 한 건이 사라졌음. 새 구현은 둘 다 atomic SQL 한 줄로
      // 끝나므로 같은 row 락 안에서 차례로 적용된다. mock 레벨에서는 두 번
      // 다 $executeRaw 가 호출됐고 amount 가 누락되지 않았는지 확인.
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })

      const [r1, r2] = await Promise.all([
        refundCredits({ ...baseParams, amount: 1, reason: 'a' }),
        refundCredits({ ...baseParams, amount: 1, reason: 'b' }),
      ])

      expect(r1).toBe(true)
      expect(r2).toBe(true)
      expect(mockExecuteRaw).toHaveBeenCalledTimes(2)
      // 두 호출 모두 amount=1 을 그대로 전달 (한쪽이 0 으로 덮어쓰지 않음)
      const amounts = mockExecuteRaw.mock.calls.map((c) => c[1])
      expect(amounts).toEqual([1, 1])
      // 로그도 두 번 모두 기록됨
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should throw if UserCredits not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(refundCredits(baseParams)).rejects.toThrow(
        'UserCredits not found for user: user_123'
      )
      expect(mockExecuteRaw).not.toHaveBeenCalled()
    })

    it('should include optional params in log', async () => {
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })

      await refundCredits({
        ...baseParams,
        apiRoute: '/api/tarot/chat',
        errorMessage: 'OpenAI timeout',
        transactionId: 'tx_abc',
        metadata: { retries: 3 },
      })

      const createCallData = mockCreate.mock.calls[0][0].data
      expect(createCallData.apiRoute).toBe('/api/tarot/chat')
      expect(createCallData.errorMessage).toBe('OpenAI timeout')
      expect(createCallData.transactionId).toBe('tx_abc')
      expect(createCallData.metadata).toEqual({ retries: 3 })
    })

    it('should truncate long errorMessage to 500 chars', async () => {
      mockFindUnique.mockResolvedValue({ userId: 'user_123' })
      const longMessage = 'x'.repeat(1000)

      await refundCredits({ ...baseParams, errorMessage: longMessage })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorMessage: 'x'.repeat(500),
        }),
      })
    })

    it('should re-throw errors from transaction', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB connection error'))

      await expect(refundCredits(baseParams)).rejects.toThrow('DB connection error')
    })
  })

  describe('getCreditRefundHistory', () => {
    it('should return refund history for a user', async () => {
      const mockHistory = [{ id: '1', userId: 'user_123', creditType: 'reading', amount: 1 }]
      mockFindMany.mockResolvedValue(mockHistory)

      const result = await getCreditRefundHistory('user_123')

      expect(result).toEqual(mockHistory)
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should filter by creditType', async () => {
      mockFindMany.mockResolvedValue([])

      await getCreditRefundHistory('user_123', { creditType: 'compatibility' })

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', creditType: 'compatibility' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should apply limit and offset', async () => {
      mockFindMany.mockResolvedValue([])

      await getCreditRefundHistory('user_123', { limit: 10, offset: 20 })

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      })
    })
  })

  describe('getRefundStatsByRoute', () => {
    it('should return refund stats for a route', async () => {
      mockFindMany.mockResolvedValue([
        { amount: 1, creditType: 'reading' },
        { amount: 2, creditType: 'reading' },
        { amount: 1, creditType: 'compatibility' },
      ])

      const result = await getRefundStatsByRoute('/api/tarot/chat')

      expect(result).toEqual({
        totalRefunds: 3,
        totalAmount: 4,
        byType: {
          reading: 3,
          compatibility: 1,
          followUp: 0,
        },
      })
    })

    it('should filter by date range', async () => {
      mockFindMany.mockResolvedValue([])
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      await getRefundStatsByRoute('/api/tarot/chat', startDate, endDate)

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          apiRoute: '/api/tarot/chat',
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { amount: true, creditType: true },
      })
    })

    it('should filter by startDate only', async () => {
      mockFindMany.mockResolvedValue([])
      const startDate = new Date('2024-01-01')

      await getRefundStatsByRoute('/api/tarot/chat', startDate)

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          apiRoute: '/api/tarot/chat',
          createdAt: { gte: startDate },
        },
        select: { amount: true, creditType: true },
      })
    })

    it('should return zeroes when no refunds', async () => {
      mockFindMany.mockResolvedValue([])

      const result = await getRefundStatsByRoute('/api/destiny')

      expect(result).toEqual({
        totalRefunds: 0,
        totalAmount: 0,
        byType: { reading: 0, compatibility: 0, followUp: 0 },
      })
    })
  })
})
