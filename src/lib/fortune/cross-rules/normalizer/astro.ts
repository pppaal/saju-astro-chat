// Astrology normalizer: turns Chart + transit AspectHit[] into AstroSignal[].
// Thin adapter — does NOT recompute astrology facts.

import type { AspectHit, Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import { SIGN_TO_ASTRO_ELEMENT } from '../bridges/element'
import type { AstroSignal } from '../types'

export interface AstroNormalizerInput {
  natal: Chart
  natalAspects?: AspectHit[]
  transits?: Chart // chart at queryTime
  transitAspects?: AspectHit[] // transit ↔ natal hits
}

const HARD = new Set(['opposition', 'square'])
const SOFT = new Set(['trine', 'sextile'])

// orb(degree) → strength 0..1. Tighter orb → stronger.
function orbStrength(orb: number, max = 8): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(orb) / max))
}

function planetSignals(planet: PlanetBase, layer: 'state'): AstroSignal[] {
  const out: AstroSignal[] = []
  out.push({
    system: 'astro',
    layer,
    key: `astro.state.planet.${planet.name}.sign.${planet.sign}`,
    fired: true,
    strength: 1,
    evidence: { sign: planet.sign, degree: planet.degree },
  })
  out.push({
    system: 'astro',
    layer,
    key: `astro.state.planet.${planet.name}.house.${planet.house}`,
    fired: true,
    strength: 1,
    evidence: { house: planet.house },
  })
  const el = SIGN_TO_ASTRO_ELEMENT[planet.sign]
  if (el) {
    out.push({
      system: 'astro',
      layer,
      key: `astro.state.planet.${planet.name}.element.${el}`,
      fired: true,
      strength: 1,
      evidence: { sign: planet.sign, element: el },
    })
  }
  return out
}

export function normalizeAstro(input: AstroNormalizerInput): AstroSignal[] {
  const out: AstroSignal[] = []
  const { natal, natalAspects = [], transits, transitAspects = [] } = input

  // ── state layer ─────────────────────────────────────────
  for (const p of natal.planets) out.push(...planetSignals(p, 'state'))
  out.push(...planetSignals(natal.ascendant, 'state'))
  out.push(...planetSignals(natal.mc, 'state'))

  // 4-element distribution
  const elCount: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const p of natal.planets) {
    const el = SIGN_TO_ASTRO_ELEMENT[p.sign]
    if (el) elCount[el]++
  }
  const total = Object.values(elCount).reduce((a, b) => a + b, 0) || 1
  for (const [el, n] of Object.entries(elCount)) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.elementCount.${el}`,
      fired: n > 0,
      strength: n / total,
      evidence: { count: n, total },
    })
  }

  // ── relation layer (natal aspects) ──────────────────────
  for (const a of natalAspects) {
    const hard = HARD.has(a.type)
    const soft = SOFT.has(a.type)
    out.push({
      system: 'astro',
      layer: 'relation',
      key: `astro.relation.aspect.${a.from.name}.${a.type}.${a.to.name}`,
      fired: true,
      strength: orbStrength(a.orb),
      evidence: { from: a.from.name, to: a.to.name, type: a.type, orb: a.orb },
    })
    if (hard) {
      out.push({
        system: 'astro',
        layer: 'relation',
        key: `astro.relation.hard.${a.from.name}.${a.to.name}`,
        fired: true,
        strength: orbStrength(a.orb),
        evidence: { type: a.type, orb: a.orb },
      })
    }
    if (soft) {
      out.push({
        system: 'astro',
        layer: 'relation',
        key: `astro.relation.soft.${a.from.name}.${a.to.name}`,
        fired: true,
        strength: orbStrength(a.orb),
        evidence: { type: a.type, orb: a.orb },
      })
    }
  }

  // ── timing layer (transits) ─────────────────────────────
  if (transits) {
    for (const p of transits.planets) {
      out.push({
        system: 'astro',
        layer: 'timing',
        key: `astro.timing.transit.${p.name}.house.${p.house}`,
        fired: true,
        strength: 1,
        evidence: { sign: p.sign, house: p.house },
      })
    }
  }
  for (const a of transitAspects) {
    out.push({
      system: 'astro',
      layer: 'timing',
      key: `astro.timing.transit.${a.from.name}.${a.type}.natal.${a.to.name}`,
      fired: true,
      strength: orbStrength(a.orb, 5), // transits use tighter orb
      evidence: { from: a.from.name, to: a.to.name, type: a.type, orb: a.orb },
    })
  }

  return out
}
