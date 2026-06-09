// @vitest-environment node
// 교차 해석 공통 코어 — 공통 DB 룩업 + v3 희소도 랭킹 검증.
import { describe, it, expect } from 'vitest'
import { lookupCross, crossMeaning, rankActiveCrosses } from '@/lib/cross/crossInterpret'
import { signalTypeKey, type BaseRateTable } from '@/lib/calendar-engine/derivers/surprise'
import type { ActiveSignal, Polarity, SignalLayer } from '@/lib/calendar-engine/types'

function crossSig(o: {
  saju: string
  astro: string
  polarity: Polarity
  layer?: SignalLayer
  weight?: number
  korean?: string
  withKeys?: boolean
}): ActiveSignal {
  const name = `${o.saju} × ${o.astro}`
  return {
    id: `cross.${o.saju}-x-${o.astro}.2026-06-01`,
    source: 'saju',
    kind: 'cross-activation',
    name,
    korean: o.korean ?? name,
    themes: [],
    polarity: o.polarity,
    layer: o.layer ?? 'daily',
    active: {
      start: '2026-06-01T00:00:00Z',
      peak: '2026-06-01T00:00:00Z',
      end: '2026-06-02T00:00:00Z',
    },
    weight: o.weight ?? 1,
    evidence: {
      module: 'cross-activation',
      detail: o.withKeys === false ? {} : { sajuKey: o.saju, astroKey: o.astro },
    },
  }
}

function ratesFor(pairs: Array<[ActiveSignal, number]>, total = 100): BaseRateTable {
  const p = new Map<string, number>()
  for (const [s, prob] of pairs) p.set(signalTypeKey(s), prob)
  return { p, totalCells: total }
}

describe('lookupCross / crossMeaning (공통 DB)', () => {
  it('resolves a real A-grade pair to its DB meaning', () => {
    const m = lookupCross('정관', 'Saturn')
    expect(m).not.toBeNull()
    expect(m!.grade).toBe('A')
    expect(m!.meaning.ko).toContain('정관')
    expect(crossMeaning('정관', 'Saturn', 'ko')).toBe(m!.meaning.ko)
    expect(crossMeaning('정관', 'Saturn', 'en')).toBe(m!.meaning.en)
  })

  it('returns null for an unknown pair', () => {
    expect(lookupCross('없는것', 'Nibiru')).toBeNull()
    expect(crossMeaning('없는것', 'Nibiru')).toBeNull()
  })
})

describe('rankActiveCrosses (희소도 추리기 + DB 해석)', () => {
  it('ranks active crosses by importance and attaches DB meaning', () => {
    const common = crossSig({ saju: '정관', astro: 'Saturn', polarity: 1 })
    const rare = crossSig({ saju: '편관', astro: 'Mars', polarity: -2 })
    // rare 가 더 드뭄(P 작음) → importance 큼 → 먼저.
    const rates = ratesFor([
      [common, 0.5],
      [rare, 0.05],
    ])

    const out = rankActiveCrosses([common, rare], rates)

    expect(out.map((x) => `${x.saju}×${x.astro}`)).toEqual(['편관×Mars', '정관×Saturn'])
    expect(out[0].meaning).toContain('편관')
    expect(out[0].grade).toBe('A')
    expect(out[1].meaning).toContain('정관')
  })

  it('ignores non-cross signals and respects topN', () => {
    const c1 = crossSig({ saju: '정관', astro: 'Saturn', polarity: 1 })
    const c2 = crossSig({ saju: '편관', astro: 'Mars', polarity: -2 })
    const c3 = crossSig({ saju: '정재', astro: 'Venus', polarity: 2 })
    const plain: ActiveSignal = { ...c1, kind: 'shinsal', id: 'plain', name: '도화' }
    const rates = ratesFor([
      [c1, 0.1],
      [c2, 0.1],
      [c3, 0.1],
      [plain, 0.1],
    ])

    const out = rankActiveCrosses([c1, c2, c3, plain], rates, { topN: 2 })
    expect(out).toHaveLength(2)
    expect(out.every((x) => x.saju && x.astro)).toBe(true)
  })

  it('falls back to signal text when the pair is not in the DB', () => {
    const unknown = crossSig({
      saju: '미상사주',
      astro: 'Unknown',
      polarity: 1,
      korean: '폴백 해석 문장',
    })
    const rates = ratesFor([[unknown, 0.1]])

    const out = rankActiveCrosses([unknown], rates)
    expect(out[0].grade).toBeNull()
    expect(out[0].meaning).toBe('폴백 해석 문장')
  })

  it('parses saju×astro from name when evidence keys are absent', () => {
    const noKeys = crossSig({ saju: '정관', astro: 'Saturn', polarity: 1, withKeys: false })
    const rates = ratesFor([[noKeys, 0.1]])

    const out = rankActiveCrosses([noKeys], rates)
    expect(out[0].saju).toBe('정관')
    expect(out[0].astro).toBe('Saturn')
    expect(out[0].meaning).toContain('정관') // 이름 파싱 → DB 룩업 성공
  })
})
