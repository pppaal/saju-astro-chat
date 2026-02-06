/**
 * Analytics and Metrics Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 활동 분석
 * - 서비스 사용 메트릭
 * - 피드백 분석
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  createTestSubscription,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: Analytics and Metrics', () => {
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

  describe('User Activity Metrics', () => {
    it('tracks daily active users', async () => {
      const users: { id: string }[] = []

      // Create multiple users
      for (let i = 0; i < 5; i++) {
        users.push(await createTestUserInDb())
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Create interactions for each user
      for (const user of users) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: 'login',
            context: {},
            createdAt: now,
          },
        })
      }

      const dailyActiveUsers = await testPrisma.userInteraction.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: today },
          interactionType: 'login',
        },
      })

      expect(dailyActiveUsers.length).toBe(5)
    })

    it('calculates user engagement score', async () => {
      const user = await createTestUserInDb()

      const interactions = ['page_view', 'page_view', 'reading_created', 'feature_use', 'share']

      for (const type of interactions) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: type,
            context: {},
          },
        })
      }

      const interactionCounts = await testPrisma.userInteraction.groupBy({
        by: ['interactionType'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const totalInteractions = interactionCounts.reduce((sum, item) => sum + item._count.id, 0)

      expect(totalInteractions).toBe(5)
    })

    it('tracks feature usage frequency', async () => {
      const user = await createTestUserInDb()

      const features = ['saju', 'tarot', 'saju', 'dream', 'saju', 'tarot']

      for (const feature of features) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: 'feature_use',
            context: { feature },
          },
        })
      }

      const interactions = await testPrisma.userInteraction.findMany({
        where: {
          userId: user.id,
          interactionType: 'feature_use',
        },
      })

      const featureCounts: Record<string, number> = {}
      for (const interaction of interactions) {
        const ctx = interaction.context as { feature?: string }
        const feature = ctx?.feature
        if (feature) {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1
        }
      }

      expect(featureCounts['saju']).toBe(3)
      expect(featureCounts['tarot']).toBe(2)
    })
  })

  describe('Service Usage Metrics', () => {
    it('counts readings by type', async () => {
      const user = await createTestUserInDb()

      const readingTypes = ['saju', 'saju', 'tarot', 'dream', 'saju', 'astrology']

      for (const type of readingTypes) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type,
            content: '{}',
          },
        })
      }

      const typeCounts = await testPrisma.reading.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const sajuCount = typeCounts.find((t) => t.type === 'saju')?._count.id
      expect(sajuCount).toBe(3)
    })

    it('calculates average readings per user', async () => {
      const users: { id: string }[] = []

      for (let i = 0; i < 3; i++) {
        users.push(await createTestUserInDb())
      }

      // User 1: 5 readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: { userId: users[0].id, type: 'saju', content: '{}' },
        })
      }

      // User 2: 3 readings
      for (let i = 0; i < 3; i++) {
        await testPrisma.reading.create({
          data: { userId: users[1].id, type: 'tarot', content: '{}' },
        })
      }

      // User 3: 2 readings
      for (let i = 0; i < 2; i++) {
        await testPrisma.reading.create({
          data: { userId: users[2].id, type: 'dream', content: '{}' },
        })
      }

      const userReadings = await testPrisma.reading.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((u) => u.id) } },
        _count: { id: true },
      })

      const totalReadings = userReadings.reduce((sum, u) => sum + u._count.id, 0)
      const avgReadings = totalReadings / users.length

      expect(avgReadings).toBeCloseTo(3.33, 1)
    })

    it('tracks credit utilization rate', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      // Use some credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 40 },
      })

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      const utilizationRate = ((credits?.usedCredits || 0) / (credits?.monthlyCredits || 1)) * 100

      expect(utilizationRate).toBe(50) // 40/80 = 50%
    })
  })

  describe('Subscription Metrics', () => {
    it('counts users by subscription plan', async () => {
      const plans = ['free', 'starter', 'pro', 'starter', 'premium', 'pro']

      for (const plan of plans) {
        const user = await createTestUserInDb()
        await createTestUserCredits(user.id, plan)
      }

      const planCounts = await testPrisma.userCredits.groupBy({
        by: ['plan'],
        _count: { userId: true },
      })

      const starterCount = planCounts.find((p) => p.plan === 'starter')?._count.userId
      const proCount = planCounts.find((p) => p.plan === 'pro')?._count.userId

      expect(starterCount).toBe(2)
      expect(proCount).toBe(2)
    })

    it('calculates subscription conversion rate', async () => {
      const users: { id: string }[] = []

      // 10 users total
      for (let i = 0; i < 10; i++) {
        users.push(await createTestUserInDb())
      }

      // 3 with paid subscriptions
      for (let i = 0; i < 3; i++) {
        await createTestSubscription(users[i].id, 'starter')
        await createTestUserCredits(users[i].id, 'starter')
      }

      // 7 free users
      for (let i = 3; i < 10; i++) {
        await createTestUserCredits(users[i].id, 'free')
      }

      const paidUsers = await testPrisma.subscription.count({
        where: {
          userId: { in: users.map((u) => u.id) },
          status: 'active',
        },
      })

      const conversionRate = (paidUsers / users.length) * 100
      expect(conversionRate).toBe(30)
    })

    it('tracks monthly recurring revenue proxy', async () => {
      const planPrices: Record<string, number> = {
        starter: 9900,
        pro: 19900,
        premium: 39900,
      }

      const users: { id: string }[] = []
      const plans = ['starter', 'starter', 'pro', 'premium']

      for (const plan of plans) {
        const user = await createTestUserInDb()
        users.push(user)
        await createTestSubscription(user.id, plan)
      }

      const subscriptions = await testPrisma.subscription.findMany({
        where: {
          userId: { in: users.map((u) => u.id) },
          status: 'active',
        },
      })

      const mrr = subscriptions.reduce((sum, sub) => sum + (planPrices[sub.plan] || 0), 0)

      expect(mrr).toBe(9900 + 9900 + 19900 + 39900) // 79,600
    })
  })

  describe('Feedback Analytics', () => {
    it('calculates average section rating', async () => {
      const user = await createTestUserInDb()

      const ratings = [5, 4, 5, 3, 4, 5]

      for (const rating of ratings) {
        await testPrisma.sectionFeedback.create({
          data: {
            userId: user.id,
            sectionId: 'career_section',
            feedbackType: 'rating',
            rating,
          },
        })
      }

      const feedbacks = await testPrisma.sectionFeedback.findMany({
        where: { sectionId: 'career_section' },
      })

      const avgRating = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length

      expect(avgRating).toBeCloseTo(4.33, 1)
    })

    it('analyzes feedback sentiment distribution', async () => {
      const user = await createTestUserInDb()

      const feedbackTypes = ['helpful', 'helpful', 'helpful', 'not_helpful', 'neutral']

      for (const feedbackType of feedbackTypes) {
        await testPrisma.sectionFeedback.create({
          data: {
            userId: user.id,
            sectionId: 'test_section',
            feedbackType,
          },
        })
      }

      const feedbackCounts = await testPrisma.sectionFeedback.groupBy({
        by: ['feedbackType'],
        where: { sectionId: 'test_section' },
        _count: { id: true },
      })

      const helpfulCount = feedbackCounts.find((f) => f.feedbackType === 'helpful')?._count.id

      expect(helpfulCount).toBe(3)
    })

    it('identifies most popular sections', async () => {
      const user = await createTestUserInDb()

      const sections = ['career', 'career', 'career', 'love', 'love', 'health']

      for (const sectionId of sections) {
        await testPrisma.sectionFeedback.create({
          data: {
            userId: user.id,
            sectionId,
            feedbackType: 'helpful',
          },
        })
      }

      const sectionCounts = await testPrisma.sectionFeedback.groupBy({
        by: ['sectionId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(sectionCounts[0].sectionId).toBe('career')
      expect(sectionCounts[0]._count.id).toBe(3)
    })
  })

  describe('Compatibility Analytics', () => {
    it('calculates average compatibility score', async () => {
      const user = await createTestUserInDb()

      const scores = [85, 72, 90, 65, 78]

      for (const score of scores) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            partnerData: { name: 'Partner' },
            result: { overallScore: score },
          },
        })
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      })

      const avgScore =
        results.reduce((sum, r) => {
          const result = r.result as { overallScore: number }
          return sum + result.overallScore
        }, 0) / results.length

      expect(avgScore).toBe(78)
    })

    it('tracks compatibility checks per user', async () => {
      const users: { id: string }[] = []

      for (let i = 0; i < 3; i++) {
        users.push(await createTestUserInDb())
      }

      // User 1: 5 checks
      for (let i = 0; i < 5; i++) {
        await testPrisma.compatibilityResult.create({
          data: { userId: users[0].id, partnerData: {}, result: {} },
        })
      }

      // User 2: 2 checks
      for (let i = 0; i < 2; i++) {
        await testPrisma.compatibilityResult.create({
          data: { userId: users[1].id, partnerData: {}, result: {} },
        })
      }

      const checkCounts = await testPrisma.compatibilityResult.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((u) => u.id) } },
        _count: { id: true },
      })

      const user1Count = checkCounts.find((c) => c.userId === users[0].id)?._count.id

      expect(user1Count).toBe(5)
    })
  })

  describe('Tarot Reading Analytics', () => {
    it('identifies most frequently drawn cards', async () => {
      const user = await createTestUserInDb()

      const cardSets = [
        ['the-fool', 'the-magician', 'the-star'],
        ['the-fool', 'the-tower', 'the-sun'],
        ['the-fool', 'the-empress', 'the-world'],
      ]

      for (const cards of cardSets) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: 'Test',
            spreadId: 'three-card',
            spreadTitle: 'Three Card',
            cards: cards.map((cardId) => ({ cardId, isReversed: false })),
          },
        })
      }

      const readings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
      })

      const cardCounts: Record<string, number> = {}

      for (const reading of readings) {
        const cards = reading.cards as { cardId: string }[]
        for (const card of cards) {
          cardCounts[card.cardId] = (cardCounts[card.cardId] || 0) + 1
        }
      }

      expect(cardCounts['the-fool']).toBe(3)
    })

    it('tracks spread type preferences', async () => {
      const user = await createTestUserInDb()

      const spreadIds = ['single', 'three-card', 'three-card', 'celtic-cross', 'three-card']

      for (const spreadId of spreadIds) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: 'Test',
            spreadId,
            spreadTitle: spreadId,
            cards: [],
          },
        })
      }

      const spreadCounts = await testPrisma.tarotReading.groupBy({
        by: ['spreadId'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const threeCardCount = spreadCounts.find((s) => s.spreadId === 'three-card')?._count.id

      expect(threeCardCount).toBe(3)
    })
  })

  describe('Time-based Analytics', () => {
    it('tracks readings by hour of day', async () => {
      const user = await createTestUserInDb()

      const now = new Date()

      // Create readings at different hours
      for (let hour = 9; hour <= 12; hour++) {
        const timestamp = new Date(now)
        timestamp.setHours(hour, 0, 0, 0)

        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: '{}',
            createdAt: timestamp,
          },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })

      expect(readings).toHaveLength(4)
    })

    it('identifies peak usage periods', async () => {
      const user = await createTestUserInDb()

      const now = new Date()

      // Morning interactions (3)
      for (let i = 0; i < 3; i++) {
        const time = new Date(now)
        time.setHours(9 + i, 0, 0, 0)
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: 'reading',
            context: { period: 'morning' },
            createdAt: time,
          },
        })
      }

      // Evening interactions (5)
      for (let i = 0; i < 5; i++) {
        const time = new Date(now)
        time.setHours(19 + (i % 4), 0, 0, 0)
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: 'reading',
            context: { period: 'evening' },
            createdAt: time,
          },
        })
      }

      const interactions = await testPrisma.userInteraction.findMany({
        where: { userId: user.id },
      })

      const eveningCount = interactions.filter((i) => {
        const ctx = i.context as { period?: string }
        return ctx?.period === 'evening'
      }).length

      expect(eveningCount).toBe(5)
    })
  })
})
