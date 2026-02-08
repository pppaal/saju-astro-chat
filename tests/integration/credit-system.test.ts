/**
 * Credit System Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 크레딧 생성 및 사용
 * - 크레딧 리필 및 만료
 * - 보너스 크레딧 관리
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: Credit System', () => {
  if (!hasTestDb) {
    return
  }

  beforeAll(async () => {
    await connectTestDb()
  })

  afterAll(async () => {
    await cleanupAllTestUsers()
    await disconnectTestDb()
  })

  afterEach(async () => {
    await cleanupAllTestUsers()
  })

  describe('Credit Allocation', () => {
    it('allocates starter credits to new user', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'starter')

      expect(credits.totalCredits).toBe(10)
      expect(credits.usedCredits).toBe(0)
    })

    it('allocates premium credits', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'premium')

      expect(credits.totalCredits).toBe(100)
    })

    it('allocates unlimited credits', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'unlimited')

      expect(credits.totalCredits).toBe(999999)
    })
  })

  describe('Credit Consumption', () => {
    it('consumes credit for service usage', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 1 } },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.usedCredits).toBe(1)
      expect(credits!.totalCredits - credits!.usedCredits).toBe(9)
    })

    it('consumes multiple credits for premium service', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'premium')

      // Premium service costs 5 credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 5 } },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.usedCredits).toBe(5)
    })

    it('tracks credit usage over time', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'premium')

      // Simulate multiple service usages
      for (let i = 0; i < 10; i++) {
        await testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        })
      }

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.usedCredits).toBe(10)
    })
  })

  describe('Credit Balance Check', () => {
    it('checks if user has sufficient credits', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      const remaining = credits!.totalCredits - credits!.usedCredits
      const canUseService = remaining >= 1

      expect(canUseService).toBe(true)
    })

    it('detects insufficient credits', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          totalCredits: 5,
          usedCredits: 5,
        },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      const remaining = credits!.totalCredits - credits!.usedCredits
      expect(remaining).toBe(0)
    })
  })

  describe('Credit Refill', () => {
    it('refills credits on subscription renewal', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          totalCredits: 100,
          usedCredits: 85,
        },
      })

      // Monthly refill - reset used credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 0 },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.usedCredits).toBe(0)
      expect(credits?.totalCredits).toBe(100)
    })

    it('increases total credits on plan upgrade', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          totalCredits: 10,
          usedCredits: 5,
        },
      })

      // Upgrade to premium
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { totalCredits: 100 },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.totalCredits).toBe(100)
      expect(credits?.usedCredits).toBe(5) // Used credits preserved
    })
  })

  describe('Bonus Credits', () => {
    it('adds bonus credits for referral', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      // Add referral bonus
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { bonusCredits: { increment: 5 } },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.bonusCredits).toBe(5)
    })

    it('tracks bonus credit purchase', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      const purchase = await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 50,
          price: 4900,
          stripePaymentIntentId: `pi_bonus_${Date.now()}`,
          status: 'completed',
        },
      })

      // Add purchased bonus credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { bonusCredits: { increment: purchase.amount } },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.bonusCredits).toBe(50)
    })

    it('uses bonus credits before regular credits', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          totalCredits: 10,
          usedCredits: 0,
          bonusCredits: 5,
        },
      })

      // Use service - consume from bonus first
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      if (credits!.bonusCredits > 0) {
        await testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { bonusCredits: { decrement: 1 } },
        })
      }

      const updated = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(updated?.bonusCredits).toBe(4)
      expect(updated?.usedCredits).toBe(0) // Regular credits untouched
    })
  })

  describe('Credit Refund', () => {
    it('refunds credits for failed service', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'premium')

      // Service was charged
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 1 } },
      })

      // Service failed - refund
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { decrement: 1 } },
      })

      // Log refund
      await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 1,
          reason: 'service_failure',
          processedBy: 'system',
        },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.usedCredits).toBe(0)
    })

    it('tracks refund history', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.creditRefundLog.create({
          data: {
            userId: user.id,
            amount: i + 1,
            reason: `refund_reason_${i}`,
            processedBy: 'admin',
          },
        })
      }

      const refunds = await testPrisma.creditRefundLog.findMany({
        where: { userId: user.id },
      })

      expect(refunds).toHaveLength(3)

      const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0)
      expect(totalRefunded).toBe(6)
    })
  })

  describe('Credit Expiration', () => {
    it('tracks credit reset date', async () => {
      const user = await createTestUserInDb()

      const resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          totalCredits: 100,
          usedCredits: 0,
          resetAt: resetDate,
        },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.resetAt?.getTime()).toBeCloseTo(resetDate.getTime(), -3)
    })

    it('finds users due for credit reset', async () => {
      const users: string[] = []
      const now = new Date()

      for (let i = 0; i < 4; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        const resetDate = new Date(now.getTime() + (i - 2) * 24 * 60 * 60 * 1000)

        await testPrisma.userCredits.create({
          data: {
            userId: user.id,
            totalCredits: 100,
            usedCredits: 50,
            resetAt: resetDate,
          },
        })
      }

      const dueForReset = await testPrisma.userCredits.findMany({
        where: {
          userId: { in: users },
          resetAt: { lte: now },
        },
      })

      expect(dueForReset).toHaveLength(2) // -2 days and -1 day
    })
  })

  describe('Credit Analytics', () => {
    it('calculates average credit usage', async () => {
      const users: string[] = []

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userCredits.create({
          data: {
            userId: user.id,
            totalCredits: 100,
            usedCredits: (i + 1) * 10, // 10, 20, 30, 40, 50
          },
        })
      }

      const credits = await testPrisma.userCredits.findMany({
        where: { userId: { in: users } },
      })

      const avgUsage = credits.reduce((sum, c) => sum + c.usedCredits, 0) / credits.length
      expect(avgUsage).toBe(30)
    })

    it('finds high usage users', async () => {
      const users: string[] = []

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userCredits.create({
          data: {
            userId: user.id,
            totalCredits: 100,
            usedCredits: i < 2 ? 90 : 30, // 2 high users, 3 normal
          },
        })
      }

      const highUsageUsers = await testPrisma.userCredits.findMany({
        where: {
          userId: { in: users },
          usedCredits: { gte: 80 },
        },
      })

      expect(highUsageUsers).toHaveLength(2)
    })
  })
})
