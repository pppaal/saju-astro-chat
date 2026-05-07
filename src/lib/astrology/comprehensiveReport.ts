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
} from './dignities'
import { aggregateAspectScore, scoreAspect, type ScoredAspect } from './aspectScoring'
import { calculateChartBalance, type ChartBalance, type Element } from './balance'

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
}

export interface AstrologyComprehensiveReport {
  overallScore: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  domains: AstrologyDomainScore[]
  topPlacements: AstrologyPlacementHighlight[]
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
    .slice(0, 8)
  const topAspects = aspects.slice(0, 8)
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

  return {
    overallScore,
    band: bandFor(overallScore),
    domains,
    topPlacements,
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

function collectScoredAspects(data: AstrologyData): AstrologyAspectHighlight[] {
  const natalAspects = findNatalAspects(
    data.natal as unknown as Parameters<typeof findNatalAspects>[0],
    { includeMinor: false, maxResults: 30 }
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
  const angular = [1, 4, 7, 10]
  return angular
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
  for (const fs of data.advanced.fixedStarConjunctions.slice(0, 6)) {
    const planet = fs.planet as AstroPlanetName
    const tone = getFixedStarPlanetTone(planet, 'ko')
    fixedStars.push(`${getPlanetLabelKo(planet)} ☌ ${fs.star.name_ko} (orb ${fs.orb.toFixed(2)}°) — ${tone}. ${fs.star.interpretation}`)
  }

  const midpoints: string[] = []
  for (const m of data.advanced.midpointActivations.slice(0, 8)) {
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
  for (const ec of data.advanced.eclipseImpacts.slice(0, 8)) {
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
  for (const al of data.advanced.draconic.alignments.slice(0, 4)) {
    draconic.push(`정렬 · ${al.draconicPlanet} ↔ natal ${al.natalPlanet} (orb ${al.orb.toFixed(2)}°) — ${al.meaning}`)
  }
  for (const t of data.advanced.draconic.tensions.slice(0, 4)) {
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
  const persParas: string[] = []
  if (sun) persParas.push(`태양 — ${sun.signal}`)
  if (moon) persParas.push(`달 — ${moon.signal}`)
  if (merc) persParas.push(`수성 — ${merc.signal}`)
  if (asc) persParas.push(`상승궁 — ${asc.signal}`)
  if (balance.dominantElement) {
    persParas.push(`원소 균형: ${balance.dominantElement} 우세${balance.weakestElement ? ` / ${balance.weakestElement} 부족` : ''}.`)
  }
  const persDom = domainByKey.get('personality')
  sections.push({
    theme: 'personality',
    title: THEME_TITLE_KO.personality,
    score: persDom?.score ?? null,
    band: persDom?.band ?? null,
    paragraphs: persParas,
    bullets: [],
  })

  // ----- Relationship -----
  const venus = findPlacement(placements, 'Venus')
  const mars = findPlacement(placements, 'Mars')
  const seventhRuler = findHouseRuler(houseRulers, 7)
  const relParas: string[] = []
  if (venus) relParas.push(`금성 — ${venus.signal}`)
  if (mars) relParas.push(`화성 — ${mars.signal}`)
  if (seventhRuler) relParas.push(seventhRuler.signal)
  const juno = data.advanced.asteroids.find((a) => a.name === 'Juno')
  if (juno?.sign) {
    relParas.push(`Juno ${getSignLabelKo(juno.sign as ZodiacName)} — ${getAsteroidSignInterpretation('Juno', juno.sign as ZodiacName, 'ko')}`)
  }
  const venusMarsAspect = aspects.find((a) =>
    (a.fromPlanet === 'Venus' && a.toPlanet === 'Mars') ||
    (a.fromPlanet === 'Mars' && a.toPlanet === 'Venus')
  )
  if (venusMarsAspect) relParas.push(`Venus·Mars 어스펙트 — ${venusMarsAspect.signal}`)
  const relDom = domainByKey.get('relationship')
  sections.push({
    theme: 'relationship',
    title: THEME_TITLE_KO.relationship,
    score: relDom?.score ?? null,
    band: relDom?.band ?? null,
    paragraphs: relParas,
    bullets: [],
  })

  // ----- Career -----
  const tenthRuler = findHouseRuler(houseRulers, 10)
  const saturn = findPlacement(placements, 'Saturn')
  const jupiter = findPlacement(placements, 'Jupiter')
  const careerParas: string[] = []
  if (tenthRuler) careerParas.push(tenthRuler.signal)
  if (data.natal.mc?.sign) {
    careerParas.push(`MC ${getSignLabelKo(data.natal.mc.sign as ZodiacName)} — 사회상의 결.`)
  }
  if (jupiter) careerParas.push(`목성(확장) — ${jupiter.signal}`)
  if (saturn) careerParas.push(`토성(구조) — ${saturn.signal}`)
  const careerDom = domainByKey.get('career')
  sections.push({
    theme: 'career',
    title: THEME_TITLE_KO.career,
    score: careerDom?.score ?? null,
    band: careerDom?.band ?? null,
    paragraphs: careerParas,
    bullets: [],
  })

  // ----- Wealth -----
  const wealthParas: string[] = []
  const secondRuler = findHouseRuler(houseRulers, 2)
  const eighthRuler = findHouseRuler(houseRulers, 8)
  if (secondRuler) wealthParas.push(secondRuler.signal)
  if (eighthRuler) wealthParas.push(eighthRuler.signal)
  if (jupiter) wealthParas.push(`목성(풍요) — ${jupiter.signal}`)
  if (venus) wealthParas.push(`금성(가치) — ${venus.signal}`)
  if (advanced.partOfFortune) wealthParas.push(advanced.partOfFortune)
  const wealthDom = domainByKey.get('wealth')
  sections.push({
    theme: 'wealth',
    title: THEME_TITLE_KO.wealth,
    score: wealthDom?.score ?? null,
    band: wealthDom?.band ?? null,
    paragraphs: wealthParas,
    bullets: [],
  })

  // ----- Health -----
  const healthParas: string[] = []
  const sixthRuler = findHouseRuler(houseRulers, 6)
  if (sixthRuler) healthParas.push(sixthRuler.signal)
  if (mars) healthParas.push(`화성(에너지) — ${mars.signal}`)
  if (saturn) healthParas.push(`토성(취약점) — ${saturn.signal}`)
  if (moon) healthParas.push(`달(생활 리듬) — ${moon.signal}`)
  const healthDom = domainByKey.get('health')
  sections.push({
    theme: 'health',
    title: THEME_TITLE_KO.health,
    score: healthDom?.score ?? null,
    band: healthDom?.band ?? null,
    paragraphs: healthParas,
    bullets: [],
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
  })

  // ----- Structure -----
  const structParas: string[] = []
  for (const hr of houseRulers) structParas.push(hr.signal)
  for (const fs of advanced.fixedStars) structParas.push(fs)
  const topMidpoints = advanced.midpoints.slice(0, 4)
  for (const m of topMidpoints) structParas.push(m)
  sections.push({
    theme: 'structure',
    title: THEME_TITLE_KO.structure,
    score: null,
    band: null,
    paragraphs: structParas,
    bullets: [],
  })

  return sections
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
    for (const a of data.daily.aspects.slice(0, 5)) {
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
    })
  }

  // ----- Monthly (lunar return + active eclipses ±60d) -----
  {
    const lines: string[] = []
    const lunarMoon = data.monthly.planets.find((p) => p.name === 'Moon')
    if (lunarMoon?.sign) {
      const sign = lunarMoon.sign as ZodiacName
      lines.push(`이번 달 달이 ${getSignLabelKo(sign)} (${lunarMoon.house}하우스) — ${getPlanetSignInterpretation('Moon', sign, 'ko')}`)
    }
    const recentEclipses = data.advanced.eclipseImpacts.filter((ec) =>
      isWithinDays(ec.eclipse.date, refIso, 60)
    ).slice(0, 3)
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
    })
  }

  // ----- Yearly (solar return + eclipses ±180d) -----
  {
    const lines: string[] = []
    const solarSun = data.yearly.planets.find((p) => p.name === 'Sun')
    if (solarSun?.sign) {
      const sign = solarSun.sign as ZodiacName
      lines.push(`올해 태양이 ${getSignLabelKo(sign)} (${solarSun.house}하우스) — ${getPlanetSignInterpretation('Sun', sign, 'ko')}`)
    }
    const yearlyEclipses = data.advanced.eclipseImpacts.filter((ec) =>
      isWithinDays(ec.eclipse.date, refIso, 180)
    ).slice(0, 5)
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
    })
  }

  // ----- Daewoon (progressed) -----
  {
    const lines: string[] = []
    const progSun = data.daewoon.planets.find((p) => p.name === 'Sun')
    if (progSun?.sign) {
      const sign = progSun.sign as ZodiacName
      lines.push(`진행 태양 ${getSignLabelKo(sign)} (${progSun.house}하우스) — ${getPlanetSignInterpretation('Sun', sign, 'ko')}`)
    }
    const progMoon = data.daewoon.planets.find((p) => p.name === 'Moon')
    if (progMoon?.sign) {
      const sign = progMoon.sign as ZodiacName
      lines.push(`진행 달 ${getSignLabelKo(sign)} (${progMoon.house}하우스) — ${getPlanetSignInterpretation('Moon', sign, 'ko')}`)
    }
    // Top 3 most-charged natal aspects (long-term life themes).
    for (const a of natalAspects.slice(0, 3)) {
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
    })
  }

  return sections
}

// Re-export dignity types for convenience.
export type { DignityKind, DignityResult }
// Helper for the result page when surfacing the planet+house signal directly.
export const buildPlanetHouseSnippet = getPlanetHouseInterpretation
