/**
 * Reading History Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 리딩 기록 저장 및 조회
 * - 리딩 유형별 관리
 * - 리딩 통계 및 분석
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

describe('Integration: Reading History', () => {
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

  describe('Reading Creation', () => {
    it('creates saju reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: JSON.stringify({
            birthDate: '1990-05-15',
            birthTime: '14:30',
            fourPillars: {
              year: { stem: '庚', branch: '午' },
              month: { stem: '辛', branch: '巳' },
              day: { stem: '甲', branch: '子' },
              hour: { stem: '辛', branch: '未' },
            },
            interpretation: '강한 금의 기운...',
          }),
        },
      })

      expect(reading.type).toBe('saju')
      const content = JSON.parse(reading.content as string)
      expect(content.fourPillars).toBeDefined()
    })

    it('creates tarot reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'tarot',
          content: JSON.stringify({
            spread: 'celtic_cross',
            question: '연애 운세',
            cards: [
              { position: 1, card: 'The Lovers', reversed: false },
              { position: 2, card: 'The Tower', reversed: true },
              { position: 3, card: 'The Star', reversed: false },
            ],
            interpretation: '사랑의 에너지가 강하게 느껴집니다...',
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.cards).toHaveLength(3)
    })

    it('creates astrology reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({
            sunSign: 'Taurus',
            moonSign: 'Cancer',
            ascendant: 'Leo',
            planets: {
              mercury: { sign: 'Gemini', house: 11 },
              venus: { sign: 'Taurus', house: 10 },
              mars: { sign: 'Aries', house: 9 },
            },
            interpretation: '태양이 황소자리에 위치하여...',
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.sunSign).toBe('Taurus')
    })

    it('creates numerology reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            birthDate: '1990-05-15',
            lifePath: 3,
            expression: 7,
            soulUrge: 5,
            personality: 2,
            interpretation: '생명수 3은 창의성과 표현력을...',
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.lifePath).toBe(3)
    })
  })

  describe('Reading Retrieval', () => {
    it('retrieves all readings for user', async () => {
      const user = await createTestUserInDb()

      const types = ['saju', 'tarot', 'astrology', 'numerology', 'iching']

      for (const type of types) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type,
            content: JSON.stringify({ type }),
          },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })

      expect(readings).toHaveLength(5)
    })

    it('retrieves readings by type', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'tarot',
            content: JSON.stringify({ index: i }),
          },
        })
      }

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: '{}',
        },
      })

      const tarotReadings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'tarot' },
      })

      expect(tarotReadings).toHaveLength(3)
    })

    it('retrieves readings in chronological order', async () => {
      const user = await createTestUserInDb()

      for (let i = 1; i <= 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: JSON.stringify({ order: i }),
          },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      const orders = readings.map((r) => JSON.parse(r.content as string).order)
      expect(orders).toEqual([5, 4, 3, 2, 1])
    })

    it('retrieves latest reading of each type', async () => {
      const user = await createTestUserInDb()

      const types = ['saju', 'tarot', 'saju', 'astrology', 'tarot']

      for (const type of types) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type,
            content: JSON.stringify({ type }),
          },
        })
      }

      const latestReadings: Record<string, unknown> = {}

      for (const type of ['saju', 'tarot', 'astrology']) {
        const reading = await testPrisma.reading.findFirst({
          where: { userId: user.id, type },
          orderBy: { createdAt: 'desc' },
        })
        if (reading) {
          latestReadings[type] = reading
        }
      }

      expect(Object.keys(latestReadings)).toHaveLength(3)
    })
  })

  describe('Reading Filtering', () => {
    it('filters readings by date range', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Create readings with different dates
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: JSON.stringify({ dayOffset: i }),
            createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          },
        })
      }

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      const recentReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: threeDaysAgo },
        },
      })

      expect(recentReadings.length).toBeGreaterThanOrEqual(3)
    })

    it('paginates reading results', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 15; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: JSON.stringify({ page: Math.floor(i / 5) + 1 }),
          },
        })
      }

      const page1 = await testPrisma.reading.findMany({
        where: { userId: user.id },
        take: 5,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      })

      const page2 = await testPrisma.reading.findMany({
        where: { userId: user.id },
        take: 5,
        skip: 5,
        orderBy: { createdAt: 'desc' },
      })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
      expect(page1[0].id).not.toBe(page2[0].id)
    })
  })

  describe('Reading Statistics', () => {
    it('counts readings by type', async () => {
      const user = await createTestUserInDb()

      const typeCounts = { saju: 5, tarot: 3, astrology: 2 }

      for (const [type, count] of Object.entries(typeCounts)) {
        for (let i = 0; i < count; i++) {
          await testPrisma.reading.create({
            data: {
              userId: user.id,
              type,
              content: '{}',
            },
          })
        }
      }

      const counts = await testPrisma.reading.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const sajuCount = counts.find((c) => c.type === 'saju')?._count.id
      expect(sajuCount).toBe(5)
    })

    it('calculates reading frequency', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // 7 readings in the past week
      for (let i = 0; i < 7; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: '{}',
            createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          },
        })
      }

      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const weeklyReadings = await testPrisma.reading.count({
        where: {
          userId: user.id,
          createdAt: { gte: weekAgo },
        },
      })

      expect(weeklyReadings).toBe(7)
    })
  })

  describe('Reading Updates', () => {
    it('adds notes to existing reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'tarot',
          content: JSON.stringify({
            cards: ['The Fool'],
            interpretation: '새로운 시작',
          }),
        },
      })

      const originalContent = JSON.parse(reading.content as string)

      const updated = await testPrisma.reading.update({
        where: { id: reading.id },
        data: {
          content: JSON.stringify({
            ...originalContent,
            userNotes: '정말 도움이 되었습니다',
            rating: 5,
          }),
        },
      })

      const newContent = JSON.parse(updated.content as string)
      expect(newContent.userNotes).toBe('정말 도움이 되었습니다')
    })

    it('marks reading as favorite', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: JSON.stringify({ favorite: false }),
        },
      })

      const originalContent = JSON.parse(reading.content as string)

      await testPrisma.reading.update({
        where: { id: reading.id },
        data: {
          content: JSON.stringify({ ...originalContent, favorite: true }),
        },
      })

      const updated = await testPrisma.reading.findUnique({
        where: { id: reading.id },
      })

      const content = JSON.parse(updated!.content as string)
      expect(content.favorite).toBe(true)
    })
  })

  describe('Reading Deletion', () => {
    it('deletes single reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'tarot',
          content: '{}',
        },
      })

      await testPrisma.reading.delete({
        where: { id: reading.id },
      })

      const found = await testPrisma.reading.findUnique({
        where: { id: reading.id },
      })

      expect(found).toBeNull()
    })

    it('deletes old readings for cleanup', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Create old and new readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: '{}',
            createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
          },
        })
      }

      for (let i = 0; i < 3; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'saju',
            content: '{}',
            createdAt: now,
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.reading.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(3)
    })
  })

  describe('Reading Search', () => {
    it('searches readings by content keyword', async () => {
      const user = await createTestUserInDb()

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'tarot',
          content: JSON.stringify({
            question: '연애 운세가 궁금합니다',
            interpretation: '사랑에 대한 긍정적인 기운',
          }),
        },
      })

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: JSON.stringify({
            question: '직장 운세',
            interpretation: '커리어 발전',
          }),
        },
      })

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })

      const loveReadings = readings.filter((r) => {
        const content = JSON.parse(r.content as string)
        return content.question?.includes('연애') || content.interpretation?.includes('사랑')
      })

      expect(loveReadings).toHaveLength(1)
    })
  })
})
