import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

type JsonObject = Record<string, unknown>

const REQUIRED_PRICING_KEYS = [
  'pricing.heroTitle',
  'pricing.heroSub',
  'pricing.subscribe',
  'pricing.creditPacksDesc',
  'pricing.perMonth',
  'pricing.perYear',
  'pricing.faqs.a4',
]

function loadLocale(locale: 'en' | 'ko'): JsonObject {
  const filePath = path.join(process.cwd(), 'src', 'i18n', 'locales', locale, 'misc.json')
  return JSON.parse(readFileSync(filePath, 'utf8')) as JsonObject
}

function getPathValue(obj: JsonObject, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object' || Array.isArray(acc)) {
      return undefined
    }
    return (acc as JsonObject)[part]
  }, obj)
}

describe('i18n pricing required keys', () => {
  for (const locale of ['en', 'ko'] as const) {
    it(`contains required pricing keys for ${locale}`, () => {
      const localeJson = loadLocale(locale)
      for (const keyPath of REQUIRED_PRICING_KEYS) {
        const value = getPathValue(localeJson, keyPath)
        expect(typeof value).toBe('string')
        expect(String(value).trim().length).toBeGreaterThan(0)
      }
    })
  }
})
