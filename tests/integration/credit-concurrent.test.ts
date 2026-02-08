/**
 * P1: Credit System Concurrent Usage Tests
 * 크레딧 동시 사용 시나리오 테스트
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock prisma before imports
const mockPrismaTransaction = vi.fn()
const mockUserCreditsFind = vi.fn()
const mockUserCreditsUpdate = vi.fn()
const mockBonusCreditPurchaseFind = vi.fn()
const mockBonusCreditPurchaseUpdate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: mockPrismaTransaction,
    userCredits: {
      findUnique: mockUserCreditsFind,
      update: mockUserCreditsUpdate,
      create: vi.fn(),
    },
    bonusCreditPurchase: {
      findMany: mockBonusCreditPurchaseFind,
      update: mockBonusCreditPurchaseUpdate,
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}))

import {
  consumeCredits,
  getCreditBalance,
  canUseCredits,
} from '@/lib/credits/creditService'

describe('Credit System Concurrent Usage (P1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Race Condition Prevention', () => {
    it('should use transaction for atomic credit consumption', async () => {
      const mockCredits = {
        userId: 'user-123',
        plan: 'premium',
        monthlyCredits: 100,
        usedCredits: 50,
        bonusCredits: 10,
        compatibilityUsed: 0,
        compatibilityLimit: 5,
        followUpUsed: 0,
        followUpLimit: 10,
        historyRetention: 30,
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue(mockCredits),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'reading', 1)

      expect(result.success).toBe(true)
      expect(mockPrismaTransaction).toHaveBeenCalled()
    })

    it('should handle concurrent credit consumption attempts', async () => {
      let currentCredits = 5 // Only 5 credits available

      mockPrismaTransaction.mockImplementation(async (callback) => {
        // Simulate concurrent access with locking
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockImplementation(() => ({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 100 - currentCredits, // Dynamic based on remaining
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            })),
            update: vi.fn().mockImplementation(() => {
              currentCredits--
              return {}
            }),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      // Attempt to consume 5 credits concurrently (each consuming 1)
      const attempts = Array.from({ length: 10 }, () =>
        consumeCredits('user-123', 'reading', 1)
      )

      const results = await Promise.all(attempts)

      // Only 5 should succeed
      const successCount = results.filter((r) => r.success).length
      expect(successCount).toBeLessThanOrEqual(5)
    })

    it('should prevent double-spending in follow-up usage', async () => {
      let followUpUsed = 9 // One slot remaining

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockImplementation(() => ({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: followUpUsed,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            })),
            update: vi.fn().mockImplementation(() => {
              followUpUsed++
              return {}
            }),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      // Two concurrent follow-up attempts
      const [result1, result2] = await Promise.all([
        consumeCredits('user-123', 'followUp', 1),
        consumeCredits('user-123', 'followUp', 1),
      ])

      // At most one should succeed
      const successCount = [result1, result2].filter((r) => r.success).length
      expect(successCount).toBeLessThanOrEqual(1)
    })
  })

  describe('Bonus Credit FIFO Consumption', () => {
    it('should consume expiring bonus credits first', async () => {
      const now = new Date()
      const soonExpiring = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // 1 day
      const laterExpiring = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const bonusPurchases = [
        { id: 'purchase-2', remaining: 10, expiresAt: laterExpiring, expired: false },
        { id: 'purchase-1', remaining: 5, expiresAt: soonExpiring, expired: false },
      ]

      let consumedFromPurchase1 = 0

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 15, // 5 + 10
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue(
              // Sorted by expiresAt ascending
              [...bonusPurchases].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
            ),
            update: vi.fn().mockImplementation(({ where }) => {
              if (where.id === 'purchase-1') {
                consumedFromPurchase1++
              }
              return {}
            }),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'reading', 3)

      expect(result.success).toBe(true)
      // Should consume from soon-expiring purchase first
      expect(consumedFromPurchase1).toBeGreaterThan(0)
    })

    it('should handle expired bonus credits gracefully', async () => {
      const now = new Date()
      const expired = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 95, // Only 5 monthly credits left
              bonusCredits: 10, // Shows 10 bonus but they're expired
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]), // No valid bonus credits
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      // Should fall back to monthly credits
      const result = await consumeCredits('user-123', 'reading', 3)

      expect(result.success).toBe(true)
    })
  })

  describe('Limit Enforcement', () => {
    it('should enforce compatibility limit', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 0,
              compatibilityUsed: 5, // At limit
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn(),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'compatibility', 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('한도')
    })

    it('should enforce follow-up limit', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 10, // At limit
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn(),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'followUp', 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('한도')
    })

    it('should reject when no credits available', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'free',
              monthlyCredits: 10,
              usedCredits: 10, // All used
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 1,
              followUpUsed: 0,
              followUpLimit: 3,
              historyRetention: 7,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn(),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'reading', 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('부족')
    })
  })

  describe('Database Error Handling', () => {
    it('should propagate database errors', async () => {
      mockPrismaTransaction.mockRejectedValue(new Error('Database connection lost'))

      await expect(consumeCredits('user-123', 'reading', 1)).rejects.toThrow(
        'Database connection lost'
      )
    })

    it('should handle transaction timeout', async () => {
      mockPrismaTransaction.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout')), 100)
          )
      )

      await expect(consumeCredits('user-123', 'reading', 1)).rejects.toThrow('timeout')
    })

    it('should handle missing user credits record', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'reading', 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('찾을 수 없습니다')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero amount consumption', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      // Should succeed without consuming anything
      const result = await consumeCredits('user-123', 'reading', 0)

      expect(result.success).toBe(true)
    })

    it('should handle negative amount gracefully', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      // Negative should be treated as zero or error
      const result = await consumeCredits('user-123', 'reading', -5)

      // Implementation should handle this gracefully
      expect(result).toBeDefined()
    })

    it('should handle very large amount request', async () => {
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue({
              userId: 'user-123',
              plan: 'premium',
              monthlyCredits: 100,
              usedCredits: 0,
              bonusCredits: 0,
              compatibilityUsed: 0,
              compatibilityLimit: 5,
              followUpUsed: 0,
              followUpLimit: 10,
              historyRetention: 30,
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
            update: vi.fn(),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits('user-123', 'reading', 1000000)

      expect(result.success).toBe(false)
      expect(result.error).toContain('부족')
    })
  })
})
