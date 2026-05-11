/**
 * Birth Snapshot serializer.
 *
 * Takes the same `SajuNormalizerInput` + `AstroNormalizerInput` that the
 * cross-rule engine consumes and emits a compact, structured JSON-ish block
 * that an LLM can read directly without the rule engine's filtering.
 *
 * Format choices:
 * - JSON-like text (not strict JSON) for readability — Anthropic models parse
 *   labelled blocks better than a single giant JSON object.
 * - Numbers rounded. Empty fields elided.
 * - Aspects filtered by orb to keep token budget sane.
 */

import type { SajuNormalizerInput } from './normalizer/saju'
import type { AstroNormalizerInput } from './normalizer/astro'
import type { AspectHit, Chart, PlanetBase } from '@/lib/astrology/foundation/types'

const NATAL_ASPECT_MAX_ORB = 5
const TRANSIT_ASPECT_MAX_ORB = 3

export interface BirthSnapshotOptions {
  /** Max orb (deg) for natal aspects. Default 5. */
  natalAspectMaxOrb?: number
  /** Max orb (deg) for current transit aspects. Default 3. */
  transitAspectMaxOrb?: number
  /** Drop fields that are empty / zero / null. Default true. */
  compact?: boolean
}

export function serializeBirthSnapshot(
  saju: SajuNormalizerInput,
  astro: AstroNormalizerInput,
  opts: BirthSnapshotOptions = {}
): string {
  const natalOrb = opts.natalAspectMaxOrb ?? NATAL_ASPECT_MAX_ORB
  const transitOrb = opts.transitAspectMaxOrb ?? TRANSIT_ASPECT_MAX_ORB

  const parts: string[] = []
  parts.push('[Birth Snapshot]')
  parts.push('# Raw saju + astrology that the rule engine consumed.')
  parts.push('# Use this when cross signals do not cover a question.')
  parts.push('')

  parts.push('## SAJU')
  parts.push(serializeSaju(saju))
  parts.push('')

  parts.push('## ASTROLOGY')
  parts.push(serializeAstro(astro, { natalOrb, transitOrb }))

  return parts.join('\n')
}

function serializeSaju(input: SajuNormalizerInput): string {
  const {
    saju,
    natalRelations,
    currentDaeun,
    currentSeun,
    currentWolun,
    currentIljin,
    daeunSequence,
    ageYears,
    extras,
  } = input
  const out: Record<string, unknown> = {}

  out.dayMaster = {
    stem: saju.dayMaster.name,
    element: saju.dayMaster.element,
    yinYang: (saju.dayMaster as { yinYang?: string }).yinYang ?? undefined,
  }

  out.pillars = pillarSummary(saju.pillars)

  out.fiveElements = saju.fiveElements

  out.sibsinDistribution = sibsinDistribution(saju.pillars)

  if (extras?.geokguk && extras.geokguk.primary !== '미정') {
    out.geokguk = {
      primary: extras.geokguk.primary,
      category: extras.geokguk.category,
      confidence: extras.geokguk.confidence,
    }
  }

  if (extras?.yongsin) {
    out.yongsin = {
      primary: extras.yongsin.primaryYongsin,
      type: extras.yongsin.yongsinType,
      kibsin: extras.yongsin.kibsin ?? undefined,
      dayMasterStrength: extras.yongsin.daymasterStrength,
    }
  }

  if (extras?.twelveStages) {
    out.twelveStages = extras.twelveStages
  }

  if (extras?.jijanggan) {
    out.jijanggan = extras.jijanggan
  }

  if (extras?.shinsal && extras.shinsal.length > 0) {
    out.shinsal = extras.shinsal.map((s) => ({
      kind: s.kind,
      pillars: s.pillars,
      target: s.target,
      detail: s.detail,
    }))
  }

  if (natalRelations && natalRelations.length > 0) {
    out.natalRelations = natalRelations.map((r) => ({
      kind: r.kind,
      pillars: r.pillars,
      detail: r.detail,
    }))
  }

  const timing: Record<string, unknown> = {}
  if (currentDaeun) timing.daeun = compactUnse(currentDaeun)
  if (currentSeun) timing.seun = compactUnse(currentSeun)
  if (currentWolun) timing.wolun = compactUnse(currentWolun)
  if (currentIljin) timing.iljin = compactUnse(currentIljin)
  if (daeunSequence) {
    timing.daeunSequence = {
      index: daeunSequence.index,
      yearsIntoCurrent: round2(daeunSequence.yearsIntoCurrent),
      yearsToNext: round2(daeunSequence.yearsToNext),
      previous: daeunSequence.previous ? compactUnse(daeunSequence.previous) : null,
      next: daeunSequence.next ? compactUnse(daeunSequence.next) : null,
      transitionImminent: !!daeunSequence.next && daeunSequence.yearsToNext <= 1,
    }
  }
  if (Object.keys(timing).length > 0) out.timing = timing

  if (typeof ageYears === 'number') out.ageYears = ageYears

  return JSON.stringify(out, null, 2)
}

