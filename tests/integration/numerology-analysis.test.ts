/**
 * Numerology Analysis Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 수비학 분석 저장 및 조회
 * - 생명수/운명수 계산
 * - 호환성 분석
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

describe('Integration: Numerology Analysis System', () => {
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

  describe('Numerology Reading Creation', () => {
    it('creates a basic numerology reading', async () => {
      const user = await createTestUserInDb({
        birthDate: '1990-05-15',
        name: 'Kim Min Jun',
      })

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            lifePathNumber: 3,
            destinyNumber: 7,
            soulUrgeNumber: 5,
            personalityNumber: 2,
            birthdayNumber: 15,
            analysis: {
              lifePath: 'Creative expression and communication',
              destiny: 'Spiritual seeker and analyst',
              soulUrge: 'Freedom and adventure lover',
            },
          }),
        },
      })

      expect(reading).toBeDefined()
      expect(reading.userId).toBe(user.id)
      expect(reading.type).toBe('numerology')

      const content = JSON.parse(reading.content as string)
      expect(content.lifePathNumber).toBe(3)
      expect(content.destinyNumber).toBe(7)
    })

    it('stores complete numerology profile', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            coreNumbers: {
              lifePath: 1,
              expression: 5,
              heartDesire: 3,
              personality: 2,
              birthday: 22,
            },
            personalYear: 6,
            personalMonth: 4,
            personalDay: 8,
            challenges: [2, 4, 2],
            pinnacles: [6, 9, 7, 3],
            karmicDebts: [14, 16],
            masterNumbers: [22],
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.coreNumbers.lifePath).toBe(1)
      expect(content.pinnacles).toHaveLength(4)
      expect(content.masterNumbers).toContain(22)
    })

    it('handles master numbers correctly', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            lifePathNumber: 11,
            isMasterNumber: true,
            masterNumberAnalysis: 'Master Number 11 - The Intuitive Illuminator',
            reducedNumber: 2,
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.lifePathNumber).toBe(11)
      expect(content.isMasterNumber).toBe(true)
      expect(content.reducedNumber).toBe(2)
    })
  })

  describe('Lucky Numbers', () => {
    it('stores lucky number calculations', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            luckyNumbers: {
              primary: [3, 7, 12, 21, 30],
              secondary: [1, 4, 10, 19, 28],
              avoid: [8, 17, 26],
            },
            luckyDays: ['Wednesday', 'Friday'],
            luckyColors: ['blue', 'green', 'white'],
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.luckyNumbers.primary).toContain(7)
      expect(content.luckyDays).toContain('Wednesday')
    })

    it('tracks daily lucky numbers', async () => {
      const user = await createTestUserInDb()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Store daily lucky numbers in a fortune entry
      const fortune = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          content: JSON.stringify({
            numerologyFortune: {
              luckyNumbersToday: [3, 8, 15, 22, 36],
              unluckyNumbersToday: [4, 13],
              personalDayNumber: 5,
            },
          }),
        },
      })

      const content = JSON.parse(fortune.content as string)
      expect(content.numerologyFortune.personalDayNumber).toBe(5)
    })
  })

  describe('Numerology Compatibility', () => {
    it('stores compatibility analysis between two people', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            compatibilityAnalysis: {
              person1: {
                name: 'Kim Min Jun',
                lifePathNumber: 3,
              },
              person2: {
                name: 'Lee Su Jin',
                lifePathNumber: 7,
              },
              overallCompatibility: 75,
              areas: {
                love: 80,
                friendship: 85,
                business: 65,
                communication: 70,
              },
              strengths: ['Intellectual connection', 'Creative collaboration'],
              challenges: ['Different social needs', 'Communication styles'],
            },
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.compatibilityAnalysis.overallCompatibility).toBe(75)
      expect(content.compatibilityAnalysis.areas.love).toBe(80)
    })

    it('handles group compatibility analysis', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            groupAnalysis: {
              members: [
                { name: 'Person A', lifePathNumber: 1 },
                { name: 'Person B', lifePathNumber: 5 },
                { name: 'Person C', lifePathNumber: 9 },
                { name: 'Person D', lifePathNumber: 3 },
              ],
              groupHarmony: 78,
              bestPairings: [
                { pair: ['Person A', 'Person C'], score: 85 },
                { pair: ['Person B', 'Person D'], score: 82 },
              ],
              potentialConflicts: [{ pair: ['Person A', 'Person B'], score: 55 }],
            },
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.groupAnalysis.members).toHaveLength(4)
      expect(content.groupAnalysis.groupHarmony).toBe(78)
    })
  })

  describe('Personal Year Cycles', () => {
    it('stores personal year analysis', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            currentYear: 2024,
            personalYearNumber: 6,
            yearAnalysis: {
              theme: 'Home, Family, and Responsibility',
              focus: ['Family relationships', 'Home improvements', 'Service to others'],
              challenges: ['Balancing personal and family needs'],
              opportunities: ['Strengthening bonds', 'Creating harmony'],
              keyMonths: {
                best: [3, 6, 9],
                challenging: [1, 10],
              },
            },
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.personalYearNumber).toBe(6)
      expect(content.yearAnalysis.theme).toContain('Family')
    })

    it('tracks yearly progression', async () => {
      const user = await createTestUserInDb()

      // Store readings for multiple years
      const years = [2022, 2023, 2024, 2025]
      const personalYears = [4, 5, 6, 7]

      for (let i = 0; i < years.length; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'numerology',
            content: JSON.stringify({
              year: years[i],
              personalYearNumber: personalYears[i],
            }),
          },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'numerology' },
        orderBy: { createdAt: 'asc' },
      })

      expect(readings).toHaveLength(4)

      // Verify progression
      const firstReading = JSON.parse(readings[0].content as string)
      const lastReading = JSON.parse(readings[3].content as string)
      expect(firstReading.personalYearNumber).toBe(4)
      expect(lastReading.personalYearNumber).toBe(7)
    })
  })

  describe('Numerology with Credits', () => {
    it('consumes credit for numerology reading', async () => {
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
          return { success: false }
        }

        await tx.reading.create({
          data: {
            userId: user.id,
            type: 'numerology',
            content: JSON.stringify({ lifePathNumber: 5 }),
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

  describe('Name Analysis', () => {
    it('stores name number analysis', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            nameAnalysis: {
              fullName: 'Kim Min Jun',
              expressionNumber: 7,
              heartDesireNumber: 3,
              personalityNumber: 4,
              vowels: { count: 3, sum: 12 },
              consonants: { count: 6, sum: 22 },
              letters: {
                total: 9,
                unique: 8,
                karmic: ['K'],
              },
            },
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.nameAnalysis.expressionNumber).toBe(7)
      expect(content.nameAnalysis.vowels.count).toBe(3)
    })

    it('handles multiple name variations', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({
            nameVariations: [
              {
                name: 'Kim Min Jun',
                type: 'full',
                expressionNumber: 7,
              },
              {
                name: 'Min Jun',
                type: 'first',
                expressionNumber: 5,
              },
              {
                name: 'MJ',
                type: 'nickname',
                expressionNumber: 9,
              },
            ],
            recommendedName: 'Kim Min Jun',
            reason: 'Balances your life path number',
          }),
        },
      })

      const content = JSON.parse(reading.content as string)
      expect(content.nameVariations).toHaveLength(3)
      expect(content.recommendedName).toBe('Kim Min Jun')
    })
  })

  describe('Reading History', () => {
    it('retrieves numerology readings for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'numerology',
            content: JSON.stringify({ reading: i + 1 }),
          },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'numerology' },
        orderBy: { createdAt: 'desc' },
      })

      expect(readings).toHaveLength(5)
    })

    it('separates numerology from other reading types', async () => {
      const user = await createTestUserInDb()

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({ lifePathNumber: 3 }),
        },
      })

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'astrology',
          content: JSON.stringify({ sunSign: 'Aries' }),
        },
      })

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({ lifePathNumber: 7 }),
        },
      })

      const numerology = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'numerology' },
      })

      const astrology = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'astrology' },
      })

      expect(numerology).toHaveLength(2)
      expect(astrology).toHaveLength(1)
    })

    it('cascades delete when user is deleted', async () => {
      const userData = {
        id: `test_num_${Date.now()}`,
        email: `num_${Date.now()}@test.example.com`,
        name: 'Numerology Test User',
      }

      const user = await testPrisma.user.create({ data: userData })

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'numerology',
          content: JSON.stringify({ lifePathNumber: 9 }),
        },
      })

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } })

      // Verify readings are deleted
      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })
      expect(readings).toHaveLength(0)
    })
  })
})
