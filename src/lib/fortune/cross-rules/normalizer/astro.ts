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
  // accidentals (Lilly-style)
  for (const a of extras.accidentals) {
    out.push({
      system: 'astro',
      layer: 'state',
      key: `astro.state.accidental.${a.planet}.${a.tier}`,
      fired: true,
      strength: Math.min(1, Math.max(0.3, (a.score + 6) / 14)),
      evidence: { planet: a.planet, score: a.score, tier: a.tier, reasons: a.reasons },
    })
  }

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

  // ─── Sect (Hellenistic 낮/밤 차트) ────────────────────────
  out.push({
    system: 'astro', layer: 'state',
    key: `astro.state.sect.${extras.sect}`,
    fired: true, strength: 1,
    evidence: { sect: extras.sect, sectLight: extras.sectLight },
  })
  // sect-aware benefic/malefic 강도. 낮차트는 Jupiter강·Saturn약, 밤차트는 Venus강·Mars약.
  if (extras.sect === 'day') {
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectBenefic.greater.Jupiter', fired: true, strength: 0.9, evidence: { sect: 'day' } })
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectBenefic.lesser.Venus', fired: true, strength: 0.7, evidence: { sect: 'day' } })
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectMalefic.greater.Mars', fired: true, strength: 0.9, evidence: { sect: 'day' } })
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectMalefic.lesser.Saturn', fired: true, strength: 0.7, evidence: { sect: 'day' } })
  } else {
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectBenefic.greater.Venus', fired: true, strength: 0.9, evidence: { sect: 'night' } })
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectBenefic.lesser.Jupiter', fired: true, strength: 0.7, evidence: { sect: 'night' } })
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectMalefic.greater.Saturn', fired: true, strength: 0.9, evidence: { sect: 'night' } })
    out.push({ system: 'astro', layer: 'state', key: 'astro.state.sectMalefic.lesser.Mars', fired: true, strength: 0.7, evidence: { sect: 'night' } })
  }

  // ─── Lot of Fortune ──────────────────────────────────────
  out.push({
    system: 'astro', layer: 'state',
    key: `astro.state.lotOfFortune.house.${extras.lotOfFortune.house}`,
    fired: true, strength: 0.9,
    evidence: { house: extras.lotOfFortune.house, sign: extras.lotOfFortune.sign },
  })
  out.push({
    system: 'astro', layer: 'state',
    key: `astro.state.lotOfFortune.sign.${extras.lotOfFortune.sign}`,
    fired: true, strength: 0.7,
    evidence: { sign: extras.lotOfFortune.sign },
  })

  // ─── Triplicity rulers (참고 신호 — 단일 사실) ──────────
  for (const t of extras.triplicityRulers) {
    out.push({
      system: 'astro', layer: 'state',
      key: `astro.state.triplicity.${t.element}.${extras.sect === 'day' ? t.primary : t.secondary}`,
      fired: true, strength: 0.5,
      evidence: { element: t.element, ruler: extras.sect === 'day' ? t.primary : t.secondary },
    })
  }

  // ─── Profection time-lord (연 통치자) ────────────────────
  if (extras.profectionRuler) {
    const pr = extras.profectionRuler
    out.push({
      system: 'astro', layer: 'timing', scale: 'year',
      key: `astro.timing.profectionLord.${pr.ruler}`,
      fired: true, strength: 0.85,
      evidence: { ruler: pr.ruler, rulerHouse: pr.rulerHouse, profectedHouse: pr.house, profectedSign: pr.sign },
    })
    out.push({
      system: 'astro', layer: 'timing', scale: 'year',
      key: `astro.timing.profectionLord.${pr.ruler}.house.${pr.rulerHouse}`,
      fired: true, strength: 0.9,
      evidence: { ruler: pr.ruler, rulerHouse: pr.rulerHouse },
    })
  }

  // ─── Lot of Spirit (직업·정신·소명) ──────────────────────
  out.push({
    system: 'astro', layer: 'state',
    key: `astro.state.lotOfSpirit.house.${extras.lotOfSpirit.house}`,
    fired: true, strength: 0.9,
    evidence: { house: extras.lotOfSpirit.house, sign: extras.lotOfSpirit.sign },
  })
  out.push({
    system: 'astro', layer: 'state',
    key: `astro.state.lotOfSpirit.sign.${extras.lotOfSpirit.sign}`,
    fired: true, strength: 0.7,
    evidence: { sign: extras.lotOfSpirit.sign },
  })

  // ─── Planetary Joys ──────────────────────────────────────
  for (const j of extras.planetaryJoys) {
    if (j.inJoy) {
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.planetaryJoy.${j.planet}`,
        fired: true, strength: 0.9,
        evidence: { planet: j.planet, joyHouse: j.joyHouse },
      })
    }
  }

  // ─── Bonification / Maltreatment ─────────────────────────
  for (const b of extras.bonifications) {
    if (b.condition !== 'neutral') {
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.${b.condition === 'bonified' ? 'bonified' : b.condition === 'maltreated' ? 'maltreated' : 'mixed'}.${b.planet}`,
        fired: true,
        strength: b.condition === 'mixed' ? 0.7 : 0.85,
        evidence: { planet: b.planet, condition: b.condition, benefics: b.benefics, malefics: b.malefics },
      })
    }
  }

  // ─── Zodiacal Releasing (Hellenistic time-lord) ──────────
  const zr = extras.zodiacalReleasing
  if (zr) {
    // Active L1 ruler — strong year-scale signal (current chapter's planet).
    out.push({
      system: 'astro', layer: 'timing', scale: 'year',
      key: `astro.timing.zr.l1.ruler.${zr.currentL1Ruler}`,
      fired: true,
      strength: 0.9,
      evidence: { sign: zr.currentL1Sign, ruler: zr.currentL1Ruler, startAge: zr.currentL1StartAge, endAge: zr.currentL1EndAge },
    })
    out.push({
      system: 'astro', layer: 'timing', scale: 'year',
      key: `astro.timing.zr.l1.sign.${zr.currentL1Sign}`,
      fired: true,
      strength: 0.85,
      evidence: { sign: zr.currentL1Sign, ruler: zr.currentL1Ruler },
    })
    if (zr.isPeakPeriod) {
      out.push({
        system: 'astro', layer: 'timing', scale: 'year',
        key: 'astro.timing.zr.peak',
        fired: true,
        strength: 1,
        evidence: { sign: zr.currentL1Sign, ruler: zr.currentL1Ruler, note: 'angular to starting sign' },
      })
    }
    if (zr.isLoosingOfTheBond) {
      out.push({
        system: 'astro', layer: 'timing', scale: 'event',
        key: 'astro.timing.zr.loosingOfTheBond',
        fired: true,
        strength: 1,
        evidence: { sign: zr.currentL1Sign, ruler: zr.currentL1Ruler, note: 'opposition to starting sign — major life transition' },
      })
    }
    // L2 sub-period (월·달 단위 — month scale로 노출)
    if (zr.currentL2Ruler && zr.currentL2Sign) {
      out.push({
        system: 'astro', layer: 'timing', scale: 'month',
        key: `astro.timing.zr.l2.ruler.${zr.currentL2Ruler}`,
        fired: true,
        strength: 0.85,
        evidence: { sign: zr.currentL2Sign, ruler: zr.currentL2Ruler, startAge: zr.currentL2StartAgeYears, endAge: zr.currentL2EndAgeYears },
      })
      if (zr.isL2Peak) {
        out.push({
          system: 'astro', layer: 'timing', scale: 'month',
          key: 'astro.timing.zr.l2.peak',
          fired: true,
          strength: 0.95,
          evidence: { sign: zr.currentL2Sign, ruler: zr.currentL2Ruler, note: 'L2 angular to L1 sign' },
        })
      }
    }
  }

  // ─── Bonification 7 conditions — explicit signals ────────
  for (const b of extras.bonifications) {
    if (b.conditions.adherence) {
      const isMal = ['Mars', 'Saturn'].includes(b.conditions.adherence.by)
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.bonif.adherence.${isMal ? 'malefic' : 'benefic'}.${b.planet}`,
        fired: true,
        strength: Math.min(1, 1 - b.conditions.adherence.orb / 3),
        evidence: { planet: b.planet, by: b.conditions.adherence.by, orb: b.conditions.adherence.orb },
      })
    }
    if (b.conditions.strikingRay) {
      const isMal = ['Mars', 'Saturn'].includes(b.conditions.strikingRay.by)
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.bonif.strikingRay.${isMal ? 'malefic' : 'benefic'}.${b.planet}`,
        fired: true,
        strength: Math.min(1, 1 - b.conditions.strikingRay.orb / 3),
        evidence: { planet: b.planet, by: b.conditions.strikingRay.by, orb: b.conditions.strikingRay.orb },
      })
    }
    if (b.conditions.overcoming) {
      const isMal = ['Mars', 'Saturn'].includes(b.conditions.overcoming.by)
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.bonif.overcoming.${isMal ? 'malefic' : 'benefic'}.${b.planet}`,
        fired: true,
        strength: 0.85,
        evidence: { planet: b.planet, by: b.conditions.overcoming.by, note: 'sign-based superior square' },
      })
    }
    if (b.conditions.opposition) {
      const isMal = ['Mars', 'Saturn'].includes(b.conditions.opposition.by)
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.bonif.opposition.${isMal ? 'malefic' : 'benefic'}.${b.planet}`,
        fired: true,
        strength: 0.8,
        evidence: { planet: b.planet, by: b.conditions.opposition.by },
      })
    }
    if (b.conditions.enclosure) {
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.bonif.enclosure.malefic.${b.planet}`,
        fired: true,
        strength: 0.95,
        evidence: { planet: b.planet, left: b.conditions.enclosure.left, right: b.conditions.enclosure.right },
      })
    }
    if (b.conditions.reception) {
      out.push({
        system: 'astro', layer: 'state',
        key: `astro.state.bonif.reception.${b.planet}`,
        fired: true,
        strength: 0.85,
        evidence: { planet: b.planet, by: b.conditions.reception.by, method: b.conditions.reception.method },
      })
    }
  }

  // ─── Combust / Cazimi / Under-Beams ──────────────────────
  for (const c of extras.combustState) {
    if (c.state === 'free') continue
    out.push({
      system: 'astro', layer: 'state',
      key: `astro.state.combust.${c.state}.${c.planet}`,
      fired: true,
      strength: c.state === 'cazimi' ? 1 : c.state === 'combust' ? 0.9 : 0.6,
      evidence: { planet: c.planet, state: c.state, orb: c.orb },
    })
  }
}
