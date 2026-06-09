// @vitest-environment node
// 운흐름 v3 step 3 — crossState: 합의/긴장/단독 판정 검증.
import { describe, it, expect } from 'vitest'
import { deriveCrossState, cellCrossState } from '@/lib/calendar-engine/derivers/crossState'
import type { DominanceByScale, SystemDominance } from '@/lib/calendar-engine/derivers/dominance'

function sys(valence: number, mass: number): SystemDominance {
  return { dominant: [], valence, mass }
}
function scale(saju: SystemDominance, astro: SystemDominance) {
  return { saju, astro }
}

describe('deriveCrossState (v3 step 3)', () => {
  it('both systems heavy and same direction → agreement (valence summed)', () => {
    const dom: DominanceByScale = { daily: scale(sys(4, 5), sys(3, 4)) }
    const out = deriveCrossState(dom)
    expect(out.daily!.state).toBe('agreement')
    expect(out.daily!.valence).toBe(7)
  })

  it('both heavy and opposite direction → tension (valence neutral 0)', () => {
    const dom: DominanceByScale = { daily: scale(sys(5, 6), sys(-4, 5)) }
    const out = deriveCrossState(dom)
    expect(out.daily!.state).toBe('tension')
    expect(out.daily!.valence).toBe(0)
  })

  it('only saju heavy → saju-only', () => {
    const dom: DominanceByScale = { yearly: scale(sys(3, 4), sys(0, 0)) }
    const out = deriveCrossState(dom)
    expect(out.yearly!.state).toBe('saju-only')
    expect(out.yearly!.valence).toBe(3)
  })

  it('only astro heavy → astro-only', () => {
    const dom: DominanceByScale = { monthly: scale(sys(0, 0), sys(-2, 3)) }
    const out = deriveCrossState(dom)
    expect(out.monthly!.state).toBe('astro-only')
    expect(out.monthly!.valence).toBe(-2)
  })

  it('both present but one direction is 0 → agreement (no conflict)', () => {
    const dom: DominanceByScale = { daily: scale(sys(0, 4), sys(3, 5)) }
    const out = deriveCrossState(dom)
    expect(out.daily!.state).toBe('agreement')
    expect(out.daily!.valence).toBe(3)
  })

  it('massThreshold gates presence → one-sided below threshold becomes single-system', () => {
    // saju mass 1 below threshold 2 → not present; astro mass 5 present.
    const dom: DominanceByScale = { daily: scale(sys(2, 1), sys(-3, 5)) }
    const out = deriveCrossState(dom, { massThreshold: 2 })
    expect(out.daily!.state).toBe('astro-only')
    expect(out.daily!.valence).toBe(-3)
  })

  it('neither present → none', () => {
    const dom: DominanceByScale = { daily: scale(sys(0, 0), sys(0, 0)) }
    const out = deriveCrossState(dom)
    expect(out.daily!.state).toBe('none')
    expect(out.daily!.valence).toBe(0)
  })
})

describe('cellCrossState headline', () => {
  it('picks the scale with the largest combined mass', () => {
    const dom: DominanceByScale = {
      daily: scale(sys(1, 1), sys(1, 1)), // combined 2
      yearly: scale(sys(2, 6), sys(2, 5)), // combined 11 ← headline
      monthly: scale(sys(1, 3), sys(-1, 2)), // combined 5
    }
    const { headline, byScale } = cellCrossState(dom)
    expect(headline?.layer).toBe('yearly')
    expect(headline?.cross.state).toBe('agreement')
    expect(Object.keys(byScale).sort()).toEqual(['daily', 'monthly', 'yearly'])
  })

  it('returns null headline for empty dominance', () => {
    expect(cellCrossState({}).headline).toBeNull()
  })
})
