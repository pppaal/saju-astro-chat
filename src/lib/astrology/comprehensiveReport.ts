// src/lib/astrology/comprehensiveReport.ts
//
// Traditional-style comprehensive report — mirrors src/lib/Saju/comprehensiveReport.ts.
//
// Inputs: full AstrologyData (natal + daily + monthly + yearly + daewoon +
// advanced layers from astrology.ts).
//
// Pipeline:
//   1. Per-planet essential-dignity score (rulership / exaltation / triplicity /
//      detriment / fall / peregrine).
//   2. Per-aspect scoring with orb scaling, planet-pair tone, retrograde modifier.
//   3. Element + Modality + Polarity + Hemisphere balance over the 7 traditional
//      planets + Asc + MC.
//   4. House ruler chasing — for each angular house (1, 4, 7, 10) we trace the
//      sign on the cusp back to its traditional ruler and look up where that
//      ruler sits, surfacing a one-line signal.
//   5. Domain scoring (성격·관계·커리어·재물·건강) combines:
//        planet-domain weight × dignity bonus
//      + house-domain hits
//      + element/modality balance bonus
//      + aggregated aspect score
//   6. Timing scores per layer:
//        oneliner + score for daily / monthly / yearly / daewoon, each derived
//        from the relevant return / progression / transit data.

import type { AstrologyData } from './astrology'
import { findNatalAspects } from './foundation/aspects'
import {
  type AspectKind,
  type AstroPlanetName,
  type ZodiacName,
  getAspectInterpretation,
  getHouseDomainKo,
  getNorthNodeInterpretation,
  getPlanetHouseInterpretation,
  getPlanetLabelKo,
  getPlanetSignInterpretation,
  getSignLabelKo,
  getSouthNodeOppositeSign,
} from './interpretations'
import {
  getChironHouseInterpretation,
  getChironSignInterpretation,
  getLilithHouseInterpretation,
  getLilithSignInterpretation,
} from './extraPointInterpretations'
import {
  getAsteroidSignInterpretation,
  getAsteroidThemeKo,
  type AsteroidName,
} from './asteroidInterpretations'
import {
  getPartOfFortuneHouseInterpretation,
  getPartOfFortuneSignInterpretation,
  getVertexSignInterpretation,
} from './pofVertexInterpretations'
import {
  getEclipseInterpretation,
  getMidpointActivationInterpretation,
  getDraconicAlignmentTone,
  getDraconicTensionTone,
  getFixedStarPlanetTone,
  type AspectKindLike,
} from './advancedInterpretations'
import { getAspectPairInterpretation } from './aspectPairInterpretations'
import {
  getEssentialDignity,
  getRulerOfSign,
  type DignityKind,
  type DignityResult,
} from './foundation/dignities'
import { aggregateAspectScore, scoreAspect, type ScoredAspect } from './foundation/aspectScoring'
import { calculateChartBalance, type ChartBalance, type Element } from './foundation/balance'

export type AstrologyDomain =
  | 'personality'
  | 'relationship'
  | 'career'
  | 'wealth'
  | 'health'

export const ASTROLOGY_DOMAIN_LABEL_KO: Record<AstrologyDomain, string> = {
  personality: '성격·자아',
  relationship: '관계·사랑',
  career: '커리어·사명',
  wealth: '재물·가치',
  health: '건강·생명력',
}

export interface AstrologyDomainScore {
  domain: AstrologyDomain
  label: string
  score: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  signals: string[]
}

export interface AstrologyPlacementHighlight {
  planet: AstroPlanetName
  sign: ZodiacName
  house: number
  retrograde?: boolean
  dignity: DignityResult
  signal: string
}

export interface AstrologyAspectHighlight extends ScoredAspect {
  signal: string
}

export interface AstrologyTimingScore {
  label: string
  score: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  headline: string
}

export interface AstrologyTiming {
  daily: AstrologyTimingScore
  monthly: AstrologyTimingScore
  yearly: AstrologyTimingScore
  daewoon: AstrologyTimingScore
}

export interface AstrologyHouseRulerSignal {
  house: number
  cuspSign: ZodiacName
  ruler: AstroPlanetName | null
  rulerSign: ZodiacName | null
  rulerHouse: number | null
  signal: string
}

export interface AstrologySoulSignal {
  kind: 'north-node' | 'chiron' | 'lilith'
  label: string
  sign: ZodiacName | null
  house: number | null
  signal: string
}

export type AstrologyThemeKey =
  | 'personality'
  | 'relationship'
  | 'career'
  | 'wealth'
  | 'health'
  | 'soul'
  | 'structure'

export interface AstrologyThemedSection {
  theme: AstrologyThemeKey
  title: string
  score: number | null
  band: 'great' | 'good' | 'mixed' | 'caution' | null
  paragraphs: string[]
  bullets: string[]
  advice: string[]
}

export type AstrologyTimingLayer = 'daily' | 'monthly' | 'yearly' | 'daewoon'

export interface AstrologyTimingSection {
  layer: AstrologyTimingLayer
  title: string
  score: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  headline: string
  paragraphs: string[]
  bullets: string[]
  advice: string[]
}

export interface AstrologyComprehensiveReport {
  overallScore: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  domains: AstrologyDomainScore[]
  topPlacements: AstrologyPlacementHighlight[]
  /** Asteroids / Chiron / Lilith / PoF / Vertex / Node placement lines. */
  extendedPlacements: string[]
  topAspects: AstrologyAspectHighlight[]
  balance: ChartBalance
  houseRulers: AstrologyHouseRulerSignal[]
  timing: AstrologyTiming
  /** True Node + Chiron + Lilith readings. */
  soulSignals: AstrologySoulSignal[]
  /** Asteroids, PoF, Vertex, fixed-star, midpoint, eclipse, draconic — interpreted lines. */
  advancedReadings: {
    asteroids: string[]
    partOfFortune: string
    vertex: string
    fixedStars: string[]
    midpoints: string[]
    eclipses: string[]
    draconic: string[]
  }
  /** Saju-style themed full sections with score + narrative paragraphs. */
  themedSections: AstrologyThemedSection[]
  /** Saju-style per-period rich text sections. */
  timingSections: AstrologyTimingSection[]
  /** Headline counts for advanced layers — surface in UI tooltips. */
  advancedSummary: {
    asteroids: number
    fixedStarConjunctions: number
    midpointActivations: number
    eclipseImpacts: number
    draconicTensions: number
    draconicAlignments: number
  }
}

// ============================================================
// Domain weights — planet × domain (per traditional astrology)
// ============================================================

const PLANET_DOMAIN_WEIGHT: Record<AstroPlanetName, Partial<Record<AstrologyDomain, number>>> = {
  Sun: { personality: 8, career: 4 },
  Moon: { personality: 5, relationship: 5, health: 4 },
  Mercury: { career: 5, personality: 3 },
  Venus: { relationship: 8, wealth: 5 },
  Mars: { career: 5, health: 5, personality: 3 },
  Jupiter: { wealth: 6, career: 4, personality: 3 },
  Saturn: { career: 5, health: 4 },
  Uranus: { career: 3, personality: 3 },
  Neptune: { relationship: 3, personality: 3 },
  Pluto: { personality: 4, career: 3 },
  Ascendant: { personality: 6 },
}

const HOUSE_DOMAIN_BOOST: Record<number, AstrologyDomain[]> = {
  1: ['personality'],
  2: ['wealth'],
  3: ['career', 'personality'],
  4: ['relationship', 'health'],
  5: ['relationship', 'personality'],
  6: ['health', 'career'],
  7: ['relationship'],
  8: ['wealth', 'health'],
  9: ['personality', 'career'],
  10: ['career'],
  11: ['career', 'wealth'],
  12: ['health', 'personality'],
}

const ELEMENT_DOMAIN_HINT: Record<Element, AstrologyDomain[]> = {
  fire: ['personality', 'career'],
  earth: ['wealth', 'health', 'career'],
  air: ['personality', 'relationship'],
  water: ['relationship', 'health'],
}

