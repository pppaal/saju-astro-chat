import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

type JsonObject = Record<string, unknown>

const REQUIRED_PUBLIC_KEYS = [
  'pricing.heroTitle',
  'pricing.heroSub',
  'pricing.subscribe',
  'pricing.creditPacksDesc',
  'pricing.perMonth',
  'pricing.perYear',
  'pricing.faqs.a4',
  'menu.destinyMap',
  'ui.titleAstrology',
  'ui.subtitleAstrology',
]

function loadLocale(locale: 'en' | 'ko'): JsonObject {
  const base = path.join(process.cwd(), 'src', 'i18n', 'locales', locale)
  const common = JSON.parse(readFileSync(path.join(base, 'common.json'), 'utf8')) as JsonObject
  const misc = JSON.parse(readFileSync(path.join(base, 'misc.json'), 'utf8')) as JsonObject
  const destinymap = JSON.parse(
    readFileSync(path.join(base, 'destinymap.json'), 'utf8')
  ) as JsonObject
  return { ...common, ...misc, ...destinymap }
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
