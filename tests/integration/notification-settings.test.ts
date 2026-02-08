/**
 * Notification Settings Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 알림 설정 관리
 * - 알림 유형별 설정
 * - 알림 스케줄 관리
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

describe('Integration: Notification Settings', () => {
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

  describe('Settings Creation', () => {
    it('creates default notification settings', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
        },
      })

      expect(settings.emailEnabled).toBe(true)
      expect(settings.smsEnabled).toBe(false)
    })

    it('creates settings with custom preferences', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: false,
          smsEnabled: true,
          preferences: {
            dailyFortune: true,
            weeklyDigest: true,
            marketing: false,
            systemAlerts: true,
          },
        },
      })

      const prefs = settings.preferences as { dailyFortune: boolean }
      expect(prefs.dailyFortune).toBe(true)
    })

    it('creates settings with quiet hours', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '07:00',
            timezone: 'Asia/Seoul',
          },
        },
      })

      const quiet = settings.quietHours as { enabled: boolean; start: string }
      expect(quiet.enabled).toBe(true)
      expect(quiet.start).toBe('22:00')
    })

    it('creates settings with frequency limits', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          frequency: {
            maxPerDay: 5,
            maxPerWeek: 20,
            cooldownMinutes: 60,
          },
        },
      })

      const freq = settings.frequency as { maxPerDay: number }
      expect(freq.maxPerDay).toBe(5)
    })
  })

  describe('Settings Retrieval', () => {
    it('retrieves settings by userId', async () => {
      const user = await createTestUserInDb()

      await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: false,
          smsEnabled: false,
        },
      })

      const settings = await testPrisma.notificationSettings.findUnique({
        where: { userId: user.id },
      })

      expect(settings?.pushEnabled).toBe(false)
    })

    it('retrieves users with push enabled', async () => {
      const users: string[] = []
      const pushStates = [true, true, false, true, false]

      for (let i = 0; i < pushStates.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.notificationSettings.create({
          data: {
            userId: user.id,
            emailEnabled: true,
            pushEnabled: pushStates[i],
            smsEnabled: false,
          },
        })
      }

      const pushEnabled = await testPrisma.notificationSettings.findMany({
        where: { userId: { in: users }, pushEnabled: true },
      })

      expect(pushEnabled).toHaveLength(3)
    })

    it('retrieves users with email enabled', async () => {
      const users: string[] = []
      const emailStates = [true, false, true, true, false]

      for (let i = 0; i < emailStates.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.notificationSettings.create({
          data: {
            userId: user.id,
            emailEnabled: emailStates[i],
            pushEnabled: true,
            smsEnabled: false,
          },
        })
      }

      const emailEnabled = await testPrisma.notificationSettings.findMany({
        where: { userId: { in: users }, emailEnabled: true },
      })

      expect(emailEnabled).toHaveLength(3)
    })
  })

  describe('Settings Updates', () => {
    it('toggles email notifications', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
        },
      })

      const updated = await testPrisma.notificationSettings.update({
        where: { id: settings.id },
        data: { emailEnabled: false },
      })

      expect(updated.emailEnabled).toBe(false)
    })

    it('toggles push notifications', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: false,
          smsEnabled: false,
        },
      })

      const updated = await testPrisma.notificationSettings.update({
        where: { id: settings.id },
        data: { pushEnabled: true },
      })

      expect(updated.pushEnabled).toBe(true)
    })

    it('updates preferences', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          preferences: { dailyFortune: true, marketing: true },
        },
      })

      const updated = await testPrisma.notificationSettings.update({
        where: { id: settings.id },
        data: {
          preferences: { dailyFortune: true, marketing: false, newFeatures: true },
        },
      })

      const prefs = updated.preferences as { marketing: boolean }
      expect(prefs.marketing).toBe(false)
    })

    it('updates quiet hours', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          quietHours: { enabled: false },
        },
      })

      const updated = await testPrisma.notificationSettings.update({
        where: { id: settings.id },
        data: {
          quietHours: {
            enabled: true,
            start: '23:00',
            end: '06:00',
          },
        },
      })

      const quiet = updated.quietHours as { enabled: boolean }
      expect(quiet.enabled).toBe(true)
    })

    it('disables all notifications', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: true,
        },
      })

      const updated = await testPrisma.notificationSettings.update({
        where: { id: settings.id },
        data: {
          emailEnabled: false,
          pushEnabled: false,
          smsEnabled: false,
        },
      })

      expect(updated.emailEnabled).toBe(false)
      expect(updated.pushEnabled).toBe(false)
      expect(updated.smsEnabled).toBe(false)
    })
  })

  describe('Settings Statistics', () => {
    it('counts users by notification channel', async () => {
      const users: string[] = []

      const configs = [
        { email: true, push: true, sms: false },
        { email: true, push: false, sms: false },
        { email: true, push: true, sms: true },
        { email: false, push: true, sms: false },
        { email: true, push: true, sms: false },
      ]

      for (const config of configs) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.notificationSettings.create({
          data: {
            userId: user.id,
            emailEnabled: config.email,
            pushEnabled: config.push,
            smsEnabled: config.sms,
          },
        })
      }

      const emailCount = await testPrisma.notificationSettings.count({
        where: { userId: { in: users }, emailEnabled: true },
      })

      const pushCount = await testPrisma.notificationSettings.count({
        where: { userId: { in: users }, pushEnabled: true },
      })

      const smsCount = await testPrisma.notificationSettings.count({
        where: { userId: { in: users }, smsEnabled: true },
      })

      expect(emailCount).toBe(4)
      expect(pushCount).toBe(4)
      expect(smsCount).toBe(1)
    })

    it('groups settings by enabled channels', async () => {
      const users: string[] = []

      for (let i = 0; i < 6; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.notificationSettings.create({
          data: {
            userId: user.id,
            emailEnabled: true,
            pushEnabled: i < 4,
            smsEnabled: false,
          },
        })
      }

      const counts = await testPrisma.notificationSettings.groupBy({
        by: ['pushEnabled'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const pushEnabledCount = counts.find((c) => c.pushEnabled === true)?._count.id
      expect(pushEnabledCount).toBe(4)
    })
  })

  describe('Settings Deletion', () => {
    it('deletes settings', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
        },
      })

      await testPrisma.notificationSettings.delete({
        where: { id: settings.id },
      })

      const found = await testPrisma.notificationSettings.findUnique({
        where: { id: settings.id },
      })

      expect(found).toBeNull()
    })

    it('resets settings to default', async () => {
      const user = await createTestUserInDb()

      await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: false,
          pushEnabled: false,
          smsEnabled: true,
          preferences: { marketing: true },
          quietHours: { enabled: true },
        },
      })

      // Delete and recreate with defaults
      await testPrisma.notificationSettings.deleteMany({
        where: { userId: user.id },
      })

      const newSettings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
        },
      })

      expect(newSettings.emailEnabled).toBe(true)
      expect(newSettings.smsEnabled).toBe(false)
    })
  })

  describe('Notification Type Settings', () => {
    it('manages daily fortune notification', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          preferences: {
            dailyFortune: {
              enabled: true,
              time: '08:00',
              channels: ['push', 'email'],
            },
          },
        },
      })

      const prefs = settings.preferences as {
        dailyFortune: { enabled: boolean; time: string }
      }
      expect(prefs.dailyFortune.time).toBe('08:00')
    })

    it('manages match notification', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          preferences: {
            matchNotifications: {
              newMatch: true,
              newMessage: true,
              profileView: false,
            },
          },
        },
      })

      const prefs = settings.preferences as {
        matchNotifications: { newMatch: boolean }
      }
      expect(prefs.matchNotifications.newMatch).toBe(true)
    })

    it('manages promotional notifications', async () => {
      const user = await createTestUserInDb()

      const settings = await testPrisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          preferences: {
            promotional: {
              enabled: false,
              unsubscribedAt: new Date().toISOString(),
            },
          },
        },
      })

      const prefs = settings.preferences as {
        promotional: { enabled: boolean }
      }
      expect(prefs.promotional.enabled).toBe(false)
    })
  })
})