function pillarSummary(pillars: SajuNormalizerInput['saju']['pillars']) {
  const compact = (p: SajuNormalizerInput['saju']['pillars']['year']) => ({
    ganji: `${p.heavenlyStem.name}${p.earthlyBranch.name}`,
    stem: {
      name: p.heavenlyStem.name,
      element: p.heavenlyStem.element,
      sibsin: p.heavenlyStem.sibsin,
    },
    branch: {
      name: p.earthlyBranch.name,
      element: p.earthlyBranch.element,
      sibsin: p.earthlyBranch.sibsin,
    },
  })
  return {
    year: compact(pillars.year),
    month: compact(pillars.month),
    day: compact(pillars.day),
    time: compact(pillars.time),
  }
}

function sibsinDistribution(
  pillars: SajuNormalizerInput['saju']['pillars']
): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const p = pillars[k]
    for (const slot of [p.heavenlyStem, p.earthlyBranch]) {
      const s = String(slot.sibsin ?? '')
      if (!s) continue
      dist[s] = (dist[s] ?? 0) + 1
    }
  }
  return dist
}

function compactUnse(u: NonNullable<SajuNormalizerInput['currentDaeun']>) {
  return {
    ganji: `${u.heavenlyStem}${u.earthlyBranch}`,
    sibsin: u.sibsin,
  }
}

function serializeAstro(
  input: AstroNormalizerInput,
  cfg: { natalOrb: number; transitOrb: number }
): string {
  const out: Record<string, unknown> = {}

  out.natal = chartSummary(input.natal)

  if (input.natalAspects && input.natalAspects.length > 0) {
    out.natalAspects = filterAspects(input.natalAspects, cfg.natalOrb)
  }

  if (input.transits) {
    out.currentTransits = {
      planets: input.transits.planets.map(planetCompact),
    }
  }
  if (input.transitAspects && input.transitAspects.length > 0) {
    out.currentTransitAspects = filterAspects(input.transitAspects, cfg.transitOrb)
  }

  if (typeof input.profectionHouse === 'number') {
    out.profectionHouse = input.profectionHouse
  }

  if (input.solarReturn) {
    out.solarReturn = {
      planets: input.solarReturn.chart.planets.map(planetCompact),
      aspects:
        input.solarReturn.aspects && input.solarReturn.aspects.length > 0
          ? filterAspects(input.solarReturn.aspects, cfg.natalOrb)
          : undefined,
    }
  }

  if (input.lunarReturn) {
    out.lunarReturn = {
      planets: input.lunarReturn.chart.planets.map(planetCompact),
      aspects:
        input.lunarReturn.aspects && input.lunarReturn.aspects.length > 0
          ? filterAspects(input.lunarReturn.aspects, cfg.natalOrb)
          : undefined,
    }
  }

  if (input.extras) {
    const ex: Record<string, unknown> = {}
    if (input.extras.dignities?.length) ex.dignities = input.extras.dignities
    if (input.extras.modeDominant) {
      ex.modes = { count: input.extras.modeCount, dominant: input.extras.modeDominant }
    }
    if (input.extras.retrograde?.length) ex.retrograde = input.extras.retrograde
    const stellium = [
      ...(input.extras.stelliumByHouse ?? []),
      ...(input.extras.stelliumBySign ?? []),
    ]
    if (stellium.length) ex.stellium = stellium
    if (input.extras.mutualReceptions?.length) ex.mutualReceptions = input.extras.mutualReceptions
    if (input.extras.progressedAspects?.length)
      ex.progressedAspects = input.extras.progressedAspects
    if (input.extras.fixedStarConjunctions?.length)
      ex.fixedStars = input.extras.fixedStarConjunctions
    if (input.extras.sect) ex.sect = { sect: input.extras.sect, light: input.extras.sectLight }
    if (input.extras.profectionRuler) ex.profectionRuler = input.extras.profectionRuler
    if (input.extras.zodiacalReleasing) ex.zodiacalReleasing = input.extras.zodiacalReleasing
    if (Object.keys(ex).length > 0) out.extras = ex
  }

  return JSON.stringify(out, null, 2)
}

function chartSummary(c: Chart) {
  return {
    planets: c.planets.map(planetCompact),
    ascendant: planetCompact(c.ascendant),
    mc: planetCompact(c.mc),
    houses: c.houses.map((h) => ({ index: h.index, sign: h.sign, cusp: round2(h.cusp) })),
  }
}

function planetCompact(p: PlanetBase) {
  const out: Record<string, unknown> = {
    name: p.name,
    sign: p.sign,
    degree: round2(p.degree + (p.minute ?? 0) / 60),
    house: p.house,
  }
  if (p.retrograde) out.retrograde = true
  return out
}

function filterAspects(aspects: AspectHit[], maxOrb: number) {
  return aspects
    .filter((a) => Math.abs(a.orb) <= maxOrb)
    .sort((a, b) => Math.abs(a.orb) - Math.abs(b.orb))
    .slice(0, 30)
    .map((a) => ({
      from: a.from.name,
      to: a.to.name,
      type: a.type,
      orb: round2(a.orb),
      applying: a.applying,
    }))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
