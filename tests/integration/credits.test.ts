/**
 * Credit System Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 크레딧 초기화 및 조회
 * - 크레딧 소비 및 잔액 계산
 * - 구독 연동 및 플랜 업그레이드
 * - 보너스 크레딧 및 만료 처리
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  createTestSubscription,
  createTestUserCredits,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: Credit System', () => {
  if (!hasTestDb) {
    it.skip('skips when test database is unavailable', () => {})
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

  describe('Credit Initialization', () => {
    it('creates credits for new user with free plan', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'free')

      expect(credits).toBeDefined()
      expect(credits.plan).toBe('free')
      expect(credits.monthlyCredits).toBe(7)
      expect(credits.usedCredits).toBe(0)
      expect(credits.bonusCredits).toBe(0)
      expect(credits.compatibilityLimit).toBe(0)
      expect(credits.followUpLimit).toBe(0)
    })

    it('creates credits with starter plan values', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'starter')

      expect(credits.plan).toBe('starter')
      expect(credits.monthlyCredits).toBe(25)
      expect(credits.compatibilityLimit).toBe(2)
      expect(credits.followUpLimit).toBe(2)
      expect(credits.historyRetention).toBe(30)
    })

    it('creates credits with pro plan values', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'pro')

      expect(credits.plan).toBe('pro')
      expect(credits.monthlyCredits).toBe(80)
      expect(credits.compatibilityLimit).toBe(5)
      expect(credits.followUpLimit).toBe(5)
      expect(credits.historyRetention).toBe(90)
    })

    it('creates credits with premium plan values', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'premium')

      expect(credits.plan).toBe('premium')
      expect(credits.monthlyCredits).toBe(150)
      expect(credits.compatibilityLimit).toBe(10)
      expect(credits.followUpLimit).toBe(10)
      expect(credits.historyRetention).toBe(365)
    })

    it('sets correct period dates', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'free')

      expect(credits.periodStart).toBeInstanceOf(Date)
      expect(credits.periodEnd).toBeInstanceOf(Date)

      // Period end should be ~1 month after start
      const diffMs = credits.periodEnd!.getTime() - credits.periodStart.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThanOrEqual(28)
      expect(diffDays).toBeLessThanOrEqual(31)
    })
  })

  describe('Credit Consumption', () => {
    it('increments usedCredits when consuming', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      // Simulate credit consumption
      const updated = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 1 } },
      })

      expect(updated.usedCredits).toBe(1)

      // Consume more
      const updated2 = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 3 } },
      })

      expect(updated2.usedCredits).toBe(4)
    })

    it('tracks compatibility usage separately', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      const updated = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { compatibilityUsed: { increment: 1 } },
      })

      expect(updated.compatibilityUsed).toBe(1)
      expect(updated.usedCredits).toBe(0) // Main credits unchanged
    })

    it('tracks follow-up usage separately', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      const updated = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { followUpUsed: { increment: 2 } },
      })

      expect(updated.followUpUsed).toBe(2)
      expect(updated.usedCredits).toBe(0)
    })

    it('calculates remaining credits correctly', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      // Use some credits
      const credits = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 10,
          bonusCredits: 5,
        },
      })

      // Remaining = monthly - used + bonus = 25 - 10 + 5 = 20
      const remaining = credits.monthlyCredits - credits.usedCredits + credits.bonusCredits
      expect(remaining).toBe(20)
    })
  })

  describe('Bonus Credits', () => {
    it('adds bonus credits to user', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const updated = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          bonusCredits: { increment: 10 },
          totalBonusReceived: { increment: 10 },
        },
      })

      expect(updated.bonusCredits).toBe(10)
      expect(updated.totalBonusReceived).toBe(10)
    })

    it('creates bonus credit purchase record', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const now = new Date()
      const expiresAt = new Date(now)
      expiresAt.setMonth(expiresAt.getMonth() + 3)

      const purchase = await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 15,
          remaining: 15,
          expiresAt,
          source: 'purchase',
          stripePaymentId: 'pi_test_123',
        },
      })

      expect(purchase.amount).toBe(15)
      expect(purchase.remaining).toBe(15)
      expect(purchase.expired).toBe(false)
      expect(purchase.source).toBe('purchase')
    })

    it('tracks multiple bonus purchases separately', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const now = new Date()
      const expiresAt = new Date(now)
      expiresAt.setMonth(expiresAt.getMonth() + 3)

      // Purchase 1: Standard pack
      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 15,
          remaining: 15,
          expiresAt,
          source: 'purchase',
        },
      })

      // Purchase 2: Referral bonus
      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 3,
          remaining: 3,
          expiresAt,
          source: 'referral',
        },
      })

      const purchases = await testPrisma.bonusCreditPurchase.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      })

      expect(purchases).toHaveLength(2)
      expect(purchases[0].source).toBe('purchase')
      expect(purchases[1].source).toBe('referral')
    })

    it('decrements remaining on bonus purchase when consumed', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const now = new Date()
      const expiresAt = new Date(now)
      expiresAt.setMonth(expiresAt.getMonth() + 3)

      const purchase = await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 10,
          remaining: 10,
          expiresAt,
          source: 'purchase',
        },
      })

      // Consume 3 credits from this purchase
      const updated = await testPrisma.bonusCreditPurchase.update({
        where: { id: purchase.id },
        data: { remaining: { decrement: 3 } },
      })

      expect(updated.remaining).toBe(7)
      expect(updated.amount).toBe(10) // Original amount unchanged
    })

    it('marks purchase as expired', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const pastDate = new Date()
      pastDate.setMonth(pastDate.getMonth() - 1) // 1 month ago

      const purchase = await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 5,
          remaining: 5,
          expiresAt: pastDate,
          source: 'promotion',
        },
      })

      // Mark as expired
      const updated = await testPrisma.bonusCreditPurchase.update({
        where: { id: purchase.id },
        data: { expired: true },
      })

      expect(updated.expired).toBe(true)
    })

    it('queries only valid (non-expired) purchases', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const now = new Date()
      const futureDate = new Date(now)
      futureDate.setMonth(futureDate.getMonth() + 3)
      const pastDate = new Date(now)
      pastDate.setMonth(pastDate.getMonth() - 1)

      // Valid purchase
      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 10,
          remaining: 10,
          expiresAt: futureDate,
          source: 'purchase',
        },
      })

      // Expired purchase (past date)
      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 5,
          remaining: 5,
          expiresAt: pastDate,
          source: 'promotion',
        },
      })

      // Already marked expired
      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 3,
          remaining: 3,
          expiresAt: futureDate,
          expired: true,
          source: 'gift',
        },
      })

      // Query valid purchases
      const validPurchases = await testPrisma.bonusCreditPurchase.findMany({
        where: {
          userId: user.id,
          expired: false,
          expiresAt: { gt: now },
          remaining: { gt: 0 },
        },
      })

      expect(validPurchases).toHaveLength(1)
      expect(validPurchases[0].amount).toBe(10)
    })
  })

  describe('Subscription Integration', () => {
    it('links subscription to user', async () => {
      const user = await createTestUserInDb()
      const subscription = await createTestSubscription(user.id, 'pro', 'active')

      expect(subscription.userId).toBe(user.id)
      expect(subscription.plan).toBe('pro')
      expect(subscription.status).toBe('active')
    })

    it('retrieves user with subscription', async () => {
      const user = await createTestUserInDb()
      await createTestSubscription(user.id, 'premium', 'active')

      const userWithSub = await testPrisma.user.findUnique({
        where: { id: user.id },
        include: { subscriptions: true },
      })

      expect(userWithSub?.subscriptions).toHaveLength(1)
      expect(userWithSub?.subscriptions[0].plan).toBe('premium')
    })

    it('identifies active subscription', async () => {
      const user = await createTestUserInDb()
      const sub = await createTestSubscription(user.id, 'starter', 'active')

      // Check if subscription is active
      const activeSub = await testPrisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: { in: ['active', 'trialing'] },
          currentPeriodEnd: { gt: new Date() },
        },
      })

      expect(activeSub).not.toBeNull()
      expect(activeSub?.id).toBe(sub.id)
    })

    it('identifies canceled subscription', async () => {
      const user = await createTestUserInDb()
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          status: 'canceled',
          plan: 'starter',
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          canceledAt: new Date(),
        },
      })

      const activeSub = await testPrisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: { in: ['active', 'trialing'] },
        },
      })

      expect(activeSub).toBeNull()
    })

    it('handles subscription upgrade', async () => {
      const user = await createTestUserInDb()

      // Start with starter
      const starterSub = await createTestSubscription(user.id, 'starter', 'active')

      // Upgrade to pro (cancel old, create new)
      await testPrisma.subscription.update({
        where: { id: starterSub.id },
        data: { status: 'canceled', canceledAt: new Date() },
      })

      const proSub = await createTestSubscription(user.id, 'pro', 'active')

      // Update credits
      await testPrisma.userCredits.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: 'pro',
          monthlyCredits: 80,
          usedCredits: 0,
          bonusCredits: 0,
          compatibilityUsed: 0,
          followUpUsed: 0,
          compatibilityLimit: 5,
          followUpLimit: 5,
          historyRetention: 90,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          plan: 'pro',
          monthlyCredits: 80,
          usedCredits: 0, // Reset on upgrade
          compatibilityUsed: 0,
          followUpUsed: 0,
          compatibilityLimit: 5,
          followUpLimit: 5,
          historyRetention: 90,
        },
      })

      // Verify latest subscription is pro
      const latestSub = await testPrisma.subscription.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
      })

      expect(latestSub?.plan).toBe('pro')

      // Verify credits updated
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.plan).toBe('pro')
      expect(credits?.monthlyCredits).toBe(80)
      expect(credits?.usedCredits).toBe(0) // Reset
    })
  })

  describe('Period Reset', () => {
    it('resets monthly usage counters', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      // Simulate usage
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 50,
          compatibilityUsed: 3,
          followUpUsed: 2,
        },
      })

      // Reset for new period
      const now = new Date()
      const newPeriodEnd = new Date(now)
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

      const reset = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 0,
          compatibilityUsed: 0,
          followUpUsed: 0,
          periodStart: now,
          periodEnd: newPeriodEnd,
        },
      })

      expect(reset.usedCredits).toBe(0)
      expect(reset.compatibilityUsed).toBe(0)
      expect(reset.followUpUsed).toBe(0)
      expect(reset.bonusCredits).toBe(0) // Bonus not reset
    })

    it('preserves bonus credits on period reset', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      // Add bonus credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          bonusCredits: 15,
          usedCredits: 20,
        },
      })

      // Reset for new period (keep bonus)
      const reset = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 0,
          compatibilityUsed: 0,
          followUpUsed: 0,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(reset.usedCredits).toBe(0)
      expect(reset.bonusCredits).toBe(15) // Preserved
    })
  })

  describe('Transaction Safety', () => {
    it('handles concurrent credit updates with transactions', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      // Simulate atomic update with transaction
      const result = await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        })

        if (!credits || credits.usedCredits >= credits.monthlyCredits) {
          throw new Error('No credits available')
        }

        return tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        })
      })

      expect(result.usedCredits).toBe(1)
    })

    it('rolls back on transaction failure', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      // Set to max usage
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 7 }, // Max for free plan
      })

      // Try to consume more (should fail)
      await expect(
        testPrisma.$transaction(async (tx) => {
          const credits = await tx.userCredits.findUnique({
            where: { userId: user.id },
          })

          const remaining =
            (credits?.monthlyCredits || 0) -
            (credits?.usedCredits || 0) +
            (credits?.bonusCredits || 0)

          if (remaining <= 0) {
            throw new Error('No credits available')
          }

          return tx.userCredits.update({
            where: { userId: user.id },
            data: { usedCredits: { increment: 1 } },
          })
        })
      ).rejects.toThrow('No credits available')

      // Verify nothing changed
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })
      expect(credits?.usedCredits).toBe(7)
    })
  })
})
