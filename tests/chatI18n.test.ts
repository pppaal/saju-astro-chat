import { describe, expect, it } from 'vitest'
import {
  CHAT_I18N,
  CRISIS_KEYWORDS,
  detectCrisis,
  type Copy,
  type LangKey,
} from '@/components/destiny-map/chat-i18n'

describe('CHAT_I18N', () => {
  const supportedLanguages: LangKey[] = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru']

  it('supports all expected languages', () => {
    supportedLanguages.forEach((lang) => {
      expect(CHAT_I18N[lang]).toBeDefined()
    })
  })

  it('has all required keys for English', () => {
    const requiredKeys: (keyof Copy)[] = [
      'placeholder',
      'send',
      'thinking',
      'empty',
      'error',
      'fallbackNote',
      'safetyNote',
      'noResponse',
      'uploadCv',
      'attached',
      'parsingPdf',
      'tarotPrompt',
      'tarotButton',
      'tarotDesc',
      'crisisTitle',
      'crisisMessage',
      'crisisHotline',
      'crisisHotlineNumber',
      'crisisClose',
      'welcomeBack',
      'groundingTip',
      'newChat',
      'previousChats',
      'noHistory',
      'loadSession',
      'deleteSession',
      'confirmDelete',
      'cancel',
      'today',
      'yesterday',
      'daysAgo',
      'messages',
    ]

    requiredKeys.forEach((key) => {
      expect(CHAT_I18N.en[key]).toBeDefined()
      expect(typeof CHAT_I18N.en[key]).toBe('string')
      expect(CHAT_I18N.en[key].length).toBeGreaterThan(0)
    })
  })

  it('has the same key structure across all languages', () => {
    const englishKeys = Object.keys(CHAT_I18N.en) as (keyof Copy)[]
    supportedLanguages.forEach((lang) => {
      englishKeys.forEach((key) => {
        expect(CHAT_I18N[lang][key]).toBeDefined()
        expect(typeof CHAT_I18N[lang][key]).toBe('string')
      })
    })
  })

  it('keeps the key Korean strings readable', () => {
    expect(CHAT_I18N.ko.placeholder).toContain('언제')
    expect(CHAT_I18N.ko.error).toContain('오류')
    expect(CHAT_I18N.ko.today).toBe('오늘')
    expect(CHAT_I18N.ko.yesterday).toBe('어제')
  })

  it('keeps the key Japanese strings readable', () => {
    expect(CHAT_I18N.ja.placeholder).toContain('いつ')
    expect(CHAT_I18N.ja.crisisHotlineNumber).toContain('0570')
  })

  it('keeps expected hotline numbers', () => {
    expect(CHAT_I18N.ko.crisisHotlineNumber).toContain('1393')
    expect(CHAT_I18N.en.crisisHotlineNumber).toContain('988')
  })
})

describe('CRISIS_KEYWORDS', () => {
  it('has keywords for Korean and English', () => {
    expect(CRISIS_KEYWORDS.ko.length).toBeGreaterThan(0)
    expect(CRISIS_KEYWORDS.en.length).toBeGreaterThan(0)
  })

  it('keeps expected Korean phrases', () => {
    expect(CRISIS_KEYWORDS.ko).toContain('자살')
    expect(CRISIS_KEYWORDS.ko).toContain('죽고 싶')
  })
})

describe('detectCrisis', () => {
  it('detects Korean crisis phrases', () => {
    expect(detectCrisis('자살하고 싶어요', 'ko')).toBe(true)
    expect(detectCrisis('너무 힘들어서 죽고 싶어요', 'ko')).toBe(true)
    expect(detectCrisis('모든 것을 끝내고 싶어', 'ko')).toBe(true)
  })

  it('does not false positive on normal Korean text', () => {
    expect(detectCrisis('오늘 날씨가 좋네요', 'ko')).toBe(false)
    expect(detectCrisis('직장을 구하고 있어요', 'ko')).toBe(false)
  })

  it('detects English crisis phrases', () => {
    expect(detectCrisis("I'm thinking about suicide", 'en')).toBe(true)
    expect(detectCrisis('I want to kill myself', 'en')).toBe(true)
  })

  it('falls back to English keywords for unsupported languages', () => {
    expect(detectCrisis('I want to kill myself', 'ja')).toBe(true)
    expect(detectCrisis('suicide', 'fr')).toBe(true)
  })
})
