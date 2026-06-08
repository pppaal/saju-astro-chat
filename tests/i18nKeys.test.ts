import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// i18n key-parity test.
//
// Reads the locale JSON files DIRECTLY from src/i18n/locales/{ko,en}/*.json
// (the source of truth) rather than going through I18nProvider, whose runtime
// dictionary cache is only populated by an async client-side load.
//
// Asserts that KO and EN expose an identical set of (namespace-scoped) keys
// across all namespaces, so neither locale silently drifts.

const LOCALES = ['ko', 'en'] as const
const NAMESPACES = [
  'common',
  'chat',
  'services',
  'tarot',
  'calendar',
  'compatibility',
  'destinymap',
  'features',
  'misc',
] as const

const localesDir = path.resolve(__dirname, '../src/i18n/locales')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const keyPath = prefix ? `${prefix}.${k}` : k
    return isRecord(v) ? flattenKeys(v, keyPath) : [keyPath]
  })
}

function loadLocaleKeys(locale: (typeof LOCALES)[number]): Set<string> {
  const keys: string[] = []
  for (const ns of NAMESPACES) {
    const file = path.join(localesDir, locale, `${ns}.json`)
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    keys.push(...flattenKeys(parsed).map((k) => `${ns}.${k}`))
  }
  return new Set(keys)
}

describe('i18n key parity', () => {
  const koKeys = loadLocaleKeys('ko')
  const enKeys = loadLocaleKeys('en')

  it('KO is missing no keys present in EN', () => {
    const missing = [...enKeys].filter((k) => !koKeys.has(k)).sort()
    expect(missing, `Keys present in EN but missing in KO:\n${missing.join('\n')}`).toEqual([])
  })

  it('EN is missing no keys present in KO', () => {
    const missing = [...koKeys].filter((k) => !enKeys.has(k)).sort()
    expect(missing, `Keys present in KO but missing in EN:\n${missing.join('\n')}`).toEqual([])
  })

  it('KO and EN have identical key sets and equal counts', () => {
    expect(koKeys.size).toBe(enKeys.size)
    expect([...koKeys].sort()).toEqual([...enKeys].sort())
  })
})
