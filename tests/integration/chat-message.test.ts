/**
 * Chat Message Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 채팅 메시지 저장
 * - 대화 히스토리 관리
 * - 메시지 검색 및 필터링
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

describe('Integration: Chat Message', () => {
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

  describe('Message Creation', () => {
    it('creates user message', async () => {
      const user = await createTestUserInDb()

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId: `session_${Date.now()}`,
          role: 'user',
          content: '오늘의 운세를 알려주세요',
          messageType: 'text',
        },
      })

      expect(message.role).toBe('user')
      expect(message.content).toContain('운세')
    })

    it('creates assistant message', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId,
          role: 'assistant',
          content: '오늘은 좋은 기운이 가득한 날입니다. 새로운 시작에 적합합니다.',
          messageType: 'text',
          metadata: {
            model: 'gpt-4',
            tokens: 150,
          },
        },
      })

      expect(message.role).toBe('assistant')
    })

    it('creates system message', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId,
          role: 'system',
          content: '당신은 사주 전문가입니다.',
          messageType: 'text',
        },
      })

      expect(message.role).toBe('system')
    })

    it('creates message with attachments', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId,
          role: 'user',
          content: '이 사진의 사주를 분석해주세요',
          messageType: 'image',
          attachments: [
            {
              type: 'image',
              url: 'https://example.com/chart.png',
              name: '사주차트.png',
            },
          ],
        },
      })

      expect(message.messageType).toBe('image')
      expect(message.attachments).toHaveLength(1)
    })

    it('creates conversation thread', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const messages = [
        { role: 'user', content: '안녕하세요' },
        { role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' },
        { role: 'user', content: '오늘 운세 좀 봐주세요' },
        { role: 'assistant', content: '오늘은 활기찬 하루가 될 것입니다.' },
      ]

      for (const msg of messages) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: msg.role,
            content: msg.content,
            messageType: 'text',
          },
        })
      }

      const thread = await testPrisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      })

      expect(thread).toHaveLength(4)
    })
  })

  describe('Message Retrieval', () => {
    it('retrieves messages by session', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      for (let i = 0; i < 5; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      const messages = await testPrisma.chatMessage.findMany({
        where: { sessionId },
      })

      expect(messages).toHaveLength(5)
    })

    it('retrieves messages by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: `session_${i}`,
            role: 'user',
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      const messages = await testPrisma.chatMessage.findMany({
        where: { userId: user.id },
      })

      expect(messages).toHaveLength(3)
    })

    it('retrieves messages by role', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const roles = ['user', 'assistant', 'user', 'assistant', 'system']

      for (let i = 0; i < roles.length; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: roles[i],
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      const userMessages = await testPrisma.chatMessage.findMany({
        where: { sessionId, role: 'user' },
      })

      expect(userMessages).toHaveLength(2)
    })

    it('retrieves recent messages first', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      for (let i = 0; i < 5; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: 'user',
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      const messages = await testPrisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(messages[0].content).toBe('Message 4')
    })

    it('retrieves messages with pagination', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      for (let i = 0; i < 10; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: 'user',
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      const page1 = await testPrisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 5,
        skip: 0,
      })

      const page2 = await testPrisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 5,
        skip: 5,
      })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
      expect(page1[0].content).toBe('Message 0')
      expect(page2[0].content).toBe('Message 5')
    })
  })

  describe('Message Search', () => {
    it('searches messages by content', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const contents = [
        '오늘의 운세를 알려주세요',
        '내일 날씨가 어떨까요',
        '운세 결과입니다',
        '좋은 하루 보내세요',
        '운세를 더 자세히 알려주세요',
      ]

      for (const content of contents) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: 'user',
            content,
            messageType: 'text',
          },
        })
      }

      const fortuneMessages = await testPrisma.chatMessage.findMany({
        where: {
          sessionId,
          content: { contains: '운세' },
        },
      })

      expect(fortuneMessages).toHaveLength(3)
    })

    it('searches messages by date range', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 7; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: `session_day_${i}`,
            role: 'user',
            content: `Message from day ${i}`,
            messageType: 'text',
            createdAt: date,
          },
        })
      }

      const threeDaysAgo = new Date(now)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const recentMessages = await testPrisma.chatMessage.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: threeDaysAgo },
        },
      })

      expect(recentMessages).toHaveLength(4)
    })
  })

  describe('Message Statistics', () => {
    it('counts messages by role', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const roles = ['user', 'user', 'user', 'assistant', 'assistant', 'system']

      for (let i = 0; i < roles.length; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: roles[i],
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      const counts = await testPrisma.chatMessage.groupBy({
        by: ['role'],
        where: { sessionId },
        _count: { id: true },
      })

      const userCount = counts.find((c) => c.role === 'user')?._count.id
      expect(userCount).toBe(3)
    })

    it('counts total tokens used', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      const tokenCounts = [100, 150, 200, 120, 180]

      for (let i = 0; i < tokenCounts.length; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: 'assistant',
            content: `Response ${i}`,
            messageType: 'text',
            metadata: { tokens: tokenCounts[i] },
          },
        })
      }

      const messages = await testPrisma.chatMessage.findMany({
        where: { sessionId, role: 'assistant' },
      })

      const totalTokens = messages.reduce((sum, m) => {
        const meta = m.metadata as { tokens?: number } | null
        return sum + (meta?.tokens || 0)
      }, 0)

      expect(totalTokens).toBe(750)
    })

    it('counts sessions per user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: `session_${i}`,
            role: 'user',
            content: `Starting session ${i}`,
            messageType: 'text',
          },
        })
      }

      const sessions = await testPrisma.chatMessage.findMany({
        where: { userId: user.id },
        distinct: ['sessionId'],
      })

      expect(sessions).toHaveLength(5)
    })
  })

  describe('Message Updates', () => {
    it('updates message content', async () => {
      const user = await createTestUserInDb()

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId: `session_${Date.now()}`,
          role: 'assistant',
          content: '원래 응답',
          messageType: 'text',
        },
      })

      const updated = await testPrisma.chatMessage.update({
        where: { id: message.id },
        data: {
          content: '수정된 응답',
          metadata: { edited: true, editedAt: new Date().toISOString() },
        },
      })

      expect(updated.content).toBe('수정된 응답')
    })

    it('marks message as read', async () => {
      const user = await createTestUserInDb()

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId: `session_${Date.now()}`,
          role: 'assistant',
          content: '새 메시지',
          messageType: 'text',
          isRead: false,
        },
      })

      const updated = await testPrisma.chatMessage.update({
        where: { id: message.id },
        data: { isRead: true, readAt: new Date() },
      })

      expect(updated.isRead).toBe(true)
    })
  })

  describe('Message Deletion', () => {
    it('deletes single message', async () => {
      const user = await createTestUserInDb()

      const message = await testPrisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId: `session_${Date.now()}`,
          role: 'user',
          content: 'Delete me',
          messageType: 'text',
        },
      })

      await testPrisma.chatMessage.delete({
        where: { id: message.id },
      })

      const found = await testPrisma.chatMessage.findUnique({
        where: { id: message.id },
      })

      expect(found).toBeNull()
    })

    it('deletes all messages in session', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session_${Date.now()}`

      for (let i = 0; i < 5; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId,
            role: 'user',
            content: `Message ${i}`,
            messageType: 'text',
          },
        })
      }

      await testPrisma.chatMessage.deleteMany({
        where: { sessionId },
      })

      const remaining = await testPrisma.chatMessage.findMany({
        where: { sessionId },
      })

      expect(remaining).toHaveLength(0)
    })

    it('deletes old messages', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old messages
      for (let i = 0; i < 3; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: `old_session_${i}`,
            role: 'user',
            content: `Old message ${i}`,
            messageType: 'text',
            createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent messages
      for (let i = 0; i < 2; i++) {
        await testPrisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: `recent_session_${i}`,
            role: 'user',
            content: `Recent message ${i}`,
            messageType: 'text',
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.chatMessage.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.chatMessage.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