function bandFor(score: number): AstrologyDomainScore['band'] {
  if (score >= 78) return 'great'
  if (score >= 65) return 'good'
  if (score >= 50) return 'mixed'
  return 'caution'
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getAspectKoLabel(kind: AspectKind): string {
  switch (kind) {
    case 'conjunction':
      return '컨정션'
    case 'sextile':
      return '섹스타일'
    case 'square':
      return '스퀘어'
    case 'trine':
      return '트라인'
    case 'opposition':
      return '오포지션'
  }
}

// ============================================================
// Public — buildAstrologyComprehensiveReport
// ============================================================

export function buildAstrologyComprehensiveReport(
  data: AstrologyData
): AstrologyComprehensiveReport {
  const placements = collectPlacements(data)
  const aspects = collectScoredAspects(data)
  const balance = calculateChartBalance(
    placements
      .filter((p) => p.planet !== 'Ascendant')
      .map((p) => ({ name: p.planet, sign: p.sign, house: p.house }))
  )
  const houseRulers = collectHouseRulers(data, placements)
  const earlySoulSignals = collectSoulSignals(data)
  const domains = scoreDomainsV2(data, placements, aspects, balance, earlySoulSignals)
  const overallScore = clampScore(
    domains.reduce((sum, d) => sum + d.score, 0) / domains.length
  )

  const topPlacements = placements
    .slice()
    .sort((a, b) => Math.abs(b.dignity.score) - Math.abs(a.dignity.score))
  const topAspects = aspects.slice()
  const soulSignals = collectSoulSignals(data)
  const timing = scoreTiming(data, aspects)
  const advancedReadings = collectAdvancedReadings(data)
  const themedSections = buildThemedSections(
    data,
    placements,
    aspects,
    domains,
    houseRulers,
    soulSignals,
    advancedReadings,
    balance,
  )
  const timingSections = buildTimingSections(data, timing, aspects)

  const extendedPlacements = collectExtendedPlacements(data)
  return {
    overallScore,
    band: bandFor(overallScore),
    domains,
    topPlacements,
    extendedPlacements,
    topAspects,
    balance,
    houseRulers,
    timing,
    soulSignals,
    advancedReadings,
    themedSections,
    timingSections,
    advancedSummary: {
      asteroids: data.advanced.asteroids.length,
      fixedStarConjunctions: data.advanced.fixedStarConjunctions.length,
      midpointActivations: data.advanced.midpointActivations.length,
      eclipseImpacts: data.advanced.eclipseImpacts.length,
      draconicTensions: data.advanced.draconic.tensions.length,
      draconicAlignments: data.advanced.draconic.alignments.length,
    },
  }
}

// ============================================================
// Internals
// ============================================================

function collectPlacements(data: AstrologyData): AstrologyPlacementHighlight[] {
  const out: AstrologyPlacementHighlight[] = []
  for (const planet of data.natal.planets) {
    if (!planet.name || !planet.sign) continue
    const planetName = planet.name as AstroPlanetName
    const signName = planet.sign as ZodiacName
    const house = typeof planet.house === 'number' ? planet.house : 1
    const dignity = getEssentialDignity(planetName, signName)
    out.push({
      planet: planetName,
      sign: signName,
      house,
      retrograde: planet.retrograde,
      dignity,
      signal: `${getPlanetLabelKo(planetName)} ${getSignLabelKo(signName)} (${house}하우스 · ${getHouseDomainKo(house)}, ${dignity.label}) — ${getPlanetSignInterpretation(planetName, signName, 'ko')}`,
    })
  }
  if (data.natal.ascendant?.sign) {
    const ascSign = data.natal.ascendant.sign as ZodiacName
    out.unshift({
      planet: 'Ascendant',
      sign: ascSign,
      house: 1,
      dignity: { kind: 'peregrine', score: 0, label: '상승궁' },
      signal: `${getPlanetLabelKo('Ascendant')} ${getSignLabelKo(ascSign)} — 외부에 비치는 첫인상의 결.`,
    })
  }
  return out
}

function collectExtendedPlacements(data: AstrologyData): string[] {
  // Asteroids + Chiron + Lilith + PoF + Vertex placements as plain readable
  // signal strings (separate from the AstroPlanetName-typed core list).
  const out: string[] = []
  for (const ast of data.advanced.asteroids) {
    if (!ast.sign) continue
    const sign = ast.sign as ZodiacName
    out.push(`${ast.name} ${getSignLabelKo(sign)} (${ast.house}H · ${getAsteroidThemeKo(ast.name as AsteroidName)}) — ${getAsteroidSignInterpretation(ast.name as AsteroidName, sign, 'ko')}`)
  }
  const ep = data.advanced.extraPoints
  if (ep.chiron?.sign) {
    out.push(`Chiron ${getSignLabelKo(ep.chiron.sign as ZodiacName)} (${ep.chiron.house}H) — ${getChironSignInterpretation(ep.chiron.sign as ZodiacName, 'ko')}; ${getChironHouseInterpretation(ep.chiron.house, 'ko')}.`)
  }
  if (ep.lilith?.sign) {
    out.push(`Lilith ${getSignLabelKo(ep.lilith.sign as ZodiacName)} (${ep.lilith.house}H) — ${getLilithSignInterpretation(ep.lilith.sign as ZodiacName, 'ko')}; ${getLilithHouseInterpretation(ep.lilith.house, 'ko')}.`)
  }
  if (ep.partOfFortune?.sign) {
    out.push(`Part of Fortune ${getSignLabelKo(ep.partOfFortune.sign as ZodiacName)} (${ep.partOfFortune.house}H) — ${getPartOfFortuneSignInterpretation(ep.partOfFortune.sign as ZodiacName, 'ko')}; ${getPartOfFortuneHouseInterpretation(ep.partOfFortune.house, 'ko')}.`)
  }
  if (ep.vertex?.sign) {
    out.push(`Vertex ${getSignLabelKo(ep.vertex.sign as ZodiacName)} (${ep.vertex.house}H) — ${getVertexSignInterpretation(ep.vertex.sign as ZodiacName, 'ko')}.`)
  }
  // North Node — already in soulSignals, but include here for unified placement view.
  const node = data.natal.planets.find((p) => p.name === 'True Node' || p.name === 'Mean Node' || p.name === 'North Node')
  if (node?.sign) {
    const ns = node.sign as ZodiacName
    out.push(`North Node ${getSignLabelKo(ns)} (${node.house}H) — 영혼 방향성.`)
  }
  return out
}

function collectScoredAspects(data: AstrologyData): AstrologyAspectHighlight[] {
  const natalAspects = findNatalAspects(
    data.natal as unknown as Parameters<typeof findNatalAspects>[0],
    { includeMinor: false, maxResults: 200 }
  )
  const planetByName = new Map<string, { retrograde?: boolean }>()
  for (const p of data.natal.planets) planetByName.set(p.name, { retrograde: p.retrograde })

  return natalAspects
    .map((hit) => {
      const fromPlanet = hit.from.name as AstroPlanetName
      const toPlanet = hit.to.name as AstroPlanetName
      const kind = hit.type as AspectKind
      const scored = scoreAspect({
        fromPlanet,
        toPlanet,
        kind,
        orb: hit.orb,
        fromRetrograde: planetByName.get(hit.from.name)?.retrograde,
        toRetrograde: planetByName.get(hit.to.name)?.retrograde,
      })
      const pairLine = getAspectPairInterpretation({
        fromPlanet,
        toPlanet,
        kind,
        language: 'ko',
      })
      return {
        ...scored,
        signal: `${hit.from.name} ${getAspectKoLabel(kind)} ${hit.to.name} (orb ${hit.orb.toFixed(1)}°, score ${scored.score}) — ${pairLine}`,
      }
    })
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
}

function collectHouseRulers(
  data: AstrologyData,
  placements: AstrologyPlacementHighlight[]
): AstrologyHouseRulerSignal[] {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  return all
    .map((houseNumber) => {
      const cusp = data.natal.houses[houseNumber - 1]
      if (!cusp || typeof cusp.cusp !== 'number') {
        return null
      }
      const cuspSign = signFromLongitude(cusp.cusp)
      const ruler = getRulerOfSign(cuspSign)
      let rulerSign: ZodiacName | null = null
      let rulerHouse: number | null = null
      let signal: string
      if (!ruler) {
        signal = `${houseNumber}하우스 cusp ${getSignLabelKo(cuspSign)} — 룰러 미정`
      } else {
        const placement = placements.find((p) => p.planet === ruler)
        rulerSign = placement?.sign ?? null
        rulerHouse = placement?.house ?? null
        signal = `${houseNumber}하우스(${getHouseDomainKo(houseNumber)}) cusp ${getSignLabelKo(cuspSign)} → 룰러 ${getPlanetLabelKo(ruler)}${
          placement
            ? ` (${getSignLabelKo(placement.sign)} · ${placement.house}하우스 · ${placement.dignity.label})`
            : ''
        }`
      }
      return {
        house: houseNumber,
        cuspSign,
        ruler,
        rulerSign,
        rulerHouse,
        signal,
      }
    })
    .filter((entry): entry is AstrologyHouseRulerSignal => entry !== null)
}

const ZODIAC_ORDER: ZodiacName[] = [
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

function signFromLongitude(longitudeDeg: number): ZodiacName {
  const normalised = ((longitudeDeg % 360) + 360) % 360
  const idx = Math.floor(normalised / 30)
  return ZODIAC_ORDER[idx] || 'Aries'
}

function scoreDomains(
  placements: AstrologyPlacementHighlight[],
  aspects: AstrologyAspectHighlight[],
  balance: ChartBalance
): AstrologyDomainScore[] {
  const tally: Record<AstrologyDomain, { raw: number; max: number; signals: string[] }> = {
    personality: { raw: 0, max: 0, signals: [] },
    relationship: { raw: 0, max: 0, signals: [] },
    career: { raw: 0, max: 0, signals: [] },
    wealth: { raw: 0, max: 0, signals: [] },
    health: { raw: 0, max: 0, signals: [] },
  }

  for (const p of placements) {
    const planetWeights = PLANET_DOMAIN_WEIGHT[p.planet] || {}
    const houseDomains = HOUSE_DOMAIN_BOOST[p.house] || []
    for (const dom of Object.keys(tally) as AstrologyDomain[]) {
      const planetWeight = planetWeights[dom] ?? 0
      const houseHits = houseDomains.includes(dom) ? 4 : 0
      // Dignity scales the planet's contribution: rulership +5 → ~1.5x
      // multiplier; fall -4 → ~0.6x.
      const dignityMultiplier = 1 + p.dignity.score / 10
      const contribution = planetWeight * dignityMultiplier + houseHits
      const ceil = planetWeight * 1.5 + 4
      tally[dom].max += ceil
      tally[dom].raw += contribution
      if (planetWeight > 0 && tally[dom].signals.length < 3) {
        tally[dom].signals.push(p.signal)
      }
    }
  }

  // Aspect environment — aggregated and shared lightly across all domains.
  const aspectAggregate = aggregateAspectScore(aspects.slice(0, 10))
  const aspectShare = aspectAggregate / 5
  for (const dom of Object.keys(tally) as AstrologyDomain[]) {
    tally[dom].raw += aspectShare
    tally[dom].max += 8
    if (aspects[0] && tally[dom].signals.length < 4) {
      tally[dom].signals.push(aspects[0].signal)
    }
  }

  // Element / modality balance bonus.
  if (balance.dominantElement) {
    const hints = ELEMENT_DOMAIN_HINT[balance.dominantElement]
    for (const dom of hints) {
      tally[dom].raw += 2
      tally[dom].max += 2
    }
  }
  if (balance.weakestElement) {
    const hints = ELEMENT_DOMAIN_HINT[balance.weakestElement]
    for (const dom of hints) {
      tally[dom].raw -= 1
      tally[dom].max += 1
    }
  }

  return (Object.keys(tally) as AstrologyDomain[]).map((dom) => {
    const { raw, max, signals } = tally[dom]
    const normalised = max > 0 ? clampScore(50 + (raw / max) * 50) : 50
    return {
      domain: dom,
      label: ASTROLOGY_DOMAIN_LABEL_KO[dom],
      score: normalised,
      band: bandFor(normalised),
      signals,
    }
  })
}

// scoreDomains is the original v1 — kept for backwards compatibility.
// scoreDomainsV2 layers in advanced engines (fixed-star benefic/malefic
// nature, eclipse activation, midpoint count, soul signals).
function scoreDomainsV2(
  data: AstrologyData,
  placements: AstrologyPlacementHighlight[],
  aspects: AstrologyAspectHighlight[],
  balance: ChartBalance,
  soulSignals: AstrologySoulSignal[],
): AstrologyDomainScore[] {
  const base = scoreDomains(placements, aspects, balance)
  const tally: Partial<Record<AstrologyDomain, number>> = {}

  // Fixed stars — apply tone by their nature string.
  for (const fs of data.advanced.fixedStarConjunctions) {
    const nature = fs.star.nature || ''
    const tone = fixedStarNatureTone(nature)
    const planet = fs.planet as AstroPlanetName
    const doms = planetDomains(planet)
    for (const d of doms) tally[d] = (tally[d] ?? 0) + tone
  }

  // Eclipses — each impact within ±2 years adds tension to the affected
  // axis's domains. Hard aspects penalise; conjunctions are neutral.
  const refMs = new Date(data.meta.nowIso).getTime()
  for (const ec of data.advanced.eclipseImpacts) {
    const ecMs = new Date(ec.eclipse.date).getTime()
    if (!Number.isFinite(ecMs)) continue
    const yearsAway = Math.abs(refMs - ecMs) / (365 * 86400000)
    if (yearsAway > 2) continue
    const planet = ec.affectedPoint as AstroPlanetName
    const doms = planetDomains(planet)
    const sign = ec.aspectType === 'square' || ec.aspectType === 'opposition' ? -1 : 0
    for (const d of doms) tally[d] = (tally[d] ?? 0) + sign
  }

  // Midpoint activations — count.
  const midpointBoost = Math.min(data.advanced.midpointActivations.length / 5, 3)
  for (const k of ['career', 'personality', 'relationship'] as const) {
    tally[k] = (tally[k] ?? 0) + midpointBoost
  }

  // Soul signals tilt: north node toward career/personality, chiron toward health/relationship.
  for (const s of soulSignals) {
    if (s.kind === 'north-node') {
      tally.career = (tally.career ?? 0) + 1
      tally.personality = (tally.personality ?? 0) + 1
    }
    if (s.kind === 'chiron') {
      tally.health = (tally.health ?? 0) - 1
      tally.relationship = (tally.relationship ?? 0) - 0.5
    }
  }

  return base.map((row) => {
    const adjust = tally[row.domain] ?? 0
    const score = clampScore(row.score + adjust)
    return {
      ...row,
      score,
      band: bandFor(score),
    }
  })
}

function fixedStarNatureTone(nature: string): number {
  // Mars/Saturn = malefic; Jupiter/Venus = benefic; mixed shifts neutral.
  let tone = 0
  if (/Mars/.test(nature)) tone -= 1
  if (/Saturn/.test(nature)) tone -= 1
  if (/Jupiter/.test(nature)) tone += 1.5
  if (/Venus/.test(nature)) tone += 1
  if (/Mercury/.test(nature)) tone += 0.5
  if (/Sun/.test(nature)) tone += 0.5
  if (/Moon/.test(nature)) tone += 0.5
  if (/Uranus/.test(nature)) tone -= 0.5
  if (/Pluto/.test(nature)) tone -= 0.5
  return tone
}

function planetDomains(planet: AstroPlanetName): AstrologyDomain[] {
  const w = PLANET_DOMAIN_WEIGHT[planet] || {}
  return (Object.keys(w) as AstrologyDomain[]).filter((d) => (w[d] ?? 0) > 0)
}

function scoreTiming(
  data: AstrologyData,
  natalAspects: AstrologyAspectHighlight[]
): AstrologyTiming {
  const dailyScored = data.daily.aspects.slice(0, 10).map((hit) => {
    const fromPlanet = hit.from.name as AstroPlanetName
    const toPlanet = hit.to.name as AstroPlanetName
    return scoreAspect({
      fromPlanet,
      toPlanet,
      kind: hit.type as AspectKind,
      orb: hit.orb,
    })
  })
  const dailyAggregate = aggregateAspectScore(dailyScored)
  const dailyScore = clampScore(60 + dailyAggregate * 2)
  const topDailyAspect = data.daily.aspects[0]

  // Eclipse + midpoint pressure within rolling windows.
  const refMs = new Date(data.meta.nowIso).getTime()
  const eclipsePressure = (windowDays: number): number => {
    let acc = 0
    for (const ec of data.advanced.eclipseImpacts) {
      const ms = new Date(ec.eclipse.date).getTime()
      if (!Number.isFinite(ms)) continue
      if (Math.abs(refMs - ms) > windowDays * 86400000) continue
      const sign = ec.aspectType === 'square' || ec.aspectType === 'opposition' ? -1.5 : -0.5
      const orbWeight = Math.max(0, 1 - ec.orb / 3)
      acc += sign * orbWeight
    }
    return acc
  }
  const midpointBonus = Math.min(data.advanced.midpointActivations.length / 4, 3)

  // Monthly = lunar return chart's Moon position dignity + eclipse ±60d.
  const lunarMoon = data.monthly.planets.find((p) => p.name === 'Moon')
  const lunarSign = (lunarMoon?.sign as ZodiacName) || null
  const lunarDignity = lunarSign ? getEssentialDignity('Moon', lunarSign) : null
  const monthlyScore = clampScore(60 + (lunarDignity?.score ?? 0) * 4 + eclipsePressure(60) * 2)

  // Yearly = solar return Sun dignity + eclipse ±180d + midpoint bonus.
  const solarSun = data.yearly.planets.find((p) => p.name === 'Sun')
  const solarSign = (solarSun?.sign as ZodiacName) || null
  const solarDignity = solarSign ? getEssentialDignity('Sun', solarSign) : null
  const yearlyScore = clampScore(60 + (solarDignity?.score ?? 0) * 4 + eclipsePressure(180) + midpointBonus)

  // Daewoon = progressed Sun + cumulative natal-aspect quality.
  const progSun = data.daewoon.planets.find((p) => p.name === 'Sun')
  const progSign = (progSun?.sign as ZodiacName) || null
  const progDignity = progSign ? getEssentialDignity('Sun', progSign) : null
  const natalAspectAggregate = aggregateAspectScore(natalAspects.slice(0, 8))
  const daewoonScore = clampScore(60 + (progDignity?.score ?? 0) * 3 + natalAspectAggregate + midpointBonus * 0.5)

  return {
    daily: {
      label: '오늘 (Daily Transit)',
      score: dailyScore,
      band: bandFor(dailyScore),
      headline: topDailyAspect
        ? `${topDailyAspect.from.name} ${getAspectKoLabel(topDailyAspect.type as AspectKind)} natal ${topDailyAspect.to.name} (orb ${topDailyAspect.orb.toFixed(1)}°)`
        : '오늘 트랜짓 데이터가 부족합니다.',
    },
    monthly: {
      label: '이번 달 (Lunar Return)',
      score: monthlyScore,
      band: bandFor(monthlyScore),
      headline: lunarSign
        ? `달이 ${getSignLabelKo(lunarSign)} (${lunarDignity?.label}) — ${getPlanetSignInterpretation('Moon', lunarSign, 'ko')}`
        : '월간 회귀 데이터가 부족합니다.',
    },
    yearly: {
      label: '올해 (Solar Return)',
      score: yearlyScore,
      band: bandFor(yearlyScore),
      headline: solarSign
        ? `태양이 ${getSignLabelKo(solarSign)} (${solarDignity?.label}) — ${getPlanetSignInterpretation('Sun', solarSign, 'ko')}`
        : '연간 회귀 데이터가 부족합니다.',
    },
    daewoon: {
      label: '대운 (Progressed)',
      score: daewoonScore,
      band: bandFor(daewoonScore),
      headline: progSign
        ? `진행 태양 ${getSignLabelKo(progSign)} (${progDignity?.label}) — ${getPlanetSignInterpretation('Sun', progSign, 'ko')}`
        : '진행 차트 데이터가 부족합니다.',
    },
  }
}

function collectSoulSignals(data: AstrologyData): AstrologySoulSignal[] {
  const out: AstrologySoulSignal[] = []

  // North Node — surfaces in natal.planets as 'True Node' / 'Mean Node' / 'North Node'.
  const node = data.natal.planets.find((p) =>
    p.name === 'True Node' || p.name === 'Mean Node' || p.name === 'North Node'
  )
  if (node?.sign) {
    const nodeSign = node.sign as ZodiacName
    const opposite = getSouthNodeOppositeSign(nodeSign)
    const houseNum = typeof node.house === 'number' ? node.house : null
    out.push({
      kind: 'north-node',
      label: 'North Node',
      sign: nodeSign,
      house: houseNum,
      signal: `노스 노드 ${getSignLabelKo(nodeSign)}${
        houseNum ? ` · ${houseNum}하우스(${getHouseDomainKo(houseNum)})` : ''
      } — ${getNorthNodeInterpretation(nodeSign, 'ko')} (반대 ${getSignLabelKo(opposite)} = 익숙한 자리).`,
    })
  }

  const chiron = data.advanced.extraPoints.chiron
  if (chiron?.sign) {
    const chironSign = chiron.sign as ZodiacName
    const houseNum = typeof chiron.house === 'number' ? chiron.house : null
    const houseLine = houseNum
      ? ` · ${houseNum}하우스(${getHouseDomainKo(houseNum)}) — ${getChironHouseInterpretation(houseNum, 'ko')}`
      : ''
    out.push({
      kind: 'chiron',
      label: 'Chiron',
      sign: chironSign,
      house: houseNum,
      signal: `카이론 ${getSignLabelKo(chironSign)} — ${getChironSignInterpretation(chironSign, 'ko')}${houseLine}`,
    })
  }

  const lilith = data.advanced.extraPoints.lilith
  if (lilith?.sign) {
    const lilithSign = lilith.sign as ZodiacName
    const houseNum = typeof lilith.house === 'number' ? lilith.house : null
    const houseLine = houseNum
      ? ` · ${houseNum}하우스(${getHouseDomainKo(houseNum)}) — ${getLilithHouseInterpretation(houseNum, 'ko')}`
      : ''
    out.push({
      kind: 'lilith',
      label: 'Lilith',
      sign: lilithSign,
      house: houseNum,
      signal: `릴리스 ${getSignLabelKo(lilithSign)} — ${getLilithSignInterpretation(lilithSign, 'ko')}${houseLine}`,
    })
  }

  return out
}

// ============================================================
// Advanced readings — interpreted lines for every advanced engine.
// ============================================================

function collectAdvancedReadings(data: AstrologyData): {
  asteroids: string[]
  partOfFortune: string
  vertex: string
  fixedStars: string[]
  midpoints: string[]
  eclipses: string[]
  draconic: string[]
} {
  const asteroids: string[] = []
  for (const a of data.advanced.asteroids) {
    if (!a.sign) continue
    const sign = a.sign as ZodiacName
    const name = a.name as AsteroidName
    const theme = getAsteroidThemeKo(name)
    const line = getAsteroidSignInterpretation(name, sign, 'ko')
    asteroids.push(`${name} ${getSignLabelKo(sign)} (${a.house}하우스 · ${theme}) — ${line}`)
  }

  const pof = data.advanced.extraPoints.partOfFortune
  const partOfFortune = pof?.sign
    ? `Part of Fortune ${getSignLabelKo(pof.sign as ZodiacName)} · ${pof.house}하우스 — ${getPartOfFortuneSignInterpretation(pof.sign as ZodiacName, 'ko')}; ${getPartOfFortuneHouseInterpretation(pof.house, 'ko')}.`
    : ''

  const vertex = data.advanced.extraPoints.vertex
  const vertexLine = vertex?.sign
    ? `Vertex ${getSignLabelKo(vertex.sign as ZodiacName)} · ${vertex.house}하우스 — ${getVertexSignInterpretation(vertex.sign as ZodiacName, 'ko')}.`
    : ''

  const fixedStars: string[] = []
  for (const fs of data.advanced.fixedStarConjunctions) {
    const planet = fs.planet as AstroPlanetName
    const tone = getFixedStarPlanetTone(planet, 'ko')
    fixedStars.push(`${getPlanetLabelKo(planet)} ☌ ${fs.star.name_ko} (orb ${fs.orb.toFixed(2)}°) — ${tone}. ${fs.star.interpretation}`)
  }

  const midpoints: string[] = []
  for (const m of data.advanced.midpointActivations) {
    const activator = m.activator as AstroPlanetName
    const aspect = m.aspectType as AspectKindLike
    midpoints.push(
      getMidpointActivationInterpretation({
        midpointNameKo: m.midpoint.name_ko,
        midpointKeywords: m.midpoint.keywords,
        activator,
        aspect,
        language: 'ko',
      }) + ` (orb ${m.orb.toFixed(2)}°)`
    )
  }

  const eclipses: string[] = []
  for (const ec of data.advanced.eclipseImpacts) {
    const aspect = ec.aspectType as AspectKindLike
    const line = getEclipseInterpretation({
      aspect,
      axis: ec.affectedPoint,
      house: ec.house,
      language: 'ko',
    })
    eclipses.push(`${ec.eclipse.date} ${ec.eclipse.type === 'solar' ? '일식' : '월식'} → ${ec.affectedPoint} (orb ${ec.orb.toFixed(2)}°): ${line}`)
  }

  const draconic: string[] = []
  for (const al of data.advanced.draconic.alignments) {
    draconic.push(`정렬 · ${al.draconicPlanet} ↔ natal ${al.natalPlanet} (orb ${al.orb.toFixed(2)}°) — ${al.meaning}`)
  }
  for (const t of data.advanced.draconic.tensions) {
    draconic.push(`긴장 · ${t.draconicPlanet} ${t.aspectType} natal ${t.natalPlanet} (orb ${t.orb.toFixed(2)}°) — ${t.meaning}`)
  }
  const draconicSummary = data.advanced.draconic.summary
  if (draconicSummary?.soulPurpose) {
    draconic.unshift(`영혼 사명 · ${draconicSummary.soulPurpose}`)
  }
  if (draconicSummary?.soulIdentity) {
    draconic.unshift(`영혼 정체성 · ${draconicSummary.soulIdentity}`)
  }

  return { asteroids, partOfFortune, vertex: vertexLine, fixedStars, midpoints, eclipses, draconic }
}

// ============================================================
// Themed sections — saju-style narrative per theme.
// ============================================================

const THEME_TITLE_KO: Record<AstrologyThemeKey, string> = {
  personality: '🧬 성격·자아',
  relationship: '💞 관계·사랑',
  career: '🎯 커리어·사명',
  wealth: '💰 재물·가치',
  health: '🌱 건강·생명력',
  soul: '🔮 영혼·카르마',
  structure: '🏛 구조·운명의 뼈대',
}

function findPlacement(
  placements: AstrologyPlacementHighlight[],
  planet: AstroPlanetName
): AstrologyPlacementHighlight | undefined {
  return placements.find((p) => p.planet === planet)
}

function findHouseRuler(
  houseRulers: AstrologyHouseRulerSignal[],
  house: number
): AstrologyHouseRulerSignal | undefined {
  return houseRulers.find((h) => h.house === house)
}

function buildThemedSections(
  data: AstrologyData,
  placements: AstrologyPlacementHighlight[],
  aspects: AstrologyAspectHighlight[],
  domains: AstrologyDomainScore[],
  houseRulers: AstrologyHouseRulerSignal[],
  soulSignals: AstrologySoulSignal[],
  advanced: ReturnType<typeof collectAdvancedReadings>,
  balance: ChartBalance,
): AstrologyThemedSection[] {
  const sections: AstrologyThemedSection[] = []
  const domainByKey = new Map(domains.map((d) => [d.domain, d]))

  // ----- Personality -----
  const sun = findPlacement(placements, 'Sun')
  const moon = findPlacement(placements, 'Moon')
  const merc = findPlacement(placements, 'Mercury')
  const asc = findPlacement(placements, 'Ascendant')
  const uranus = findPlacement(placements, 'Uranus')
  const pluto = findPlacement(placements, 'Pluto')
  const persParas: string[] = []
  if (sun) persParas.push(`태양(자아) — ${sun.signal}`)
  if (moon) persParas.push(`달(정서) — ${moon.signal}`)
  if (merc) persParas.push(`수성(사고) — ${merc.signal}`)
  if (asc) persParas.push(`상승궁(외모) — ${asc.signal}`)
  if (uranus) persParas.push(`천왕성(독립성) — ${uranus.signal}`)
  if (pluto) persParas.push(`명왕성(권력 코어) — ${pluto.signal}`)
  if (balance.dominantElement) {
    persParas.push(
      `원소 균형: 불 ${balance.elements.fire} / 흙 ${balance.elements.earth} / 공기 ${balance.elements.air} / 물 ${balance.elements.water} — ${balance.dominantElement} 우세${balance.weakestElement ? ` / ${balance.weakestElement} 부족` : ''}.`,
    )
    persParas.push(
      `모달리티: 활동 ${balance.modalities.cardinal} / 고정 ${balance.modalities.fixed} / 변동 ${balance.modalities.mutable}.`,
    )
    persParas.push(
      `극성: 양 ${balance.polarity.masculine} / 음 ${balance.polarity.feminine}.`,
    )
  }
  const persDom = domainByKey.get('personality')
  sections.push({
    theme: 'personality',
    title: THEME_TITLE_KO.personality,
    score: persDom?.score ?? null,
    band: persDom?.band ?? null,
    paragraphs: persParas,
    bullets: [],
    advice: advicePersonality(sun, moon, asc, balance, persDom),
  })

  // ----- Relationship -----
  const venus = findPlacement(placements, 'Venus')
  const mars = findPlacement(placements, 'Mars')
  const seventhRuler = findHouseRuler(houseRulers, 7)
  const fifthRuler = findHouseRuler(houseRulers, 5)
  const relParas: string[] = []
  if (venus) relParas.push(`금성(애정 방식) — ${venus.signal}`)
  if (mars) relParas.push(`화성(욕망 방식) — ${mars.signal}`)
  if (seventhRuler) relParas.push(`7H ${seventhRuler.signal}`)
  if (fifthRuler) relParas.push(`5H(연애·재미) ${fifthRuler.signal}`)
  const juno = data.advanced.asteroids.find((a) => a.name === 'Juno')
  if (juno?.sign) {
    relParas.push(`Juno ${getSignLabelKo(juno.sign as ZodiacName)} (${juno.house}H) — ${getAsteroidSignInterpretation('Juno', juno.sign as ZodiacName, 'ko')}`)
  }
  // Venus-Mars / Venus-Saturn / Venus-Pluto aspects matter for relationships.
  for (const a of aspects) {
    const pair = [a.fromPlanet, a.toPlanet].sort().join('-')
    if (pair === 'Mars-Venus' || pair === 'Saturn-Venus' || pair === 'Pluto-Venus' || pair === 'Mars-Moon' || pair === 'Pluto-Moon') {
      relParas.push(`주요 어스펙트 — ${a.signal}`)
    }
  }
  const lilithSig = soulSignals.find((s) => s.kind === 'lilith')
  if (lilithSig) relParas.push(`친밀의 그림자 — ${lilithSig.signal}`)
  const relDom = domainByKey.get('relationship')
  sections.push({
    theme: 'relationship',
    title: THEME_TITLE_KO.relationship,
    score: relDom?.score ?? null,
    band: relDom?.band ?? null,
    paragraphs: relParas,
    bullets: [],
    advice: adviceRelationship(venus, mars, lilithSig ?? null, relDom),
  })

  // ----- Career -----
  const tenthRuler = findHouseRuler(houseRulers, 10)
  const sixthRulerForCareer = findHouseRuler(houseRulers, 6)
  const saturn = findPlacement(placements, 'Saturn')
  const jupiter = findPlacement(placements, 'Jupiter')
  const sunForCareer = findPlacement(placements, 'Sun')
  const marsForCareer = findPlacement(placements, 'Mars')
  const careerParas: string[] = []
  if (tenthRuler) careerParas.push(`10H ${tenthRuler.signal}`)
  if (data.natal.mc?.sign) {
    careerParas.push(`MC ${getSignLabelKo(data.natal.mc.sign as ZodiacName)} — 공적 정체성·사회상.`)
  }
  if (sunForCareer) careerParas.push(`태양(사명 방향) — ${sunForCareer.signal}`)
  if (jupiter) careerParas.push(`목성(확장 영역) — ${jupiter.signal}`)
  if (saturn) careerParas.push(`토성(책임·구조) — ${saturn.signal}`)
  if (marsForCareer) careerParas.push(`화성(에너지 운용) — ${marsForCareer.signal}`)
  if (sixthRulerForCareer) careerParas.push(`6H(일상 노동) ${sixthRulerForCareer.signal}`)
  const pallas = data.advanced.asteroids.find((a) => a.name === 'Pallas')
  if (pallas?.sign) {
    careerParas.push(`Pallas(전략 지능) ${getSignLabelKo(pallas.sign as ZodiacName)} (${pallas.house}H) — ${getAsteroidSignInterpretation('Pallas', pallas.sign as ZodiacName, 'ko')}`)
  }
  const vesta = data.advanced.asteroids.find((a) => a.name === 'Vesta')
  if (vesta?.sign) {
    careerParas.push(`Vesta(헌신 영역) ${getSignLabelKo(vesta.sign as ZodiacName)} (${vesta.house}H) — ${getAsteroidSignInterpretation('Vesta', vesta.sign as ZodiacName, 'ko')}`)
  }
  // Sun-Saturn / Sun-Jupiter / Saturn-Jupiter / MC aspects for career.
  for (const a of aspects) {
    const pair = [a.fromPlanet, a.toPlanet].sort().join('-')
    if (pair === 'Saturn-Sun' || pair === 'Jupiter-Sun' || pair === 'Jupiter-Saturn' || pair === 'Mars-Saturn') {
      careerParas.push(`주요 어스펙트 — ${a.signal}`)
    }
  }
  const careerDom = domainByKey.get('career')
  sections.push({
    theme: 'career',
    title: THEME_TITLE_KO.career,
    score: careerDom?.score ?? null,
    band: careerDom?.band ?? null,
    paragraphs: careerParas,
    bullets: [],
    advice: adviceCareer(sunForCareer, jupiter, saturn, tenthRuler ?? null, careerDom),
  })

  // ----- Wealth -----
  const wealthParas: string[] = []
  const secondRuler = findHouseRuler(houseRulers, 2)
  const eighthRuler = findHouseRuler(houseRulers, 8)
  const eleventhRuler = findHouseRuler(houseRulers, 11)
  if (secondRuler) wealthParas.push(`2H(자기 자원) ${secondRuler.signal}`)
  if (eighthRuler) wealthParas.push(`8H(공유 자원·상속) ${eighthRuler.signal}`)
  if (eleventhRuler) wealthParas.push(`11H(소득·미래 보상) ${eleventhRuler.signal}`)
  if (jupiter) wealthParas.push(`목성(풍요·확장) — ${jupiter.signal}`)
  if (venus) wealthParas.push(`금성(가치 평가) — ${venus.signal}`)
  if (saturn) wealthParas.push(`토성(자원 통제) — ${saturn.signal}`)
  if (advanced.partOfFortune) wealthParas.push(advanced.partOfFortune)
  // Venus-Jupiter / Venus-Saturn / Sun-Jupiter aspects for wealth.
  for (const a of aspects) {
    const pair = [a.fromPlanet, a.toPlanet].sort().join('-')
    if (pair === 'Jupiter-Venus' || pair === 'Saturn-Venus' || pair === 'Jupiter-Sun') {
      wealthParas.push(`주요 어스펙트 — ${a.signal}`)
    }
  }
  const wealthDom = domainByKey.get('wealth')
  sections.push({
    theme: 'wealth',
    title: THEME_TITLE_KO.wealth,
    score: wealthDom?.score ?? null,
    band: wealthDom?.band ?? null,
    paragraphs: wealthParas,
    bullets: [],
    advice: adviceWealth(jupiter, venus, saturn, advanced.partOfFortune, wealthDom),
  })

  // ----- Health -----
  const healthParas: string[] = []
  const sixthRuler = findHouseRuler(houseRulers, 6)
  const twelfthRuler = findHouseRuler(houseRulers, 12)
  if (sixthRuler) healthParas.push(`6H(일상·면역) ${sixthRuler.signal}`)
  if (twelfthRuler) healthParas.push(`12H(만성·무의식) ${twelfthRuler.signal}`)
  if (mars) healthParas.push(`화성(에너지·염증) — ${mars.signal}`)
  if (saturn) healthParas.push(`토성(취약점·만성) — ${saturn.signal}`)
  if (moon) healthParas.push(`달(생활 리듬·정서 면역) — ${moon.signal}`)
  const ceres = data.advanced.asteroids.find((a) => a.name === 'Ceres')
  if (ceres?.sign) {
    healthParas.push(`Ceres(몸·돌봄) ${getSignLabelKo(ceres.sign as ZodiacName)} (${ceres.house}H) — ${getAsteroidSignInterpretation('Ceres', ceres.sign as ZodiacName, 'ko')}`)
  }
  const chironSig = soulSignals.find((s) => s.kind === 'chiron')
  if (chironSig) healthParas.push(`만성 상처 — ${chironSig.signal}`)
  // Mars-Saturn (energy block), Moon-Saturn (depression risk), Mars-Pluto (over-drive).
  for (const a of aspects) {
    const pair = [a.fromPlanet, a.toPlanet].sort().join('-')
    if (pair === 'Mars-Saturn' || pair === 'Moon-Saturn' || pair === 'Mars-Pluto') {
      healthParas.push(`주요 어스펙트 — ${a.signal}`)
    }
  }
  const healthDom = domainByKey.get('health')
  sections.push({
    theme: 'health',
    title: THEME_TITLE_KO.health,
    score: healthDom?.score ?? null,
    band: healthDom?.band ?? null,
    paragraphs: healthParas,
    bullets: [],
    advice: adviceHealth(mars, saturn, moon, chironSig ?? null, healthDom),
  })

  // ----- Soul -----
  const soulParas: string[] = []
  for (const s of soulSignals) soulParas.push(s.signal)
  if (advanced.vertex) soulParas.push(advanced.vertex)
  for (const d of advanced.draconic) soulParas.push(d)
  sections.push({
    theme: 'soul',
    title: THEME_TITLE_KO.soul,
    score: null,
    band: null,
    paragraphs: soulParas,
    bullets: [],
    advice: adviceSoul(soulSignals, advanced.draconic),
  })

  // ----- Structure -----
  const structParas: string[] = []
  for (const hr of houseRulers) structParas.push(hr.signal)
  for (const fs of advanced.fixedStars) structParas.push(fs)
  for (const m of advanced.midpoints) structParas.push(m)
  // Dignity overview row.
  const dignityCounts = countDignities(placements)
  if (dignityCounts.summary) structParas.push(dignityCounts.summary)
  sections.push({
    theme: 'structure',
    title: THEME_TITLE_KO.structure,
    score: null,
    band: null,
    paragraphs: structParas,
    bullets: [],
    advice: adviceStructure(placements, balance),
  })

  return sections
}

// ============================================================
// Themed advice generators (saju luckyElements style).
// ============================================================

function advicePersonality(
  sun: AstrologyPlacementHighlight | undefined,
  moon: AstrologyPlacementHighlight | undefined,
  asc: AstrologyPlacementHighlight | undefined,
  balance: ChartBalance,
  dom: AstrologyDomainScore | undefined,
): string[] {
  const out: string[] = []
  if (sun?.dignity.kind === 'detriment' || sun?.dignity.kind === 'fall') {
    out.push(`태양이 ${sun.dignity.label}이라 "남들과 다른 방식"의 자기 증명이 평생 과제. 외부 인정에 휘둘리지 말고 자기 기준을 단단히 잡으세요.`)
  } else if (sun?.dignity.kind === 'rulership' || sun?.dignity.kind === 'exaltation') {
    out.push(`태양이 ${sun.dignity.label}로 강함. 자기 정체성을 숨기지 말고 무대로 끌어올리세요.`)
  }
  if (moon) {
    out.push(`정서 회복 루틴: ${getSignLabelKo(moon.sign)}의 결대로 — 그 사인이 편안해하는 환경을 일상에 심으세요.`)
  }
  if (asc) {
    out.push(`외부에 보이는 첫 인상: ${getSignLabelKo(asc.sign)}. 이 결을 의식적으로 활용하면 첫만남 임팩트가 커집니다.`)
  }
  if (balance.weakestElement) {
    out.push(`부족한 ${balance.weakestElement} 원소를 채우세요 — ${ELEMENT_DOMAIN_HINT[balance.weakestElement].join('·')} 영역의 활동.`)
  }
  if (dom?.band === 'caution') {
    out.push('자아 점수 caution — 정체성 흔들림기. 외부 평가보다 자기 의식의 일관성에 집중.')
  }
  return out
}

function adviceRelationship(
  venus: AstrologyPlacementHighlight | undefined,
  mars: AstrologyPlacementHighlight | undefined,
  lilith: AstrologySoulSignal | null,
  dom: AstrologyDomainScore | undefined,
): string[] {
  const out: string[] = []
  if (venus) out.push(`애정 표현 방식: ${getSignLabelKo(venus.sign)} 결 — 사랑한다고 받아들여지는 언어가 다릅니다.`)
  if (mars) out.push(`욕망/추진 방식: ${getSignLabelKo(mars.sign)} 결 — 욕구 표현이 자연스러운 채널을 막지 마세요.`)
  if (venus && mars && getEssentialDignity('Venus', venus.sign).score < 0) {
    out.push('금성이 약한 자리 — "사랑받기 위한 타협"이 자기 가치를 깎는 패턴 주의.')
  }
  if (lilith) out.push('억압된 욕망(릴리스)을 부정하지 말고 의식의 빛 아래 통합하세요. 검열될수록 그림자에서 폭발.')
  if (dom?.band === 'caution') out.push('관계 점수 caution — 누구를·왜 사랑하는지 다시 정의할 시기.')
  return out
}

function adviceCareer(
  sun: AstrologyPlacementHighlight | undefined,
  jupiter: AstrologyPlacementHighlight | undefined,
  saturn: AstrologyPlacementHighlight | undefined,
  tenthRuler: AstrologyHouseRulerSignal | null,
  dom: AstrologyDomainScore | undefined,
): string[] {
  const out: string[] = []
  if (jupiter && jupiter.dignity.score >= 4) {
    out.push(`목성이 ${jupiter.dignity.label} — ${getHouseDomainKo(jupiter.house)} 영역이 평생 확장 자리. 망설이지 말고 그 방향으로 베팅.`)
  }
  if (saturn) {
    out.push(`토성 자리(${getHouseDomainKo(saturn.house)})에서는 빨리 결과 내려고 하지 말고 ${getSignLabelKo(saturn.sign)} 결로 장기 빌드. 7~10년 단위 호흡.`)
  }
  if (sun?.dignity.kind === 'detriment' || sun?.dignity.kind === 'fall') {
    out.push('태양 약함 — "인정받는 방식"이 표준 코스가 아님. 자기 트랙을 따로 만드세요.')
  }
  if (tenthRuler?.rulerHouse) {
    out.push(`커리어 룰러가 ${tenthRuler.rulerHouse}하우스(${getHouseDomainKo(tenthRuler.rulerHouse)})에 있음 — 그 영역의 활동이 곧 커리어의 무게중심.`)
  }
  if (dom?.band === 'caution') out.push('커리어 점수 caution — 방향 점검기. 빠른 액션보다 토대 점검.')
  return out
}

function adviceWealth(
  jupiter: AstrologyPlacementHighlight | undefined,
  venus: AstrologyPlacementHighlight | undefined,
  saturn: AstrologyPlacementHighlight | undefined,
  pofLine: string,
  dom: AstrologyDomainScore | undefined,
): string[] {
  const out: string[] = []
  if (pofLine) out.push('Part of Fortune 자리 — 그 영역에서 자연스러운 행운/이득의 흐름을 의식적으로 활용.')
  if (jupiter) out.push(`목성 ${getSignLabelKo(jupiter.sign)} ${jupiter.house}H — 이 사인의 결을 자원 확장에 적용.`)
  if (venus) out.push(`금성 ${getSignLabelKo(venus.sign)} ${venus.house}H — 가치 평가가 이 사인의 결을 따름. 그 결과 무관한 거래는 손해 패턴.`)
  if (saturn?.dignity.score && saturn.dignity.score > 0) {
    out.push('토성 단단함 — 자원 통제·저축에 자연스러운 강점.')
  } else if (saturn) {
    out.push(`토성 자리(${getHouseDomainKo(saturn.house)})의 시험을 통과해야 자원 안정. 단기 자금에 무리하지 말 것.`)
  }
  if (dom?.band === 'caution') out.push('재물 점수 caution — 큰 베팅·과소비 자제. 자원 흐름 점검.')
  return out
}

function adviceHealth(
  mars: AstrologyPlacementHighlight | undefined,
  saturn: AstrologyPlacementHighlight | undefined,
  moon: AstrologyPlacementHighlight | undefined,
  chiron: AstrologySoulSignal | null,
  dom: AstrologyDomainScore | undefined,
): string[] {
  const out: string[] = []
  if (mars) out.push(`에너지 운용: ${getSignLabelKo(mars.sign)} 결 — 무리하면 ${getSignLabelKo(mars.sign)} 영역의 신체 부위가 신호.`)
  if (saturn) out.push(`토성 자리(${getHouseDomainKo(saturn.house)}) — 만성 취약점일 수 있음. 정기 점검 영역.`)
  if (moon) out.push(`달(생활 리듬): ${getSignLabelKo(moon.sign)} — 이 결의 환경이 파괴되면 면역·정서가 무너짐.`)
  if (chiron) out.push('카이론 — 만성적 상처. 거기를 회피하지 말고 천천히 통합.')
  if (dom?.band === 'caution') out.push('건강 점수 caution — 수면·식사·운동 기본기 재설정 시기.')
  return out
}

function adviceSoul(
  soulSignals: AstrologySoulSignal[],
  draconic: string[],
): string[] {
  const out: string[] = []
  const node = soulSignals.find((s) => s.kind === 'north-node')
  if (node && node.sign) {
    out.push(`노스 노드 방향(${getSignLabelKo(node.sign)})으로 의식적으로 한 걸음 더. 익숙한 사우스 노드 자리는 편하지만 영혼 과제가 안 풀림.`)
  }
  const chiron = soulSignals.find((s) => s.kind === 'chiron')
  if (chiron) out.push('카이론은 "자기 상처를 통해 타인을 치유" 패턴 — 회피 말고 그 자체를 직업/사명으로 통합 가능.')
  const lilith = soulSignals.find((s) => s.kind === 'lilith')
  if (lilith) out.push('릴리스 — 사회가 "여성스럽지 않다/예의 없다"고 검열한 부분이 진짜 힘. 의식의 빛 아래로.')
  if (draconic.length > 0) out.push('드라코닉 영혼 차트 — 이번 생 자아와 영혼 정체성 사이 간격이 클수록 "이게 나야?"라는 질문이 잦음. 둘을 분리해서 보세요.')
  return out
}

function adviceStructure(
  placements: AstrologyPlacementHighlight[],
  balance: ChartBalance,
): string[] {
  const out: string[] = []
  const dignified = placements.filter((p) => p.dignity.score >= 4)
  if (dignified.length > 0) {
    out.push(`강한 자리(${dignified.map((p) => `${getPlanetLabelKo(p.planet)}-${getSignLabelKo(p.sign)}`).join(', ')}) — 차트의 무게중심. 이 행성들이 곧 본인의 정통적 강점.`)
  }
  const weakened = placements.filter((p) => p.dignity.score <= -3)
  if (weakened.length > 0) {
    out.push(`약한 자리(${weakened.map((p) => `${getPlanetLabelKo(p.planet)}-${getSignLabelKo(p.sign)}`).join(', ')}) — 평생 과제. 약점이 아니라 의식적 작업 영역.`)
  }
  if (balance.dominantElement && balance.weakestElement) {
    out.push(`${balance.dominantElement} 우세 / ${balance.weakestElement} 부족 — 부족한 원소 영역의 활동·사람을 가까이.`)
  }
  return out
}

function countDignities(placements: AstrologyPlacementHighlight[]): { summary: string } {
  const counts: Record<string, number> = {}
  for (const p of placements) {
    if (p.planet === 'Ascendant') continue
    counts[p.dignity.label] = (counts[p.dignity.label] ?? 0) + 1
  }
  const parts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `${label} ${n}`)
  return { summary: parts.length ? `Dignity 분포 — ${parts.join(' / ')}` : '' }
}

// ============================================================
// Timing sections — saju-style per-period rich text.
// ============================================================

const TIMING_TITLE_KO: Record<AstrologyTimingLayer, string> = {
  daily: '🌅 일운 (Daily Transit)',
  monthly: '🌙 월운 (Lunar Return)',
  yearly: '☀️ 세운 (Solar Return)',
  daewoon: '🪐 대운 (Progressed)',
}

function isWithinDays(iso: string, refIso: string, days: number): boolean {
  const a = new Date(iso).getTime()
  const b = new Date(refIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(a - b) <= days * 86400000
}

function buildTimingSections(
  data: AstrologyData,
  timing: AstrologyTiming,
  natalAspects: AstrologyAspectHighlight[],
): AstrologyTimingSection[] {
  const sections: AstrologyTimingSection[] = []
  const refIso = data.meta.nowIso

  // ----- Daily -----
  {
    const aspectLines: string[] = []
    for (const a of data.daily.aspects) {
      const fromP = a.from.name as AstroPlanetName
      const toP = a.to.name as AstroPlanetName
      const kind = a.type as AspectKind
      aspectLines.push(`transit ${a.from.name} ${getAspectKoLabel(kind)} natal ${a.to.name} (orb ${a.orb.toFixed(1)}°) — ${getAspectPairInterpretation({ fromPlanet: fromP, toPlanet: toP, kind, language: 'ko' })}`)
    }
    const t = timing.daily
    sections.push({
      layer: 'daily',
      title: TIMING_TITLE_KO.daily,
      score: t.score,
      band: t.band,
      headline: t.headline,
      paragraphs: aspectLines.length ? aspectLines : ['오늘의 트랜짓 데이터가 충분하지 않습니다.'],
      bullets: [],
      advice: adviceForBand(t.band, 'daily'),
    })
  }

  // ----- Monthly (lunar return) -----
  {
    const lines: string[] = []
    for (const p of data.monthly.planets) {
      if (!p.sign) continue
      const sign = p.sign as ZodiacName
      lines.push(`이번 달 ${p.name} ${getSignLabelKo(sign)} (${p.house}H) — ${getPlanetSignInterpretation(p.name as AstroPlanetName, sign, 'ko')}`)
    }
    const monthlyAspects = findChartAspects(data.monthly)
    for (const a of monthlyAspects) lines.push(`이번 달 차트 어스펙트 · ${a}`)
    const recentEclipses = data.advanced.eclipseImpacts.filter((ec) =>
      isWithinDays(ec.eclipse.date, refIso, 60)
    )
    for (const ec of recentEclipses) {
      const aspect = ec.aspectType as AspectKindLike
      lines.push(`${ec.eclipse.date} ${ec.eclipse.type === 'solar' ? '일식' : '월식'} → ${ec.affectedPoint}: ${getEclipseInterpretation({ aspect, axis: ec.affectedPoint, house: ec.house, language: 'ko' })}`)
    }
    const t = timing.monthly
    sections.push({
      layer: 'monthly',
      title: TIMING_TITLE_KO.monthly,
      score: t.score,
      band: t.band,
      headline: t.headline,
      paragraphs: lines.length ? lines : ['월간 데이터 부족.'],
      bullets: [],
      advice: adviceForBand(t.band, 'monthly', recentEclipses.length),
    })
  }

  // ----- Yearly (solar return) -----
  {
    const lines: string[] = []
    for (const p of data.yearly.planets) {
      if (!p.sign) continue
      const sign = p.sign as ZodiacName
      lines.push(`올해 ${p.name} ${getSignLabelKo(sign)} (${p.house}H) — ${getPlanetSignInterpretation(p.name as AstroPlanetName, sign, 'ko')}`)
    }
    const yearlyAspects = findChartAspects(data.yearly)
    for (const a of yearlyAspects) lines.push(`올해 차트 어스펙트 · ${a}`)
    const yearlyEclipses = data.advanced.eclipseImpacts.filter((ec) =>
      isWithinDays(ec.eclipse.date, refIso, 180)
    )
    for (const ec of yearlyEclipses) {
      const aspect = ec.aspectType as AspectKindLike
      lines.push(`${ec.eclipse.date} ${ec.eclipse.type === 'solar' ? '일식' : '월식'} → ${ec.affectedPoint}: ${getEclipseInterpretation({ aspect, axis: ec.affectedPoint, house: ec.house, language: 'ko' })}`)
    }
    const t = timing.yearly
    sections.push({
      layer: 'yearly',
      title: TIMING_TITLE_KO.yearly,
      score: t.score,
      band: t.band,
      headline: t.headline,
      paragraphs: lines.length ? lines : ['연간 데이터 부족.'],
      bullets: [],
      advice: adviceForBand(t.band, 'yearly', yearlyEclipses.length),
    })
  }

  // ----- Daewoon (progressed) -----
  {
    const lines: string[] = []
    for (const p of data.daewoon.planets) {
      if (!p.sign) continue
      const sign = p.sign as ZodiacName
      lines.push(`진행 ${p.name} ${getSignLabelKo(sign)} (${p.house}H) — ${getPlanetSignInterpretation(p.name as AstroPlanetName, sign, 'ko')}`)
    }
    const progAspects = findChartAspects(data.daewoon)
    for (const a of progAspects) lines.push(`진행 차트 내부 어스펙트 · ${a}`)
    // Long-term natal life themes.
    for (const a of natalAspects.slice(0, 6)) {
      lines.push(`평생 테마 · ${a.signal}`)
    }
    const t = timing.daewoon
    sections.push({
      layer: 'daewoon',
      title: TIMING_TITLE_KO.daewoon,
      score: t.score,
      band: t.band,
      headline: t.headline,
      paragraphs: lines.length ? lines : ['진행 데이터 부족.'],
      bullets: [],
      advice: adviceForBand(t.band, 'daewoon'),
    })
  }

  return sections
}

function findChartAspects(chart: { planets: { name: string; longitude: number; sign?: string }[] }): string[] {
  const planets = chart.planets.filter((p) => Number.isFinite(p.longitude))
  const out: string[] = []
  const ASPECTS: { kind: AspectKind; angle: number; orb: number }[] = [
    { kind: 'conjunction', angle: 0, orb: 8 },
    { kind: 'sextile', angle: 60, orb: 4 },
    { kind: 'square', angle: 90, orb: 6 },
    { kind: 'trine', angle: 120, orb: 6 },
    { kind: 'opposition', angle: 180, orb: 8 },
  ]
  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const a = planets[i]
      const b = planets[j]
      let diff = Math.abs(a.longitude - b.longitude) % 360
      if (diff > 180) diff = 360 - diff
      for (const asp of ASPECTS) {
        const off = Math.abs(diff - asp.angle)
        if (off <= asp.orb) {
          const pairLine = getAspectPairInterpretation({
            fromPlanet: a.name,
            toPlanet: b.name,
            kind: asp.kind,
            language: 'ko',
          })
          out.push(`${a.name} ${getAspectKoLabel(asp.kind)} ${b.name} (orb ${off.toFixed(1)}°) — ${pairLine}`)
        }
      }
    }
  }
  return out.slice(0, 12)
}

