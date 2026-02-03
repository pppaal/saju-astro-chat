/**
 * Comprehensive tests for Credit Refund Service
 * Tests automatic refunds on API failures, transaction atomicity, and audit logging
 */

import { prisma } from '@/lib/db/prisma'
import {
  refundCredits,
  getCreditRefundHistory,
  getRefundStatsByRoute,
  type CreditRefundParams,
} from '@/lib/credits/creditRefund'
import { logger } from '@/lib/logger'

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    userCredits: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    creditRefundLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Credit Refund Service', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('refundCredits', () => {
    describe('Reading Credits Refund', () => {
      it('should refund reading credits successfully', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          usedCredits: 10,
        }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

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
        expect(logger.info).toHaveBeenCalledWith(
          '[CreditRefund] Success',
          expect.objectContaining({
            userId: mockUserId,
            creditType: 'reading',
            amount: 2,
          })
        )
      })

      it('should not allow negative usedCredits', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          usedCredits: 1,
        }

        let capturedUpdateData: any
        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockImplementation((args) => {
                capturedUpdateData = args.data
                return Promise.resolve({})
              }),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 5, // More than usedCredits
          reason: 'test',
        })

        expect(capturedUpdateData.usedCredits).toBe(0) // Should be 0, not negative
      })

      it('should handle zero usedCredits', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          usedCredits: 0,
        }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'test',
        })

        expect(result).toBe(true)
      })
    })

    describe('Compatibility Credits Refund', () => {
      it('should refund compatibility credits', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          compatibilityUsed: 3,
        }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'calculation_error',
          apiRoute: '/api/compatibility',
        })

        expect(result).toBe(true)
      })

      it('should not allow negative compatibilityUsed', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          compatibilityUsed: 0,
        }

        let capturedUpdateData: any
        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockImplementation((args) => {
                capturedUpdateData = args.data
                return Promise.resolve({})
              }),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        await refundCredits({
          userId: mockUserId,
          creditType: 'compatibility',
          amount: 2,
          reason: 'test',
        })

        expect(capturedUpdateData.compatibilityUsed).toBe(0)
      })
    })

    describe('FollowUp Credits Refund', () => {
      it('should refund followUp credits', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          followUpUsed: 5,
        }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'followUp',
          amount: 2,
          reason: 'api_error',
          apiRoute: '/api/chat/followup',
        })

        expect(result).toBe(true)
      })
    })

    describe('Audit Logging', () => {
      it('should create refund log entry', async () => {
        const mockUserCredits = { userId: mockUserId, usedCredits: 5 }
        let capturedLogData: any
        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockImplementation((args) => {
                capturedLogData = args.data
                return Promise.resolve({})
              }),
            },
          })
        )

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
        const mockUserCredits = { userId: mockUserId, usedCredits: 5 }
        let capturedLogData: any
        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockImplementation((args) => {
                capturedLogData = args.data
                return Promise.resolve({})
              }),
            },
          })
        )

        const longError = 'A'.repeat(1000)

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'error',
          errorMessage: longError,
        })

        expect(capturedLogData.errorMessage).toHaveLength(500)
      })

      it('should handle metadata with circular references', async () => {
        const mockUserCredits = { userId: mockUserId, usedCredits: 5 }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        const circular: any = { a: 1 }
        circular.self = circular

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'test',
          metadata: circular,
        })

        expect(result).toBe(true)
      })
    })

    describe('Error Handling', () => {
      it('should throw when user not found', async () => {
        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          })
        )

        await expect(
          refundCredits({
            userId: 'nonexistent',
            creditType: 'reading',
            amount: 1,
            reason: 'test',
          })
        ).rejects.toThrow('UserCredits not found')
      })

      it('should throw on database error', async () => {
        ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB connection failed'))

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

      it('should ensure transaction atomicity', async () => {
        const updateMock = jest.fn().mockRejectedValue(new Error('Update failed'))

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue({ userId: mockUserId, usedCredits: 5 }),
              update: updateMock,
            },
            creditRefundLog: {
              create: jest.fn(),
            },
          })
        )

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
        const mockUserCredits = { userId: mockUserId, usedCredits: 5 }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 0,
          reason: 'test',
        })

        expect(result).toBe(true)
      })

      it('should handle very large refund amounts', async () => {
        const mockUserCredits = { userId: mockUserId, usedCredits: 1000000 }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

        const result = await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 999999,
          reason: 'test',
        })

        expect(result).toBe(true)
      })

      it('should handle missing optional fields', async () => {
        const mockUserCredits = { userId: mockUserId, usedCredits: 5 }

        ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
          callback({
            userCredits: {
              findUnique: jest.fn().mockResolvedValue(mockUserCredits),
              update: jest.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          })
        )

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

      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue(mockHistory)

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
      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue([])

      await getCreditRefundHistory(mockUserId, { creditType: 'reading' })

      expect(prisma.creditRefundLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, creditType: 'reading' },
        })
      )
    })

    it('should support pagination', async () => {
      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue([])

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

      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue(mockRefunds)

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

      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue([])

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
      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue([])

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

      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue(mockRefunds)

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
      const mockUserCredits = { userId: mockUserId, usedCredits: 10 }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: jest.fn().mockResolvedValue(mockUserCredits),
            update: jest.fn().mockResolvedValue({}),
          },
          creditRefundLog: {
            create: jest.fn().mockResolvedValue({ id: 'log1' }),
          },
        })
      )

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
      ;(prisma.creditRefundLog.findMany as jest.Mock).mockResolvedValue([
        { id: 'log1', amount: 2, creditType: 'reading' },
      ])

      const history = await getCreditRefundHistory(mockUserId)
      expect(history).toHaveLength(1)
    })

    it('should handle concurrent refunds safely', async () => {
      const mockUserCredits = { userId: mockUserId, usedCredits: 10 }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: jest.fn().mockResolvedValue(mockUserCredits),
            update: jest.fn().mockResolvedValue({}),
          },
          creditRefundLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        })
      )

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
    })
  })
})
