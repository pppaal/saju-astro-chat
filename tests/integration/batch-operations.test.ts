/**
 * Batch Operations Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 대량 데이터 삽입/수정/삭제
 * - 배치 처리 성능
 * - 그룹화 및 집계 연산
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

describe('Integration: Batch Operations', () => {
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

  describe('Bulk Create', () => {
    it('creates multiple readings in batch', async () => {
      const user = await createTestUserInDb()

      const readingsData = Array.from({ length: 20 }, (_, i) => ({
        userId: user.id,
        type: i % 2 === 0 ? 'saju' : 'tarot',
        content: JSON.stringify({ index: i }),
      }))

      // Prisma doesn't have createMany for SQLite, use transaction
      await testPrisma.$transaction(readingsData.map((data) => testPrisma.reading.create({ data })))

      const count = await testPrisma.reading.count({
        where: { userId: user.id },
      })

      expect(count).toBe(20)
    })

    it('creates multiple users with related data', async () => {
      const userCount = 10
      const createdUsers: string[] = []

      for (let i = 0; i < userCount; i++) {
        const user = await createTestUserInDb()
        createdUsers.push(user.id)
        await createTestUserCredits(user.id, 'free')
      }

      const users = await testPrisma.user.findMany({
        where: { id: { in: createdUsers } },
      })

      const credits = await testPrisma.userCredits.findMany({
        where: { userId: { in: createdUsers } },
      })

      expect(users).toHaveLength(userCount)
      expect(credits).toHaveLength(userCount)
    })

    it('creates fortune data for multiple days', async () => {
      const user = await createTestUserInDb()

      const fortuneData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return {
          userId: user.id,
          date: date.toISOString().split('T')[0],
          loveScore: 70 + (i % 20),
          careerScore: 65 + (i % 25),
          wealthScore: 60 + (i % 30),
          healthScore: 75 + (i % 15),
          overallScore: 70 + (i % 20),
        }
      })

      await testPrisma.$transaction(
        fortuneData.map((data) => testPrisma.dailyFortune.create({ data }))
      )

      const count = await testPrisma.dailyFortune.count({
        where: { userId: user.id },
      })

      expect(count).toBe(30)
    })
  })

  describe('Bulk Update', () => {
    it('updates multiple readings at once', async () => {
      const user = await createTestUserInDb()

      // Create readings
      for (let i = 0; i < 10; i++) {
        await testPrisma.reading.create({
          data: { userId: user.id, type: 'old_type', content: '{}' },
        })
      }

      // Bulk update
      const result = await testPrisma.reading.updateMany({
        where: { userId: user.id, type: 'old_type' },
        data: { type: 'new_type' },
      })

      expect(result.count).toBe(10)

      const updated = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'new_type' },
      })

      expect(updated).toHaveLength(10)
    })

    it('resets all user credits at period end', async () => {
      const users: string[] = []

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)
        await createTestUserCredits(user.id, 'starter')

        // Simulate used credits
        await testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: 10 + i },
        })
      }

      // Reset all credits
      const result = await testPrisma.userCredits.updateMany({
        where: { userId: { in: users } },
        data: { usedCredits: 0 },
      })

      expect(result.count).toBe(5)

      const credits = await testPrisma.userCredits.findMany({
        where: { userId: { in: users } },
      })

      expect(credits.every((c) => c.usedCredits === 0)).toBe(true)
    })

    it('marks all messages as read in conversation', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: 'User1',
          birthDate: '1990-01-01',
          gender: 'male',
          lookingFor: 'female',
          isActive: true,
          lastActive: new Date(),
        },
      })

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: 'User2',
          birthDate: '1992-05-15',
          gender: 'female',
          lookingFor: 'male',
          isActive: true,
          lastActive: new Date(),
        },
      })

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: 'active',
          matchedAt: new Date(),
        },
      })

      // Create unread messages
      for (let i = 0; i < 10; i++) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: user1.id,
            content: `Message ${i}`,
            isRead: false,
          },
        })
      }

      // Mark all as read
      const result = await testPrisma.matchMessage.updateMany({
        where: { connectionId: connection.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })

      expect(result.count).toBe(10)
    })
  })

  describe('Bulk Delete', () => {
    it('deletes multiple old readings', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const oldDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      // Create old readings
      for (let i = 0; i < 15; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'old',
            content: '{}',
            createdAt: oldDate,
          },
        })
      }

      // Create recent readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'recent',
            content: '{}',
            createdAt: now,
          },
        })
      }

      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const result = await testPrisma.reading.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: cutoff },
        },
      })

      expect(result.count).toBe(15)

      const remaining = await testPrisma.reading.count({
        where: { userId: user.id },
      })

      expect(remaining).toBe(5)
    })

    it('clears expired shared results', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const expired = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const valid = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Create expired shares
      for (let i = 0; i < 10; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'expired',
            shareCode: `expired_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: expired,
          },
        })
      }

      // Create valid shares
      for (let i = 0; i < 3; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'valid',
            shareCode: `valid_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: valid,
          },
        })
      }

      const result = await testPrisma.sharedResult.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: now },
        },
      })

      expect(result.count).toBe(10)

      const remaining = await testPrisma.sharedResult.count({
        where: { userId: user.id },
      })

      expect(remaining).toBe(3)
    })
  })

  describe('Aggregation Operations', () => {
    it('counts readings by type', async () => {
      const user = await createTestUserInDb()

      const types = ['saju', 'saju', 'saju', 'tarot', 'tarot', 'dream']

      for (const type of types) {
        await testPrisma.reading.create({
          data: { userId: user.id, type, content: '{}' },
        })
      }

      const counts = await testPrisma.reading.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const sajuCount = counts.find((c) => c.type === 'saju')?._count.id
      const tarotCount = counts.find((c) => c.type === 'tarot')?._count.id

      expect(sajuCount).toBe(3)
      expect(tarotCount).toBe(2)
    })

    it('calculates average fortune scores', async () => {
      const user = await createTestUserInDb()

      const scores = [70, 80, 90, 75, 85]

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: `2024-06-${String(i + 1).padStart(2, '0')}`,
            loveScore: scores[i],
            careerScore: scores[i],
            wealthScore: scores[i],
            healthScore: scores[i],
            overallScore: scores[i],
          },
        })
      }

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      })

      const avg = fortunes.reduce((sum, f) => sum + f.overallScore, 0) / fortunes.length

      expect(avg).toBe(80)
    })

    it('finds min and max scores', async () => {
      const user = await createTestUserInDb()

      const scores = [55, 70, 95, 60, 85]

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: `2024-06-${String(i + 1).padStart(2, '0')}`,
            loveScore: scores[i],
            careerScore: scores[i],
            wealthScore: scores[i],
            healthScore: scores[i],
            overallScore: scores[i],
          },
        })
      }

      const maxFortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id },
        orderBy: { overallScore: 'desc' },
      })

      const minFortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id },
        orderBy: { overallScore: 'asc' },
      })

      expect(maxFortune?.overallScore).toBe(95)
      expect(minFortune?.overallScore).toBe(55)
    })

    it('groups interactions by type', async () => {
      const user = await createTestUserInDb()

      const interactions = [
        'page_view',
        'page_view',
        'page_view',
        'button_click',
        'button_click',
        'reading_created',
      ]

      for (const type of interactions) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: type,
            context: {},
          },
        })
      }

      const grouped = await testPrisma.userInteraction.groupBy({
        by: ['interactionType'],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(grouped[0].interactionType).toBe('page_view')
      expect(grouped[0]._count.id).toBe(3)
    })
  })

  describe('Transaction Batching', () => {
    it('executes multiple operations in single transaction', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      const result = await testPrisma.$transaction([
        testPrisma.reading.create({
          data: { userId: user.id, type: 'batch1', content: '{}' },
        }),
        testPrisma.reading.create({
          data: { userId: user.id, type: 'batch2', content: '{}' },
        }),
        testPrisma.reading.create({
          data: { userId: user.id, type: 'batch3', content: '{}' },
        }),
        testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 3 } },
        }),
      ])

      expect(result).toHaveLength(4)

      const readingCount = await testPrisma.reading.count({
        where: { userId: user.id },
      })
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(readingCount).toBe(3)
      expect(credits?.usedCredits).toBe(3)
    })

    it('rolls back batch on any failure', async () => {
      const user = await createTestUserInDb()

      const initialCount = await testPrisma.reading.count({
        where: { userId: user.id },
      })

      try {
        await testPrisma.$transaction([
          testPrisma.reading.create({
            data: { userId: user.id, type: 'will_rollback', content: '{}' },
          }),
          testPrisma.reading.create({
            data: { userId: 'non_existent', type: 'fail', content: '{}' },
          }),
        ])
      } catch {
        // Expected
      }

      const finalCount = await testPrisma.reading.count({
        where: { userId: user.id },
      })

      expect(finalCount).toBe(initialCount)
    })
  })
})
