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
  getPlanetHouseInterpretation,
  getPlanetLabelKo,
  getPlanetSignInterpretation,
  getSignLabelKo,
} from './interpretations'
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

export interface AstrologyComprehensiveReport {
  overallScore: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  domains: AstrologyDomainScore[]
  topPlacements: AstrologyPlacementHighlight[]
  topAspects: AstrologyAspectHighlight[]
  balance: ChartBalance
  houseRulers: AstrologyHouseRulerSignal[]
  timing: AstrologyTiming
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
  const domains = scoreDomains(placements, aspects, balance)
  const overallScore = clampScore(
    domains.reduce((sum, d) => sum + d.score, 0) / domains.length
  )

  return {
    overallScore,
    band: bandFor(overallScore),
    domains,
    topPlacements: placements
      .slice()
      .sort((a, b) => Math.abs(b.dignity.score) - Math.abs(a.dignity.score))
      .slice(0, 8),
    topAspects: aspects.slice(0, 8),
    balance,
    houseRulers,
    timing: scoreTiming(data, aspects),
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
      return {
        ...scored,
        signal: `${hit.from.name} ${getAspectKoLabel(kind)} ${hit.to.name} (orb ${hit.orb.toFixed(1)}°, score ${scored.score}) — ${getAspectInterpretation(kind, 'ko')}`,
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

  // Monthly = lunar return chart's Moon position dignity.
  const lunarMoon = data.monthly.planets.find((p) => p.name === 'Moon')
  const lunarSign = (lunarMoon?.sign as ZodiacName) || null
  const lunarDignity = lunarSign ? getEssentialDignity('Moon', lunarSign) : null
  const monthlyScore = clampScore(60 + (lunarDignity?.score ?? 0) * 4)

  // Yearly = solar return Sun dignity + benefic transits to Sun.
  const solarSun = data.yearly.planets.find((p) => p.name === 'Sun')
  const solarSign = (solarSun?.sign as ZodiacName) || null
  const solarDignity = solarSign ? getEssentialDignity('Sun', solarSign) : null
  const yearlyScore = clampScore(60 + (solarDignity?.score ?? 0) * 4)

  // Daewoon = progressed Sun house + cumulative natal-aspect quality.
  const progSun = data.daewoon.planets.find((p) => p.name === 'Sun')
  const progSign = (progSun?.sign as ZodiacName) || null
  const progDignity = progSign ? getEssentialDignity('Sun', progSign) : null
  const natalAspectAggregate = aggregateAspectScore(natalAspects.slice(0, 8))
  const daewoonScore = clampScore(60 + (progDignity?.score ?? 0) * 3 + natalAspectAggregate)

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

// Re-export dignity types for convenience.
export type { DignityKind, DignityResult }
// Helper for the result page when surfacing the planet+house signal directly.
export const buildPlanetHouseSnippet = getPlanetHouseInterpretation