function adviceForBand(
  band: 'great' | 'good' | 'mixed' | 'caution',
  layer: AstrologyTimingLayer,
  eclipseCount = 0,
): string[] {
  const out: string[] = []
  const horizon: Record<AstrologyTimingLayer, string> = {
    daily: '오늘',
    monthly: '이번 달',
    yearly: '올해',
    daewoon: '이 대운기',
  }
  const window = horizon[layer]
  switch (band) {
    case 'great':
      out.push(`${window} 흐름이 매우 좋음 — 미루던 일을 시작·확장하기 좋은 시기.`)
      break
    case 'good':
      out.push(`${window} 흐름이 양호 — 큰 전환보다는 꾸준한 빌드에 적합.`)
      break
    case 'mixed':
      out.push(`${window} 흐름 혼재 — 명확한 우선순위 한두 개만 잡고 나머지는 보류.`)
      break
    case 'caution':
      out.push(`${window} 마찰이 큼 — 주요 결정·이동·계약은 다음 시기로 미루는 게 안전.`)
      break
  }
  if (eclipseCount > 0) {
    out.push(`${window} 활성 이클립스 ${eclipseCount}개 — 정체성·관계·구조 중 하나가 의도와 무관하게 재편될 수 있음. 저항보다 흐름을 읽고 따라가세요.`)
  }
  if (layer === 'daewoon') {
    out.push('대운기 advice: 이 시기는 단년 사이클이 아니라 7~30년 호흡. 진행 행성이 가리키는 사인의 결로 인생 무게중심을 옮기세요.')
  }
  return out
}

// Re-export dignity types for convenience.
export type { DignityKind, DignityResult }
// Helper for the result page when surfacing the planet+house signal directly.
export const buildPlanetHouseSnippet = getPlanetHouseInterpretation
