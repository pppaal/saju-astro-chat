/**
 * User Preference Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 설정 저장
 * - 테마 및 언어 설정
 * - 개인화 옵션
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

describe('Integration: User Preference', () => {
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
    it('creates default preferences', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      expect(pref.theme).toBe('light')
      expect(pref.language).toBe('ko')
    })

    it('creates preferences with dark theme', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'dark',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      expect(pref.theme).toBe('dark')
    })

    it('creates preferences with English language', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'en',
          timezone: 'America/New_York',
        },
      })

      expect(pref.language).toBe('en')
      expect(pref.timezone).toBe('America/New_York')
    })

    it('creates preferences with fortune settings', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          fortuneSettings: {
            showDailyFortune: true,
            fortuneTime: '08:00',
            includeCareer: true,
            includeLove: true,
            includeHealth: true,
            includeMoney: false,
          },
        },
      })

      const settings = pref.fortuneSettings as { showDailyFortune: boolean }
      expect(settings.showDailyFortune).toBe(true)
    })

    it('creates preferences with display options', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          displayOptions: {
            fontSize: 'large',
            showAnimations: true,
            compactMode: false,
            showTooltips: true,
          },
        },
      })

      const options = pref.displayOptions as { fontSize: string }
      expect(options.fontSize).toBe('large')
    })
  })

  describe('Preference Retrieval', () => {
    it('retrieves preferences by user', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'dark',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      const pref = await testPrisma.userPreference.findUnique({
        where: { userId: user.id },
      })

      expect(pref?.theme).toBe('dark')
    })

    it('retrieves users by theme', async () => {
      const users: string[] = []
      const themes = ['light', 'dark', 'dark', 'light', 'dark']

      for (let i = 0; i < themes.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreference.create({
          data: {
            userId: user.id,
            theme: themes[i],
            language: 'ko',
            timezone: 'Asia/Seoul',
          },
        })
      }

      const darkUsers = await testPrisma.userPreference.findMany({
        where: { userId: { in: users }, theme: 'dark' },
      })

      expect(darkUsers).toHaveLength(3)
    })

    it('retrieves users by language', async () => {
      const users: string[] = []
      const languages = ['ko', 'en', 'ko', 'ja', 'ko']

      for (let i = 0; i < languages.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreference.create({
          data: {
            userId: user.id,
            theme: 'light',
            language: languages[i],
            timezone: 'Asia/Seoul',
          },
        })
      }

      const koreanUsers = await testPrisma.userPreference.findMany({
        where: { userId: { in: users }, language: 'ko' },
      })

      expect(koreanUsers).toHaveLength(3)
    })

    it('retrieves users by timezone', async () => {
      const users: string[] = []
      const timezones = [
        'Asia/Seoul',
        'America/New_York',
        'Asia/Seoul',
        'Europe/London',
        'Asia/Seoul',
      ]

      for (let i = 0; i < timezones.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreference.create({
          data: {
            userId: user.id,
            theme: 'light',
            language: 'ko',
            timezone: timezones[i],
          },
        })
      }

      const seoulUsers = await testPrisma.userPreference.findMany({
        where: { userId: { in: users }, timezone: 'Asia/Seoul' },
      })

      expect(seoulUsers).toHaveLength(3)
    })
  })

  describe('Preference Statistics', () => {
    it('counts users by theme', async () => {
      const users: string[] = []
      const themes = ['light', 'dark', 'dark', 'dark', 'light', 'system']

      for (let i = 0; i < themes.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreference.create({
          data: {
            userId: user.id,
            theme: themes[i],
            language: 'ko',
            timezone: 'Asia/Seoul',
          },
        })
      }

      const counts = await testPrisma.userPreference.groupBy({
        by: ['theme'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const darkCount = counts.find((c) => c.theme === 'dark')?._count.id
      expect(darkCount).toBe(3)
    })

    it('counts users by language', async () => {
      const users: string[] = []
      const languages = ['ko', 'ko', 'en', 'ko', 'ja', 'en']

      for (let i = 0; i < languages.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreference.create({
          data: {
            userId: user.id,
            theme: 'light',
            language: languages[i],
            timezone: 'Asia/Seoul',
          },
        })
      }

      const counts = await testPrisma.userPreference.groupBy({
        by: ['language'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const koCount = counts.find((c) => c.language === 'ko')?._count.id
      expect(koCount).toBe(3)
    })

    it('finds most popular timezone', async () => {
      const users: string[] = []
      const timezones = [
        'Asia/Seoul',
        'Asia/Seoul',
        'America/New_York',
        'Asia/Seoul',
        'Europe/London',
      ]

      for (let i = 0; i < timezones.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userPreference.create({
          data: {
            userId: user.id,
            theme: 'light',
            language: 'ko',
            timezone: timezones[i],
          },
        })
      }

      const counts = await testPrisma.userPreference.groupBy({
        by: ['timezone'],
        where: { userId: { in: users } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0].timezone).toBe('Asia/Seoul')
    })
  })

  describe('Preference Updates', () => {
    it('updates theme', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: { theme: 'dark' },
      })

      expect(updated.theme).toBe('dark')
    })

    it('updates language', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: { language: 'en' },
      })

      expect(updated.language).toBe('en')
    })

    it('updates timezone', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: { timezone: 'America/Los_Angeles' },
      })

      expect(updated.timezone).toBe('America/Los_Angeles')
    })

    it('updates fortune settings', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          fortuneSettings: { showDailyFortune: true },
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: {
          fortuneSettings: {
            showDailyFortune: false,
            fortuneTime: '09:00',
          },
        },
      })

      const settings = updated.fortuneSettings as { showDailyFortune: boolean }
      expect(settings.showDailyFortune).toBe(false)
    })

    it('updates display options', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          displayOptions: { fontSize: 'medium' },
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: {
          displayOptions: {
            fontSize: 'large',
            showAnimations: false,
          },
        },
      })

      const options = updated.displayOptions as { fontSize: string }
      expect(options.fontSize).toBe('large')
    })
  })

  describe('Preference Reset', () => {
    it('resets to defaults', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'dark',
          language: 'en',
          timezone: 'America/New_York',
          fortuneSettings: { customSetting: true },
          displayOptions: { customOption: true },
        },
      })

      const reset = await testPrisma.userPreference.update({
        where: { userId: user.id },
        data: {
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          fortuneSettings: null,
          displayOptions: null,
        },
      })

      expect(reset.theme).toBe('light')
      expect(reset.fortuneSettings).toBeNull()
    })
  })

  describe('Preference Deletion', () => {
    it('deletes preferences', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
        },
      })

      await testPrisma.userPreference.delete({
        where: { id: pref.id },
      })

      const found = await testPrisma.userPreference.findUnique({
        where: { id: pref.id },
      })

      expect(found).toBeNull()
    })
  })

  describe('Accessibility Settings', () => {
    it('stores accessibility preferences', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          accessibilitySettings: {
            screenReaderOptimized: true,
            highContrast: false,
            reducedMotion: true,
            largeText: true,
          },
        },
      })

      const settings = pref.accessibilitySettings as { screenReaderOptimized: boolean }
      expect(settings.screenReaderOptimized).toBe(true)
    })

    it('updates accessibility settings', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          accessibilitySettings: { highContrast: false },
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: {
          accessibilitySettings: { highContrast: true },
        },
      })

      const settings = updated.accessibilitySettings as { highContrast: boolean }
      expect(settings.highContrast).toBe(true)
    })
  })

  describe('Privacy Settings', () => {
    it('stores privacy preferences', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          privacySettings: {
            shareReadingHistory: false,
            allowAnalytics: true,
            showOnlineStatus: false,
            allowDataExport: true,
          },
        },
      })

      const settings = pref.privacySettings as { shareReadingHistory: boolean }
      expect(settings.shareReadingHistory).toBe(false)
    })

    it('updates privacy settings', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userPreference.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'ko',
          timezone: 'Asia/Seoul',
          privacySettings: { allowAnalytics: true },
        },
      })

      const updated = await testPrisma.userPreference.update({
        where: { id: pref.id },
        data: {
          privacySettings: { allowAnalytics: false },
        },
      })

      const settings = updated.privacySettings as { allowAnalytics: boolean }
      expect(settings.allowAnalytics).toBe(false)
    })
  })
})
