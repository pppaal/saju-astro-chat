// src/lib/astrology/comprehensiveReport.ts
//
// Deterministic comprehensive astrology report — mirrors the role of
// src/lib/Saju/comprehensiveReport.ts on the saju side.
//
// Takes the unified `AstrologyData` result from `calculateAstrologyData()`
// and produces a structured, scored report:
//   - 5 life-domain scores (성격·관계·커리어·재물·건강) on a 0–100 scale
//   - top placements list (key planet × sign × house signals)
//   - top aspects list (most informative natal aspects)
//   - timing snapshot (current daily transits, this lunar return, this solar return,
//     current progressed Sun/Moon)
//   - per-domain interpretive snippets pulled from interpretations.ts
//
// No LLM, no network. Pure computation over the engine output.

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
  score: number // 0–100
  band: 'great' | 'good' | 'mixed' | 'caution'
  /** Reasons that drove the score (placement signals + aspect signals). */
  signals: string[]
}

export interface AstrologyPlacementHighlight {
  planet: AstroPlanetName
  sign: ZodiacName
  house: number
  retrograde?: boolean
  signal: string
}

export interface AstrologyAspectHighlight {
  fromPlanet: string
  toPlanet: string
  kind: AspectKind
  orb: number
  signal: string
}

export interface AstrologyTimingSnapshot {
  /** "오늘은 …" / 트랜짓 핵심 요약 (최대 3개). */
  todayTransits: Array<{ planet: string; toNatal: string; kind: AspectKind; orb: number }>
  /** 이번 달 (lunar return) 흐름 한 줄. */
  monthlyHeadline: string
  /** 올해 (solar return) 흐름 한 줄. */
  yearlyHeadline: string
  /** 현재 대운 (progressed Sun / Moon) 한 줄. */
  daewoonHeadline: string
}

export interface AstrologyComprehensiveReport {
  overallScore: number // 0–100, weighted across domains
  band: 'great' | 'good' | 'mixed' | 'caution'
  domains: AstrologyDomainScore[]
  topPlacements: AstrologyPlacementHighlight[]
  topAspects: AstrologyAspectHighlight[]
  timing: AstrologyTimingSnapshot
}

// ============================================================
// Sign element + modality lookups (for domain scoring heuristics)
// ============================================================

const SIGN_ELEMENT: Record<ZodiacName, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

// Each planet's primary domain weight contribution (0–10 per signal).
// Mirrors saju's domain mapping table.
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

// House × domain lookup — what life area each house naturally seeds.
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

