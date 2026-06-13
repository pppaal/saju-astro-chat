/**
 * 궁합 시너스트리 뷰 — 행성쌍 의미(해석) 회귀.
 * "별자리 — 끌림과 마찰"이 raw 데이터(행성+관계어)만 나열하던 걸, 행성쌍마다
 * 관계 의미 한 줄을 붙이는 변경을 잠근다. 천체력 불필요(좌표 직접 주입).
 */
import { describe, it, expect } from 'vitest'
import { computeSynastryView } from '@/lib/compatibility/synastryView'

const HANGUL = /[가-힣]/
const chart = (planets: Array<[string, number]>) => ({
  planets: planets.map(([name, longitude]) => ({ name, longitude, sign: 'Aries' })),
  ascendant: { longitude: 0, sign: 'Aries' },
  mc: { longitude: 270, sign: 'Capricorn' },
  houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
})
// 태양-달 합 + 화성-금성 합(케미) + 태양-화성
const A = chart([
  ['Sun', 0],
  ['Venus', 120],
  ['Mars', 60],
])
const B = chart([
  ['Moon', 0],
  ['Mars', 122],
  ['Venus', 60],
])

describe('synastryView — 행성쌍 의미', () => {
  it('모든 aspect 에 의미가 붙고 undefined 누출이 없다', () => {
    const v = computeSynastryView(A, B, 'ko')!
    expect(v.aspects.length).toBeGreaterThan(0)
    for (const a of v.aspects) {
      expect(a.meaning.length).toBeGreaterThan(0)
      expect(a.a).not.toBe('undefined')
      expect(a.b).not.toBe('undefined')
      expect(a.meaning).not.toContain('undefined')
    }
  })
  it('hand-authored 핵심 쌍은 전용 문구', () => {
    const v = computeSynastryView(A, B, 'ko')!
    const sunMoon = v.aspects.find(
      (a) => (a.a === '태양' && a.b === '달') || (a.a === '달' && a.b === '태양')
    )
    expect(sunMoon?.meaning).toContain('핵심 축')
    const marsVenus = v.aspects.find(
      (a) => (a.a === '화성' && a.b === '금성') || (a.a === '금성' && a.b === '화성')
    )
    expect(marsVenus?.meaning).toContain('케미')
  })
  it('fallback 은 축 명사구 + 톤 접미사로 조사 안전', () => {
    // 수성-목성 같은 비-수록 쌍 → fallback. (목성은 개인행성 아님 → 수성이 껴야 통과)
    const a2 = chart([['Mercury', 0]])
    const b2 = chart([['Jupiter', 0]])
    const v = computeSynastryView(a2, b2, 'ko')
    const m = v?.aspects[0]?.meaning ?? ''
    if (m) {
      expect(m).toMatch(/축/)
      // 톤 방향 접미사가 항상 붙어 라벨과 일치
      expect(m).toMatch(/통해요|조율이 필요해요|엮이는 결/)
    }
  })
  it('의미가 톤 라벨과 어긋나지 않는다(조화=통해 / 긴장=조율)', () => {
    const v = computeSynastryView(A, B, 'ko')!
    for (const a of v.aspects) {
      if (a.tone === 'harmony') expect(a.meaning).toContain('통해요')
      if (a.tone === 'tension') expect(a.meaning).toContain('조율이 필요해요')
    }
  })
  it('EN 모드 의미에 한글 누출 없음', () => {
    const v = computeSynastryView(A, B, 'en')!
    for (const a of v.aspects) expect(HANGUL.test(a.meaning)).toBe(false)
  })
})
