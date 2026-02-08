/**
 * Referral System Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 추천인 보상 시스템
 * - 추천 코드 관리
 * - 보상 지급 및 추적
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

describe('Integration: Referral System', () => {
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

  describe('Referral Reward Creation', () => {
    it('creates referral reward for referrer', async () => {
      const referrer = await createTestUserInDb()
      const referred = await createTestUserInDb()

      const reward = await testPrisma.referralReward.create({
        data: {
          userId: referrer.id,
          referredUserId: referred.id,
          rewardType: 'referrer_bonus',
          creditsAwarded: 10,
          status: 'pending',
        },
      })

      expect(reward).toBeDefined()
      expect(reward.userId).toBe(referrer.id)
      expect(reward.creditsAwarded).toBe(10)
      expect(reward.status).toBe('pending')
    })

    it('creates reward for referred user', async () => {
      const referrer = await createTestUserInDb()
      const referred = await createTestUserInDb()

      const reward = await testPrisma.referralReward.create({
        data: {
          userId: referred.id,
          referredUserId: referred.id,
          rewardType: 'referred_bonus',
          creditsAwarded: 5,
          status: 'completed',
          completedAt: new Date(),
        },
      })

      expect(reward.rewardType).toBe('referred_bonus')
      expect(reward.status).toBe('completed')
    })

    it('tracks multiple referrals from same user', async () => {
      const referrer = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        const referred = await createTestUserInDb()
        await testPrisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: referred.id,
            rewardType: 'referrer_bonus',
            creditsAwarded: 10,
            status: 'completed',
            completedAt: new Date(),
          },
        })
      }

      const rewards = await testPrisma.referralReward.findMany({
        where: { userId: referrer.id },
      })

      expect(rewards).toHaveLength(5)
    })
  })

  describe('Reward Status Management', () => {
    it('updates reward status from pending to completed', async () => {
      const referrer = await createTestUserInDb()
      const referred = await createTestUserInDb()

      const reward = await testPrisma.referralReward.create({
        data: {
          userId: referrer.id,
          referredUserId: referred.id,
          rewardType: 'referrer_bonus',
          creditsAwarded: 10,
          status: 'pending',
        },
      })

      const updated = await testPrisma.referralReward.update({
        where: { id: reward.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })

      expect(updated.status).toBe('completed')
      expect(updated.completedAt).toBeInstanceOf(Date)
    })

    it('retrieves pending rewards', async () => {
      const referrer = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        const referred = await createTestUserInDb()
        await testPrisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: referred.id,
            rewardType: 'referrer_bonus',
            creditsAwarded: 10,
            status: i < 2 ? 'pending' : 'completed',
            completedAt: i < 2 ? null : new Date(),
          },
        })
      }

      const pendingRewards = await testPrisma.referralReward.findMany({
        where: { userId: referrer.id, status: 'pending' },
      })

      expect(pendingRewards).toHaveLength(2)
    })

    it('calculates total rewards earned', async () => {
      const referrer = await createTestUserInDb()

      const creditAmounts = [10, 10, 10, 15, 20]

      for (const credits of creditAmounts) {
        const referred = await createTestUserInDb()
        await testPrisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: referred.id,
            rewardType: 'referrer_bonus',
            creditsAwarded: credits,
            status: 'completed',
            completedAt: new Date(),
          },
        })
      }

      const rewards = await testPrisma.referralReward.findMany({
        where: { userId: referrer.id, status: 'completed' },
      })

      const totalCredits = rewards.reduce((sum, r) => sum + r.creditsAwarded, 0)
      expect(totalCredits).toBe(65)
    })
  })

  describe('Referral with Credits Integration', () => {
    it('awards credits to referrer upon referral completion', async () => {
      const referrer = await createTestUserInDb()
      await createTestUserCredits(referrer.id, 'starter')
      const referred = await createTestUserInDb()

      await testPrisma.$transaction(async (tx) => {
        // Create reward record
        await tx.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: referred.id,
            rewardType: 'referrer_bonus',
            creditsAwarded: 10,
            status: 'completed',
            completedAt: new Date(),
          },
        })

        // Add bonus credits
        await tx.userCredits.update({
          where: { userId: referrer.id },
          data: { bonusCredits: { increment: 10 } },
        })
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: referrer.id },
      })

      expect(credits?.bonusCredits).toBe(10)
    })

    it('tracks referral chain', async () => {
      const users: { id: string }[] = []

      // Create chain of 5 users
      for (let i = 0; i < 5; i++) {
        users.push(await createTestUserInDb())
      }

      // Create referral rewards (each user refers the next)
      for (let i = 0; i < 4; i++) {
        await testPrisma.referralReward.create({
          data: {
            userId: users[i].id,
            referredUserId: users[i + 1].id,
            rewardType: 'referrer_bonus',
            creditsAwarded: 10,
            status: 'completed',
            completedAt: new Date(),
          },
        })
      }

      // Check first user's referral count
      const firstUserRewards = await testPrisma.referralReward.findMany({
        where: { userId: users[0].id },
      })

      expect(firstUserRewards).toHaveLength(1)
    })
  })

  describe('Referral Analytics', () => {
    it('counts total referrals by user', async () => {
      const referrer = await createTestUserInDb()

      for (let i = 0; i < 10; i++) {
        const referred = await createTestUserInDb()
        await testPrisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: referred.id,
            rewardType: 'referrer_bonus',
            creditsAwarded: 10,
            status: 'completed',
            completedAt: new Date(),
          },
        })
      }

      const count = await testPrisma.referralReward.count({
        where: { userId: referrer.id },
      })

      expect(count).toBe(10)
    })

    it('groups rewards by status', async () => {
      const referrer = await createTestUserInDb()

      const statuses = ['pending', 'pending', 'completed', 'completed', 'completed']

      for (const status of statuses) {
        const referred = await createTestUserInDb()
        await testPrisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: referred.id,
            rewardType: 'referrer_bonus',
            creditsAwarded: 10,
            status,
            completedAt: status === 'completed' ? new Date() : null,
          },
        })
      }

      const pendingCount = await testPrisma.referralReward.count({
        where: { userId: referrer.id, status: 'pending' },
      })

      const completedCount = await testPrisma.referralReward.count({
        where: { userId: referrer.id, status: 'completed' },
      })

      expect(pendingCount).toBe(2)
      expect(completedCount).toBe(3)
    })

    it('retrieves referrals within date range', async () => {
      const referrer = await createTestUserInDb()
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const referred = await createTestUserInDb()
      await testPrisma.referralReward.create({
        data: {
          userId: referrer.id,
          referredUserId: referred.id,
          rewardType: 'referrer_bonus',
          creditsAwarded: 10,
          status: 'completed',
          completedAt: now,
          createdAt: now,
        },
      })

      const recentRewards = await testPrisma.referralReward.findMany({
        where: {
          userId: referrer.id,
          createdAt: { gte: oneWeekAgo },
        },
      })

      expect(recentRewards.length).toBeGreaterThanOrEqual(1)
    })
  })
})
