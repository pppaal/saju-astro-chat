/**
 * Comprehensive tests for Credit Refund Service
 * Tests automatic refunds on API failures, transaction atomicity, and audit logging
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import {
  refundCredits,
  type CreditRefundParams,
} from '@/lib/credits/creditRefund'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    userCredits: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// 새 refundCredits (PR: prisma-credit-races) 가 reading 환불에서 보너스 풀
// 복원(reverse-FIFO)을 시도하고, compat/followUp/usedCredits 차감을 raw SQL
// (GREATEST) 로 처리하므로 tx mock 에 bonusCreditPurchase 와 $executeRaw 가
// 반드시 있어야 한다. 기존 테스트들은 update() 호출만 mock 했어서, 보너스
// findMany 가 undefined.findMany 로 깨졌다. 호환을 위해 각 콜백 안 객체를
// 보강해주는 헬퍼.
function withDefaults(tx: any) {
  return {
    bonusCreditPurchase: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    // CreditTransaction (REFUND/*) audit row — 모든 refund 경로가 한 줄 emit.
    // 본 테스트들은 잔액 / 로그만 검증하므로 noop 으로 충분.
    creditTransaction: {
      create: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    ...tx,
  }
}

describe('Credit Refund Service', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('refundCredits', () => {
    describe('Reading Credits Refund', () => {
      it('should refund reading credits successfully', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          usedCredits: 10,
        }

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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

      it('should not allow negative usedCredits (handled by SQL GREATEST)', async () => {
        // 새 코드는 client-side Math.max 대신 SQL GREATEST(0, ...) 로 floor.
        // 따라서 update() 가 아니라 $executeRaw 가 호출돼야 한다.
        const executeRawMock = vi.fn().mockResolvedValue(1)
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue({ userId: mockUserId }),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
            $executeRaw: executeRawMock,
          }))
        )

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 5, // More than usedCredits
          reason: 'test',
        })

        // GREATEST 가 음수 방지 — raw SQL 호출만 확인.
        expect(executeRawMock).toHaveBeenCalled()
      })

      it('should handle zero usedCredits', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          usedCredits: 0,
        }

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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

      it('should not allow negative compatibilityUsed (handled by SQL GREATEST)', async () => {
        const executeRawMock = vi.fn().mockResolvedValue(1)
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue({ userId: mockUserId }),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
            $executeRaw: executeRawMock,
          }))
        )

        await refundCredits({
          userId: mockUserId,
          creditType: 'compatibility',
          amount: 2,
          reason: 'test',
        })

        expect(executeRawMock).toHaveBeenCalled()
      })
    })

    describe('FollowUp Credits Refund', () => {
      it('should refund followUp credits', async () => {
        const mockUserCredits = {
          userId: mockUserId,
          followUpUsed: 5,
        }

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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
      // CreditRefundLog 모델 제거(2026-06-06) — 환불 감사는 CreditTransaction
      // (type='REFUND') 가 SSOT. 옛 errorMessage 절단/순환참조 직렬화 동작은
      // 사라졌으므로(원본 metadata 를 더 이상 저장 안 함) 새 동작만 검증한다.
      it('creates a CreditTransaction REFUND audit row', async () => {
        const created: any[] = []
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue({ userId: mockUserId, usedCredits: 5 }),
              update: vi.fn().mockResolvedValue({}),
            },
            creditTransaction: {
              create: vi.fn().mockImplementation((args) => {
                created.push(args.data)
                return Promise.resolve({})
              }),
            },
          }))
        )

        await refundCredits({
          userId: mockUserId,
          creditType: 'reading',
          amount: 1,
          reason: 'timeout',
          apiRoute: '/api/test',
          transactionId: 'txn_123',
        })

        // 보너스 후보 없음(withDefaults) → usedCredits fallback → REFUND/MONTHLY 한 줄.
        expect(created).toHaveLength(1)
        expect(created[0]).toMatchObject({
          userId: mockUserId,
          type: 'REFUND',
          pool: 'MONTHLY',
          amount: 1,
          reason: 'timeout',
        })
      })
    })

    describe('Error Handling', () => {
      it('should throw when user not found', async () => {
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(null),
            },
          }))
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

      it('should ensure transaction atomicity', async () => {
        // 새 코드는 reading 환불을 raw SQL ($executeRaw) 로 처리하므로
        // 그 쪽이 throw 했을 때 트랜잭션이 깨지는지 확인.
        const executeRawMock = vi.fn().mockRejectedValue(new Error('Update failed'))

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue({ userId: mockUserId }),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn(),
            },
            $executeRaw: executeRawMock,
          }))
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

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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

        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
          callback(withDefaults({
            userCredits: {
              findUnique: vi.fn().mockResolvedValue(mockUserCredits),
              update: vi.fn().mockResolvedValue({}),
            },
            creditRefundLog: {
              create: vi.fn().mockResolvedValue({}),
            },
          }))
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

  describe('Integration Scenarios', () => {
    it('should handle complete refund workflow', async () => {
      const mockUserCredits = { userId: mockUserId, usedCredits: 10 }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback(withDefaults({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockUserCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          creditRefundLog: {
            create: vi.fn().mockResolvedValue({ id: 'log1' }),
          },
        }))
      )

      const refundResult = await refundCredits({
        userId: mockUserId,
        creditType: 'reading',
        amount: 2,
        reason: 'api_timeout',
        apiRoute: '/api/tarot/chat',
      })

      expect(refundResult).toBe(true)
    })

    it('should handle concurrent refunds safely', async () => {
      const mockUserCredits = { userId: mockUserId, usedCredits: 10 }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback(withDefaults({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockUserCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          creditRefundLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        }))
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
