import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

type JsonObject = Record<string, unknown>

const REQUIRED_PUBLIC_KEYS = [
  'pricing.heroTitle',
  'pricing.heroSub',
  'pricing.creditPacksDesc',
  'pricing.faqs.a4',
  'menu.destinyMap',
  'ui.titleAstrology',
  'ui.subtitleAstrology',
  'services.destinyMap.desc',
  'services.tarot.desc',
  // 동의 배너 — 키가 없으면 t() 가 영어 기본값으로 떨어져 KO 배너 끝에 'Privacy Policy' 가 찍힌다(QA R-VH-1).
  'consent.title',
  'consent.description',
  'consent.reject',
  'consent.accept',
  'consent.policyLink',
]

function loadLocale(locale: 'en' | 'ko'): JsonObject {
  const base = path.join(process.cwd(), 'src', 'i18n', 'locales', locale)
  const common = JSON.parse(readFileSync(path.join(base, 'common.json'), 'utf8')) as JsonObject
  const misc = JSON.parse(readFileSync(path.join(base, 'misc.json'), 'utf8')) as JsonObject
  const destinymap = JSON.parse(
    readFileSync(path.join(base, 'destinymap.json'), 'utf8')
  ) as JsonObject
  const services = JSON.parse(readFileSync(path.join(base, 'services.json'), 'utf8')) as JsonObject
  return { ...common, ...misc, ...destinymap, ...services }
}

function getPathValue(obj: JsonObject, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object' || Array.isArray(acc)) {
      return undefined
    }
    return (acc as JsonObject)[part]
  }, obj)
}

describe('i18n public required keys', () => {
  for (const locale of ['en', 'ko'] as const) {
    it(`contains required public keys for ${locale}`, () => {
      const localeJson = loadLocale(locale)
      for (const keyPath of REQUIRED_PUBLIC_KEYS) {
        const value = getPathValue(localeJson, keyPath)
        expect(typeof value).toBe('string')
        expect(String(value).trim().length).toBeGreaterThan(0)
      }
    })
  }
})

describe('consent banner policy link', () => {
  it('KO 는 한국어 라벨, EN 은 영어 라벨', () => {
    expect(getPathValue(loadLocale('ko'), 'consent.policyLink')).toBe('개인정보처리방침')
    expect(getPathValue(loadLocale('en'), 'consent.policyLink')).toBe('Privacy Policy')
  })
})
