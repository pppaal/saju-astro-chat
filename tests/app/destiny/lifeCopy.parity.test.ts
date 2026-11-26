// tests/app/destiny/lifeCopy.parity.test.ts
//
// 인생 흐름 문구 ko/en 짝 — 모든 키가 두 언어 다 있고, 영어엔 한글이 없고, 한국어엔 SSR 게이트
// (scripts/check-ssr-placeholders.mjs)가 막는 영어 토큰이 없다. 자리표시자({n} · {range} …)가
// 두 언어에서 같다. 'Powered by AI' · 이모지 없음, 읽기 라벨에 'AI' 없음(FIX9b E8).

import { describe, it, expect } from 'vitest'
import { LIFE_COPY } from '@/app/destiny/lifeCopy'

// SSR 게이트의 KO_FORBIDDEN_EN_TOKENS 와 같은 목록.
const KO_FORBIDDEN = ['Pricing', 'Get started', "Today's", 'Members', 'Total Visitors']
const HANGUL = /[가-힣]/
const EMOJI = /\p{Extended_Pictographic}/u
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()

const pairs = Object.entries(LIFE_COPY) as Array<[string, { ko: string; en: string }]>

describe('lifeCopy parity', () => {
  it.each(pairs)('%s — ko · en 둘 다 비어 있지 않다', (_k, bi) => {
    expect(bi.ko.trim().length).toBeGreaterThan(0)
    expect(bi.en.trim().length).toBeGreaterThan(0)
  })

  it.each(pairs)('%s — 영어 문구에 한글이 없다', (_k, bi) => {
    expect(bi.en).not.toMatch(HANGUL)
  })

  it.each(pairs)('%s — 한국어 문구에 금지 영어 토큰이 없다', (_k, bi) => {
    for (const token of KO_FORBIDDEN) {
      expect(new RegExp(`\\b${token.replace(/'/g, "\\'")}\\b`, 'i').test(bi.ko)).toBe(false)
    }
  })

  it.each(pairs)('%s — 자리표시자가 두 언어에서 같다', (_k, bi) => {
    expect(placeholders(bi.ko)).toEqual(placeholders(bi.en))
  })

  it('이모지 · Powered by AI 없음, 읽기 라벨에 AI 없음', () => {
    for (const [, bi] of pairs) {
      expect(bi.en).not.toMatch(EMOJI)
      expect(bi.ko).not.toMatch(EMOJI)
      expect(bi.en).not.toMatch(/powered by ai/i)
    }
    expect(LIFE_COPY.readingLabel.en).not.toMatch(/\bAI\b/)
    expect(LIFE_COPY.readingNote.en).not.toMatch(/\bAI\b/)
  })

  it('까치 — en 은 Kkachi, ko 는 까치', () => {
    expect(LIFE_COPY.byline.en).toContain('Kkachi')
    expect(LIFE_COPY.byline.ko).toContain('까치')
  })
})
