/**
 * Login History Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 로그인 기록 저장
 * - 보안 분석
 * - 이상 탐지
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

describe('Integration: Login History', () => {
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

  describe('Login Recording', () => {
    it('records successful login', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
          loginMethod: 'email',
          status: 'success',
        },
      })

      expect(login.status).toBe('success')
      expect(login.loginMethod).toBe('email')
    })

    it('records failed login', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'email',
          status: 'failed',
          failureReason: 'Invalid password',
        },
      })

      expect(login.status).toBe('failed')
      expect(login.failureReason).toBe('Invalid password')
    })

    it('records social login', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'google',
          status: 'success',
          socialProvider: 'google',
        },
      })

      expect(login.loginMethod).toBe('google')
      expect(login.socialProvider).toBe('google')
    })

    it('records login with location', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'email',
          status: 'success',
          country: 'KR',
          city: 'Seoul',
          latitude: 37.5665,
          longitude: 126.978,
        },
      })

      expect(login.country).toBe('KR')
      expect(login.city).toBe('Seoul')
    })

    it('records login with device info', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
          loginMethod: 'email',
          status: 'success',
          deviceType: 'mobile',
          platform: 'ios',
          browserName: 'Safari',
          browserVersion: '17.0',
        },
      })

      expect(login.deviceType).toBe('mobile')
      expect(login.browserName).toBe('Safari')
    })
  })

  describe('Login Retrieval', () => {
    it('retrieves login history by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
          },
        })
      }

      const history = await testPrisma.loginHistory.findMany({
        where: { userId: user.id },
      })

      expect(history).toHaveLength(5)
    })

    it('retrieves successful logins only', async () => {
      const user = await createTestUserInDb()

      const statuses = ['success', 'failed', 'success', 'failed', 'success']

      for (const status of statuses) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status,
          },
        })
      }

      const successfulLogins = await testPrisma.loginHistory.findMany({
        where: { userId: user.id, status: 'success' },
      })

      expect(successfulLogins).toHaveLength(3)
    })

    it('retrieves recent logins first', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: `192.168.1.${i}`,
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
          },
        })
      }

      const logins = await testPrisma.loginHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(logins[0].ipAddress).toBe('192.168.1.4')
    })

    it('retrieves logins by IP address', async () => {
      const user = await createTestUserInDb()

      const ips = ['192.168.1.1', '203.0.113.1', '192.168.1.1', '10.0.0.1', '192.168.1.1']

      for (const ip of ips) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: ip,
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
          },
        })
      }

      const loginsFromIp = await testPrisma.loginHistory.findMany({
        where: { userId: user.id, ipAddress: '192.168.1.1' },
      })

      expect(loginsFromIp).toHaveLength(3)
    })

    it('retrieves logins by date range', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
            createdAt: date,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentLogins = await testPrisma.loginHistory.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
      })

      expect(recentLogins).toHaveLength(8)
    })
  })

  describe('Security Analysis', () => {
    it('counts failed login attempts', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'failed',
            failureReason: 'Invalid password',
          },
        })
      }

      const failedCount = await testPrisma.loginHistory.count({
        where: { userId: user.id, status: 'failed' },
      })

      expect(failedCount).toBe(5)
    })

    it('detects multiple IPs', async () => {
      const user = await createTestUserInDb()

      const ips = ['192.168.1.1', '203.0.113.1', '10.0.0.1', '172.16.0.1']

      for (const ip of ips) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: ip,
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
          },
        })
      }

      const uniqueIps = await testPrisma.loginHistory.findMany({
        where: { userId: user.id },
        distinct: ['ipAddress'],
      })

      expect(uniqueIps).toHaveLength(4)
    })

    it('detects suspicious country changes', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Login from Korea
      await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '211.0.0.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'email',
          status: 'success',
          country: 'KR',
          createdAt: new Date(now.getTime() - 3600000),
        },
      })

      // Login from US (1 hour later - impossible travel)
      await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'email',
          status: 'success',
          country: 'US',
          createdAt: now,
        },
      })

      const countries = await testPrisma.loginHistory.findMany({
        where: { userId: user.id },
        distinct: ['country'],
      })

      expect(countries).toHaveLength(2)
    })

    it('identifies new device logins', async () => {
      const user = await createTestUserInDb()

      const devices = [
        { type: 'mobile', platform: 'ios' },
        { type: 'mobile', platform: 'ios' },
        { type: 'desktop', platform: 'windows' },
        { type: 'mobile', platform: 'android' },
      ]

      for (const device of devices) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
            deviceType: device.type,
            platform: device.platform,
          },
        })
      }

      const uniqueDevices = await testPrisma.loginHistory.findMany({
        where: { userId: user.id },
        distinct: ['deviceType', 'platform'],
      })

      expect(uniqueDevices).toHaveLength(3)
    })
  })

  describe('Login Statistics', () => {
    it('counts logins by method', async () => {
      const user = await createTestUserInDb()

      const methods = ['email', 'google', 'email', 'kakao', 'email', 'google']

      for (const method of methods) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: method,
            status: 'success',
          },
        })
      }

      const counts = await testPrisma.loginHistory.groupBy({
        by: ['loginMethod'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const emailCount = counts.find((c) => c.loginMethod === 'email')?._count.id
      expect(emailCount).toBe(3)
    })

    it('counts logins by status', async () => {
      const user = await createTestUserInDb()

      const statuses = ['success', 'success', 'failed', 'success', 'blocked']

      for (const status of statuses) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status,
          },
        })
      }

      const counts = await testPrisma.loginHistory.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const successCount = counts.find((c) => c.status === 'success')?._count.id
      expect(successCount).toBe(3)
    })

    it('counts logins by country', async () => {
      const users: string[] = []
      const countries = ['KR', 'US', 'KR', 'KR', 'JP', 'US']

      for (let i = 0; i < countries.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
            country: countries[i],
          },
        })
      }

      const counts = await testPrisma.loginHistory.groupBy({
        by: ['country'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const krCount = counts.find((c) => c.country === 'KR')?._count.id
      expect(krCount).toBe(3)
    })

    it('calculates daily login count', async () => {
      const user = await createTestUserInDb()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 5; i++) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
          },
        })
      }

      const todayLogins = await testPrisma.loginHistory.count({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      })

      expect(todayLogins).toBe(5)
    })
  })

  describe('Login Session', () => {
    it('records session duration', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'email',
          status: 'success',
          sessionId: `session_${Date.now()}`,
        },
      })

      // Simulate logout after 30 minutes
      const updated = await testPrisma.loginHistory.update({
        where: { id: login.id },
        data: {
          logoutAt: new Date(Date.now() + 30 * 60 * 1000),
          sessionDuration: 30 * 60,
        },
      })

      expect(updated.sessionDuration).toBe(1800)
    })

    it('marks session as expired', async () => {
      const user = await createTestUserInDb()

      const login = await testPrisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          loginMethod: 'email',
          status: 'success',
          sessionId: `session_${Date.now()}`,
        },
      })

      const updated = await testPrisma.loginHistory.update({
        where: { id: login.id },
        data: {
          sessionExpired: true,
          sessionExpiredAt: new Date(),
        },
      })

      expect(updated.sessionExpired).toBe(true)
    })
  })

  describe('Login Cleanup', () => {
    it('deletes old login history', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old logins
      for (let i = 0; i < 3; i++) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
            createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent logins
      for (let i = 0; i < 2; i++) {
        await testPrisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            loginMethod: 'email',
            status: 'success',
          },
        })
      }

      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      await testPrisma.loginHistory.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: oneYearAgo },
        },
      })

      const remaining = await testPrisma.loginHistory.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
