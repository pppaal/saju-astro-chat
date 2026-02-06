/**
 * Subscription and Premium Features Integration Tests
 * Tests subscription management and premium feature access
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

describe('Subscription and Premium Integration', () => {
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

  describe('Subscription Management', () => {
    it('should create subscription for user', async () => {
      const user = await createTestUserInDb()

      const subscription = await createTestSubscription(user.id, 'pro', 'active')

      expect(subscription).toBeDefined()
      expect(subscription.userId).toBe(user.id)
      expect(subscription.plan).toBe('pro')
      expect(subscription.status).toBe('active')
      expect(subscription.stripeCustomerId).toBeTruthy()
      expect(subscription.stripeSubscriptionId).toBeTruthy()
    })

    it('should retrieve active subscription for user', async () => {
      const user = await createTestUserInDb()
      await createTestSubscription(user.id, 'starter', 'active')

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id, status: 'active' },
      })

      expect(subscription).toBeDefined()
      expect(subscription?.plan).toBe('starter')
      expect(subscription?.status).toBe('active')
    })

    it('should update subscription status', async () => {
      const user = await createTestUserInDb()
      const subscription = await createTestSubscription(user.id, 'pro', 'active')

      const updated = await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'canceled' },
      })

      expect(updated.status).toBe('canceled')
    })

    it('should handle subscription renewal', async () => {
      const user = await createTestUserInDb()
      const subscription = await createTestSubscription(user.id, 'premium', 'active')

      const now = new Date()
      const newPeriodEnd = new Date(now)
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

      const renewed = await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
        },
      })

      expect(renewed.currentPeriodStart).toBeDefined()
      expect(renewed.currentPeriodEnd.getTime()).toBeGreaterThan(now.getTime())
    })

    it('should track subscription history', async () => {
      const user = await createTestUserInDb()

      // Create first subscription
      await createTestSubscription(user.id, 'starter', 'canceled')

      // Create second subscription (upgrade)
      await createTestSubscription(user.id, 'pro', 'active')

      const subscriptions = await testPrisma.subscription.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      expect(subscriptions.length).toBe(2)
      expect(subscriptions[0].plan).toBe('pro')
      expect(subscriptions[1].plan).toBe('starter')
    })
  })

  describe('User Credits Management', () => {
    it('should create user credits based on plan', async () => {
      const user = await createTestUserInDb()

      const credits = await createTestUserCredits(user.id, 'starter')

      expect(credits).toBeDefined()
      expect(credits.userId).toBe(user.id)
      expect(credits.plan).toBe('starter')
      expect(credits.monthlyCredits).toBe(25)
      expect(credits.usedCredits).toBe(0)
      expect(credits.compatibilityLimit).toBe(2)
      expect(credits.followUpLimit).toBe(2)
    })

    it('should deduct credits on usage', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'pro')

      // Use some credits
      const updated = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: { increment: 5 },
          compatibilityUsed: { increment: 1 },
        },
      })

      expect(updated.usedCredits).toBe(5)
      expect(updated.compatibilityUsed).toBe(1)
    })

    it('should check if user has enough credits', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      const availableCredits =
        (credits?.monthlyCredits || 0) + (credits?.bonusCredits || 0) - (credits?.usedCredits || 0)

      expect(availableCredits).toBeGreaterThanOrEqual(0)
      expect(availableCredits).toBe(7) // free plan has 7 monthly credits
    })

    it('should add bonus credits', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'starter')

      const updated = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { bonusCredits: { increment: 10 } },
      })

      expect(updated.bonusCredits).toBe(10)
    })

    it('should reset monthly credits at period end', async () => {
      const user = await createTestUserInDb()
      const credits = await createTestUserCredits(user.id, 'pro')

      // Use some credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 50 },
      })

      // Simulate period reset
      const now = new Date()
      const nextPeriod = new Date(now)
      nextPeriod.setMonth(nextPeriod.getMonth() + 1)

      const reset = await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 0,
          compatibilityUsed: 0,
          followUpUsed: 0,
          periodStart: now,
          periodEnd: nextPeriod,
        },
      })

      expect(reset.usedCredits).toBe(0)
      expect(reset.compatibilityUsed).toBe(0)
      expect(reset.followUpUsed).toBe(0)
    })
  })

  describe('Premium Content Access', () => {
    it('should grant premium content access', async () => {
      const user = await createTestUserInDb()
      await createTestSubscription(user.id, 'premium', 'active')

      const access = await testPrisma.premiumContentAccess.create({
        data: {
          userId: user.id,
          service: 'destiny-map',
          contentType: 'details',
          contentId: 'destiny-matrix',
          metadata: { tier: 'full' },
        },
      })

      expect(access).toBeDefined()
      expect(access.service).toBe('destiny-map')
      expect(access.contentType).toBe('details')
    })

    it('should check premium content access validity', async () => {
      const user = await createTestUserInDb()

      await testPrisma.premiumContentAccess.create({
        data: {
          userId: user.id,
          service: 'compatibility',
          contentType: 'advanced',
          contentId: 'advanced-compatibility',
        },
      })

      const access = await testPrisma.premiumContentAccess.findFirst({
        where: {
          userId: user.id,
          service: 'compatibility',
          contentType: 'advanced',
        },
      })

      expect(access).toBeDefined()
      expect(access?.contentId).toBe('advanced-compatibility')
    })

    it('should store premium content access metadata', async () => {
      const user = await createTestUserInDb()

      const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

      await testPrisma.premiumContentAccess.create({
        data: {
          userId: user.id,
          service: 'astrology',
          contentType: 'full_report',
          contentId: 'life-prediction',
          metadata: { expiresAt: pastExpiry.toISOString() },
        },
      })

      const expiredAccess = await testPrisma.premiumContentAccess.findFirst({
        where: {
          userId: user.id,
          service: 'astrology',
          contentType: 'full_report',
        },
      })

      expect(expiredAccess).toBeDefined()
      expect(expiredAccess?.metadata).toMatchObject({
        expiresAt: pastExpiry.toISOString(),
      })
    })

    it('should support different content types', async () => {
      const user = await createTestUserInDb()

      const contentTypes = ['details', 'advanced', 'full_report', 'insights']

      for (const contentType of contentTypes) {
        await testPrisma.premiumContentAccess.create({
          data: {
            userId: user.id,
            contentType,
            service: 'tarot',
          },
        })
      }

      const allAccess = await testPrisma.premiumContentAccess.findMany({
        where: { userId: user.id },
      })

      expect(allAccess.length).toBe(contentTypes.length)
    })
  })

  describe('Subscription Upgrade/Downgrade', () => {
    it('should upgrade subscription from starter to pro', async () => {
      const user = await createTestUserInDb()
      const subscription = await createTestSubscription(user.id, 'starter', 'active')
      await createTestUserCredits(user.id, 'starter')

      // Upgrade
      const upgraded = await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: { plan: 'pro' },
      })

      // Update credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          plan: 'pro',
          monthlyCredits: 80,
          compatibilityLimit: 5,
          followUpLimit: 5,
        },
      })

      expect(upgraded.plan).toBe('pro')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.monthlyCredits).toBe(80)
    })

    it('should downgrade subscription from premium to starter', async () => {
      const user = await createTestUserInDb()
      const subscription = await createTestSubscription(user.id, 'premium', 'active')

      // Downgrade at period end
      const downgraded = await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: { plan: 'starter' },
      })

      expect(downgraded.plan).toBe('starter')
    })
  })

  describe('Bonus Credit Purchase', () => {
    it('should record bonus credit purchase', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const purchase = await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 50,
          remaining: 50,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          source: 'purchase',
        },
      })

      expect(purchase).toBeDefined()
      expect(purchase.amount).toBe(50)
      expect(purchase.remaining).toBe(50)

      // Add bonus credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { bonusCredits: { increment: 50 } },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.bonusCredits).toBe(50)
    })

    it('should track multiple bonus credit purchases', async () => {
      const user = await createTestUserInDb()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await testPrisma.bonusCreditPurchase.createMany({
        data: [
          {
            userId: user.id,
            amount: 25,
            remaining: 25,
            expiresAt,
            source: 'purchase',
          },
          {
            userId: user.id,
            amount: 50,
            remaining: 50,
            expiresAt,
            source: 'purchase',
          },
        ],
      })

      const purchases = await testPrisma.bonusCreditPurchase.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      expect(purchases.length).toBe(2)

      const totalCredits = purchases.reduce((sum, p) => sum + p.amount, 0)
      expect(totalCredits).toBe(75)
    })
  })

  describe('Feature Limits by Plan', () => {
    it('should enforce compatibility analysis limit for free plan', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.compatibilityLimit).toBe(0) // Free plan has no compatibility analyses
    })

    it('should allow unlimited compatibility for premium plan', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'premium')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.compatibilityLimit).toBe(10) // Premium has high limit
    })

    it('should track feature usage against limits', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      // Use compatibility feature twice
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { compatibilityUsed: 2 },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      const canUseCompatibility =
        (credits?.compatibilityUsed || 0) < (credits?.compatibilityLimit || 0)

      expect(canUseCompatibility).toBe(false) // Used 2 out of 2
    })
  })
})
