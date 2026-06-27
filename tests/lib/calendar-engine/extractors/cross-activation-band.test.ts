import { describe, it, expect } from 'vitest'
import { extractCrossActivations } from '@/lib/calendar-engine/extractors/cross/cross-activation'
import { crossLayerAllowed } from '@/lib/calendar-engine/data/saju-astro-mapping'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

// 층별 교차 밴드 — 외행성은 대운(decadal)에서만, 빠른 행성은 일/월에서만 교차.

const W = {
  start: '2030-01-01T00:00:00Z',
  peak: '2030-06-01T00:00:00Z',
  end: '2030-12-31T00:00:00Z',
}

function sajuSig(p: {
  sibsin?: string
  shinsalName?: string
  layer: ActiveSignal['layer']
}): ActiveSignal {
  return {
    id: `saju.${p.sibsin ?? p.shinsalName}.x`,
    source: 'saju',
    kind: 'pillar-sibsin',
    name: p.sibsin ?? p.shinsalName ?? 'x',
    polarity: 2 as ActiveSignal['polarity'],
    layer: p.layer,
    active: W,
    weight: 0.6,
    evidence: { module: 'test', detail: {}, sibsin: p.sibsin as never, shinsalName: p.shinsalName },
  }
}

function astroSig(planet: string, layer: ActiveSignal['layer']): ActiveSignal {
  return {
    id: `astro.${planet}.x`,
    source: 'astro',
    kind: 'transit',
    name: planet,
    polarity: 2 as ActiveSignal['polarity'],
    layer,
    active: W,
    weight: 0.6,
    evidence: { module: 'test', detail: {}, planets: [planet] },
  }
}

describe('crossLayerAllowed — 밴드 정의', () => {
  it('외행성은 대운만, 빠른 행성은 일/월만', () => {
    expect(crossLayerAllowed('Pluto', 'decadal')).toBe(true)
    expect(crossLayerAllowed('Pluto', 'daily')).toBe(false)
    expect(crossLayerAllowed('Mars', 'daily')).toBe(true)
    expect(crossLayerAllowed('Mars', 'decadal')).toBe(false)
    expect(crossLayerAllowed('Saturn', 'decadal')).toBe(true)
    expect(crossLayerAllowed('Saturn', 'daily')).toBe(false)
  })
})

describe('extractCrossActivations — 밴드 게이팅', () => {
  it('편관 × 명왕성: 대운 층에서 교차 발화', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '편관', layer: 'decadal' }),
      astroSig('Pluto', 'decadal'),
    ])
    expect(out.length).toBe(1)
    expect(out[0].layer).toBe('decadal')
    expect(out[0].name).toBe('편관 × 명왕성')
  })

  it('양인 × 화성: 대운 층(합성 decadal)이면 밴드 밖 → 차단', () => {
    // 양인(decadal) × Mars(daily) → 합성 layer = decadal(느린쪽). Mars 밴드는 일/월만 → 차단.
    const out = extractCrossActivations([
      sajuSig({ shinsalName: '양인', layer: 'decadal' }),
      astroSig('Mars', 'daily'),
    ])
    expect(out.length).toBe(0)
  })

  it('양인 × 화성: 일 층이면 발화', () => {
    const out = extractCrossActivations([
      sajuSig({ shinsalName: '양인', layer: 'daily' }),
      astroSig('Mars', 'daily'),
    ])
    expect(out.length).toBe(1)
    expect(out[0].layer).toBe('daily')
  })

  // 대운 커버리지 확장 — 정재·식신·비견·겁재 대운도 외행성/사회행성 트랜짓이
  // 활성이면 교차가 뜬다(이전엔 대응이 없어 공백이었음). 신호를 지어내는 게 아니라,
  // 해당 트랜짓이 실제 활성일 때만 발화한다(둘 다 활성 + 밴드 통과).
  it('정재 × 토성: 대운 층에서 교차 발화 (확장 매핑)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '정재', layer: 'decadal' }),
      astroSig('Saturn', 'yearly'),
    ])
    expect(out.length).toBe(1)
    expect(out[0].layer).toBe('decadal')
    expect(out[0].name).toBe('정재 × 토성')
  })

  it('겁재 × 명왕성: 대운 층에서 교차 발화 (확장 매핑, decadal 전용)', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '겁재', layer: 'decadal' }),
      astroSig('Pluto', 'decadal'),
    ])
    expect(out.length).toBe(1)
    expect(out[0].name).toBe('겁재 × 명왕성')
    expect(out[0].polarity).toBeLessThan(0)
  })

  it('식신 × 목성: 사회행성이라 세운(yearly) 층에서도 발화', () => {
    const out = extractCrossActivations([
      sajuSig({ sibsin: '식신', layer: 'yearly' }),
      astroSig('Jupiter', 'yearly'),
    ])
    expect(out.length).toBe(1)
    expect(out[0].layer).toBe('yearly')
    expect(out[0].name).toBe('식신 × 목성')
  })
})
