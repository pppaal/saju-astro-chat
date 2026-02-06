/**
 * Consultation Session Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 상담 세션 생성 및 관리
 * - 메시지 저장 및 조회
 * - 세션 상태 관리
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

describe('Integration: Consultation Session System', () => {
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

  describe('Session Creation', () => {
    it('creates a new consultation session', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'career',
          messages: [],
        },
      })

      expect(session).toBeDefined()
      expect(session.userId).toBe(user.id)
      expect(session.theme).toBe('career')
      expect(session.createdAt).toBeInstanceOf(Date)
    })

    it('creates session with different themes', async () => {
      const user = await createTestUserInDb()

      const themes = ['career', 'love', 'health', 'general']

      for (const theme of themes) {
        const session = await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            theme,
            messages: [],
          },
        })

        expect(session.theme).toBe(theme)
      }

      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      })

      expect(sessions).toHaveLength(4)
    })

    it('stores messages in session', async () => {
      const user = await createTestUserInDb()

      const messages = [
        { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Hi! How can I help?', timestamp: new Date().toISOString() },
      ]

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'love',
          messages,
          messageCount: 2,
        },
      })

      const sessionMessages = session.messages as { role: string; content: string }[]
      expect(sessionMessages).toHaveLength(2)
      expect(sessionMessages[0].role).toBe('user')
    })
  })

  describe('Session Retrieval', () => {
    it('retrieves user sessions ordered by date', async () => {
      const user = await createTestUserInDb()

      // Create sessions
      for (let i = 1; i <= 3; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            theme: 'career',
            messages: [],
            summary: `Session ${i}`,
          },
        })
      }

      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      expect(sessions).toHaveLength(3)
      expect(sessions[0].summary).toBe('Session 3')
    })

    it('filters sessions by theme', async () => {
      const user = await createTestUserInDb()

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'career',
          messages: [],
          summary: 'Career 1',
        },
      })

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'love',
          messages: [],
          summary: 'Love 1',
        },
      })

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'career',
          messages: [],
          summary: 'Career 2',
        },
      })

      const careerSessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id, theme: 'career' },
      })

      expect(careerSessions).toHaveLength(2)
    })

    it('paginates session history', async () => {
      const user = await createTestUserInDb()

      // Create 20 sessions
      for (let i = 1; i <= 20; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            theme: 'career',
            messages: [],
            summary: `Session ${i}`,
          },
        })
      }

      const page1 = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      })

      const page2 = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 10,
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)

      const page1Ids = page1.map((s) => s.id)
      const page2Ids = page2.map((s) => s.id)
      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids))
    })
  })

  describe('Consultation History', () => {
    it('creates consultation history entry', async () => {
      const user = await createTestUserInDb()

      const history = await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: 'saju',
          summary: '2024년 운세 상담',
          content: JSON.stringify({
            question: '올해 운세가 어떤가요?',
            answer: '좋은 기운이 감지됩니다...',
          }),
        },
      })

      expect(history).toBeDefined()
      expect(history.theme).toBe('saju')
      expect(history.summary).toBe('2024년 운세 상담')
    })

    it('stores multiple consultation themes', async () => {
      const user = await createTestUserInDb()

      const themes = ['saju', 'tarot', 'astrology', 'dream', 'compatibility']

      for (const theme of themes) {
        await testPrisma.consultationHistory.create({
          data: {
            userId: user.id,
            theme,
            summary: `${theme} consultation`,
            content: JSON.stringify({ theme }),
          },
        })
      }

      const histories = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id },
      })

      expect(histories).toHaveLength(5)
    })

    it('retrieves consultation history with date range', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: 'saju',
          summary: 'Recent consultation',
          content: JSON.stringify({}),
          createdAt: now,
        },
      })

      const recentHistories = await testPrisma.consultationHistory.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: oneWeekAgo },
        },
      })

      expect(recentHistories.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Session with Credits', () => {
    it('creates follow-up session with credit check', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      const result = await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        })

        const followUpRemaining = (credits?.followUpLimit || 0) - (credits?.followUpUsed || 0)

        if (followUpRemaining <= 0) {
          return { success: false, reason: 'No follow-up credits available' }
        }

        const session = await tx.counselorChatSession.create({
          data: {
            userId: user.id,
            theme: 'career',
            messages: [],
            summary: 'Follow-up Session',
          },
        })

        await tx.userCredits.update({
          where: { userId: user.id },
          data: { followUpUsed: { increment: 1 } },
        })

        return { success: true, session }
      })

      expect(result.success).toBe(true)

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })
      expect(credits?.followUpUsed).toBe(1)
    })

    it('prevents session when no follow-up credits', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      // Use all follow-up credits (2 for starter)
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { followUpUsed: 2 },
      })

      const result = await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        })

        const followUpRemaining = (credits?.followUpLimit || 0) - (credits?.followUpUsed || 0)

        if (followUpRemaining <= 0) {
          return { success: false, reason: 'No follow-up credits available' }
        }

        return { success: true }
      })

      expect(result.success).toBe(false)
      expect(result.reason).toBe('No follow-up credits available')
    })
  })

  describe('Session Update and Delete', () => {
    it('updates session summary', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'love',
          messages: [],
          summary: 'Original Summary',
        },
      })

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: { summary: 'Updated Summary' },
      })

      expect(updated.summary).toBe('Updated Summary')
    })

    it('deletes session', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'career',
          messages: [],
        },
      })

      await testPrisma.counselorChatSession.delete({
        where: { id: session.id },
      })

      const found = await testPrisma.counselorChatSession.findUnique({
        where: { id: session.id },
      })

      expect(found).toBeNull()
    })

    it('cascades delete when user is deleted', async () => {
      const userData = {
        id: `test_session_${Date.now()}`,
        email: `session_${Date.now()}@test.example.com`,
        name: 'Session Test User',
      }

      const user = await testPrisma.user.create({ data: userData })

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'career',
          messages: [],
        },
      })

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'love',
          messages: [],
        },
      })

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } })

      // Verify sessions are deleted
      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      })

      expect(sessions).toHaveLength(0)
    })
  })

  describe('Session Statistics', () => {
    it('counts sessions by theme', async () => {
      const user = await createTestUserInDb()

      // Create various sessions
      for (let i = 0; i < 5; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            theme: 'career',
            messages: [],
          },
        })
      }

      for (let i = 0; i < 3; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            theme: 'love',
            messages: [],
          },
        })
      }

      const careerCount = await testPrisma.counselorChatSession.count({
        where: { userId: user.id, theme: 'career' },
      })

      const loveCount = await testPrisma.counselorChatSession.count({
        where: { userId: user.id, theme: 'love' },
      })

      expect(careerCount).toBe(5)
      expect(loveCount).toBe(3)
    })

    it('calculates total sessions per user', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      // User 1: 3 sessions
      for (let i = 0; i < 3; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user1.id,
            theme: 'career',
            messages: [],
          },
        })
      }

      // User 2: 5 sessions
      for (let i = 0; i < 5; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user2.id,
            theme: 'love',
            messages: [],
          },
        })
      }

      const user1Sessions = await testPrisma.counselorChatSession.count({
        where: { userId: user1.id },
      })

      const user2Sessions = await testPrisma.counselorChatSession.count({
        where: { userId: user2.id },
      })

      expect(user1Sessions).toBe(3)
      expect(user2Sessions).toBe(5)
    })
  })
})
