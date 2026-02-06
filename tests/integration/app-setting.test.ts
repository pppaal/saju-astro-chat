/**
 * App Setting Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 앱 설정 관리
 * - 사용자 환경 설정
 * - 기능 플래그
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

describe('Integration: App Setting', () => {
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

  describe('Global Settings', () => {
    it('creates global app setting', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'maintenance_mode',
          value: { enabled: false, message: null },
          category: 'system',
          isPublic: true,
        },
      })

      expect(setting.key).toBe('maintenance_mode')
    })

    it('creates feature flag setting', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'feature_new_tarot_ui',
          value: { enabled: true, rolloutPercentage: 50 },
          category: 'feature_flags',
          isPublic: false,
        },
      })

      const value = setting.value as { enabled: boolean }
      expect(value.enabled).toBe(true)
    })

    it('creates configuration setting', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'api_rate_limits',
          value: {
            free: { requests: 100, period: 'hour' },
            premium: { requests: 1000, period: 'hour' },
          },
          category: 'configuration',
          isPublic: false,
        },
      })

      const value = setting.value as { free: { requests: number } }
      expect(value.free.requests).toBe(100)
    })

    it('creates content setting', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'welcome_message',
          value: {
            ko: '안녕하세요! 오늘의 운세를 확인해보세요.',
            en: 'Hello! Check your fortune for today.',
          },
          category: 'content',
          isPublic: true,
        },
      })

      const value = setting.value as { ko: string }
      expect(value.ko).toContain('운세')
    })
  })

  describe('User Settings', () => {
    it('creates user notification setting', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'notifications',
          value: {
            push: true,
            email: false,
            sms: false,
            dailyFortune: true,
            weeklyReport: true,
          },
        },
      })

      const value = setting.value as { push: boolean }
      expect(value.push).toBe(true)
    })

    it('creates user display setting', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'display',
          value: {
            theme: 'dark',
            fontSize: 'medium',
            language: 'ko',
            showHanja: true,
          },
        },
      })

      const value = setting.value as { theme: string }
      expect(value.theme).toBe('dark')
    })

    it('creates user privacy setting', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'privacy',
          value: {
            profileVisibility: 'friends',
            showBirthInfo: false,
            allowMatching: true,
            dataCollection: true,
          },
        },
      })

      const value = setting.value as { profileVisibility: string }
      expect(value.profileVisibility).toBe('friends')
    })

    it('creates user calendar setting', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'calendar',
          value: {
            defaultView: 'lunar',
            showSolarDate: true,
            showLunarDate: true,
            firstDayOfWeek: 'monday',
          },
        },
      })

      const value = setting.value as { defaultView: string }
      expect(value.defaultView).toBe('lunar')
    })
  })

  describe('Setting Updates', () => {
    it('updates global setting', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'update_test',
          value: { version: 1 },
          category: 'system',
        },
      })

      const updated = await testPrisma.appSetting.update({
        where: { id: setting.id },
        data: {
          value: { version: 2 },
          updatedAt: new Date(),
        },
      })

      const value = updated.value as { version: number }
      expect(value.version).toBe(2)
    })

    it('updates user setting', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'notifications',
          value: { push: true, email: true },
        },
      })

      const updated = await testPrisma.userSetting.update({
        where: { id: setting.id },
        data: {
          value: { push: false, email: true },
          updatedAt: new Date(),
        },
      })

      const value = updated.value as { push: boolean }
      expect(value.push).toBe(false)
    })

    it('toggles feature flag', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'feature_toggle_test',
          value: { enabled: false },
          category: 'feature_flags',
        },
      })

      const toggled = await testPrisma.appSetting.update({
        where: { id: setting.id },
        data: { value: { enabled: true } },
      })

      const value = toggled.value as { enabled: boolean }
      expect(value.enabled).toBe(true)
    })

    it('merges user setting values', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'display',
          value: { theme: 'light', fontSize: 'medium' },
        },
      })

      const currentValue = setting.value as Record<string, unknown>
      const newValue = { ...currentValue, theme: 'dark', contrast: 'high' }

      const updated = await testPrisma.userSetting.update({
        where: { id: setting.id },
        data: { value: newValue },
      })

      const value = updated.value as { theme: string; fontSize: string; contrast: string }
      expect(value.theme).toBe('dark')
      expect(value.fontSize).toBe('medium')
      expect(value.contrast).toBe('high')
    })
  })

  describe('Setting Retrieval', () => {
    it('retrieves setting by key', async () => {
      await testPrisma.appSetting.create({
        data: {
          key: 'find_by_key',
          value: { test: true },
          category: 'system',
        },
      })

      const setting = await testPrisma.appSetting.findFirst({
        where: { key: 'find_by_key' },
      })

      expect(setting).not.toBeNull()
    })

    it('retrieves settings by category', async () => {
      const categories = ['system', 'feature_flags', 'system', 'content', 'system']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.appSetting.create({
          data: {
            key: `category_test_${i}`,
            value: { index: i },
            category: categories[i],
          },
        })
      }

      const systemSettings = await testPrisma.appSetting.findMany({
        where: { category: 'system' },
      })

      expect(systemSettings).toHaveLength(3)
    })

    it('retrieves public settings', async () => {
      const isPublic = [true, false, true, false, true]

      for (let i = 0; i < isPublic.length; i++) {
        await testPrisma.appSetting.create({
          data: {
            key: `public_test_${i}`,
            value: { index: i },
            category: 'system',
            isPublic: isPublic[i],
          },
        })
      }

      const publicSettings = await testPrisma.appSetting.findMany({
        where: { isPublic: true },
      })

      expect(publicSettings).toHaveLength(3)
    })

    it('retrieves all user settings', async () => {
      const user = await createTestUserInDb()
      const keys = ['notifications', 'display', 'privacy', 'calendar']

      for (const key of keys) {
        await testPrisma.userSetting.create({
          data: {
            userId: user.id,
            key,
            value: { enabled: true },
          },
        })
      }

      const settings = await testPrisma.userSetting.findMany({
        where: { userId: user.id },
      })

      expect(settings).toHaveLength(4)
    })

    it('retrieves user setting with default fallback', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.findFirst({
        where: { userId: user.id, key: 'nonexistent' },
      })

      const defaultValue = { enabled: true }
      const value = setting?.value ?? defaultValue

      expect(value).toEqual(defaultValue)
    })
  })

  describe('Feature Flags', () => {
    it('checks if feature is enabled', async () => {
      await testPrisma.appSetting.create({
        data: {
          key: 'feature_dark_mode',
          value: { enabled: true },
          category: 'feature_flags',
        },
      })

      const setting = await testPrisma.appSetting.findFirst({
        where: { key: 'feature_dark_mode', category: 'feature_flags' },
      })

      const isEnabled = (setting?.value as { enabled: boolean })?.enabled ?? false
      expect(isEnabled).toBe(true)
    })

    it('checks feature with rollout percentage', async () => {
      await testPrisma.appSetting.create({
        data: {
          key: 'feature_new_ui',
          value: { enabled: true, rolloutPercentage: 30 },
          category: 'feature_flags',
        },
      })

      const setting = await testPrisma.appSetting.findFirst({
        where: { key: 'feature_new_ui' },
      })

      const config = setting?.value as { enabled: boolean; rolloutPercentage: number }
      expect(config.rolloutPercentage).toBe(30)
    })

    it('checks feature with user targeting', async () => {
      await testPrisma.appSetting.create({
        data: {
          key: 'feature_beta',
          value: {
            enabled: true,
            targetUserTypes: ['beta_tester', 'premium'],
            excludeRegions: ['US'],
          },
          category: 'feature_flags',
        },
      })

      const setting = await testPrisma.appSetting.findFirst({
        where: { key: 'feature_beta' },
      })

      const config = setting?.value as { targetUserTypes: string[] }
      expect(config.targetUserTypes).toContain('beta_tester')
    })
  })

  describe('Setting History', () => {
    it('tracks setting change history', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'history_test',
          value: { version: 1 },
          category: 'system',
        },
      })

      await testPrisma.settingHistory.create({
        data: {
          settingId: setting.id,
          settingKey: setting.key,
          previousValue: null,
          newValue: { version: 1 },
          changedAt: new Date(),
          changedBy: 'admin',
        },
      })

      // Update setting
      await testPrisma.appSetting.update({
        where: { id: setting.id },
        data: { value: { version: 2 } },
      })

      await testPrisma.settingHistory.create({
        data: {
          settingId: setting.id,
          settingKey: setting.key,
          previousValue: { version: 1 },
          newValue: { version: 2 },
          changedAt: new Date(),
          changedBy: 'admin',
        },
      })

      const history = await testPrisma.settingHistory.findMany({
        where: { settingId: setting.id },
        orderBy: { changedAt: 'desc' },
      })

      expect(history).toHaveLength(2)
    })
  })

  describe('Setting Deletion', () => {
    it('deletes app setting', async () => {
      const setting = await testPrisma.appSetting.create({
        data: {
          key: 'delete_test',
          value: { temp: true },
          category: 'system',
        },
      })

      await testPrisma.appSetting.delete({
        where: { id: setting.id },
      })

      const found = await testPrisma.appSetting.findUnique({
        where: { id: setting.id },
      })

      expect(found).toBeNull()
    })

    it('deletes user setting', async () => {
      const user = await createTestUserInDb()

      const setting = await testPrisma.userSetting.create({
        data: {
          userId: user.id,
          key: 'delete_user_test',
          value: { temp: true },
        },
      })

      await testPrisma.userSetting.delete({
        where: { id: setting.id },
      })

      const found = await testPrisma.userSetting.findUnique({
        where: { id: setting.id },
      })

      expect(found).toBeNull()
    })

    it('resets user settings to default', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.userSetting.create({
          data: {
            userId: user.id,
            key: `reset_test_${i}`,
            value: { custom: true },
          },
        })
      }

      await testPrisma.userSetting.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.userSetting.count({
        where: { userId: user.id },
      })

      expect(remaining).toBe(0)
    })
  })
})
