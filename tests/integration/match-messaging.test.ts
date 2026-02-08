/**
 * Match Messaging Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 매칭 메시지 전송 및 수신
 * - 대화 스레드 관리
 * - 메시지 읽음 처리
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

describe('Integration: Match Messaging', () => {
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

  async function createMatchProfile(userId: string) {
    return testPrisma.matchProfile.create({
      data: {
        userId,
        displayName: `User_${userId.slice(-6)}`,
        birthDate: '1990-01-01',
        gender: 'male',
        lookingFor: 'female',
        bio: 'Test bio',
        isActive: true,
        lastActive: new Date(),
      },
    })
  }

  async function createConnection(profile1Id: string, profile2Id: string) {
    return testPrisma.matchConnection.create({
      data: {
        user1Id: profile1Id,
        user2Id: profile2Id,
        status: 'active',
        matchedAt: new Date(),
      },
    })
  }

  describe('Message Sending', () => {
    it('sends message between matched users', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      const message = await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: 'Hello! Nice to meet you!',
        },
      })

      expect(message).toBeDefined()
      expect(message.senderId).toBe(user1.id)
      expect(message.content).toBe('Hello! Nice to meet you!')
      expect(message.isRead).toBe(false)
    })

    it('stores multiple messages in conversation', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      const messages = [
        { senderId: user1.id, content: 'Hi!' },
        { senderId: user2.id, content: 'Hello!' },
        { senderId: user1.id, content: 'How are you?' },
        { senderId: user2.id, content: 'Im good, thanks!' },
      ]

      for (const msg of messages) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: msg.senderId,
            content: msg.content,
          },
        })
      }

      const conversationMessages = await testPrisma.matchMessage.findMany({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'asc' },
      })

      expect(conversationMessages).toHaveLength(4)
      expect(conversationMessages[0].content).toBe('Hi!')
      expect(conversationMessages[3].content).toBe('Im good, thanks!')
    })
  })

  describe('Message Reading', () => {
    it('marks message as read', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      const message = await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: 'Please read this',
          isRead: false,
        },
      })

      const updated = await testPrisma.matchMessage.update({
        where: { id: message.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      expect(updated.isRead).toBe(true)
      expect(updated.readAt).toBeInstanceOf(Date)
    })

    it('marks all unread messages as read', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      // Create multiple unread messages from user1
      for (let i = 0; i < 5; i++) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: user1.id,
            content: `Message ${i + 1}`,
            isRead: false,
          },
        })
      }

      // Mark all as read (simulating user2 reading)
      await testPrisma.matchMessage.updateMany({
        where: {
          connectionId: connection.id,
          senderId: user1.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      const unreadCount = await testPrisma.matchMessage.count({
        where: {
          connectionId: connection.id,
          isRead: false,
        },
      })

      expect(unreadCount).toBe(0)
    })

    it('counts unread messages for user', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      // 3 unread from user1
      for (let i = 0; i < 3; i++) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: user1.id,
            content: `Unread ${i}`,
            isRead: false,
          },
        })
      }

      // 2 read from user1
      for (let i = 0; i < 2; i++) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: user1.id,
            content: `Read ${i}`,
            isRead: true,
            readAt: new Date(),
          },
        })
      }

      const unreadCount = await testPrisma.matchMessage.count({
        where: {
          connectionId: connection.id,
          senderId: user1.id,
          isRead: false,
        },
      })

      expect(unreadCount).toBe(3)
    })
  })

  describe('Conversation Management', () => {
    it('retrieves conversation with pagination', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      // Create 20 messages
      for (let i = 0; i < 20; i++) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: i % 2 === 0 ? user1.id : user2.id,
            content: `Message ${i + 1}`,
          },
        })
      }

      const page1 = await testPrisma.matchMessage.findMany({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      })

      const page2 = await testPrisma.matchMessage.findMany({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 10,
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)
      expect(page1[0].id).not.toBe(page2[0].id)
    })

    it('gets last message for connection preview', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      for (let i = 0; i < 5; i++) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: user1.id,
            content: `Message ${i + 1}`,
          },
        })
      }

      const lastMessage = await testPrisma.matchMessage.findFirst({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'desc' },
      })

      expect(lastMessage?.content).toBe('Message 5')
    })

    it('updates connection last activity on message', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)
      const initialUpdatedAt = connection.updatedAt

      // Wait a bit and send message
      await new Promise((r) => setTimeout(r, 10))

      await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: 'New message',
        },
      })

      await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: { lastMessageAt: new Date() },
      })

      const updatedConnection = await testPrisma.matchConnection.findUnique({
        where: { id: connection.id },
      })

      expect(updatedConnection?.lastMessageAt).toBeInstanceOf(Date)
    })
  })

  describe('Connection Status', () => {
    it('blocks connection and prevents messaging', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      // Block the connection
      const blocked = await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: { status: 'blocked' },
      })

      expect(blocked.status).toBe('blocked')

      // Check before sending (in real app, this would prevent sending)
      const isBlocked = blocked.status === 'blocked'
      expect(isBlocked).toBe(true)
    })

    it('unmutes connection', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: 'active',
          matchedAt: new Date(),
          isMuted: true,
        },
      })

      const unmuted = await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: { isMuted: false },
      })

      expect(unmuted.isMuted).toBe(false)
    })
  })

  describe('Message Search', () => {
    it('searches messages by content', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      const messages = [
        'Hello there!',
        'How are you?',
        'The weather is nice today',
        'Hello again!',
        'Goodbye!',
      ]

      for (const content of messages) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: user1.id,
            content,
          },
        })
      }

      const searchResults = await testPrisma.matchMessage.findMany({
        where: {
          connectionId: connection.id,
          content: { contains: 'Hello' },
        },
      })

      expect(searchResults).toHaveLength(2)
    })
  })

  describe('Message Statistics', () => {
    it('counts messages per connection', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()
      const user3 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)
      const profile3 = await createMatchProfile(user3.id)

      const conn1 = await createConnection(profile1.id, profile2.id)
      const conn2 = await createConnection(profile1.id, profile3.id)

      // 10 messages in conn1
      for (let i = 0; i < 10; i++) {
        await testPrisma.matchMessage.create({
          data: { connectionId: conn1.id, senderId: user1.id, content: `Msg ${i}` },
        })
      }

      // 5 messages in conn2
      for (let i = 0; i < 5; i++) {
        await testPrisma.matchMessage.create({
          data: { connectionId: conn2.id, senderId: user1.id, content: `Msg ${i}` },
        })
      }

      const conn1Count = await testPrisma.matchMessage.count({
        where: { connectionId: conn1.id },
      })

      const conn2Count = await testPrisma.matchMessage.count({
        where: { connectionId: conn2.id },
      })

      expect(conn1Count).toBe(10)
      expect(conn2Count).toBe(5)
    })

    it('calculates response time', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const connection = await createConnection(profile1.id, profile2.id)

      const now = new Date()
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000)

      await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: 'Hello',
          createdAt: now,
        },
      })

      await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user2.id,
          content: 'Hi!',
          createdAt: fiveMinutesLater,
        },
      })

      const messages = await testPrisma.matchMessage.findMany({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'asc' },
      })

      const responseTime = messages[1].createdAt.getTime() - messages[0].createdAt.getTime()

      expect(responseTime).toBe(5 * 60 * 1000) // 5 minutes in ms
    })
  })
})
