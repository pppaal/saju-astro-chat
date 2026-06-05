import { describe, it, expect } from 'vitest'
import { derivePatterns } from '@/lib/calendar-engine/derivers/patterns'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

// 다층 정렬 카운트(스텝2) — 5층 정렬 패턴이 *몇 개 층이 같은 방향인지* meta 로 노출.

const W = { start: '2030-01-01T00:00:00Z', peak: '2030-01-02T00:00:00Z', end: '2030-01-03T00:00:00Z' }

function sig(source: ActiveSignal['source'], layer: ActiveSignal['layer'], polarity: number): ActiveSignal {
  return {
    id: `${source}.${layer}.x`,
    source,
    kind: 'pillar-sibsin',
    name: 'x',
    themes: ['career'],
    polarity: polarity as ActiveSignal['polarity'],
    layer,
    active: W,
    weight: 0.6,
    evidence: { module: 'test', detail: {} },
  }
}

function find(patterns: ReturnType<typeof derivePatterns>, id: string) {
  return patterns.find((p) => p.id === id)
}

describe('derivePatterns — 다층 정렬 카운트(meta)', () => {
  it('사주 5층 + 점성 4층 모두 ↑ → five-layer-resonance 가 사주 5/점성 4 카운트', () => {
    const signals: ActiveSignal[] = [
      // 사주 5층 (decadal/yearly/monthly/daily/hourly) 전부 +
      sig('saju', 'decadal', 2),
      sig('saju', 'yearly', 2),
      sig('saju', 'monthly', 2),
      sig('saju', 'daily', 2),
      sig('saju', 'hourly', 2),
      // 점성 4층 (decadal/yearly/monthly/daily) 전부 +
      sig('astro', 'decadal', 2),
      sig('astro', 'yearly', 2),
      sig('astro', 'monthly', 2),
      sig('astro', 'daily', 2),
    ]
    const patterns = derivePatterns(signals)

    const both = find(patterns, 'five-layer-resonance')
    expect(both).toBeTruthy()
    expect(both!.meta?.sajuLayers).toBe(5)
    expect(both!.meta?.astroLayers).toBe(4)

    const saju = find(patterns, 'saju-five-layer')
    expect(saju?.meta?.sajuLayers).toBe(5)

    const astro = find(patterns, 'astro-five-layer')
    expect(astro?.meta?.astroLayers).toBe(4)
  })

  it('정렬 안 되면(엇갈림) five-layer-resonance 미발동', () => {
    const signals: ActiveSignal[] = [
      sig('saju', 'decadal', 2),
      sig('saju', 'yearly', -2), // 엇갈림
      sig('saju', 'monthly', 2),
      sig('saju', 'daily', 2),
      sig('saju', 'hourly', 2),
      sig('astro', 'decadal', 2),
      sig('astro', 'yearly', 2),
      sig('astro', 'monthly', 2),
      sig('astro', 'daily', 2),
    ]
    const patterns = derivePatterns(signals)
    expect(find(patterns, 'five-layer-resonance')).toBeFalsy()
  })
})
