/**
 * User Streak Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 연속 접속 기록
 * - 스트릭 보상
 * - 스트릭 통계
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: User Streak', () => {
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

  describe('Streak Creation', () => {
    it('creates user streak record', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: new Date(),
          totalActiveDays: 1,
        },
      })

      expect(streak.currentStreak).toBe(1)
    })

    it('creates streak with type', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          streakType: 'daily_login',
          currentStreak: 5,
          longestStreak: 10,
          lastActiveDate: new Date(),
          totalActiveDays: 30,
        },
      })

      expect(streak.streakType).toBe('daily_login')
    })

    it('creates reading streak', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          streakType: 'daily_reading',
          currentStreak: 7,
          longestStreak: 7,
          lastActiveDate: new Date(),
          totalActiveDays: 7,
        },
      })

      expect(streak.streakType).toBe('daily_reading')
    })
  })

  describe('Streak Updates', () => {
    it('increments current streak', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 5,
          longestStreak: 10,
          lastActiveDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          totalActiveDays: 20,
        },
      })

      const updated = await testPrisma.userStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: { increment: 1 },
          totalActiveDays: { increment: 1 },
          lastActiveDate: new Date(),
        },
      })

      expect(updated.currentStreak).toBe(6)
      expect(updated.totalActiveDays).toBe(21)
    })

    it('updates longest streak', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 10,
          longestStreak: 10,
          lastActiveDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          totalActiveDays: 50,
        },
      })

      const updated = await testPrisma.userStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: 11,
          longestStreak: 11,
          lastActiveDate: new Date(),
        },
      })

      expect(updated.longestStreak).toBe(11)
    })

    it('resets streak after missed day', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 15,
          longestStreak: 15,
          lastActiveDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          totalActiveDays: 30,
        },
      })

      const updated = await testPrisma.userStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: 1,
          lastActiveDate: new Date(),
          totalActiveDays: { increment: 1 },
        },
      })

      expect(updated.currentStreak).toBe(1)
      expect(updated.longestStreak).toBe(15)
    })

    it('uses streak freeze', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 10,
          longestStreak: 10,
          lastActiveDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          freezesAvailable: 2,
          freezesUsed: 0,
        },
      })

      const updated = await testPrisma.userStreak.update({
        where: { id: streak.id },
        data: {
          freezesAvailable: { decrement: 1 },
          freezesUsed: { increment: 1 },
          lastFreezeUsedAt: new Date(),
        },
      })

      expect(updated.freezesAvailable).toBe(1)
      expect(updated.freezesUsed).toBe(1)
    })
  })

  describe('Streak Retrieval', () => {
    it('retrieves user streak', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 7,
          longestStreak: 14,
          lastActiveDate: new Date(),
          totalActiveDays: 30,
        },
      })

      const streak = await testPrisma.userStreak.findUnique({
        where: { userId: user.id },
      })

      expect(streak?.currentStreak).toBe(7)
    })

    it('retrieves active streaks', async () => {
      const now = new Date()

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        const lastActive = new Date(now)
        lastActive.setDate(lastActive.getDate() - (i > 2 ? 3 : 0))

        await testPrisma.userStreak.create({
          data: {
            userId: user.id,
            currentStreak: 5 + i,
            longestStreak: 10,
            lastActiveDate: lastActive,
            totalActiveDays: 20,
          },
        })
      }

      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      const activeStreaks = await testPrisma.userStreak.findMany({
        where: {
          lastActiveDate: { gte: yesterday },
        },
      })

      expect(activeStreaks).toHaveLength(3)
    })

    it('retrieves top streaks', async () => {
      const streakValues = [5, 15, 8, 20, 12]

      for (let i = 0; i < streakValues.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userStreak.create({
          data: {
            userId: user.id,
            currentStreak: streakValues[i],
            longestStreak: streakValues[i] + 5,
            lastActiveDate: new Date(),
            totalActiveDays: streakValues[i] * 2,
          },
        })
      }

      const topStreaks = await testPrisma.userStreak.findMany({
        orderBy: { currentStreak: 'desc' },
        take: 3,
      })

      expect(topStreaks[0].currentStreak).toBe(20)
      expect(topStreaks[1].currentStreak).toBe(15)
    })
  })

  describe('Streak Rewards', () => {
    it('records streak milestone reward', async () => {
      const user = await createTestUserInDb()

      const reward = await testPrisma.streakReward.create({
        data: {
          userId: user.id,
          streakMilestone: 7,
          rewardType: 'credits',
          rewardAmount: 100,
          claimedAt: new Date(),
        },
      })

      expect(reward.streakMilestone).toBe(7)
      expect(reward.rewardAmount).toBe(100)
    })

    it('records multiple milestone rewards', async () => {
      const user = await createTestUserInDb()
      const milestones = [7, 14, 30]

      for (const milestone of milestones) {
        await testPrisma.streakReward.create({
          data: {
            userId: user.id,
            streakMilestone: milestone,
            rewardType: 'credits',
            rewardAmount: milestone * 10,
            claimedAt: new Date(),
          },
        })
      }

      const rewards = await testPrisma.streakReward.findMany({
        where: { userId: user.id },
      })

      expect(rewards).toHaveLength(3)
    })

    it('checks unclaimed rewards', async () => {
      const user = await createTestUserInDb()

      await testPrisma.streakReward.create({
        data: {
          userId: user.id,
          streakMilestone: 7,
          rewardType: 'credits',
          rewardAmount: 100,
          claimedAt: new Date(),
        },
      })

      await testPrisma.streakReward.create({
        data: {
          userId: user.id,
          streakMilestone: 14,
          rewardType: 'credits',
          rewardAmount: 200,
          claimedAt: null,
        },
      })

      const unclaimed = await testPrisma.streakReward.findMany({
        where: { userId: user.id, claimedAt: null },
      })

      expect(unclaimed).toHaveLength(1)
    })
  })

  describe('Streak Statistics', () => {
    it('calculates average streak', async () => {
      const streakValues = [5, 10, 15, 10, 10] // avg = 10

      for (let i = 0; i < streakValues.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userStreak.create({
          data: {
            userId: user.id,
            currentStreak: streakValues[i],
            longestStreak: streakValues[i],
            lastActiveDate: new Date(),
            totalActiveDays: streakValues[i],
          },
        })
      }

      const streaks = await testPrisma.userStreak.findMany()
      const avgStreak = streaks.reduce((sum, s) => sum + s.currentStreak, 0) / streaks.length

      expect(avgStreak).toBe(10)
    })

    it('counts users by streak range', async () => {
      const streakValues = [3, 8, 15, 25, 5, 12, 35, 7, 2, 18]

      for (let i = 0; i < streakValues.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userStreak.create({
          data: {
            userId: user.id,
            currentStreak: streakValues[i],
            longestStreak: streakValues[i],
            lastActiveDate: new Date(),
            totalActiveDays: streakValues[i],
          },
        })
      }

      const under7 = await testPrisma.userStreak.count({
        where: { currentStreak: { lt: 7 } },
      })

      const between7and14 = await testPrisma.userStreak.count({
        where: { currentStreak: { gte: 7, lt: 14 } },
      })

      const over14 = await testPrisma.userStreak.count({
        where: { currentStreak: { gte: 14 } },
      })

      expect(under7).toBe(3)
      expect(between7and14).toBe(3)
      expect(over14).toBe(4)
    })

    it('finds streak leaders', async () => {
      const users: { id: string; streak: number }[] = []

      for (let i = 0; i < 10; i++) {
        const user = await createTestUserInDb()
        const streak = (i + 1) * 5
        users.push({ id: user.id, streak })

        await testPrisma.userStreak.create({
          data: {
            userId: user.id,
            currentStreak: streak,
            longestStreak: streak,
            lastActiveDate: new Date(),
            totalActiveDays: streak,
          },
        })
      }

      const leaders = await testPrisma.userStreak.findMany({
        orderBy: { currentStreak: 'desc' },
        take: 3,
        include: { user: true },
      })

      expect(leaders[0].currentStreak).toBe(50)
      expect(leaders).toHaveLength(3)
    })
  })

  describe('Streak History', () => {
    it('records streak history', async () => {
      const user = await createTestUserInDb()

      const history = await testPrisma.streakHistory.create({
        data: {
          userId: user.id,
          streakLength: 14,
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          endReason: 'missed_day',
        },
      })

      expect(history.streakLength).toBe(14)
      expect(history.endReason).toBe('missed_day')
    })

    it('retrieves user streak history', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 5; i++) {
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - (i + 1) * 20)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7 + i)

        await testPrisma.streakHistory.create({
          data: {
            userId: user.id,
            streakLength: 7 + i,
            startDate,
            endDate,
            endReason: 'missed_day',
          },
        })
      }

      const history = await testPrisma.streakHistory.findMany({
        where: { userId: user.id },
        orderBy: { endDate: 'desc' },
      })

      expect(history).toHaveLength(5)
    })

    it('finds longest historical streak', async () => {
      const user = await createTestUserInDb()
      const streakLengths = [7, 14, 30, 10, 21]

      for (let i = 0; i < streakLengths.length; i++) {
        await testPrisma.streakHistory.create({
          data: {
            userId: user.id,
            streakLength: streakLengths[i],
            startDate: new Date(Date.now() - (i + 1) * 50 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - i * 50 * 24 * 60 * 60 * 1000),
            endReason: 'missed_day',
          },
        })
      }

      const longest = await testPrisma.streakHistory.findFirst({
        where: { userId: user.id },
        orderBy: { streakLength: 'desc' },
      })

      expect(longest?.streakLength).toBe(30)
    })
  })

  describe('Streak Deletion', () => {
    it('deletes streak', async () => {
      const user = await createTestUserInDb()

      const streak = await testPrisma.userStreak.create({
        data: {
          userId: user.id,
          currentStreak: 5,
          longestStreak: 10,
          lastActiveDate: new Date(),
          totalActiveDays: 20,
        },
      })

      await testPrisma.userStreak.delete({
        where: { id: streak.id },
      })

      const found = await testPrisma.userStreak.findUnique({
        where: { id: streak.id },
      })

      expect(found).toBeNull()
    })
  })
})
