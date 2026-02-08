/**
 * Session Management Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 세션 관리
 * - 세션 만료 처리
 * - 다중 세션 관리
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

describe('Integration: Session Management', () => {
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

  describe('Session Creation', () => {
    it('creates new session for user', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `session_${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      expect(session).toBeDefined()
      expect(session.userId).toBe(user.id)
      expect(session.expires > new Date()).toBe(true)
    })

    it('creates session with custom expiry', async () => {
      const user = await createTestUserInDb()

      const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `long_session_${Date.now()}`,
          expires: oneWeekLater,
        },
      })

      expect(session.expires.getTime()).toBeCloseTo(oneWeekLater.getTime(), -3)
    })

    it('creates multiple sessions for same user', async () => {
      const user = await createTestUserInDb()

      const devices = ['mobile', 'desktop', 'tablet']

      for (const device of devices) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `${device}_${Date.now()}_${Math.random()}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      const sessions = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(sessions).toHaveLength(3)
    })
  })

  describe('Session Validation', () => {
    it('validates active session', async () => {
      const user = await createTestUserInDb()
      const token = `valid_session_${Date.now()}`

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      })

      const session = await testPrisma.session.findUnique({
        where: { sessionToken: token },
      })

      const isValid = session && session.expires > new Date()
      expect(isValid).toBe(true)
    })

    it('detects expired session', async () => {
      const user = await createTestUserInDb()
      const token = `expired_session_${Date.now()}`

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      })

      const session = await testPrisma.session.findUnique({
        where: { sessionToken: token },
      })

      const isValid = session && session.expires > new Date()
      expect(isValid).toBe(false)
    })

    it('finds session by token', async () => {
      const user = await createTestUserInDb()
      const token = `find_me_${Date.now()}`

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const session = await testPrisma.session.findUnique({
        where: { sessionToken: token },
      })

      expect(session).not.toBeNull()
      expect(session?.userId).toBe(user.id)
    })
  })

  describe('Session Expiry Management', () => {
    it('extends session expiry', async () => {
      const user = await createTestUserInDb()
      const token = `extend_me_${Date.now()}`

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      })

      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const extended = await testPrisma.session.update({
        where: { id: session.id },
        data: { expires: newExpiry },
      })

      expect(extended.expires > session.expires).toBe(true)
    })

    it('cleans up expired sessions', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Create expired sessions
      for (let i = 0; i < 5; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `expired_${i}_${Date.now()}`,
            expires: past,
          },
        })
      }

      // Create valid sessions
      for (let i = 0; i < 2; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `valid_${i}_${Date.now()}`,
            expires: future,
          },
        })
      }

      // Delete expired
      await testPrisma.session.deleteMany({
        where: {
          userId: user.id,
          expires: { lt: now },
        },
      })

      const remaining = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })

  describe('Session Termination', () => {
    it('deletes single session (logout)', async () => {
      const user = await createTestUserInDb()
      const token = `logout_me_${Date.now()}`

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      await testPrisma.session.delete({
        where: { sessionToken: token },
      })

      const found = await testPrisma.session.findUnique({
        where: { sessionToken: token },
      })

      expect(found).toBeNull()
    })

    it('deletes all user sessions (logout all devices)', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `device_${i}_${Date.now()}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      await testPrisma.session.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })
  })

  describe('Account Provider Management', () => {
    it('creates OAuth account link', async () => {
      const user = await createTestUserInDb()

      const account = await testPrisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: `google_${Date.now()}`,
          access_token: 'access_token_here',
          refresh_token: 'refresh_token_here',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      })

      expect(account).toBeDefined()
      expect(account.provider).toBe('google')
    })

    it('links multiple providers to user', async () => {
      const user = await createTestUserInDb()

      const providers = ['google', 'kakao', 'naver']

      for (const provider of providers) {
        await testPrisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider,
            providerAccountId: `${provider}_${Date.now()}`,
          },
        })
      }

      const accounts = await testPrisma.account.findMany({
        where: { userId: user.id },
      })

      expect(accounts).toHaveLength(3)
    })

    it('finds account by provider', async () => {
      const user = await createTestUserInDb()
      const providerAccountId = `kakao_unique_${Date.now()}`

      await testPrisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'kakao',
          providerAccountId,
        },
      })

      const account = await testPrisma.account.findFirst({
        where: {
          provider: 'kakao',
          providerAccountId,
        },
      })

      expect(account).not.toBeNull()
      expect(account?.userId).toBe(user.id)
    })

    it('updates account tokens', async () => {
      const user = await createTestUserInDb()

      const account = await testPrisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: `google_refresh_${Date.now()}`,
          access_token: 'old_access_token',
          refresh_token: 'old_refresh_token',
        },
      })

      const updated = await testPrisma.account.update({
        where: { id: account.id },
        data: {
          access_token: 'new_access_token',
          expires_at: Math.floor(Date.now() / 1000) + 7200,
        },
      })

      expect(updated.access_token).toBe('new_access_token')
    })

    it('removes account link', async () => {
      const user = await createTestUserInDb()

      const account = await testPrisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'naver',
          providerAccountId: `naver_remove_${Date.now()}`,
        },
      })

      await testPrisma.account.delete({
        where: { id: account.id },
      })

      const found = await testPrisma.account.findUnique({
        where: { id: account.id },
      })

      expect(found).toBeNull()
    })
  })

  describe('Session and Account Isolation', () => {
    it('isolates sessions between users', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      await testPrisma.session.create({
        data: {
          userId: user1.id,
          sessionToken: `user1_session_${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      await testPrisma.session.create({
        data: {
          userId: user2.id,
          sessionToken: `user2_session_${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const user1Sessions = await testPrisma.session.findMany({
        where: { userId: user1.id },
      })

      const user2Sessions = await testPrisma.session.findMany({
        where: { userId: user2.id },
      })

      expect(user1Sessions).toHaveLength(1)
      expect(user2Sessions).toHaveLength(1)
      expect(user1Sessions[0].userId).not.toBe(user2Sessions[0].userId)
    })

    it('isolates accounts between users', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      await testPrisma.account.create({
        data: {
          userId: user1.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: `google_user1_${Date.now()}`,
        },
      })

      await testPrisma.account.create({
        data: {
          userId: user2.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: `google_user2_${Date.now()}`,
        },
      })

      const user1Accounts = await testPrisma.account.findMany({
        where: { userId: user1.id },
      })

      expect(user1Accounts).toHaveLength(1)
      expect(user1Accounts[0].userId).toBe(user1.id)
    })
  })
})
