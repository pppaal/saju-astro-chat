// @vitest-environment node
// 운흐름 v3 step 2 — deriveDominance: 스케일(층)×체계(사주/점성) 지배신호 추출 검증.
import { describe, it, expect } from 'vitest'
import { deriveDominance, type DominanceByScale } from '@/lib/calendar-engine/derivers/dominance'
import { signalTypeKey, type BaseRateTable } from '@/lib/calendar-engine/derivers/surprise'
import type {
  ActiveSignal,
  Polarity,
  SignalKind,
  SignalLayer,
  SignalSource,
} from '@/lib/calendar-engine/types'

function sig(o: {
  name: string
  source: SignalSource
  kind: SignalKind
  polarity: Polarity
  layer: SignalLayer
  weight?: number
}): ActiveSignal {
  return {
    id: `${o.source}.${o.kind}.${o.name}`,
    source: o.source,
    kind: o.kind,
    name: o.name,
    themes: [],
    polarity: o.polarity,
    layer: o.layer,
    active: {
      start: '2026-06-01T00:00:00Z',
      peak: '2026-06-01T00:00:00Z',
      end: '2026-06-02T00:00:00Z',
    },
    weight: o.weight ?? 1,
    evidence: { module: 'test', detail: {} },
  }
}

/** 각 신호에 명시적 P 를 부여한 base-rate 테이블 구성. */
function ratesFor(pairs: Array<[ActiveSignal, number]>, total = 100): BaseRateTable {
  const p = new Map<string, number>()
  for (const [s, prob] of pairs) p.set(signalTypeKey(s), prob)
  return { p, totalCells: total }
}

describe('deriveDominance (v3 step 2)', () => {
  it('separates dominant signals by scale (layer) and system (saju/astro)', () => {
    const sajuDaily = sig({
      name: '지지충',
      source: 'saju',
      kind: 'hyeongchung',
      polarity: -2,
      layer: 'daily',
    })
    const astroDaily = sig({
      name: 'Mars □ Sun',
      source: 'astro',
      kind: 'transit',
      polarity: -1,
      layer: 'daily',
    })
    const sajuYearly = sig({
      name: '세운 정관',
      source: 'saju',
      kind: 'sewoon',
      polarity: 2,
      layer: 'yearly',
    })
    const rates = ratesFor([
      [sajuDaily, 0.1],
      [astroDaily, 0.1],
      [sajuYearly, 0.2],
    ])

    const out = deriveDominance([sajuDaily, astroDaily, sajuYearly], rates)

    expect(Object.keys(out).sort()).toEqual(['daily', 'yearly'])
    expect(out.daily!.saju.dominant.map((d) => d.name)).toEqual(['지지충'])
    expect(out.daily!.astro.dominant.map((d) => d.name)).toEqual(['Mars □ Sun'])
    expect(out.yearly!.saju.dominant.map((d) => d.name)).toEqual(['세운 정관'])
    expect(out.yearly!.astro.dominant).toEqual([])
  })

  it('excludes cross-activation, polarity-0, and always-on (P≈1) signals', () => {
    const cross = sig({
      name: '정관×토성',
      source: 'saju',
      kind: 'cross-activation',
      polarity: 2,
      layer: 'daily',
    })
    const ambient = sig({
      name: 'VoC',
      source: 'astro',
      kind: 'void-of-course',
      polarity: 0,
      layer: 'daily',
    })
    const alwaysOn = sig({
      name: 'Pluto □ MC',
      source: 'astro',
      kind: 'transit',
      polarity: -2,
      layer: 'decadal',
    })
    const real = sig({ name: '도화', source: 'saju', kind: 'shinsal', polarity: 1, layer: 'daily' })
    const rates = ratesFor([
      [cross, 0.1],
      [ambient, 0.1],
      [alwaysOn, 1], // 늘 켜짐 → rarity 0 → importance 0
      [real, 0.1],
    ])

    const out = deriveDominance([cross, ambient, alwaysOn, real], rates)

    // 살아남는 건 'real'(saju/daily) 하나뿐 — decadal 버킷 자체가 안 생김.
    expect(Object.keys(out)).toEqual(['daily'])
    expect(out.daily!.saju.dominant.map((d) => d.name)).toEqual(['도화'])
    expect(out.daily!.astro.dominant).toEqual([])
  })

  it('caps each bucket at topK by importance descending', () => {
    const a = sig({ name: 'A', source: 'saju', kind: 'shinsal', polarity: 1, layer: 'daily' })
    const b = sig({ name: 'B', source: 'saju', kind: 'shinsal', polarity: 3, layer: 'daily' })
    const c = sig({ name: 'C', source: 'saju', kind: 'shinsal', polarity: 2, layer: 'daily' })
    const d = sig({ name: 'D', source: 'saju', kind: 'shinsal', polarity: 1, layer: 'daily' })
    // 같은 P → importance 는 |polarity| 순: B(3) > C(2) > A(1)=D(1)
    const rates = ratesFor([
      [a, 0.1],
      [b, 0.1],
      [c, 0.1],
      [d, 0.1],
    ])

    const out = deriveDominance([a, b, c, d], rates, 2)

    expect(out.daily!.saju.dominant.map((x) => x.name)).toEqual(['B', 'C'])
  })

  it('valence sign follows polarity direction; mass sums importance', () => {
    const good = sig({
      name: '천을귀인',
      source: 'saju',
      kind: 'shinsal',
      polarity: 3,
      layer: 'daily',
    })
    const bad = sig({ name: '백호', source: 'saju', kind: 'shinsal', polarity: -1, layer: 'daily' })
    const rates = ratesFor([
      [good, 0.1],
      [bad, 0.1],
    ])

    const out = deriveDominance([good, bad], rates)
    const saju = out.daily!.saju

    // 우호(+3)가 흉(-1)보다 크므로 valence 양수.
    expect(saju.valence).toBeGreaterThan(0)
    // mass = Σ importance, 두 신호 importance 합과 일치.
    const sum = saju.dominant.reduce((acc, x) => acc + x.importance, 0)
    expect(saju.mass).toBeCloseTo(sum, 2)
  })

  it('unmeasured signal type is treated as extremely rare (high importance)', () => {
    const known = sig({
      name: '도화',
      source: 'saju',
      kind: 'shinsal',
      polarity: 2,
      layer: 'daily',
    })
    const unknown = sig({
      name: '미측정',
      source: 'saju',
      kind: 'shinsal',
      polarity: 2,
      layer: 'daily',
    })
    // known 만 P 등록, unknown 은 미측정 → −log(1/(total+1)) 하한.
    const rates = ratesFor([[known, 0.5]], 100)

    const out = deriveDominance([known, unknown], rates)
    const names = out.daily!.saju.dominant.map((x) => x.name)
    // 미측정(극희소)이 흔한 known 보다 먼저.
    expect(names[0]).toBe('미측정')
  })

  it('returns an empty object when no raw verb survives', () => {
    const onlyCross = sig({
      name: 'x',
      source: 'astro',
      kind: 'cross-activation',
      polarity: 2,
      layer: 'daily',
    })
    const out: DominanceByScale = deriveDominance([onlyCross], ratesFor([[onlyCross, 0.1]]))
    expect(out).toEqual({})
  })
})
