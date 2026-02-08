/**
 * Tarot Spread Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 타로 스프레드 저장
 * - 카드 배치 및 해석
 * - 스프레드 유형별 관리
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

describe('Integration: Tarot Spread', () => {
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

  describe('Three Card Spread', () => {
    it('creates three card spread', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '오늘의 조언',
          spreadType: 'three_card',
          cards: [
            { position: 'past', card: 'The Fool', reversed: false },
            { position: 'present', card: 'The Magician', reversed: true },
            { position: 'future', card: 'The High Priestess', reversed: false },
          ],
          interpretation: '과거의 새로운 시작이 현재의 도전을 만들었습니다...',
        },
      })

      expect(reading.spreadType).toBe('three_card')
      const cards = reading.cards as unknown[]
      expect(cards).toHaveLength(3)
    })

    it('creates past-present-future spread', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '연애 운세',
          spreadType: 'past_present_future',
          cards: [
            { position: 'past', card: 'Two of Cups', reversed: false, meaning: '과거의 연결' },
            { position: 'present', card: 'The Lovers', reversed: false, meaning: '현재의 선택' },
            { position: 'future', card: 'Ten of Cups', reversed: false, meaning: '행복한 미래' },
          ],
          interpretation: '사랑의 여정이 아름답게 펼쳐집니다...',
        },
      })

      const cards = reading.cards as Array<{ position: string }>
      expect(cards.map((c) => c.position)).toEqual(['past', 'present', 'future'])
    })
  })

  describe('Celtic Cross Spread', () => {
    it('creates celtic cross spread', async () => {
      const user = await createTestUserInDb()

      const celticCrossPositions = [
        'present',
        'challenge',
        'past',
        'future',
        'above',
        'below',
        'advice',
        'external',
        'hopes',
        'outcome',
      ]

      const cards = celticCrossPositions.map((position, i) => ({
        position,
        card: `Card ${i + 1}`,
        reversed: i % 3 === 0,
      }))

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '인생 전반적인 조언',
          spreadType: 'celtic_cross',
          cards,
          interpretation: '깊은 통찰을 제공하는 켈틱 크로스 리딩...',
        },
      })

      expect(reading.spreadType).toBe('celtic_cross')
      const readingCards = reading.cards as unknown[]
      expect(readingCards).toHaveLength(10)
    })
  })

  describe('Single Card Draw', () => {
    it('creates single card draw', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '오늘의 메시지',
          spreadType: 'single',
          cards: [{ position: 'message', card: 'The Star', reversed: false }],
          interpretation: '희망과 영감의 메시지입니다...',
        },
      })

      const cards = reading.cards as unknown[]
      expect(cards).toHaveLength(1)
    })

    it('creates daily card draw', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '오늘 하루의 에너지',
          spreadType: 'daily',
          cards: [{ position: 'daily_energy', card: 'The Sun', reversed: false }],
          interpretation: '밝고 긍정적인 에너지가 가득한 하루...',
          metadata: {
            date: new Date().toISOString().split('T')[0],
          },
        },
      })

      expect(reading.spreadType).toBe('daily')
    })
  })

  describe('Love Spread', () => {
    it('creates relationship spread', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '현재 관계의 상태',
          spreadType: 'relationship',
          cards: [
            { position: 'you', card: 'Queen of Cups', reversed: false },
            { position: 'partner', card: 'King of Wands', reversed: false },
            { position: 'relationship', card: 'Two of Cups', reversed: false },
            { position: 'challenge', card: 'Five of Swords', reversed: true },
            { position: 'advice', card: 'The Empress', reversed: false },
          ],
          interpretation: '두 분의 에너지가 조화롭게 흐르고 있습니다...',
        },
      })

      const cards = reading.cards as unknown[]
      expect(cards).toHaveLength(5)
    })
  })

  describe('Career Spread', () => {
    it('creates career spread', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: '직장 이직 여부',
          spreadType: 'career',
          cards: [
            { position: 'current_situation', card: 'Eight of Pentacles', reversed: false },
            { position: 'obstacle', card: 'The Tower', reversed: true },
            { position: 'hidden_influence', card: 'The Moon', reversed: false },
            { position: 'advice', card: 'The Chariot', reversed: false },
            { position: 'outcome', card: 'Ace of Pentacles', reversed: false },
          ],
          interpretation: '새로운 기회가 다가오고 있습니다...',
        },
      })

      expect(reading.spreadType).toBe('career')
    })
  })

  describe('Spread Retrieval', () => {
    it('retrieves spreads by type', async () => {
      const user = await createTestUserInDb()

      const types = ['three_card', 'celtic_cross', 'three_card', 'single', 'three_card']

      for (const type of types) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: `Question for ${type}`,
            spreadType: type,
            cards: [{ position: 'test', card: 'Test Card', reversed: false }],
            interpretation: 'Test interpretation',
          },
        })
      }

      const threeCardReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id, spreadType: 'three_card' },
      })

      expect(threeCardReadings).toHaveLength(3)
    })

    it('retrieves recent spreads', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: `Question ${i}`,
            spreadType: 'three_card',
            cards: [],
            interpretation: `Interpretation ${i}`,
          },
        })
      }

      const recentReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(recentReadings).toHaveLength(3)
    })
  })

  describe('Card Statistics', () => {
    it('tracks most drawn cards', async () => {
      const user = await createTestUserInDb()

      const cardSets = [
        ['The Fool', 'The Magician', 'The High Priestess'],
        ['The Fool', 'The Lovers', 'The Star'],
        ['The Fool', 'The Sun', 'The Moon'],
      ]

      for (const cards of cardSets) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: 'Test',
            spreadType: 'three_card',
            cards: cards.map((card, i) => ({ position: `pos${i}`, card, reversed: false })),
            interpretation: 'Test',
          },
        })
      }

      const readings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
      })

      const cardCounts: Record<string, number> = {}
      for (const reading of readings) {
        const cards = reading.cards as Array<{ card: string }>
        for (const c of cards) {
          cardCounts[c.card] = (cardCounts[c.card] || 0) + 1
        }
      }

      expect(cardCounts['The Fool']).toBe(3)
    })

    it('counts reversed vs upright cards', async () => {
      const user = await createTestUserInDb()

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: 'Test',
          spreadType: 'three_card',
          cards: [
            { position: '1', card: 'Card 1', reversed: true },
            { position: '2', card: 'Card 2', reversed: false },
            { position: '3', card: 'Card 3', reversed: true },
          ],
          interpretation: 'Test',
        },
      })

      const reading = await testPrisma.tarotReading.findFirst({
        where: { userId: user.id },
      })

      const cards = reading?.cards as Array<{ reversed: boolean }>
      const reversedCount = cards.filter((c) => c.reversed).length
      const uprightCount = cards.filter((c) => !c.reversed).length

      expect(reversedCount).toBe(2)
      expect(uprightCount).toBe(1)
    })
  })

  describe('Spread Updates', () => {
    it('adds user notes to spread', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: 'Test',
          spreadType: 'three_card',
          cards: [],
          interpretation: 'Original interpretation',
        },
      })

      const updated = await testPrisma.tarotReading.update({
        where: { id: reading.id },
        data: {
          userNotes: '이 리딩이 정말 도움이 되었습니다',
          rating: 5,
        },
      })

      expect(updated.userNotes).toContain('도움')
      expect(updated.rating).toBe(5)
    })
  })

  describe('Spread Deletion', () => {
    it('deletes spread', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: 'Delete me',
          spreadType: 'single',
          cards: [],
          interpretation: 'Test',
        },
      })

      await testPrisma.tarotReading.delete({
        where: { id: reading.id },
      })

      const found = await testPrisma.tarotReading.findUnique({
        where: { id: reading.id },
      })

      expect(found).toBeNull()
    })
  })
})
