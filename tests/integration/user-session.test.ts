/**
 * User Session Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 세션 관리
 * - 세션 유효성 검증
 * - 동시 세션 제어
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

describe('Integration: User Session', () => {
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
    it('creates session on login', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `session_${Date.now()}_${Math.random().toString(36)}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      expect(session.userId).toBe(user.id)
      expect(session.sessionToken).toBeTruthy()
    })

    it('creates session with device info', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `session_${Date.now()}_${Math.random().toString(36)}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          deviceInfo: {
            browser: 'Chrome',
            os: 'Windows',
            device: 'Desktop',
          },
        },
      })

      const deviceInfo = session.deviceInfo as { browser: string }
      expect(deviceInfo.browser).toBe('Chrome')
    })

    it('creates session with IP address', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `session_${Date.now()}_${Math.random().toString(36)}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: '192.168.1.100',
        },
      })

      expect(session.ipAddress).toBe('192.168.1.100')
    })

    it('creates long-lived remember me session', async () => {
      const user = await createTestUserInDb()

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `session_${Date.now()}_${Math.random().toString(36)}`,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          rememberMe: true,
        },
      })

      expect(session.rememberMe).toBe(true)
    })
  })

  describe('Session Validation', () => {
    it('validates active session', async () => {
      const user = await createTestUserInDb()
      const token = `session_${Date.now()}_${Math.random().toString(36)}`

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
      expect(session?.expires.getTime()).toBeGreaterThan(Date.now())
    })

    it('rejects expired session', async () => {
      const user = await createTestUserInDb()
      const token = `session_${Date.now()}_${Math.random().toString(36)}`

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() - 60 * 60 * 1000),
        },
      })

      const session = await testPrisma.session.findFirst({
        where: {
          sessionToken: token,
          expires: { gt: new Date() },
        },
      })

      expect(session).toBeNull()
    })

    it('validates session with user', async () => {
      const user = await createTestUserInDb()
      const token = `session_${Date.now()}_${Math.random().toString(36)}`

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const session = await testPrisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
      })

      expect(session?.user.id).toBe(user.id)
    })
  })

  describe('Session Retrieval', () => {
    it('retrieves all user sessions', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `session_${Date.now()}_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      const sessions = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(sessions).toHaveLength(3)
    })

    it('retrieves active sessions only', async () => {
      const user = await createTestUserInDb()

      // Active sessions
      for (let i = 0; i < 2; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `active_${Date.now()}_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      // Expired sessions
      for (let i = 0; i < 3; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `expired_${Date.now()}_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() - 60 * 60 * 1000),
          },
        })
      }

      const activeSessions = await testPrisma.session.findMany({
        where: {
          userId: user.id,
          expires: { gt: new Date() },
        },
      })

      expect(activeSessions).toHaveLength(2)
    })

    it('retrieves sessions by device', async () => {
      const user = await createTestUserInDb()

      const devices = ['Desktop', 'Mobile', 'Desktop', 'Tablet', 'Mobile']

      for (let i = 0; i < devices.length; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `device_${Date.now()}_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            deviceInfo: { device: devices[i] },
          },
        })
      }

      const sessions = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      const mobileSessions = sessions.filter((s) => {
        const info = s.deviceInfo as { device: string } | null
        return info?.device === 'Mobile'
      })

      expect(mobileSessions).toHaveLength(2)
    })
  })

  describe('Concurrent Session Control', () => {
    it('limits concurrent sessions', async () => {
      const user = await createTestUserInDb()
      const maxSessions = 3

      // Create max sessions
      for (let i = 0; i < maxSessions; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `session_${Date.now()}_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      const activeSessions = await testPrisma.session.findMany({
        where: {
          userId: user.id,
          expires: { gt: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      })

      expect(activeSessions.length).toBe(maxSessions)
    })

    it('removes oldest session when limit exceeded', async () => {
      const user = await createTestUserInDb()

      // Create initial sessions
      const sessions: string[] = []
      for (let i = 0; i < 3; i++) {
        const session = await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `session_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - (3 - i) * 60 * 60 * 1000),
          },
        })
        sessions.push(session.id)
      }

      // Delete oldest
      await testPrisma.session.delete({
        where: { id: sessions[0] },
      })

      const remaining = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })

  describe('Session Activity', () => {
    it('updates last activity', async () => {
      const user = await createTestUserInDb()
      const token = `session_${Date.now()}_${Math.random().toString(36)}`

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 60 * 60 * 1000),
        },
      })

      const updated = await testPrisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
      })

      expect(updated.lastActivity?.getTime()).toBeGreaterThan(session.lastActivity?.getTime() || 0)
    })

    it('extends session on activity', async () => {
      const user = await createTestUserInDb()
      const token = `session_${Date.now()}_${Math.random().toString(36)}`

      const originalExpiry = new Date(Date.now() + 60 * 60 * 1000)

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: originalExpiry,
        },
      })

      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const updated = await testPrisma.session.update({
        where: { id: session.id },
        data: { expires: newExpiry },
      })

      expect(updated.expires.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })

    it('finds inactive sessions', async () => {
      const user = await createTestUserInDb()

      // Active session
      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `active_${Math.random().toString(36)}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastActivity: new Date(),
        },
      })

      // Inactive sessions
      for (let i = 0; i < 2; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `inactive_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        })
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      const inactiveSessions = await testPrisma.session.findMany({
        where: {
          userId: user.id,
          lastActivity: { lt: oneHourAgo },
        },
      })

      expect(inactiveSessions).toHaveLength(2)
    })
  })

  describe('Session Statistics', () => {
    it('counts active sessions by user', async () => {
      const users: string[] = []

      for (let i = 0; i < 3; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        const sessionCount = i + 1
        for (let j = 0; j < sessionCount; j++) {
          await testPrisma.session.create({
            data: {
              userId: user.id,
              sessionToken: `session_${user.id}_${j}_${Math.random().toString(36)}`,
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          })
        }
      }

      const counts = await testPrisma.session.groupBy({
        by: ['userId'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      expect(counts.length).toBe(3)
    })

    it('finds users with most sessions', async () => {
      const users: { id: string; count: number }[] = []

      for (let i = 0; i < 3; i++) {
        const user = await createTestUserInDb()
        const sessionCount = (i + 1) * 2
        users.push({ id: user.id, count: sessionCount })

        for (let j = 0; j < sessionCount; j++) {
          await testPrisma.session.create({
            data: {
              userId: user.id,
              sessionToken: `session_${user.id}_${j}_${Math.random().toString(36)}`,
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          })
        }
      }

      const counts = await testPrisma.session.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((u) => u.id) } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0]._count.id).toBe(6)
    })
  })

  describe('Session Termination', () => {
    it('terminates single session', async () => {
      const user = await createTestUserInDb()
      const token = `session_${Date.now()}_${Math.random().toString(36)}`

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      await testPrisma.session.delete({
        where: { id: session.id },
      })

      const found = await testPrisma.session.findUnique({
        where: { id: session.id },
      })

      expect(found).toBeNull()
    })

    it('terminates all user sessions', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `session_${i}_${Math.random().toString(36)}`,
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

    it('terminates all sessions except current', async () => {
      const user = await createTestUserInDb()
      const currentToken = `current_${Math.random().toString(36)}`

      // Current session
      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: currentToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      // Other sessions
      for (let i = 0; i < 4; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `other_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      await testPrisma.session.deleteMany({
        where: {
          userId: user.id,
          sessionToken: { not: currentToken },
        },
      })

      const remaining = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(1)
      expect(remaining[0].sessionToken).toBe(currentToken)
    })
  })

  describe('Session Cleanup', () => {
    it('removes expired sessions', async () => {
      const user = await createTestUserInDb()

      // Expired sessions
      for (let i = 0; i < 3; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `expired_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        })
      }

      // Active sessions
      for (let i = 0; i < 2; i++) {
        await testPrisma.session.create({
          data: {
            userId: user.id,
            sessionToken: `active_${i}_${Math.random().toString(36)}`,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      await testPrisma.session.deleteMany({
        where: {
          userId: user.id,
          expires: { lt: new Date() },
        },
      })

      const remaining = await testPrisma.session.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
