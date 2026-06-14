/**
 * 궁합 교차 종합(crossVerdict) — 사주(합/충)와 별자리(조화/긴장)를 교차해
 * "둘이 같은 말 하는지" 한 줄로 내는 것을 잠근다. raw 행 나열 위에 얹는 해석 헤드라인.
 */
import { describe, it, expect } from 'vitest'
import { buildCompatReport } from '@/lib/compatibility/compatReport'

const HANGUL = /[가-힣]/
const chart = (planets: Array<[string, number]>) => ({
  planets: planets.map(([name, longitude]) => ({ name, longitude, sign: 'Aries' })),
  ascendant: { longitude: 0, sign: 'Aries' },
  mc: { longitude: 270, sign: 'Capricorn' },
  houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
})
const pillars = (p: string[]) => p.map((s) => ({ stem: s[0], branch: s[1] }))
const base = {
  astroA: chart([
    ['Sun', 0],
    ['Venus', 120],
  ]),
  astroB: chart([
    ['Moon', 0],
    ['Mars', 120],
  ]),
  pillarsA: pillars(['갑자', '을축', '병인', '정묘']),
  pillarsB: pillars(['무진', '기사', '경오', '신미']),
}

describe('compatReport — 교차 종합', () => {
  it('crossVerdict 가 유효한 톤·문구로 생성된다', () => {
    const r = buildCompatReport({ ...base, lang: 'ko' })
    expect(r.crossVerdict).toBeTruthy()
    expect(r.crossVerdict!.text.length).toBeGreaterThan(0)
    expect(['aligned', 'mixed', 'tension', 'neutral']).toContain(r.crossVerdict!.tone)
  })
  it('EN 모드 종합에 한글 누출 없음', () => {
    const r = buildCompatReport({ ...base, lang: 'en' })
    expect(HANGUL.test(r.crossVerdict?.text ?? '')).toBe(false)
  })
  it('사주·별자리 데이터가 둘 다 없으면 종합 생략', () => {
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA: null, pillarsB: null })
    expect(r.crossVerdict).toBeUndefined()
  })
})
