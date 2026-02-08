/**
 * Persona Memory Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - AI 페르소나 메모리 저장
 * - 대화 컨텍스트 관리
 * - 사용자별 메모리 격리
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

describe('Integration: Persona Memory', () => {
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

  describe('Memory Creation', () => {
    it('creates persona memory for user', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'fortune_teller',
          memories: {
            preferences: ['career', 'love'],
            lastTopics: ['2024년 운세'],
            userName: '철수',
          },
        },
      })

      expect(memory.persona).toBe('fortune_teller')
      const memories = memory.memories as { userName: string }
      expect(memories.userName).toBe('철수')
    })

    it('creates memory with conversation context', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'tarot_reader',
          memories: {
            conversationHistory: [
              { role: 'user', content: '오늘의 타로 운세' },
              { role: 'assistant', content: '카드를 뽑겠습니다...' },
            ],
            lastCardDraw: ['The Fool', 'The Magician'],
          },
        },
      })

      const memories = memory.memories as { conversationHistory: unknown[] }
      expect(memories.conversationHistory).toHaveLength(2)
    })

    it('creates memory for multiple personas', async () => {
      const user = await createTestUserInDb()

      const personas = ['fortune_teller', 'tarot_reader', 'astrologer', 'counselor']

      for (const persona of personas) {
        await testPrisma.personaMemory.create({
          data: {
            userId: user.id,
            persona,
            memories: { initialized: true },
          },
        })
      }

      const memories = await testPrisma.personaMemory.findMany({
        where: { userId: user.id },
      })

      expect(memories).toHaveLength(4)
    })

    it('creates memory with user preferences', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'life_advisor',
          memories: {
            preferences: {
              communicationStyle: 'formal',
              language: 'ko',
              interests: ['career', 'health', 'relationships'],
            },
            userProfile: {
              age: 30,
              occupation: 'developer',
            },
          },
        },
      })

      const memories = memory.memories as { preferences: { communicationStyle: string } }
      expect(memories.preferences.communicationStyle).toBe('formal')
    })
  })

  describe('Memory Retrieval', () => {
    it('retrieves memory by user and persona', async () => {
      const user = await createTestUserInDb()

      await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'fortune_teller',
          memories: { topic: 'career' },
        },
      })

      const memory = await testPrisma.personaMemory.findFirst({
        where: {
          userId: user.id,
          persona: 'fortune_teller',
        },
      })

      expect(memory).not.toBeNull()
      const memories = memory?.memories as { topic: string }
      expect(memories.topic).toBe('career')
    })

    it('retrieves all memories for user', async () => {
      const user = await createTestUserInDb()

      const personas = ['saju', 'tarot', 'astro']

      for (const persona of personas) {
        await testPrisma.personaMemory.create({
          data: {
            userId: user.id,
            persona,
            memories: {},
          },
        })
      }

      const memories = await testPrisma.personaMemory.findMany({
        where: { userId: user.id },
      })

      expect(memories).toHaveLength(3)
    })

    it('retrieves recent memory first', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.personaMemory.create({
          data: {
            userId: user.id,
            persona: 'fortune_teller',
            memories: { order: i },
          },
        })
      }

      const recentMemory = await testPrisma.personaMemory.findFirst({
        where: { userId: user.id, persona: 'fortune_teller' },
        orderBy: { updatedAt: 'desc' },
      })

      const memories = recentMemory?.memories as { order: number }
      expect(memories.order).toBe(2)
    })
  })

  describe('Memory Updates', () => {
    it('updates memory content', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'fortune_teller',
          memories: { visits: 1 },
        },
      })

      const updated = await testPrisma.personaMemory.update({
        where: { id: memory.id },
        data: {
          memories: { visits: 2, lastVisit: new Date().toISOString() },
        },
      })

      const memories = updated.memories as { visits: number }
      expect(memories.visits).toBe(2)
    })

    it('appends to memory array', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'tarot_reader',
          memories: {
            readings: [{ date: '2024-06-01', cards: ['The Fool'] }],
          },
        },
      })

      const existingMemories = memory.memories as { readings: unknown[] }
      const newReadings = [
        ...existingMemories.readings,
        { date: '2024-06-15', cards: ['The Magician', 'The High Priestess'] },
      ]

      const updated = await testPrisma.personaMemory.update({
        where: { id: memory.id },
        data: {
          memories: { readings: newReadings },
        },
      })

      const updatedMemories = updated.memories as { readings: unknown[] }
      expect(updatedMemories.readings).toHaveLength(2)
    })

    it('updates conversation history', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'counselor',
          memories: {
            history: [{ role: 'user', content: 'Hello' }],
          },
        },
      })

      const existingMemories = memory.memories as { history: unknown[] }

      const updated = await testPrisma.personaMemory.update({
        where: { id: memory.id },
        data: {
          memories: {
            history: [
              ...existingMemories.history,
              { role: 'assistant', content: '안녕하세요!' },
              { role: 'user', content: '오늘 운세 알려줘' },
            ],
          },
        },
      })

      const updatedMemories = updated.memories as { history: unknown[] }
      expect(updatedMemories.history).toHaveLength(3)
    })

    it('clears specific memory fields', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'fortune_teller',
          memories: {
            temporary: 'should be cleared',
            permanent: 'should remain',
          },
        },
      })

      const updated = await testPrisma.personaMemory.update({
        where: { id: memory.id },
        data: {
          memories: {
            permanent: 'should remain',
            // temporary field removed
          },
        },
      })

      const updatedMemories = updated.memories as Record<string, unknown>
      expect(updatedMemories.temporary).toBeUndefined()
      expect(updatedMemories.permanent).toBe('should remain')
    })
  })

  describe('Memory Deletion', () => {
    it('deletes specific persona memory', async () => {
      const user = await createTestUserInDb()

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'fortune_teller',
          memories: {},
        },
      })

      await testPrisma.personaMemory.delete({
        where: { id: memory.id },
      })

      const found = await testPrisma.personaMemory.findUnique({
        where: { id: memory.id },
      })

      expect(found).toBeNull()
    })

    it('deletes all memories for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.personaMemory.create({
          data: {
            userId: user.id,
            persona: `persona_${i}`,
            memories: {},
          },
        })
      }

      await testPrisma.personaMemory.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.personaMemory.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })

    it('deletes memories by persona type', async () => {
      const user = await createTestUserInDb()

      const personas = ['temp_1', 'temp_2', 'permanent']

      for (const persona of personas) {
        await testPrisma.personaMemory.create({
          data: {
            userId: user.id,
            persona,
            memories: {},
          },
        })
      }

      await testPrisma.personaMemory.deleteMany({
        where: {
          userId: user.id,
          persona: { startsWith: 'temp_' },
        },
      })

      const remaining = await testPrisma.personaMemory.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(1)
      expect(remaining[0].persona).toBe('permanent')
    })
  })

  describe('Memory Isolation', () => {
    it('isolates memory between users', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      await testPrisma.personaMemory.create({
        data: {
          userId: user1.id,
          persona: 'fortune_teller',
          memories: { userName: 'User1' },
        },
      })

      await testPrisma.personaMemory.create({
        data: {
          userId: user2.id,
          persona: 'fortune_teller',
          memories: { userName: 'User2' },
        },
      })

      const user1Memory = await testPrisma.personaMemory.findFirst({
        where: { userId: user1.id, persona: 'fortune_teller' },
      })

      const user2Memory = await testPrisma.personaMemory.findFirst({
        where: { userId: user2.id, persona: 'fortune_teller' },
      })

      const mem1 = user1Memory?.memories as { userName: string }
      const mem2 = user2Memory?.memories as { userName: string }

      expect(mem1.userName).toBe('User1')
      expect(mem2.userName).toBe('User2')
    })

    it('isolates memory between personas', async () => {
      const user = await createTestUserInDb()

      await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'tarot_reader',
          memories: { specialty: 'tarot' },
        },
      })

      await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: 'astrologer',
          memories: { specialty: 'astrology' },
        },
      })

      const tarotMemory = await testPrisma.personaMemory.findFirst({
        where: { userId: user.id, persona: 'tarot_reader' },
      })

      const astroMemory = await testPrisma.personaMemory.findFirst({
        where: { userId: user.id, persona: 'astrologer' },
      })

      const tarotMem = tarotMemory?.memories as { specialty: string }
      const astroMem = astroMemory?.memories as { specialty: string }

      expect(tarotMem.specialty).toBe('tarot')
      expect(astroMem.specialty).toBe('astrology')
    })
  })

  describe('Memory Statistics', () => {
    it('counts memories by persona', async () => {
      const users: string[] = []

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.personaMemory.create({
          data: {
            userId: user.id,
            persona: i < 3 ? 'fortune_teller' : 'tarot_reader',
            memories: {},
          },
        })
      }

      const counts = await testPrisma.personaMemory.groupBy({
        by: ['persona'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const fortuneCount = counts.find((c) => c.persona === 'fortune_teller')?._count.id
      expect(fortuneCount).toBe(3)
    })

    it('finds users with specific persona memory', async () => {
      const users: string[] = []

      for (let i = 0; i < 4; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        if (i < 2) {
          await testPrisma.personaMemory.create({
            data: {
              userId: user.id,
              persona: 'premium_advisor',
              memories: {},
            },
          })
        }
      }

      const premiumUsers = await testPrisma.personaMemory.findMany({
        where: {
          userId: { in: users },
          persona: 'premium_advisor',
        },
        select: { userId: true },
      })

      expect(premiumUsers).toHaveLength(2)
    })
  })
})
