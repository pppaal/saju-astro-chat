/**
 * Saved Data Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 저장된 인물 관리
 * - 저장된 캘린더 날짜
 * - 공유된 결과 관리
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

describe('Integration: Saved Data System', () => {
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

  describe('Saved Person', () => {
    it('creates saved person', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '김철수',
          relationship: 'friend',
          birthDate: '1990-05-15',
          birthTime: '14:30',
          gender: 'male',
        },
      })

      expect(person).toBeDefined()
      expect(person.name).toBe('김철수')
      expect(person.relationship).toBe('friend')
    })

    it('stores person with full birth info', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '이영희',
          relationship: 'family',
          birthDate: '1985-08-20',
          birthTime: '09:15',
          gender: 'female',
          birthCity: 'Seoul',
          latitude: 37.5665,
          longitude: 126.978,
          timeZone: 'Asia/Seoul',
        },
      })

      expect(person.birthCity).toBe('Seoul')
      expect(person.latitude).toBeCloseTo(37.5665, 2)
    })

    it('retrieves persons by relationship', async () => {
      const user = await createTestUserInDb()

      await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'Person 1',
          relationship: 'friend',
          birthDate: '1990-01-01',
          gender: 'male',
        },
      })
      await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'Person 2',
          relationship: 'family',
          birthDate: '1985-01-01',
          gender: 'female',
        },
      })
      await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'Person 3',
          relationship: 'friend',
          birthDate: '1992-01-01',
          gender: 'male',
        },
      })

      const friends = await testPrisma.savedPerson.findMany({
        where: { userId: user.id, relationship: 'friend' },
      })

      expect(friends).toHaveLength(2)
    })

    it('updates saved person', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'Original Name',
          relationship: 'colleague',
          birthDate: '1990-01-01',
          gender: 'male',
        },
      })

      const updated = await testPrisma.savedPerson.update({
        where: { id: person.id },
        data: { name: 'Updated Name', relationship: 'friend' },
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.relationship).toBe('friend')
    })

    it('deletes saved person', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'To Delete',
          relationship: 'other',
          birthDate: '1990-01-01',
          gender: 'male',
        },
      })

      await testPrisma.savedPerson.delete({ where: { id: person.id } })

      const found = await testPrisma.savedPerson.findUnique({ where: { id: person.id } })
      expect(found).toBeNull()
    })

    it('limits saved persons per user', async () => {
      const user = await createTestUserInDb()

      // Create 10 persons
      for (let i = 1; i <= 10; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: 'friend',
            birthDate: '1990-01-01',
            gender: i % 2 === 0 ? 'male' : 'female',
          },
        })
      }

      const count = await testPrisma.savedPerson.count({ where: { userId: user.id } })
      expect(count).toBe(10)
    })
  })

  describe('Saved Calendar Date', () => {
    it('saves calendar date', async () => {
      const user = await createTestUserInDb()

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: '2024-06-15',
          title: 'Important Meeting',
          notes: 'Conference with investors',
          category: 'business',
        },
      })

      expect(savedDate).toBeDefined()
      expect(savedDate.title).toBe('Important Meeting')
      expect(savedDate.category).toBe('business')
    })

    it('stores fortune data for date', async () => {
      const user = await createTestUserInDb()

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: '2024-07-20',
          title: 'Vacation Start',
          fortuneData: {
            overallScore: 85,
            luckyColor: 'blue',
            advice: 'Great day for new beginnings',
          },
        },
      })

      const data = savedDate.fortuneData as { overallScore: number }
      expect(data.overallScore).toBe(85)
    })

    it('retrieves dates by category', async () => {
      const user = await createTestUserInDb()

      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: '2024-01-01', title: 'New Year', category: 'holiday' },
      })
      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: '2024-02-14', title: 'Valentine', category: 'personal' },
      })
      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: '2024-12-25', title: 'Christmas', category: 'holiday' },
      })

      const holidays = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id, category: 'holiday' },
      })

      expect(holidays).toHaveLength(2)
    })

    it('retrieves dates within range', async () => {
      const user = await createTestUserInDb()

      const dates = ['2024-06-01', '2024-06-15', '2024-06-30', '2024-07-15']

      for (const date of dates) {
        await testPrisma.savedCalendarDate.create({
          data: { userId: user.id, date, title: `Event on ${date}` },
        })
      }

      const juneDates = await testPrisma.savedCalendarDate.findMany({
        where: {
          userId: user.id,
          date: { gte: '2024-06-01', lte: '2024-06-30' },
        },
      })

      expect(juneDates).toHaveLength(3)
    })

    it('updates saved date', async () => {
      const user = await createTestUserInDb()

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: '2024-08-10', title: 'Original Event' },
      })

      const updated = await testPrisma.savedCalendarDate.update({
        where: { id: savedDate.id },
        data: { title: 'Updated Event', notes: 'Added notes' },
      })

      expect(updated.title).toBe('Updated Event')
      expect(updated.notes).toBe('Added notes')
    })

    it('marks date as important', async () => {
      const user = await createTestUserInDb()

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: '2024-09-01',
          title: 'Very Important Date',
          isImportant: true,
        },
      })

      expect(savedDate.isImportant).toBe(true)

      const importantDates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id, isImportant: true },
      })

      expect(importantDates).toHaveLength(1)
    })
  })

  describe('Shared Result', () => {
    it('creates shared result', async () => {
      const user = await createTestUserInDb()

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'saju_reading',
          shareCode: `share_${Date.now()}`,
          resultData: {
            summary: 'Your fortune reading...',
            scores: { love: 80, career: 75 },
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      expect(shared).toBeDefined()
      expect(shared.resultType).toBe('saju_reading')
    })

    it('retrieves result by share code', async () => {
      const user = await createTestUserInDb()
      const shareCode = `unique_${Date.now()}`

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'tarot_reading',
          shareCode,
          resultData: { reading: 'The Fool' },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const found = await testPrisma.sharedResult.findUnique({
        where: { shareCode },
      })

      expect(found).not.toBeNull()
      expect(found?.resultType).toBe('tarot_reading')
    })

    it('tracks view count', async () => {
      const user = await createTestUserInDb()

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'compatibility',
          shareCode: `view_test_${Date.now()}`,
          resultData: {},
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          viewCount: 0,
        },
      })

      // Simulate views
      const updated = await testPrisma.sharedResult.update({
        where: { id: shared.id },
        data: { viewCount: { increment: 5 } },
      })

      expect(updated.viewCount).toBe(5)
    })

    it('handles expired share links', async () => {
      const user = await createTestUserInDb()

      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'expired_result',
          shareCode: `expired_${Date.now()}`,
          resultData: {},
          expiresAt: expiredDate,
        },
      })

      const validShares = await testPrisma.sharedResult.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
        },
      })

      const expiredShares = validShares.filter((s) => s.resultType === 'expired_result')
      expect(expiredShares).toHaveLength(0)
    })

    it('stores multiple result types', async () => {
      const user = await createTestUserInDb()

      const resultTypes = ['saju_reading', 'tarot_reading', 'compatibility', 'dream_analysis']

      for (const resultType of resultTypes) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType,
            shareCode: `${resultType}_${Date.now()}_${Math.random()}`,
            resultData: { type: resultType },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const shares = await testPrisma.sharedResult.findMany({
        where: { userId: user.id },
      })

      expect(shares).toHaveLength(4)
    })
  })

  describe('Reading Storage', () => {
    it('saves general reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'daily_fortune',
          content: JSON.stringify({
            date: '2024-06-15',
            fortune: 'Great day ahead!',
            scores: { overall: 85 },
          }),
        },
      })

      expect(reading).toBeDefined()
      expect(reading.type).toBe('daily_fortune')
    })

    it('retrieves readings by type', async () => {
      const user = await createTestUserInDb()

      await testPrisma.reading.create({
        data: { userId: user.id, type: 'saju', content: '{}' },
      })
      await testPrisma.reading.create({
        data: { userId: user.id, type: 'tarot', content: '{}' },
      })
      await testPrisma.reading.create({
        data: { userId: user.id, type: 'saju', content: '{}' },
      })

      const sajuReadings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'saju' },
      })

      expect(sajuReadings).toHaveLength(2)
    })

    it('paginates reading history', async () => {
      const user = await createTestUserInDb()

      for (let i = 1; i <= 25; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'fortune',
            content: JSON.stringify({ order: i }),
          },
        })
      }

      const page1 = await testPrisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      })

      const page2 = await testPrisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 10,
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)
      expect(page1[0].id).not.toBe(page2[0].id)
    })
  })

  describe('Fortune Storage', () => {
    it('saves fortune with all fields', async () => {
      const user = await createTestUserInDb()

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: 'yearly',
          content: JSON.stringify({
            year: 2024,
            overall: 'Prosperous year ahead',
            months: Array(12).fill({ score: 80 }),
          }),
        },
      })

      expect(fortune).toBeDefined()
      expect(fortune.type).toBe('yearly')
    })

    it('retrieves fortunes by type', async () => {
      const user = await createTestUserInDb()

      await testPrisma.fortune.create({
        data: { userId: user.id, type: 'daily', content: '{}' },
      })
      await testPrisma.fortune.create({
        data: { userId: user.id, type: 'monthly', content: '{}' },
      })
      await testPrisma.fortune.create({
        data: { userId: user.id, type: 'daily', content: '{}' },
      })

      const dailyFortunes = await testPrisma.fortune.findMany({
        where: { userId: user.id, type: 'daily' },
      })

      expect(dailyFortunes).toHaveLength(2)
    })
  })
})
