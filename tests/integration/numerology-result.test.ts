/**
 * Numerology Result Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 수비학 결과 저장
 * - 숫자 분석 데이터
 * - 결과 히스토리
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

describe('Integration: Numerology Result', () => {
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

  describe('Result Creation', () => {
    it('creates life path number result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-05-15'),
          lifePathNumber: 7,
          interpretation: '7은 지식과 지혜를 추구하는 숫자입니다',
          resultType: 'life_path',
        },
      })

      expect(result.lifePathNumber).toBe(7)
      expect(result.resultType).toBe('life_path')
    })

    it('creates full numerology profile', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1985-08-20'),
          lifePathNumber: 5,
          destinyNumber: 3,
          soulNumber: 9,
          personalityNumber: 4,
          birthdayNumber: 20,
          interpretation: '자유롭고 다재다능한 성격입니다',
          resultType: 'full_profile',
        },
      })

      expect(result.destinyNumber).toBe(3)
      expect(result.soulNumber).toBe(9)
    })

    it('creates name numerology result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-01'),
          name: '김철수',
          destinyNumber: 6,
          soulNumber: 2,
          personalityNumber: 4,
          interpretation: '이름에서 조화와 균형의 에너지가 느껴집니다',
          resultType: 'name_analysis',
        },
      })

      expect(result.name).toBe('김철수')
      expect(result.resultType).toBe('name_analysis')
    })

    it('creates yearly numerology forecast', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-05-15'),
          lifePathNumber: 7,
          personalYear: 1,
          interpretation: '새로운 시작의 해입니다. 새로운 프로젝트를 시작하기 좋은 시기입니다.',
          resultType: 'yearly_forecast',
          year: 2024,
        },
      })

      expect(result.personalYear).toBe(1)
      expect(result.year).toBe(2024)
    })

    it('creates compatibility numerology', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-01'),
          lifePathNumber: 7,
          partnerLifePath: 3,
          compatibilityScore: 75,
          interpretation: '7과 3의 조합은 창의적이고 지적인 파트너십을 만듭니다',
          resultType: 'compatibility',
        },
      })

      expect(result.partnerLifePath).toBe(3)
      expect(result.compatibilityScore).toBe(75)
    })
  })

  describe('Result Retrieval', () => {
    it('retrieves results by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: (i % 9) + 1,
            interpretation: `Result ${i}`,
            resultType: 'life_path',
          },
        })
      }

      const results = await testPrisma.numerologyResult.findMany({
        where: { userId: user.id },
      })

      expect(results).toHaveLength(5)
    })

    it('retrieves results by type', async () => {
      const user = await createTestUserInDb()

      const types = ['life_path', 'name_analysis', 'life_path', 'yearly_forecast', 'life_path']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: 7,
            interpretation: `Result ${i}`,
            resultType: types[i],
          },
        })
      }

      const lifePathResults = await testPrisma.numerologyResult.findMany({
        where: { userId: user.id, resultType: 'life_path' },
      })

      expect(lifePathResults).toHaveLength(3)
    })

    it('retrieves results by life path number', async () => {
      const users: string[] = []
      const lifePathNumbers = [7, 3, 7, 9, 7, 1]

      for (let i = 0; i < lifePathNumbers.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: lifePathNumbers[i],
            interpretation: `Life path ${lifePathNumbers[i]}`,
            resultType: 'life_path',
          },
        })
      }

      const sevenResults = await testPrisma.numerologyResult.findMany({
        where: { userId: { in: users }, lifePathNumber: 7 },
      })

      expect(sevenResults).toHaveLength(3)
    })

    it('retrieves recent results first', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: i + 1,
            interpretation: `Result ${i}`,
            resultType: 'life_path',
          },
        })
      }

      const results = await testPrisma.numerologyResult.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(results[0].lifePathNumber).toBe(5)
    })
  })

  describe('Statistics', () => {
    it('counts results by life path number', async () => {
      const users: string[] = []
      const numbers = [1, 2, 3, 1, 1, 2, 3, 3, 3]

      for (let i = 0; i < numbers.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: numbers[i],
            interpretation: `Result`,
            resultType: 'life_path',
          },
        })
      }

      const counts = await testPrisma.numerologyResult.groupBy({
        by: ['lifePathNumber'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const threeCount = counts.find((c) => c.lifePathNumber === 3)?._count.id
      expect(threeCount).toBe(4)
    })

    it('counts results by type', async () => {
      const user = await createTestUserInDb()

      const types = [
        'life_path',
        'name_analysis',
        'life_path',
        'compatibility',
        'name_analysis',
        'life_path',
      ]

      for (let i = 0; i < types.length; i++) {
        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: 7,
            interpretation: `Result ${i}`,
            resultType: types[i],
          },
        })
      }

      const counts = await testPrisma.numerologyResult.groupBy({
        by: ['resultType'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const lifePathCount = counts.find((c) => c.resultType === 'life_path')?._count.id
      expect(lifePathCount).toBe(3)
    })

    it('finds most common life path number', async () => {
      const users: string[] = []
      const numbers = [7, 7, 3, 7, 1, 9, 7, 3]

      for (let i = 0; i < numbers.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: numbers[i],
            interpretation: `Result`,
            resultType: 'life_path',
          },
        })
      }

      const counts = await testPrisma.numerologyResult.groupBy({
        by: ['lifePathNumber'],
        where: { userId: { in: users } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0].lifePathNumber).toBe(7)
    })
  })

  describe('Number Analysis', () => {
    it('stores detailed number breakdown', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-05-15'),
          lifePathNumber: 7,
          interpretation: '분석 결과',
          resultType: 'full_profile',
          numberBreakdown: {
            year: { value: 1990, reduced: 1 },
            month: { value: 5, reduced: 5 },
            day: { value: 15, reduced: 6 },
            total: { value: 21, reduced: 3 },
          },
        },
      })

      const breakdown = result.numberBreakdown as {
        year: { value: number; reduced: number }
      }
      expect(breakdown.year.value).toBe(1990)
    })

    it('stores master numbers', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1977-11-11'),
          lifePathNumber: 11,
          isMasterNumber: true,
          interpretation: '마스터 넘버 11은 영적 깨달음을 나타냅니다',
          resultType: 'life_path',
        },
      })

      expect(result.isMasterNumber).toBe(true)
      expect(result.lifePathNumber).toBe(11)
    })

    it('stores karmic numbers', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-13'),
          lifePathNumber: 4,
          karmicNumbers: [13, 14],
          interpretation: '카르마 숫자가 있습니다',
          resultType: 'life_path',
        },
      })

      expect(result.karmicNumbers).toContain(13)
    })
  })

  describe('Result Updates', () => {
    it('updates interpretation', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-01'),
          lifePathNumber: 7,
          interpretation: '원래 해석',
          resultType: 'life_path',
        },
      })

      const updated = await testPrisma.numerologyResult.update({
        where: { id: result.id },
        data: { interpretation: '수정된 해석' },
      })

      expect(updated.interpretation).toBe('수정된 해석')
    })

    it('adds user notes', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-01'),
          lifePathNumber: 7,
          interpretation: '해석',
          resultType: 'life_path',
        },
      })

      const updated = await testPrisma.numerologyResult.update({
        where: { id: result.id },
        data: { userNotes: '이 결과가 정확하다고 느낌' },
      })

      expect(updated.userNotes).toContain('정확')
    })

    it('marks as favorite', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-01'),
          lifePathNumber: 7,
          interpretation: '해석',
          resultType: 'life_path',
          isFavorite: false,
        },
      })

      const updated = await testPrisma.numerologyResult.update({
        where: { id: result.id },
        data: { isFavorite: true },
      })

      expect(updated.isFavorite).toBe(true)
    })
  })

  describe('Result Deletion', () => {
    it('deletes result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.numerologyResult.create({
        data: {
          userId: user.id,
          birthDate: new Date('1990-01-01'),
          lifePathNumber: 7,
          interpretation: '삭제할 결과',
          resultType: 'life_path',
        },
      })

      await testPrisma.numerologyResult.delete({
        where: { id: result.id },
      })

      const found = await testPrisma.numerologyResult.findUnique({
        where: { id: result.id },
      })

      expect(found).toBeNull()
    })

    it('deletes old results', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old results
      for (let i = 0; i < 3; i++) {
        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: 7,
            interpretation: `Old ${i}`,
            resultType: 'life_path',
            createdAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent results
      for (let i = 0; i < 2; i++) {
        await testPrisma.numerologyResult.create({
          data: {
            userId: user.id,
            birthDate: new Date('1990-01-01'),
            lifePathNumber: 7,
            interpretation: `Recent ${i}`,
            resultType: 'life_path',
          },
        })
      }

      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

      await testPrisma.numerologyResult.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: oneEightyDaysAgo },
        },
      })

      const remaining = await testPrisma.numerologyResult.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
