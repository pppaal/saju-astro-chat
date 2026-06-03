// tests/i18n/isLikelyCorrupted.test.ts
//
// Regression guard for the mojibake heuristic in src/i18n/I18nProvider.tsx.
//
// BUG (fixed): `isLikelyCorrupted` used a UTF-16 code-unit allowlist that
// excluded the surrogate range (U+D800–U+DFFF). Every astral-plane emoji
// (🌟 🌍 🎯 📊 💰, all U+1F300+) is encoded as a surrogate *pair* in JS strings,
// so legitimate Korean strings containing emoji (e.g. calendar.bestDay
// "🌟 최고의 날", all calendar.recommendations.*) were flagged "corrupted" and
// silently replaced with their English fallback. ~86 of 1216 KO strings (~7%).
//
// This suite asserts:
//   (a) ZERO false positives across EVERY real KO locale string, and
//   (b) the heuristic still flags genuine mojibake (it is NOT a no-op).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { isLikelyCorrupted } from '@/i18n/I18nProvider'

// --- Load the REAL Korean locale dictionaries straight from disk -------------
// We read the JSON files directly (not via the provider's mocked imports) so the
// regression scan reflects exactly what ships to Korean users.

const KO_DIR = path.resolve(__dirname, '../../src/i18n/locales/ko')

function loadKoStrings(): Array<{ file: string; key: string; value: string }> {
  const out: Array<{ file: string; key: string; value: string }> = []

  const flatten = (file: string, obj: unknown, prefix: string) => {
    if (typeof obj === 'string') {
      out.push({ file, key: prefix, value: obj })
      return
    }
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => flatten(file, v, `${prefix}[${i}]`))
      return
    }
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        flatten(file, v, prefix ? `${prefix}.${k}` : k)
      }
    }
    // numbers / booleans / null are not translation copy — ignore.
  }

  for (const file of readdirSync(KO_DIR).filter((f) => f.endsWith('.json'))) {
    const json = JSON.parse(readFileSync(path.join(KO_DIR, file), 'utf-8'))
    flatten(file, json, '')
  }
  return out
}

const KO_STRINGS = loadKoStrings()

describe('isLikelyCorrupted — zero false positives on real KO locale', () => {
  it('loads a non-trivial number of KO strings to scan', () => {
    // Sanity: make sure the fixture actually loaded; otherwise the guard below
    // would vacuously pass.
    expect(KO_STRINGS.length).toBeGreaterThan(500)
  })

  it('flags NONE of the current KO strings as corrupted', () => {
    const falsePositives = KO_STRINGS.filter(({ value }) => isLikelyCorrupted(value))

    if (falsePositives.length > 0) {
      // Surface a readable diagnostic listing the first offenders.
      const sample = falsePositives
        .slice(0, 20)
        .map(({ file, key, value }) => `  ${file} :: ${key} = ${JSON.stringify(value)}`)
        .join('\n')
      throw new Error(
        `Expected 0 false positives, got ${falsePositives.length} of ${KO_STRINGS.length}:\n${sample}`
      )
    }

    expect(falsePositives.length).toBe(0)
  })

  it('passes the specific emoji-bearing strings that triggered the bug', () => {
    // These are real-world examples from the calendar namespace.
    expect(isLikelyCorrupted('🌟 최고의 날')).toBe(false)
    expect(isLikelyCorrupted('🌍 좋은 날')).toBe(false)
    expect(isLikelyCorrupted('🎯 목표 달성')).toBe(false)
    expect(isLikelyCorrupted('📊 분석 결과')).toBe(false)
    expect(isLikelyCorrupted('💰 재물운')).toBe(false)
    // ZWJ emoji sequence + variation selectors + flag.
    expect(isLikelyCorrupted('가족 👨‍👩‍👧‍👦 그리고 ❤️ 🇰🇷')).toBe(false)
  })
})

describe('isLikelyCorrupted — still catches genuine mojibake', () => {
  it('flags an empty string', () => {
    expect(isLikelyCorrupted('')).toBe(true)
  })

  it('flags a U+FFFD replacement char', () => {
    expect(isLikelyCorrupted('최고의 � 날')).toBe(true)
    expect(isLikelyCorrupted('�')).toBe(true)
  })

  it('flags a Latin-1 UTF-8 garble ("ìì..." style)', () => {
    // Classic UTF-8-decoded-as-Latin-1 output for Korean text.
    expect(isLikelyCorrupted('ìëê')).toBe(true)
    expect(isLikelyCorrupted('Ã¬Ã«Ã©')).toBe(true)
  })

  it('flags stray Cyrillic embedded in otherwise-Korean text', () => {
    // 'к' (U+043A) sitting inside Korean copy — a single-byte decode artifact.
    expect(isLikelyCorrupted('한국어 텍스트 к 포함')).toBe(true)
  })

  it('flags control characters', () => {
    expect(isLikelyCorrupted('정상텍스트')).toBe(true)
  })

  it('does NOT flag clean Korean, ASCII, or normal punctuation', () => {
    expect(isLikelyCorrupted('완전히 정상적인 한국어')).toBe(false)
    expect(isLikelyCorrupted('Hello, world!')).toBe(false)
    expect(isLikelyCorrupted('2026년 6월 3일 — 오늘의 운세 (좋음)')).toBe(false)
    // Newlines/tabs are legitimate copy whitespace.
    expect(isLikelyCorrupted('첫 줄\n둘째 줄')).toBe(false)
  })
})
