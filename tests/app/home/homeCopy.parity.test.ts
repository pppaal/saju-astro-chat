// tests/app/home/homeCopy.parity.test.ts
//
// 홈 문구 ko/en 짝 — 모든 키가 두 언어 다 있고, 영어엔 한글이 없고, 한국어엔 SSR 게이트
// (scripts/check-ssr-placeholders.mjs)가 막는 영어 토큰이 없다. 'Powered by AI' 는 없다.

import { describe, it, expect } from 'vitest'
import { HOME_COPY, LOCALE_TOGGLE } from '@/app/(main)/home/homeCopy'
import { EXPLORE_ROWS } from '@/app/(main)/home/exploreRows'

// SSR 게이트의 KO_FORBIDDEN_EN_TOKENS 와 같은 목록.
const KO_FORBIDDEN = ['Pricing', 'Get started', "Today's", 'Members', 'Total Visitors']
const HANGUL = /[가-힣]/

const pairs: Array<[string, { ko: string; en: string }]> = [
  ...Object.entries(HOME_COPY),
  ...EXPLORE_ROWS.flatMap((r) => [
    [`explore.${r.id}.title`, r.title] as [string, { ko: string; en: string }],
    [`explore.${r.id}.desc`, r.desc] as [string, { ko: string; en: string }],
  ]),
]

// en H1 은 밑줄 안에 마침표까지 넣어('you.') 뒤 조각이 비어 있다 — 그 키만 en 빈 값을 허용한다.
const EN_MAY_BE_EMPTY = new Set(['h1After'])

describe('homeCopy parity', () => {
  it.each(pairs)('%s — ko · en 둘 다 비어 있지 않다', (k, bi) => {
    expect(bi.ko.trim().length).toBeGreaterThan(0)
    if (!EN_MAY_BE_EMPTY.has(k)) expect(bi.en.trim().length).toBeGreaterThan(0)
  })

  it.each(pairs)('%s — 영어 문구에 한글이 없다', (_k, bi) => {
    expect(bi.en).not.toMatch(HANGUL)
  })

  it.each(pairs)('%s — 한국어 문구에 금지 영어 토큰이 없다', (_k, bi) => {
    for (const token of KO_FORBIDDEN) {
      expect(new RegExp(`\\b${token.replace(/'/g, "\\'")}\\b`, 'i').test(bi.ko)).toBe(false)
    }
  })

  it("'Powered by AI' 와 'AI reads your Saju' 류 문구가 없다", () => {
    for (const [, bi] of pairs) {
      expect(bi.en).not.toMatch(/powered by ai/i)
      expect(bi.en).not.toMatch(/ai reads/i)
    }
  })

  it('까치 — en 은 Kkachi 만, ko 는 까치', () => {
    expect(HOME_COPY.magpieEyebrow.en).toBe('Kkachi')
    expect(HOME_COPY.magpieEyebrow.ko).toBe('까치')
  })

  it('언어 토글의 숨긴 설명은 기존 접근성 이름 그대로(이름 = 보이는 글자 + 설명)', () => {
    expect(LOCALE_TOGGLE.aria.en).toBe('한국어로 전환')
    expect(LOCALE_TOGGLE.aria.ko).toBe('Switch to English')
  })
})
