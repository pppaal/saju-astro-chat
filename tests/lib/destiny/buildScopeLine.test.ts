/**
 * buildScopeLine — 현재 턴에 박는 "이번 답변 범위" 한 줄.
 * 핵심 회귀: "둘 다(both)"도 반드시 양시스템 지시를 가져야 한다(예전엔 빈 값이라
 * 점성만→둘다 전환 시 직전 점성 답변을 recency 로 이어가는 버그가 있었다).
 */
import { describe, it, expect } from 'vitest'
import { buildScopeLine } from '@/lib/destiny/counselorRequest'

describe('buildScopeLine', () => {
  it('both: KO/EN both demand using BOTH systems (non-empty, sequence-bug guard)', () => {
    const ko = buildScopeLine({ saju: true, astro: true }, 'ko')
    const en = buildScopeLine({ saju: true, astro: true }, 'en')
    expect(ko.trim().length).toBeGreaterThan(0)
    expect(en.trim().length).toBeGreaterThan(0)
    expect(ko).toMatch(/둘 다|함께 엮어/)
    expect(en).toMatch(/BOTH|weave the two/i)
  })

  it('saju-only: scopes to Saju, forbids astrology', () => {
    expect(buildScopeLine({ saju: true, astro: false }, 'ko')).toMatch(/사주만/)
    expect(buildScopeLine({ saju: true, astro: false }, 'en')).toMatch(/Saju only/i)
  })

  it('astro-only: scopes to astrology, forbids Saju', () => {
    expect(buildScopeLine({ saju: false, astro: true }, 'ko')).toMatch(/점성만/)
    expect(buildScopeLine({ saju: false, astro: true }, 'en')).toMatch(/Astrology only/i)
  })

  it('EN scope lines carry no Hangul', () => {
    for (const s of [
      { saju: true, astro: true },
      { saju: true, astro: false },
      { saju: false, astro: true },
    ]) {
      expect(buildScopeLine(s, 'en')).not.toMatch(/[가-힣]/)
    }
  })
})
