/**
 * Astrology Analysis Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 별자리 분석 저장 및 조회
 * - 행성 위치 데이터 저장
 * - 운세 예측 관리
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

describe('Integration: Astrology Analysis System', () => {
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

  describe('Astrology Reading Creation', () => {
    it('creates a basic astrology reading', async () => {
      const user = await createTestUserInDb({
        birthDate: '1990-05-15',
        birthTime: '14:30',
      })

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({
            sunSign: 'Taurus',
            moonSign: 'Cancer',
            risingSign: 'Virgo',
            birthChart: {
              sun: { sign: 'Taurus', degree: 24, house: 9 },
              moon: { sign: 'Cancer', degree: 15, house: 11 },
              mercury: { sign: 'Gemini', degree: 8, house: 10 },
              venus: { sign: 'Aries', degree: 12, house: 8 },
              mars: { sign: 'Pisces', degree: 3, house: 7 },
            },
          }),
        },
      })

      expect(reading).toBeDefined()
      expect(reading.userId).toBe(user.id)
      expect(reading.type).toBe('astrology')

      const content = JSON.parse(reading.content as string)
      expect(content.sunSign).toBe('Taurus')
      expect(content.moonSign).toBe('Cancer')
    })

    it('stores complete birth chart data', async () => {
      const user = await createTestUserInDb()

      const planets = [
        'sun',
        'moon',
        'mercury',
        'venus',
        'mars',
        'jupiter',
        'saturn',
        'uranus',
        'neptune',
        'pluto',
      ]

      const birthChart: Record<string, { sign: string; degree: number; house: number }> = {}
      planets.forEach((planet, i) => {
        birthChart[planet] = {
          sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo'][i % 5],
          degree: (i * 30) % 360,
          house: (i % 12) + 1,
        }
      })

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({ birthChart }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(Object.keys(content.birthChart)).toHaveLength(10)
      expect(content.birthChart.sun).toBeDefined()
      expect(content.birthChart.pluto).toBeDefined()
    })

    it('handles aspects between planets', async () => {
      const user = await createTestUserInDb()

      const aspects = [
        { planet1: 'sun', planet2: 'moon', type: 'trine', orb: 2.5 },
        { planet1: 'venus', planet2: 'mars', type: 'conjunction', orb: 3.1 },
        { planet1: 'jupiter', planet2: 'saturn', type: 'square', orb: 4.0 },
      ]

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({
            sunSign: 'Leo',
            aspects,
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.aspects).toHaveLength(3)
      expect(content.aspects[0].type).toBe('trine')
    })
  })

  describe('Daily Fortune', () => {
    it('creates daily fortune entry', async () => {
      const user = await createTestUserInDb()
      const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"

      const fortune = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 7,
          careerScore: 9,
          wealthScore: 8,
          healthScore: 6,
          overallScore: 8,
          luckyColor: 'blue',
          luckyNumber: 7,
        },
      })

      expect(fortune).toBeDefined()
      expect(fortune.userId).toBe(user.id)
      expect(fortune.date).toBe(today)
      expect(fortune.overallScore).toBe(8)
    })

    it('retrieves fortune for specific date', async () => {
      const user = await createTestUserInDb()
      const targetDate = '2024-06-15'

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: targetDate,
          loveScore: 8,
          careerScore: 7,
          wealthScore: 6,
          healthScore: 9,
          overallScore: 75,
        },
      })

      const fortune = await testPrisma.dailyFortune.findFirst({
        where: {
          userId: user.id,
          date: targetDate,
        },
      })

      expect(fortune).not.toBeNull()
      expect(fortune!.loveScore).toBe(8)
    })

    it('handles multiple days of fortunes', async () => {
      const user = await createTestUserInDb()

      // Create fortunes for a week
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: dateStr,
            loveScore: 5 + i,
            careerScore: 6 + i,
            wealthScore: 7,
            healthScore: 8,
            overallScore: 70 + i,
          },
        })
      }

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
      })

      expect(fortunes).toHaveLength(7)
    })

    it('prevents duplicate fortune for same date', async () => {
      const user = await createTestUserInDb()
      const today = new Date().toISOString().split('T')[0]

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 5,
          careerScore: 6,
          wealthScore: 7,
          healthScore: 8,
          overallScore: 65,
        },
      })

      // Second fortune for same date should use upsert
      const upserted = await testPrisma.dailyFortune.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          },
        },
        create: {
          userId: user.id,
          date: today,
          loveScore: 9,
          careerScore: 9,
          wealthScore: 9,
          healthScore: 9,
          overallScore: 90,
        },
        update: {
          overallScore: 95,
        },
      })

      expect(upserted.overallScore).toBe(95)

      // Should still only have one fortune for today
      const count = await testPrisma.dailyFortune.count({
        where: { userId: user.id, date: today },
      })
      expect(count).toBe(1)
    })
  })

  describe('Destiny Snapshot', () => {
    it('creates destiny snapshot', async () => {
      const user = await createTestUserInDb()

      const snapshot = await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-15',
          data: {
            period: '2024-06',
            overall: 'Transformation period',
            keyDates: ['2024-06-05', '2024-06-21'],
            advice: 'Focus on personal growth',
          },
        },
      })

      expect(snapshot).toBeDefined()
      expect(snapshot.targetDate).toBe('2024-06-15')
    })

    it('stores different snapshot target dates', async () => {
      const user = await createTestUserInDb()

      const dates = ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01']

      for (const targetDate of dates) {
        await testPrisma.destinySnapshot.create({
          data: {
            userId: user.id,
            targetDate,
            data: { targetDate, message: `Snapshot for ${targetDate}` },
          },
        })
      }

      const snapshots = await testPrisma.destinySnapshot.findMany({
        where: { userId: user.id },
      })

      expect(snapshots).toHaveLength(4)
    })

    it('retrieves latest snapshot', async () => {
      const user = await createTestUserInDb()

      // Create multiple snapshots
      for (let i = 0; i < 3; i++) {
        const targetDate = `2024-0${i + 1}-15`
        await testPrisma.destinySnapshot.create({
          data: {
            userId: user.id,
            targetDate,
            data: { month: i + 1 },
          },
        })
      }

      const latest = await testPrisma.destinySnapshot.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      const data = latest!.data as { month: number }
      expect(data.month).toBe(3)
    })
  })

  describe('Astrology with Credits', () => {
    it('consumes credit for astrology reading', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      const result = await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        })

        const remaining =
          (credits?.monthlyCredits || 0) -
          (credits?.usedCredits || 0) +
          (credits?.bonusCredits || 0)

        if (remaining <= 0) {
          return { success: false, reason: 'No credits' }
        }

        await tx.reading.create({
          data: {
            userId: user.id,
            type: 'astrology',
            content: JSON.stringify({ sunSign: 'Gemini' }),
          },
        })

        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        })

        return { success: true }
      })

      expect(result.success).toBe(true)

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })
      expect(credits?.usedCredits).toBe(1)
    })
  })

  describe('Zodiac Sign Analysis', () => {
    it('stores zodiac compatibility data', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({
            userSign: 'Leo',
            compatibilityMatrix: {
              Aries: 9,
              Taurus: 5,
              Gemini: 7,
              Cancer: 6,
              Leo: 8,
              Virgo: 4,
              Libra: 8,
              Scorpio: 6,
              Sagittarius: 9,
              Capricorn: 5,
              Aquarius: 7,
              Pisces: 6,
            },
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.compatibilityMatrix.Aries).toBe(9)
      expect(content.compatibilityMatrix.Sagittarius).toBe(9)
    })

    it('tracks element balance', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({
            elementBalance: {
              fire: 30,
              earth: 25,
              air: 20,
              water: 25,
            },
            dominantElement: 'fire',
            lackingElement: 'air',
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.dominantElement).toBe('fire')
      expect(content.elementBalance.fire).toBe(30)
    })
  })

  describe('Reading History', () => {
    it('retrieves astrology readings for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'astrology',
            content: JSON.stringify({ reading: i + 1 }),
          },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'astrology' },
        orderBy: { createdAt: 'desc' },
      })

      expect(readings).toHaveLength(5)
    })

    it('cascades delete when user is deleted', async () => {
      const userData = {
        id: `test_astro_${Date.now()}`,
        email: `astro_${Date.now()}@test.example.com`,
        name: 'Astrology Test User',
      }

      const user = await testPrisma.user.create({ data: userData })

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({ sunSign: 'Aries' }),
        },
      })

      const today = new Date().toISOString().split('T')[0]
      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 5,
          careerScore: 6,
          wealthScore: 7,
          healthScore: 8,
          overallScore: 65,
        },
      })

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } })

      // Verify readings are deleted
      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })
      expect(readings).toHaveLength(0)

      // Verify fortunes are deleted
      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      })
      expect(fortunes).toHaveLength(0)
    })
  })
})
