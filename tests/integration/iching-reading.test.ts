/**
 * I Ching Reading Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 주역 점괘 결과 저장
 * - 괘 해석 데이터
 * - 점괘 히스토리
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

describe('Integration: I Ching Reading', () => {
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
    it('creates basic reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '새로운 사업을 시작해도 될까요?',
          hexagramNumber: 1,
          hexagramName: '건(乾)',
          interpretation: '하늘의 기운이 강합니다. 적극적으로 추진하세요.',
        },
      })

      expect(reading.hexagramNumber).toBe(1)
      expect(reading.hexagramName).toBe('건(乾)')
    })

    it('creates reading with changing lines', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '이직을 해야 할까요?',
          hexagramNumber: 11,
          hexagramName: '태(泰)',
          changingLines: [2, 5],
          futureHexagram: 63,
          futureHexagramName: '기제(旣濟)',
          interpretation: '현재는 순조롭지만 변화가 옵니다.',
        },
      })

      expect(reading.changingLines).toContain(2)
      expect(reading.futureHexagram).toBe(63)
    })

    it('creates reading with coin method', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '관계를 회복할 수 있을까요?',
          hexagramNumber: 8,
          hexagramName: '비(比)',
          method: 'coin',
          coinResults: [
            [3, 2, 2], // 7 - 양
            [3, 3, 3], // 9 - 노양 (변효)
            [2, 2, 2], // 6 - 노음 (변효)
            [3, 3, 2], // 8 - 음
            [2, 3, 2], // 7 - 양
            [3, 2, 3], // 8 - 음
          ],
          interpretation: '친밀한 관계를 맺을 시기입니다.',
        },
      })

      expect(reading.method).toBe('coin')
      expect(reading.coinResults).toHaveLength(6)
    })

    it('creates reading with yarrow stalk method', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '투자해도 괜찮을까요?',
          hexagramNumber: 14,
          hexagramName: '대유(大有)',
          method: 'yarrow',
          yarrowResults: [9, 8, 7, 6, 7, 8],
          interpretation: '큰 소유의 괘입니다. 풍요로운 시기입니다.',
        },
      })

      expect(reading.method).toBe('yarrow')
    })

    it('creates reading with detailed line interpretations', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '현재 상황에서 어떻게 해야 할까요?',
          hexagramNumber: 3,
          hexagramName: '준(屯)',
          interpretation: '어려운 시작이지만 인내가 필요합니다.',
          lineInterpretations: {
            1: '초효: 어려움 속에서도 정도를 지키세요',
            2: '이효: 도움을 구하는 것이 좋습니다',
            3: '삼효: 경솔하게 행동하지 마세요',
            4: '사효: 협력자를 찾으세요',
            5: '오효: 작은 일부터 시작하세요',
            6: '상효: 포기하지 말고 계속 노력하세요',
          },
        },
      })

      const lines = reading.lineInterpretations as Record<string, string>
      expect(lines['1']).toContain('정도')
    })
  })

  describe('Reading Retrieval', () => {
    it('retrieves readings by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            hexagramNumber: i + 1,
            hexagramName: `Hexagram ${i + 1}`,
            interpretation: `Interpretation ${i}`,
          },
        })
      }

      const readings = await testPrisma.ichingReading.findMany({
        where: { userId: user.id },
      })

      expect(readings).toHaveLength(5)
    })

    it('retrieves readings by hexagram', async () => {
      const user = await createTestUserInDb()

      const hexagrams = [1, 2, 1, 3, 1, 4]

      for (let i = 0; i < hexagrams.length; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            hexagramNumber: hexagrams[i],
            hexagramName: `Hexagram ${hexagrams[i]}`,
            interpretation: `Interpretation`,
          },
        })
      }

      const hexagram1Readings = await testPrisma.ichingReading.findMany({
        where: { userId: user.id, hexagramNumber: 1 },
      })

      expect(hexagram1Readings).toHaveLength(3)
    })

    it('retrieves recent readings first', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            hexagramNumber: i + 1,
            hexagramName: `Hexagram ${i + 1}`,
            interpretation: `Interpretation ${i}`,
          },
        })
      }

      const readings = await testPrisma.ichingReading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(readings[0].hexagramNumber).toBe(5)
    })

    it('searches readings by question', async () => {
      const user = await createTestUserInDb()

      const questions = [
        '사업을 시작해도 될까요?',
        '이직을 고민 중입니다',
        '새로운 사업 아이템은?',
        '연애 운이 궁금합니다',
        '사업 파트너를 찾고 있어요',
      ]

      for (let i = 0; i < questions.length; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: questions[i],
            hexagramNumber: i + 1,
            hexagramName: `Hexagram ${i + 1}`,
            interpretation: `Interpretation`,
          },
        })
      }

      const businessReadings = await testPrisma.ichingReading.findMany({
        where: {
          userId: user.id,
          question: { contains: '사업' },
        },
      })

      expect(businessReadings).toHaveLength(3)
    })
  })

  describe('Reading Statistics', () => {
    it('counts readings by hexagram', async () => {
      const user = await createTestUserInDb()

      const hexagrams = [1, 2, 3, 1, 2, 1, 4, 2, 1]

      for (let i = 0; i < hexagrams.length; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            hexagramNumber: hexagrams[i],
            hexagramName: `Hexagram ${hexagrams[i]}`,
            interpretation: `Interpretation`,
          },
        })
      }

      const counts = await testPrisma.ichingReading.groupBy({
        by: ['hexagramNumber'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const hex1Count = counts.find((c) => c.hexagramNumber === 1)?._count.id
      expect(hex1Count).toBe(4)
    })

    it('finds most common hexagram', async () => {
      const user = await createTestUserInDb()

      const hexagrams = [11, 12, 11, 1, 11, 2, 11, 3]

      for (let i = 0; i < hexagrams.length; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            hexagramNumber: hexagrams[i],
            hexagramName: `Hexagram ${hexagrams[i]}`,
            interpretation: `Interpretation`,
          },
        })
      }

      const counts = await testPrisma.ichingReading.groupBy({
        by: ['hexagramNumber'],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0].hexagramNumber).toBe(11)
    })

    it('counts readings by method', async () => {
      const user = await createTestUserInDb()

      const methods = ['coin', 'yarrow', 'coin', 'random', 'coin']

      for (let i = 0; i < methods.length; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            hexagramNumber: i + 1,
            hexagramName: `Hexagram ${i + 1}`,
            method: methods[i],
            interpretation: `Interpretation`,
          },
        })
      }

      const counts = await testPrisma.ichingReading.groupBy({
        by: ['method'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const coinCount = counts.find((c) => c.method === 'coin')?._count.id
      expect(coinCount).toBe(3)
    })
  })

  describe('Hexagram Analysis', () => {
    it('stores trigram breakdown', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '질문',
          hexagramNumber: 11,
          hexagramName: '태(泰)',
          interpretation: '해석',
          upperTrigram: '곤(坤)',
          lowerTrigram: '건(乾)',
          trigramAnalysis: {
            upper: '땅 - 순종, 수용',
            lower: '하늘 - 창조, 강건',
            relationship: '하늘과 땅이 교감하여 만물이 생성됨',
          },
        },
      })

      expect(reading.upperTrigram).toBe('곤(坤)')
      expect(reading.lowerTrigram).toBe('건(乾)')
    })

    it('stores nuclear hexagram', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '질문',
          hexagramNumber: 1,
          hexagramName: '건(乾)',
          interpretation: '해석',
          nuclearHexagram: 1,
          nuclearHexagramName: '건(乾)',
          nuclearInterpretation: '내면에서도 강건한 기운이 흐릅니다',
        },
      })

      expect(reading.nuclearHexagram).toBe(1)
    })

    it('stores relating hexagram', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '질문',
          hexagramNumber: 11,
          hexagramName: '태(泰)',
          changingLines: [1, 3, 5],
          futureHexagram: 41,
          futureHexagramName: '손(損)',
          interpretation: '현재는 순조롭지만 변화를 대비하세요',
          transitionInterpretation: '태에서 손으로의 변화는 절제가 필요함을 의미합니다',
        },
      })

      expect(reading.transitionInterpretation).toContain('절제')
    })
  })

  describe('Reading Updates', () => {
    it('updates interpretation', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '질문',
          hexagramNumber: 1,
          hexagramName: '건(乾)',
          interpretation: '원래 해석',
        },
      })

      const updated = await testPrisma.ichingReading.update({
        where: { id: reading.id },
        data: { interpretation: '수정된 해석' },
      })

      expect(updated.interpretation).toBe('수정된 해석')
    })

    it('adds user reflection', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '질문',
          hexagramNumber: 1,
          hexagramName: '건(乾)',
          interpretation: '해석',
        },
      })

      const updated = await testPrisma.ichingReading.update({
        where: { id: reading.id },
        data: { userReflection: '이 괘가 정말 맞았다!' },
      })

      expect(updated.userReflection).toContain('맞았다')
    })

    it('marks reading as fulfilled', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '새 프로젝트 성공할까?',
          hexagramNumber: 14,
          hexagramName: '대유(大有)',
          interpretation: '성공할 것입니다',
          isFulfilled: false,
        },
      })

      const updated = await testPrisma.ichingReading.update({
        where: { id: reading.id },
        data: {
          isFulfilled: true,
          fulfilledAt: new Date(),
          fulfillmentNotes: '프로젝트가 성공적으로 완료되었다!',
        },
      })

      expect(updated.isFulfilled).toBe(true)
    })

    it('marks as favorite', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '질문',
          hexagramNumber: 1,
          hexagramName: '건(乾)',
          interpretation: '해석',
          isFavorite: false,
        },
      })

      const updated = await testPrisma.ichingReading.update({
        where: { id: reading.id },
        data: { isFavorite: true },
      })

      expect(updated.isFavorite).toBe(true)
    })
  })

  describe('Reading Deletion', () => {
    it('deletes reading', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.ichingReading.create({
        data: {
          userId: user.id,
          question: '삭제할 점괘',
          hexagramNumber: 1,
          hexagramName: '건(乾)',
          interpretation: '해석',
        },
      })

      await testPrisma.ichingReading.delete({
        where: { id: reading.id },
      })

      const found = await testPrisma.ichingReading.findUnique({
        where: { id: reading.id },
      })

      expect(found).toBeNull()
    })

    it('deletes old readings', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old readings
      for (let i = 0; i < 3; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Old ${i}`,
            hexagramNumber: i + 1,
            hexagramName: `Hexagram ${i + 1}`,
            interpretation: '해석',
            createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent readings
      for (let i = 0; i < 2; i++) {
        await testPrisma.ichingReading.create({
          data: {
            userId: user.id,
            question: `Recent ${i}`,
            hexagramNumber: i + 1,
            hexagramName: `Hexagram ${i + 1}`,
            interpretation: '해석',
          },
        })
      }

      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      await testPrisma.ichingReading.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: oneYearAgo },
        },
      })

      const remaining = await testPrisma.ichingReading.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
