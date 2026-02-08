/**
 * User Preferences Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 환경설정 관리
 * - 알림 설정
 * - 테마 및 언어 선호도
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

describe('Integration: User Preferences', () => {
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

  describe('Preference Creation', () => {
    it('creates user preferences with language', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
        },
      })

      expect(prefs).toBeDefined()
      expect(prefs.preferredLanguage).toBe('ko')
    })

    it('creates preferences with themes', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'en',
          preferredThemes: ['career', 'love', 'health'],
        },
      })

      expect(prefs.preferredThemes).toEqual(['career', 'love', 'health'])
    })

    it('creates preferences with notification settings', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
          notificationSettings: {
            email: {
              dailyFortune: true,
              weeklyDigest: true,
              marketing: false,
            },
            push: {
              enabled: true,
              dailyReminder: true,
            },
          },
        },
      })

      const settings = prefs.notificationSettings as {
        email: { dailyFortune: boolean }
      }
      expect(settings.email.dailyFortune).toBe(true)
    })

    it('creates default preferences for new user', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
          preferredThemes: [],
          notificationSettings: {
            email: { all: true },
            push: { all: true },
          },
        },
      })

      expect(prefs.preferredLanguage).toBe('ko')
    })
  })

  describe('Preference Updates', () => {
    it('updates language preference', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
        },
      })

      const updated = await testPrisma.userPreferences.update({
        where: { id: prefs.id },
        data: { preferredLanguage: 'en' },
      })

      expect(updated.preferredLanguage).toBe('en')
    })

    it('updates theme preferences', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
          preferredThemes: ['career'],
        },
      })

      const updated = await testPrisma.userPreferences.update({
        where: { id: prefs.id },
        data: {
          preferredThemes: ['career', 'love', 'wealth'],
        },
      })

      expect(updated.preferredThemes).toHaveLength(3)
    })

    it('toggles notification settings', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
          notificationSettings: {
            email: { dailyFortune: true },
            push: { enabled: true },
          },
        },
      })

      const updated = await testPrisma.userPreferences.update({
        where: { id: prefs.id },
        data: {
          notificationSettings: {
            email: { dailyFortune: false },
            push: { enabled: false },
          },
        },
      })

      const settings = updated.notificationSettings as {
        email: { dailyFortune: boolean }
        push: { enabled: boolean }
      }
      expect(settings.email.dailyFortune).toBe(false)
      expect(settings.push.enabled).toBe(false)
    })

    it('adds new theme to existing preferences', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
          preferredThemes: ['career', 'love'],
        },
      })

      const currentThemes = prefs.preferredThemes as string[]

      const updated = await testPrisma.userPreferences.update({
        where: { id: prefs.id },
        data: {
          preferredThemes: [...currentThemes, 'health'],
        },
      })

      expect(updated.preferredThemes).toContain('health')
      expect(updated.preferredThemes).toHaveLength(3)
    })
  })

  describe('Preference Retrieval', () => {
    it('retrieves user preferences by userId', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ja',
          preferredThemes: ['fortune', 'astrology'],
        },
      })

      const prefs = await testPrisma.userPreferences.findFirst({
        where: { userId: user.id },
      })

      expect(prefs).not.toBeNull()
      expect(prefs?.preferredLanguage).toBe('ja')
    })

    it('returns null for user without preferences', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.findFirst({
        where: { userId: user.id },
      })

      expect(prefs).toBeNull()
    })
  })

  describe('Language Preference Analysis', () => {
    it('groups users by language preference', async () => {
      const users: string[] = []

      const languages = ['ko', 'ko', 'ko', 'en', 'en', 'ja']

      for (const lang of languages) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreferences.create({
          data: {
            userId: user.id,
            preferredLanguage: lang,
          },
        })
      }

      const languageCounts = await testPrisma.userPreferences.groupBy({
        by: ['preferredLanguage'],
        where: { userId: { in: users } },
        _count: { userId: true },
      })

      const koCount = languageCounts.find((l) => l.preferredLanguage === 'ko')?._count.userId
      const enCount = languageCounts.find((l) => l.preferredLanguage === 'en')?._count.userId

      expect(koCount).toBe(3)
      expect(enCount).toBe(2)
    })
  })

  describe('Theme Preference Analysis', () => {
    it('finds users interested in specific themes', async () => {
      const users: string[] = []

      const themePrefs = [
        ['career', 'love'],
        ['health', 'wealth'],
        ['career', 'health'],
        ['love', 'career'],
      ]

      for (const themes of themePrefs) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreferences.create({
          data: {
            userId: user.id,
            preferredLanguage: 'ko',
            preferredThemes: themes,
          },
        })
      }

      const allPrefs = await testPrisma.userPreferences.findMany({
        where: { userId: { in: users } },
      })

      const careerInterested = allPrefs.filter((p) => {
        const themes = p.preferredThemes as string[] | null
        return themes?.includes('career')
      })

      expect(careerInterested).toHaveLength(3)
    })
  })

  describe('Notification Settings', () => {
    it('finds users with email notifications enabled', async () => {
      const users: string[] = []

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreferences.create({
          data: {
            userId: user.id,
            preferredLanguage: 'ko',
            notificationSettings: {
              email: { enabled: i < 3 },
            },
          },
        })
      }

      const allPrefs = await testPrisma.userPreferences.findMany({
        where: { userId: { in: users } },
      })

      const emailEnabled = allPrefs.filter((p) => {
        const settings = p.notificationSettings as { email?: { enabled?: boolean } } | null
        return settings?.email?.enabled === true
      })

      expect(emailEnabled).toHaveLength(3)
    })

    it('finds users with push notifications enabled', async () => {
      const users: string[] = []

      for (let i = 0; i < 4; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreferences.create({
          data: {
            userId: user.id,
            preferredLanguage: 'ko',
            notificationSettings: {
              push: { enabled: i % 2 === 0 },
            },
          },
        })
      }

      const allPrefs = await testPrisma.userPreferences.findMany({
        where: { userId: { in: users } },
      })

      const pushEnabled = allPrefs.filter((p) => {
        const settings = p.notificationSettings as { push?: { enabled?: boolean } } | null
        return settings?.push?.enabled === true
      })

      expect(pushEnabled).toHaveLength(2)
    })
  })

  describe('Preference Deletion', () => {
    it('deletes user preferences', async () => {
      const user = await createTestUserInDb()

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ko',
        },
      })

      await testPrisma.userPreferences.delete({
        where: { id: prefs.id },
      })

      const found = await testPrisma.userPreferences.findFirst({
        where: { userId: user.id },
      })

      expect(found).toBeNull()
    })

    it('resets preferences to default', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'ja',
          preferredThemes: ['career', 'love', 'health'],
          notificationSettings: {
            email: { all: false },
            push: { all: false },
          },
        },
      })

      // Reset by updating to defaults
      const reset = await testPrisma.userPreferences.updateMany({
        where: { userId: user.id },
        data: {
          preferredLanguage: 'ko',
          preferredThemes: [],
          notificationSettings: {
            email: { all: true },
            push: { all: true },
          },
        },
      })

      expect(reset.count).toBe(1)

      const prefs = await testPrisma.userPreferences.findFirst({
        where: { userId: user.id },
      })

      expect(prefs?.preferredLanguage).toBe('ko')
    })
  })
})
