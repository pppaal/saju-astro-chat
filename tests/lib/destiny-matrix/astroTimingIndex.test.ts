import { describe, expect, it } from 'vitest'
import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'

describe('buildAstroTimingIndex', () => {
  it('builds normalized timing scales from transits and advanced signals', () => {
    const index = buildAstroTimingIndex({
      activeTransits: ['saturnReturn', 'jupiterReturn', 'eclipse'],
      advancedAstroSignals: {
        solarReturn: true,
        lunarReturn: ['Moon'],
        progressions: { mode: 'secondary' },
      } as any,
    })

    expect(index.decade).toBeGreaterThan(0)
    expect(index.annual).toBeGreaterThan(0)
    expect(index.monthly).toBeGreaterThan(0)
    expect(index.daily).toBeGreaterThan(0)
    expect(index.confidence).toBeGreaterThan(0.55)
    expect(index.confidence).toBeLessThanOrEqual(1)
    expect(index.evidenceCount).toBe(6)
  })

  it('deduplicates transits and clamps output ranges', () => {
    const index = buildAstroTimingIndex({
      activeTransits: ['plutoTransit', 'plutoTransit', 'saturnReturn'],
      advancedAstroSignals: {
        fixedStars: 'active',
        midpoints: { enabled: true },
        harmonics: false,
      } as any,
    })

    expect(index.evidenceCount).toBe(4)
    expect(index.decade).toBeGreaterThanOrEqual(0)
    expect(index.decade).toBeLessThanOrEqual(1)
    expect(index.annual).toBeGreaterThanOrEqual(0)
    expect(index.annual).toBeLessThanOrEqual(1)
    expect(index.monthly).toBeGreaterThanOrEqual(0)
    expect(index.monthly).toBeLessThanOrEqual(1)
    expect(index.daily).toBeGreaterThanOrEqual(0)
    expect(index.daily).toBeLessThanOrEqual(1)
  })
})