const ASPECT_FAVOR: Record<AspectKind, number> = {
  conjunction: 4, // could be either way; default neutral-positive
  sextile: 5,
  trine: 6,
  square: -3,
  opposition: -2,
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

// ============================================================
// Public — buildAstrologyComprehensiveReport
// ============================================================

export function buildAstrologyComprehensiveReport(
  data: AstrologyData
): AstrologyComprehensiveReport {
  const placements = collectPlacements(data)
  const aspects = collectTopAspects(data)
  const domains = scoreDomains(placements, aspects)
  const overallScore = clampScore(
    domains.reduce((sum, d) => sum + d.score, 0) / domains.length
  )

  return {
    overallScore,
    band: bandFor(overallScore),
    domains,
    topPlacements: placements.slice(0, 8),
    topAspects: aspects.slice(0, 6),
    timing: buildTimingSnapshot(data),
  }
}

interface CollectedPlacement {
  planet: AstroPlanetName
  sign: ZodiacName
  house: number
  retrograde?: boolean
  signal: string
}

function collectPlacements(data: AstrologyData): CollectedPlacement[] {
  const out: CollectedPlacement[] = []
  for (const planet of data.natal.planets) {
    if (!planet.name || !planet.sign) continue
    const planetName = planet.name as AstroPlanetName
    const signName = planet.sign as ZodiacName
    const house = typeof planet.house === 'number' ? planet.house : 1
    out.push({
      planet: planetName,
      sign: signName,
      house,
      retrograde: planet.retrograde,
      signal: `${getPlanetLabelKo(planetName)} ${getSignLabelKo(signName)} (${house}하우스 · ${getHouseDomainKo(house)}) — ${getPlanetSignInterpretation(planetName, signName, 'ko')}`,
    })
  }
  if (data.natal.ascendant?.sign) {
    out.unshift({
      planet: 'Ascendant',
      sign: data.natal.ascendant.sign as ZodiacName,
      house: 1,
      signal: `${getPlanetLabelKo('Ascendant')} ${getSignLabelKo(data.natal.ascendant.sign as ZodiacName)} — 외부에 비치는 첫인상의 결.`,
    })
  }
  return out
}

interface CollectedAspect {
  fromPlanet: string
  toPlanet: string
  kind: AspectKind
  orb: number
  signal: string
}

function collectTopAspects(data: AstrologyData): CollectedAspect[] {
  // The aspects helper expects the trimmed `Chart` shape from
  // foundation/types. NatalChartData is structurally compatible (same
  // planet/house fields), so we cast through `unknown`.
  const natalAspects = findNatalAspects(
    data.natal as unknown as Parameters<typeof findNatalAspects>[0],
    { includeMinor: false, maxResults: 30 }
  )
  return natalAspects.slice(0, 12).map((hit) => {
    const kind = hit.type as AspectKind
    return {
      fromPlanet: hit.from.name,
      toPlanet: hit.to.name,
      kind,
      orb: Number(hit.orb.toFixed(2)),
      signal: `${hit.from.name} ${getAspectKoLabel(kind)} ${hit.to.name} (orb ${hit.orb.toFixed(1)}°) — ${getAspectInterpretation(kind, 'ko')}`,
    }
  })
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

function scoreDomains(
  placements: CollectedPlacement[],
  aspects: CollectedAspect[]
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
    const sign = p.sign
    const elementBonus = SIGN_ELEMENT[sign]
    for (const dom of Object.keys(tally) as AstrologyDomain[]) {
      const planetWeight = planetWeights[dom] ?? 0
      const houseHits = houseDomains.includes(dom) ? 4 : 0
      const elementBonusValue = matchElementBonus(dom, elementBonus)
      const contribution = planetWeight + houseHits + elementBonusValue
      tally[dom].max += planetWeight + 4 + elementBonusValue
      tally[dom].raw += contribution
      if (planetWeight > 0 && tally[dom].signals.length < 3) {
        tally[dom].signals.push(p.signal)
      }
    }
  }

  for (const a of aspects.slice(0, 8)) {
    const favor = ASPECT_FAVOR[a.kind] ?? 0
    const aspectAffectsAllDomains = 2
    for (const dom of Object.keys(tally) as AstrologyDomain[]) {
      tally[dom].raw += favor
      tally[dom].max += aspectAffectsAllDomains
      if (favor > 0 && tally[dom].signals.length < 5) {
        tally[dom].signals.push(a.signal)
      }
    }
  }

  return (Object.keys(tally) as AstrologyDomain[]).map((dom) => {
    const { raw, max, signals } = tally[dom]
    // Normalise to 0–100. Allow some headroom so 100 is unusual.
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

function matchElementBonus(
  domain: AstrologyDomain,
  element: 'fire' | 'earth' | 'air' | 'water' | undefined
): number {
  if (!element) return 0
  if (domain === 'personality' && (element === 'fire' || element === 'air')) return 1
  if (domain === 'relationship' && (element === 'air' || element === 'water')) return 1
  if (domain === 'career' && (element === 'fire' || element === 'earth')) return 1
  if (domain === 'wealth' && element === 'earth') return 2
  if (domain === 'health' && (element === 'earth' || element === 'water')) return 1
  return 0
}

function buildTimingSnapshot(data: AstrologyData): AstrologyTimingSnapshot {
  const top = data.daily.aspects.slice(0, 3).map((a) => ({
    planet: a.from.name,
    toNatal: a.to.name,
    kind: a.type as AspectKind,
    orb: Number(a.orb.toFixed(2)),
  }))
  const monthlyMoon = data.monthly.planets.find((p) => p.name === 'Moon')
  const yearlySun = data.yearly.planets.find((p) => p.name === 'Sun')
  const progSun = data.daewoon.planets.find((p) => p.name === 'Sun')
  const progMoon = data.daewoon.planets.find((p) => p.name === 'Moon')

  return {
    todayTransits: top,
    monthlyHeadline: monthlyMoon
      ? `이번 달 달이 ${getSignLabelKo(monthlyMoon.sign as ZodiacName)} 자리에서 운영됩니다 — ${getPlanetSignInterpretation('Moon', monthlyMoon.sign as ZodiacName, 'ko')}.`
      : '이번 달 흐름 데이터가 부족합니다.',
    yearlyHeadline: yearlySun
      ? `올해 태양이 ${getSignLabelKo(yearlySun.sign as ZodiacName)}로 회귀 — ${getPlanetSignInterpretation('Sun', yearlySun.sign as ZodiacName, 'ko')}.`
      : '올해 회귀 데이터가 부족합니다.',
    daewoonHeadline: progSun
      ? `현재 대운(진행 차트)에서 태양은 ${getSignLabelKo(progSun.sign as ZodiacName)}, 달은 ${getSignLabelKo((progMoon?.sign as ZodiacName) || (progSun.sign as ZodiacName))} — ${getPlanetSignInterpretation('Sun', progSun.sign as ZodiacName, 'ko')}.`
      : '진행 차트 데이터가 부족합니다.',
  }
}
