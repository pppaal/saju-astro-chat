/**
 * Localization Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 다국어 지원
 * - 번역 관리
 * - 지역화 설정
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

describe('Integration: Localization', () => {
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

  describe('Language Management', () => {
    it('creates supported language', async () => {
      const language = await testPrisma.language.create({
        data: {
          code: 'ko',
          name: '한국어',
          nativeName: '한국어',
          isActive: true,
          isDefault: true,
        },
      })

      expect(language.code).toBe('ko')
      expect(language.isDefault).toBe(true)
    })

    it('creates multiple languages', async () => {
      const languages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
      ]

      for (const lang of languages) {
        await testPrisma.language.create({
          data: {
            ...lang,
            isActive: true,
            isDefault: false,
          },
        })
      }

      const count = await testPrisma.language.count({
        where: { isActive: true },
      })

      expect(count).toBe(3)
    })

    it('sets language as default', async () => {
      const lang1 = await testPrisma.language.create({
        data: {
          code: 'lang1',
          name: 'Language 1',
          nativeName: 'Lang 1',
          isActive: true,
          isDefault: true,
        },
      })

      const lang2 = await testPrisma.language.create({
        data: {
          code: 'lang2',
          name: 'Language 2',
          nativeName: 'Lang 2',
          isActive: true,
          isDefault: false,
        },
      })

      // Change default
      await testPrisma.language.update({
        where: { id: lang1.id },
        data: { isDefault: false },
      })

      const newDefault = await testPrisma.language.update({
        where: { id: lang2.id },
        data: { isDefault: true },
      })

      expect(newDefault.isDefault).toBe(true)
    })
  })

  describe('Translation Management', () => {
    it('creates translation entry', async () => {
      const translation = await testPrisma.translation.create({
        data: {
          key: 'common.welcome',
          languageCode: 'ko',
          value: '환영합니다!',
          namespace: 'common',
        },
      })

      expect(translation.key).toBe('common.welcome')
      expect(translation.value).toBe('환영합니다!')
    })

    it('creates translations for multiple languages', async () => {
      const translations = [
        { languageCode: 'ko', value: '안녕하세요' },
        { languageCode: 'en', value: 'Hello' },
        { languageCode: 'ja', value: 'こんにちは' },
      ]

      for (const t of translations) {
        await testPrisma.translation.create({
          data: {
            key: 'common.greeting',
            languageCode: t.languageCode,
            value: t.value,
            namespace: 'common',
          },
        })
      }

      const greetings = await testPrisma.translation.findMany({
        where: { key: 'common.greeting' },
      })

      expect(greetings).toHaveLength(3)
    })

    it('creates translation with context', async () => {
      const translation = await testPrisma.translation.create({
        data: {
          key: 'tarot.card.fool',
          languageCode: 'ko',
          value: '광대',
          namespace: 'tarot',
          context: '타로 카드 이름',
          description: 'Major Arcana 0번 카드',
        },
      })

      expect(translation.context).toBe('타로 카드 이름')
    })

    it('creates translation with pluralization', async () => {
      const translation = await testPrisma.translation.create({
        data: {
          key: 'credits.remaining',
          languageCode: 'en',
          value: '{{count}} credit remaining',
          pluralValue: '{{count}} credits remaining',
          namespace: 'credits',
        },
      })

      expect(translation.pluralValue).toContain('credits')
    })
  })

  describe('Translation Retrieval', () => {
    it('retrieves translation by key and language', async () => {
      await testPrisma.translation.create({
        data: {
          key: 'saju.title',
          languageCode: 'ko',
          value: '사주팔자',
          namespace: 'saju',
        },
      })

      const translation = await testPrisma.translation.findFirst({
        where: { key: 'saju.title', languageCode: 'ko' },
      })

      expect(translation?.value).toBe('사주팔자')
    })

    it('retrieves all translations for namespace', async () => {
      const keys = ['menu.home', 'menu.profile', 'menu.settings', 'menu.help']

      for (const key of keys) {
        await testPrisma.translation.create({
          data: {
            key,
            languageCode: 'ko',
            value: `${key} 번역`,
            namespace: 'menu',
          },
        })
      }

      const menuTranslations = await testPrisma.translation.findMany({
        where: { namespace: 'menu', languageCode: 'ko' },
      })

      expect(menuTranslations).toHaveLength(4)
    })

    it('retrieves all translations for language', async () => {
      const namespaces = ['common', 'saju', 'tarot', 'menu']

      for (const ns of namespaces) {
        await testPrisma.translation.create({
          data: {
            key: `${ns}.test`,
            languageCode: 'en',
            value: `${ns} test`,
            namespace: ns,
          },
        })
      }

      const enTranslations = await testPrisma.translation.findMany({
        where: { languageCode: 'en' },
      })

      expect(enTranslations).toHaveLength(4)
    })

    it('finds missing translations', async () => {
      // Create Korean translations
      const keys = ['key1', 'key2', 'key3']
      for (const key of keys) {
        await testPrisma.translation.create({
          data: {
            key,
            languageCode: 'ko',
            value: `${key} 한국어`,
            namespace: 'test',
          },
        })
      }

      // Create only some English translations
      await testPrisma.translation.create({
        data: {
          key: 'key1',
          languageCode: 'en',
          value: 'key1 English',
          namespace: 'test',
        },
      })

      const koKeys = (
        await testPrisma.translation.findMany({
          where: { languageCode: 'ko', namespace: 'test' },
          select: { key: true },
        })
      ).map((t) => t.key)

      const enKeys = (
        await testPrisma.translation.findMany({
          where: { languageCode: 'en', namespace: 'test' },
          select: { key: true },
        })
      ).map((t) => t.key)

      const missing = koKeys.filter((k) => !enKeys.includes(k))
      expect(missing).toHaveLength(2)
    })
  })

  describe('User Language Preference', () => {
    it('sets user language preference', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userLanguagePreference.create({
        data: {
          userId: user.id,
          languageCode: 'ko',
          region: 'KR',
        },
      })

      expect(pref.languageCode).toBe('ko')
    })

    it('updates user language preference', async () => {
      const user = await createTestUserInDb()

      const pref = await testPrisma.userLanguagePreference.create({
        data: {
          userId: user.id,
          languageCode: 'ko',
          region: 'KR',
        },
      })

      const updated = await testPrisma.userLanguagePreference.update({
        where: { id: pref.id },
        data: { languageCode: 'en', region: 'US' },
      })

      expect(updated.languageCode).toBe('en')
    })

    it('retrieves user language with fallback', async () => {
      const user = await createTestUserInDb()

      // User without preference
      const pref = await testPrisma.userLanguagePreference.findFirst({
        where: { userId: user.id },
      })

      const defaultLang = 'ko'
      const userLang = pref?.languageCode ?? defaultLang

      expect(userLang).toBe('ko')
    })
  })

  describe('Regional Settings', () => {
    it('creates regional settings', async () => {
      const region = await testPrisma.regionalSetting.create({
        data: {
          code: 'KR',
          name: 'South Korea',
          defaultLanguage: 'ko',
          timezone: 'Asia/Seoul',
          dateFormat: 'YYYY년 MM월 DD일',
          timeFormat: 'HH:mm',
          currency: 'KRW',
          currencySymbol: '₩',
        },
      })

      expect(region.code).toBe('KR')
      expect(region.currency).toBe('KRW')
    })

    it('retrieves regional settings by code', async () => {
      await testPrisma.regionalSetting.create({
        data: {
          code: 'JP',
          name: 'Japan',
          defaultLanguage: 'ja',
          timezone: 'Asia/Tokyo',
          dateFormat: 'YYYY年MM月DD日',
          currency: 'JPY',
          currencySymbol: '¥',
        },
      })

      const region = await testPrisma.regionalSetting.findFirst({
        where: { code: 'JP' },
      })

      expect(region?.timezone).toBe('Asia/Tokyo')
    })

    it('creates calendar settings', async () => {
      const calendar = await testPrisma.calendarSetting.create({
        data: {
          regionCode: 'KR',
          calendarType: 'lunar',
          showLunarDates: true,
          showSolarTerms: true,
          weekStartDay: 'sunday',
        },
      })

      expect(calendar.calendarType).toBe('lunar')
      expect(calendar.showLunarDates).toBe(true)
    })
  })

  describe('Translation Updates', () => {
    it('updates translation value', async () => {
      const translation = await testPrisma.translation.create({
        data: {
          key: 'update.test',
          languageCode: 'ko',
          value: '원래 값',
          namespace: 'test',
        },
      })

      const updated = await testPrisma.translation.update({
        where: { id: translation.id },
        data: { value: '수정된 값', updatedAt: new Date() },
      })

      expect(updated.value).toBe('수정된 값')
    })

    it('marks translation as reviewed', async () => {
      const translation = await testPrisma.translation.create({
        data: {
          key: 'review.test',
          languageCode: 'ko',
          value: '검토 필요',
          namespace: 'test',
          isReviewed: false,
        },
      })

      const reviewed = await testPrisma.translation.update({
        where: { id: translation.id },
        data: {
          isReviewed: true,
          reviewedBy: 'reviewer-123',
          reviewedAt: new Date(),
        },
      })

      expect(reviewed.isReviewed).toBe(true)
    })
  })

  describe('Translation Statistics', () => {
    it('counts translations by language', async () => {
      const languages = ['ko', 'en', 'ko', 'ja', 'ko', 'en']

      for (let i = 0; i < languages.length; i++) {
        await testPrisma.translation.create({
          data: {
            key: `stat.key${i}`,
            languageCode: languages[i],
            value: `value ${i}`,
            namespace: 'stats',
          },
        })
      }

      const counts = await testPrisma.translation.groupBy({
        by: ['languageCode'],
        _count: { id: true },
      })

      const koCount = counts.find((c) => c.languageCode === 'ko')?._count.id
      expect(koCount).toBe(3)
    })

    it('counts translations by namespace', async () => {
      const namespaces = ['common', 'saju', 'common', 'tarot', 'common']

      for (let i = 0; i < namespaces.length; i++) {
        await testPrisma.translation.create({
          data: {
            key: `ns.key${i}`,
            languageCode: 'ko',
            value: `value ${i}`,
            namespace: namespaces[i],
          },
        })
      }

      const counts = await testPrisma.translation.groupBy({
        by: ['namespace'],
        _count: { id: true },
      })

      const commonCount = counts.find((c) => c.namespace === 'common')?._count.id
      expect(commonCount).toBe(3)
    })

    it('calculates translation coverage', async () => {
      // Korean has 10 keys
      for (let i = 0; i < 10; i++) {
        await testPrisma.translation.create({
          data: {
            key: `coverage.key${i}`,
            languageCode: 'ko',
            value: `한국어 ${i}`,
            namespace: 'coverage',
          },
        })
      }

      // English has 7 keys
      for (let i = 0; i < 7; i++) {
        await testPrisma.translation.create({
          data: {
            key: `coverage.key${i}`,
            languageCode: 'en',
            value: `English ${i}`,
            namespace: 'coverage',
          },
        })
      }

      const koCount = await testPrisma.translation.count({
        where: { namespace: 'coverage', languageCode: 'ko' },
      })

      const enCount = await testPrisma.translation.count({
        where: { namespace: 'coverage', languageCode: 'en' },
      })

      const coverage = (enCount / koCount) * 100
      expect(coverage).toBe(70)
    })
  })

  describe('Translation Deletion', () => {
    it('deletes translation', async () => {
      const translation = await testPrisma.translation.create({
        data: {
          key: 'delete.test',
          languageCode: 'ko',
          value: '삭제할 번역',
          namespace: 'test',
        },
      })

      await testPrisma.translation.delete({
        where: { id: translation.id },
      })

      const found = await testPrisma.translation.findUnique({
        where: { id: translation.id },
      })

      expect(found).toBeNull()
    })

    it('deletes all translations for key', async () => {
      const languages = ['ko', 'en', 'ja']

      for (const lang of languages) {
        await testPrisma.translation.create({
          data: {
            key: 'delete.all',
            languageCode: lang,
            value: `${lang} value`,
            namespace: 'test',
          },
        })
      }

      await testPrisma.translation.deleteMany({
        where: { key: 'delete.all' },
      })

      const remaining = await testPrisma.translation.count({
        where: { key: 'delete.all' },
      })

      expect(remaining).toBe(0)
    })
  })
})
