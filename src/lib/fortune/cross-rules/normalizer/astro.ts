// Astrology normalizer: turns Chart + transit/return AspectHit[] into
// AstroSignal[]. Thin adapter — does NOT recompute astrology facts.
//
// Composite (timing.event scale): when a transit aspect lands on a planet
// that itself participates in a tight natal hard aspect, we emit an
// activation signal. That's how "잠재 패턴이 지금 발화" is surfaced.

import type { AspectHit, Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import { SIGN_TO_ASTRO_ELEMENT } from '../bridges/element'
import type { AstroSignal } from '../types'
import type { AstroExtrasInput } from '../adapters/astro'

export interface AstroNormalizerInput {
  natal: Chart
  natalAspects?: AspectHit[]
  transits?: Chart
  transitAspects?: AspectHit[]
  solarReturn?: { chart: Chart; aspects?: AspectHit[] }
  lunarReturn?: { chart: Chart; aspects?: AspectHit[] }
  // 1-based: which natal house is "activated" this year by profection.
  profectionHouse?: number
  // Pulled extras: dignity / mode / stellium / mutual reception / progression / fixed stars.
  extras?: AstroExtrasInput
}

const HARD = new Set(['opposition', 'square'])
const SOFT = new Set(['trine', 'sextile'])

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
  const {
    natal,
    natalAspects = [],
    transits,
    transitAspects = [],
    solarReturn,
    lunarReturn,
    profectionHouse,
  } = input

  // ── state ───────────────────────────────────────────────
  for (const p of natal.planets) out.push(...planetSignals(p, 'state'))
  out.push(...planetSignals(natal.ascendant, 'state'))
  out.push(...planetSignals(natal.mc, 'state'))

  const elCount: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const p of natal.planets) {
    const el = SIGN_TO_ASTRO_ELEMENT[p.sign]
    if (el) elCount[el]++
  }
  const total = Object.values(elCount).reduce((a, b) => a + b, 0) || 1
  for (const [el, n] of Object.entries(elCount)) {
    const ratio = n / total
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.elementCount.${el}`,
      fired: n > 0,
      strength: ratio,
      evidence: { count: n, total },
    })
    if (ratio >= 0.4) {
      out.push({
        system: 'astro',
        layer: 'state',
        key: `astro.state.elementDominant.${el}`,
        fired: true,
        strength: ratio,
        evidence: { count: n, total },
      })
    }
    if (n === 0) {
      out.push({
        system: 'astro',
        layer: 'state',
        key: `astro.state.elementAbsent.${el}`,
        fired: true,
        strength: 1,
        evidence: { count: 0, total },
      })
    }
  }

  // ── relation (natal aspects) ────────────────────────────
  // Track natal hard pairs so we can emit timing activations later.
  const natalHardPairs = new Set<string>()
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
      natalHardPairs.add(a.from.name)
      natalHardPairs.add(a.to.name)
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

  // ── timing: transits (day scale by default) ─────────────
  if (transits) {
    for (const p of transits.planets) {
      out.push({
        system: 'astro',
        layer: 'timing',
        scale: 'day',
        key: `astro.timing.transit.${p.name}.house.${p.house}`,
        fired: true,
        strength: 1,
        evidence: { sign: p.sign, house: p.house },
      })
    }
  }
  for (const a of transitAspects) {
    const tight = orbStrength(a.orb, 5)
    out.push({
      system: 'astro',
      layer: 'timing',
      // Transit-to-natal aspects can move slowly (outer planets) so we duplicate
      // the signal across day + month + year scales; rules then filter by scale.
      scale: 'day',
      key: `astro.timing.transit.${a.from.name}.${a.type}.natal.${a.to.name}`,
      fired: true,
      strength: tight,
      evidence: { from: a.from.name, to: a.to.name, type: a.type, orb: a.orb },
    })
    if (HARD.has(a.type) || SOFT.has(a.type)) {
      const slow = ['Saturn', 'Jupiter', 'Uranus', 'Neptune', 'Pluto'].includes(
        a.from.name,
      )
      const longScale = slow ? 'year' : 'month'
      out.push({
        system: 'astro',
        layer: 'timing',
        scale: longScale,
        key: `astro.timing.transit.${a.from.name}.${a.type}.natal.${a.to.name}`,
        fired: true,
        strength: tight,
        evidence: { from: a.from.name, to: a.to.name, type: a.type, orb: a.orb },
      })
      // Composite activation: transit hits a planet that's already in a natal
      // hard aspect → 잠복 패턴 발화.
      if (HARD.has(a.type) && natalHardPairs.has(a.to.name)) {
        out.push({
          system: 'astro',
          layer: 'timing',
          scale: 'event',
          key: `astro.timing.event.activate.${a.to.name}`,
          fired: true,
          strength: tight,
          evidence: {
            trigger: a.from.name,
            target: a.to.name,
            type: a.type,
            orb: a.orb,
          },
        })
      }
    }
  }

  // ── timing: Solar Return (year scale) ───────────────────
  if (solarReturn) {
    for (const p of solarReturn.chart.planets) {
      out.push({
        system: 'astro',
        layer: 'timing',
        scale: 'year',
        key: `astro.timing.solarReturn.${p.name}.house.${p.house}`,
        fired: true,
        strength: 1,
        evidence: { sign: p.sign, house: p.house },
      })
    }
  }

  // ── timing: Lunar Return (month scale) ──────────────────
  if (lunarReturn) {
    for (const p of lunarReturn.chart.planets) {
      out.push({
        system: 'astro',
        layer: 'timing',
        scale: 'month',
        key: `astro.timing.lunarReturn.${p.name}.house.${p.house}`,
        fired: true,
        strength: 0.9,
        evidence: { sign: p.sign, house: p.house },
      })
    }
  }

  // ── timing: profection (year scale) ─────────────────────
  if (profectionHouse) {
    out.push({
      system: 'astro',
      layer: 'timing',
      scale: 'year',
      key: `astro.timing.profection.house.${profectionHouse}`,
      fired: true,
      strength: 0.8,
      evidence: { house: profectionHouse },
    })
  }

  if (input.extras) pushAstroExtras(out, input.extras)

  return out
}

function pushAstroExtras(out: AstroSignal[], extras: AstroExtrasInput) {
  // dignities
  for (const d of extras.dignities) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.dignity.${d.planet}.${d.status}`,
      fired: true,
      strength: d.status === 'peregrine' ? 0.5 : 0.9,
      evidence: { planet: d.planet, sign: d.sign, status: d.status },
    })
  }

  // mode distribution
  const total = extras.modeCount.cardinal + extras.modeCount.fixed + extras.modeCount.mutable || 1
  for (const mode of ['cardinal', 'fixed', 'mutable'] as const) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.modeCount.${mode}`,
      fired: extras.modeCount[mode] > 0,
      strength: extras.modeCount[mode] / total,
      evidence: { count: extras.modeCount[mode], total },
    })
  }
  if (extras.modeDominant) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.modeDominant.${extras.modeDominant}`,
      fired: true,
      strength: extras.modeCount[extras.modeDominant] / total,
      evidence: { mode: extras.modeDominant, count: extras.modeCount[extras.modeDominant] },
    })
  }

  // retrograde
  for (const planet of extras.retrograde) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.retrograde.${planet}`,
      fired: true,
      strength: 0.8,
      evidence: { planet },
    })
  }

  // stellium by house
  for (const s of extras.stelliumByHouse) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.stellium.house.${s.house}`,
      fired: true,
      strength: Math.min(1, s.planets.length / 5),
      evidence: { house: s.house, planets: s.planets },
    })
  }

  // stellium by sign
  for (const s of extras.stelliumBySign) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.stellium.sign.${s.sign}`,
      fired: true,
      strength: Math.min(1, s.planets.length / 5),
      evidence: { sign: s.sign, planets: s.planets },
    })
  }

  // house cusp signs
  for (const c of extras.houseCusps) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.houseCusp.${c.index}.${c.sign}`,
      fired: true,
      strength: 0.6,
      evidence: { house: c.index, sign: c.sign },
    })
  }

  // mutual receptions
  for (const mr of extras.mutualReceptions) {
    out.push({
      system: 'astro',
      layer: 'relation',
      key: `astro.relation.mutualReception.${mr.a}.${mr.b}`,
      fired: true,
      strength: 0.85,
      evidence: { a: mr.a, b: mr.b, aIn: mr.aIn, bIn: mr.bIn },
    })
  }

  // progressed-to-natal aspects (timing scale: year-ish; emit as year)
  if (extras.progressedAspects) {
    for (const p of extras.progressedAspects) {
      out.push({
        system: 'astro',
        layer: 'timing',
        scale: 'year',
        key: `astro.timing.progression.${p.progressed}.angle.${Math.round(p.angle)}.natal.${p.natal}`,
        fired: true,
        strength: 0.7,
        evidence: { progressed: p.progressed, natal: p.natal, angle: p.angle },
      })
    }
  }

  // fixed star conjunctions
  if (extras.fixedStarConjunctions) {
    for (const fs of extras.fixedStarConjunctions) {
      const orb = Math.abs(fs.orb)
      const strength = Math.max(0, Math.min(1, 1 - orb))
      out.push({
        system: 'astro',
        layer: 'state',
        key: `astro.state.fixedStar.${fs.star.name}.conjunct.${fs.planet}`,
        fired: true,
        strength,
        evidence: { star: fs.star.name, planet: fs.planet, orb },
      })
    }
  }
}
