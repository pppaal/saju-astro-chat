// @vitest-environment node
//
// STEP 3 (final) of the aspect-engine consolidation: synastry.ts's
// findAspectBetween was a THIRD independent copy of the
// "shortest-angle -> orb test -> accept -> score" logic (with its own
// ASPECT_ORBS table and no `applying`). It now delegates to the single core,
// src/lib/astrology/foundation/aspectCore.ts, via a synastry-specific
// AspectEngineConfig.
//
// This suite proves the migration is BYTE-IDENTICAL: a brute-force grid of
// two-chart planet pairs is run through (a) a faithful re-implementation of the
// OLD inline findAspectBetween and (b) the NEW synastry engine (exercised via
// the public calculateSynastry / findSynastryAspects). For every accepted pair
// the reported aspect type, orb and score must match exactly, and the synastry
// output must NOT carry an `applying` field (synastry never reported one).
import { describe, it, expect } from 'vitest'
import { calculateSynastry, findSynastryAspects } from '@/lib/astrology/foundation/synastry'
import { shortestAngle } from '@/lib/astrology/foundation/utils'
import type {
  AspectHit,
  AspectType,
  Chart,
  PlanetBase,
  ZodiacKo,
} from '@/lib/astrology/foundation/types'

const SIGNS: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function planet(name: string, longitude: number): PlanetBase {
  const norm = ((longitude % 360) + 360) % 360
  const idx = Math.floor(norm / 30)
  return {
    name,
    longitude,
    sign: SIGNS[idx],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${SIGNS[idx]} ${Math.floor(norm % 30)}deg`,
    house: (idx % 12) + 1,
  }
}

function chart(planets: PlanetBase[]): Chart {
  return {
    planets,
    ascendant: planet('Ascendant', 0),
    mc: planet('MC', 90),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: `${i * 30}deg`,
    })),
  }
}

// ---------------------------------------------------------------------------
// Faithful copy of the ORIGINAL findAspectBetween (pre-consolidation) so the
// test pins the exact arithmetic the migration must preserve. These constants
// are duplicated here ON PURPOSE — they are the oracle, independent of the
// production module.
// ---------------------------------------------------------------------------
const OLD_ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  semisextile: 30,
  quincunx: 150,
  quintile: 72,
  biquintile: 144,
  sesquiquadrate: 135,
}

const OLD_ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 5,
  quincunx: 3,
  semisextile: 2,
  quintile: 2,
  biquintile: 2,
  sesquiquadrate: 2,
}

const DEFAULT_ASPECTS: AspectType[] = [
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
  'quincunx',
]

function oldFindAspectBetween(pA: PlanetBase, pB: PlanetBase): AspectHit | null {
  const diff = shortestAngle(pA.longitude, pB.longitude)
  for (const aspectType of DEFAULT_ASPECTS) {
    const targetAngle = OLD_ASPECT_ANGLES[aspectType]
    const orb = Math.abs(diff - targetAngle)
    const maxOrb = OLD_ASPECT_ORBS[aspectType]
    if (orb <= maxOrb) {
      return {
        from: {
          name: pA.name,
          kind: 'natal',
          house: pA.house,
          sign: pA.sign,
          longitude: pA.longitude,
        },
        to: {
          name: pB.name,
          kind: 'natal',
          house: pB.house,
          sign: pB.sign,
          longitude: pB.longitude,
        },
        type: aspectType,
        orb,
        score: 1 - orb / maxOrb,
      }
    }
  }
  return null
}

// Reproduce calculateSynastry's planet iteration order against the OLD engine so
// the two aspect arrays line up 1:1 for comparison.
function oldSynastryAspects(chartA: Chart, chartB: Chart): AspectHit[] {
  const planetsA = [...chartA.planets, chartA.ascendant, chartA.mc]
  const planetsB = [...chartB.planets, chartB.ascendant, chartB.mc]
  const out: AspectHit[] = []
  for (const pA of planetsA) {
    for (const pB of planetsB) {
      const a = oldFindAspectBetween(pA, pB)
      if (a) {
        a.from.kind = 'natal'
        a.to.kind = 'natal'
        out.push(a)
      }
    }
  }
  return out.sort((x, y) => (y.score ?? 0) - (x.score ?? 0))
}

describe('synastry-aspect-unify: NEW engine is byte-identical to the OLD inline logic', () => {
  // Brute-force a dense grid of A/B longitudes. Single-planet charts keep the
  // mapping trivial and exercise every aspect window + reject region.
  it('brute-force grid: type, orb and score match exactly across all pairs', () => {
    let comparedAccepted = 0
    let comparedNull = 0

    for (let la = 0; la < 360; la += 3) {
      for (let lb = 0; lb < 360; lb += 7) {
        const pA = planet('A', la)
        const pB = planet('B', lb)

        const oldHit = oldFindAspectBetween(pA, pB)

        // Drive the NEW engine through the public API with single-planet charts
        // and read back the one A->B aspect (if any).
        const chartA = chart([pA])
        const chartB = chart([pB])
        const newHits = findSynastryAspects(chartA, chartB).filter(
          (h) => h.from.name === 'A' && h.to.name === 'B'
        )

        if (oldHit === null) {
          comparedNull++
          expect(newHits).toHaveLength(0)
          continue
        }

        comparedAccepted++
        expect(newHits).toHaveLength(1)
        const newHit = newHits[0]
        // Aspect type identical.
        expect(newHit.type).toBe(oldHit.type)
        // Orb identical to full float precision (NOT just close).
        expect(newHit.orb).toBe(oldHit.orb)
        // Score identical to full float precision.
        expect(newHit.score).toBe(oldHit.score)
        // Synastry never reported an `applying` flag — it must stay absent.
        expect('applying' in newHit).toBe(false)
        // from/to payload identical.
        expect(newHit.from).toEqual(oldHit.from)
        expect(newHit.to).toEqual(oldHit.to)
      }
    }

    // Sanity: the grid actually covered both branches.
    expect(comparedAccepted).toBeGreaterThan(0)
    expect(comparedNull).toBeGreaterThan(0)
  })

  it('full calculateSynastry aspect array is byte-identical (multi-planet charts)', () => {
    const chartA = chart([
      planet('Sun', 10),
      planet('Moon', 100),
      planet('Mercury', 5),
      planet('Venus', 200),
      planet('Mars', 333),
    ])
    const chartB = chart([
      planet('Sun', 12), // conjunction-ish to A.Sun, A.Mercury
      planet('Moon', 220), // trine to A.Venus
      planet('Mercury', 95),
      planet('Venus', 150),
      planet('Mars', 90),
    ])

    const oldAspects = oldSynastryAspects(chartA, chartB)
    const result = calculateSynastry({ chartA, chartB })

    // Same number of detected aspects.
    expect(result.aspects).toHaveLength(oldAspects.length)

    // Same sorted sequence, field-for-field. JSON round-trip catches any extra
    // field (e.g. a stray `applying`) as well as value drift.
    expect(JSON.stringify(result.aspects)).toBe(JSON.stringify(oldAspects))

    // No aspect carries an `applying` field.
    for (const a of result.aspects) {
      expect('applying' in a).toBe(false)
    }
  })

  it('orb-boundary cases score 0 exactly, like the old engine', () => {
    // conjunction at exactly 8deg (maxOrb 8) -> orb 8, score 1 - 8/8 = 0.
    const chartA = chart([planet('A', 0)])
    const chartB = chart([planet('B', 8)])
    const hits = findSynastryAspects(chartA, chartB).filter(
      (h) => h.from.name === 'A' && h.to.name === 'B'
    )
    expect(hits).toHaveLength(1)
    expect(hits[0].type).toBe('conjunction')
    expect(hits[0].orb).toBe(8)
    expect(hits[0].score).toBe(0)

    // Just past the boundary -> no aspect (8.0001deg > 8).
    const chartB2 = chart([planet('B', 8.0001)])
    const none = findSynastryAspects(chartA, chartB2).filter(
      (h) => h.from.name === 'A' && h.to.name === 'B'
    )
    expect(none).toHaveLength(0)
  })

  it('synastry score totals are unchanged (harmony/tension/total derived from same scores)', () => {
    const chartA = chart([planet('Sun', 0), planet('Moon', 120)])
    const chartB = chart([planet('Sun', 2), planet('Moon', 240)])

    const result = calculateSynastry({ chartA, chartB })

    // Recompute the score the same way the module does, from the OLD aspects,
    // to prove the downstream scoring is unaffected by the migration.
    const oldAspects = oldSynastryAspects(chartA, chartB)
    const HARMONY: AspectType[] = ['conjunction', 'trine', 'sextile']
    const TENSION: AspectType[] = ['square', 'opposition', 'quincunx']
    let harmony = 0
    let tension = 0
    for (const a of oldAspects) {
      const w = a.score ?? 0.5
      if (HARMONY.includes(a.type)) harmony += w
      else if (TENSION.includes(a.type)) tension += w
    }
    expect(result.score.harmony).toBe(Math.round(harmony * 10) / 10)
    expect(result.score.tension).toBe(Math.round(tension * 10) / 10)
    expect(result.score.total).toBe(Math.round((harmony - tension * 0.5 + 10) * 10) / 10)
  })
})
