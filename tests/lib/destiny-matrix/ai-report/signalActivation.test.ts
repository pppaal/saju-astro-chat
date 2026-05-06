import { describe, expect, it } from 'vitest'
import {
  activationFor,
  filterActiveSignals,
  rankSignalsByActivation,
  type ActivationContext,
} from '@/lib/destiny-matrix/ai-report/signalActivation'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

function makeSignal(overrides: Partial<NormalizedSignal> = {}): NormalizedSignal {
  return {
    id: 'L5:samhap:trine',
    layer: 5,
    rowKey: 'samhap',
    colKey: 'trine',
    family: 'identity_drive',
    domainHints: ['career'],
    polarity: 'strength',
    score: 10,
    rankScore: 10,
    keyword: 'test',
    sajuBasis: '지지삼합 (亥·卯·未 삼합(목))',
    astroBasis: 'Saturn-True Node trine angle=120deg orb=2.63deg allowed=6deg',
    advice: '',
    tags: [],
    ...overrides,
  }
}

const baseCtx: ActivationContext = {
  targetDate: '2026-05-06',
}

describe('signalActivation/activationFor', () => {
  it('returns a baseline level even with no time context', () => {
    const result = activationFor(makeSignal(), baseCtx)
    expect(result.level).toBeGreaterThan(0)
    expect(result.level).toBeLessThan(80)
    expect(result.reasons.some((r) => r.includes('기본 활성도'))).toBe(true)
  })

  it('boosts when sajuBasis chars overlap with current pillar', () => {
    const without = activationFor(makeSignal(), baseCtx)
    const withWolun = activationFor(makeSignal(), {
      ...baseCtx,
      wolun: { pillar: '己亥' }, // 亥 overlaps with 지지삼합 (亥·卯·未)
    })
    expect(withWolun.level).toBeGreaterThan(without.level)
    expect(withWolun.reasons.some((r) => r.includes('월운'))).toBe(true)
  })

  it('boosts when astroBasis planet matches an active transit cycle', () => {
    const without = activationFor(makeSignal(), baseCtx)
    const withTransit = activationFor(makeSignal(), {
      ...baseCtx,
      activeTransits: [
        {
          cycle: 'saturnReturn',
          influence: 'challenging',
          description: 'Saturn return',
          descriptionEn: '',
        },
      ],
    })
    expect(withTransit.level).toBeGreaterThan(without.level)
    expect(withTransit.reasons.some((r) => r.includes('Saturn'))).toBe(true)
  })

  it('boosts state:opening / state:peak tags', () => {
    const without = activationFor(makeSignal(), baseCtx)
    const opening = activationFor(makeSignal({ tags: ['state:opening'] }), baseCtx)
    const peak = activationFor(makeSignal({ tags: ['state:peak'] }), baseCtx)
    expect(opening.level).toBeGreaterThan(without.level)
    expect(peak.level).toBeGreaterThan(opening.level)
  })

  it('floors caution signals so risks still surface', () => {
    const cold = activationFor(
      makeSignal({ layer: 9, sajuBasis: undefined, astroBasis: undefined, polarity: 'caution' }),
      baseCtx
    )
    expect(cold.level).toBeGreaterThanOrEqual(35)
  })

  it('honors target-date / pillar window when both ends provided', () => {
    const inWindow = activationFor(makeSignal(), {
      targetDate: '2026-05-06',
      seun: { pillar: '丙午', startDate: '2026-01-01', endDate: '2026-12-31' },
    })
    const outOfWindow = activationFor(makeSignal(), {
      targetDate: '2026-05-06',
      seun: { pillar: '丙午', startDate: '2025-01-01', endDate: '2025-12-31' },
    })
    expect(inWindow.level).toBeGreaterThanOrEqual(outOfWindow.level)
  })

  it('caps the final level at 100', () => {
    const ctx: ActivationContext = {
      targetDate: '2026-05-06',
      daeun: { pillar: '乙亥' },
      seun: { pillar: '亥卯' },
      wolun: { pillar: '亥未' },
      iljin: { pillar: '亥子' },
      activeTransits: [
        { cycle: 'saturnReturn', influence: 'positive', description: '', descriptionEn: '' },
      ],
    }
    const result = activationFor(
      makeSignal({ tags: ['state:peak', 'rule:execute'] }),
      ctx
    )
    expect(result.level).toBeLessThanOrEqual(100)
  })

  it('exposes isActive based on threshold', () => {
    const high = activationFor(
      makeSignal({ layer: 1, tags: ['state:peak'] }),
      baseCtx,
      { activeThreshold: 60 }
    )
    expect(high.isActive).toBe(true)

    const low = activationFor(makeSignal({ layer: 9 }), baseCtx, { activeThreshold: 90 })
    expect(low.isActive).toBe(false)
  })
})

describe('signalActivation/rankSignalsByActivation', () => {
  it('sorts signals by descending activation level', () => {
    const signals = [
      makeSignal({ id: 'a', layer: 9 }),
      makeSignal({ id: 'b', layer: 1, tags: ['state:peak'] }),
      makeSignal({ id: 'c', layer: 5 }),
    ]
    const ranked = rankSignalsByActivation(signals, baseCtx)
    expect(ranked.map((entry) => entry.signal.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('signalActivation/filterActiveSignals', () => {
  it('returns only signals above threshold and respects limit', () => {
    const signals = [
      makeSignal({ id: 'hot', layer: 1, tags: ['state:peak'] }),
      makeSignal({ id: 'warm', layer: 4 }),
      makeSignal({ id: 'cold', layer: 10 }),
    ]
    const active = filterActiveSignals(signals, baseCtx, {
      activeThreshold: 60,
      limit: 2,
    })
    expect(active.length).toBeLessThanOrEqual(2)
    for (const entry of active) {
      expect(entry.activation.isActive).toBe(true)
    }
    expect(active.find((entry) => entry.signal.id === 'cold')).toBeUndefined()
  })
})
