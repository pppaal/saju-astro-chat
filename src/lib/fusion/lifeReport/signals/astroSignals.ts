// src/lib/fusion/lifeReport/signals/astroSignals.ts
// Helpers that extract domain-relevant signals from AstrologyLikeChart.
// Every helper is defensive — missing fields return undefined/[].

import type { PlanetBase, AspectHit } from '@/lib/astrology/foundation/types'
import type { AstrologyLikeChart } from '../types'
import {
  findAspectPairEntry,
  type AspectKind,
  type AspectPairEntry,
} from '@/lib/astrology/interpretations'

// 5대 주요 각(conjunction/sextile/square/trine/opposition)일 때만 aspectPair
// DB(ASPECT_PAIR_DICTIONARY) entry를 조회. minor 각(quincunx 등)은 DB 미수록.
const MAJOR_ASPECTS = new Set<AspectKind>([
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
])
export function aspectPairEntryMajor(
  planetA: string,
  planetB: string,
  type: string
): AspectPairEntry | null {
  if (!MAJOR_ASPECTS.has(type as AspectKind)) return null
  return findAspectPairEntry(
    planetA as Parameters<typeof findAspectPairEntry>[0],
    planetB as Parameters<typeof findAspectPairEntry>[1],
    type as AspectKind
  )
}

/**
 * 주어진 행성 쌍 목록 중 차트에 실제로 존재하는 주요 각의 aspectPair DB
 * entry들을 orb(좁은 순) → 입력 순서 tiebreaker로 정렬해 반환. 결정론적.
 * 도메인 builder가 limit으로 narrative 과적을 방지한다.
 */
export function aspectPairEntriesForPairs(
  astro: AstrologyLikeChart,
  pairs: ReadonlyArray<readonly [string, string]>,
  limit = 1
): AspectPairEntry[] {
  const hits: Array<{ entry: AspectPairEntry; orb: number; idx: number }> = []
  pairs.forEach(([a, b], idx) => {
    const asp = aspectBetween(astro, a, b)
    if (!asp) return
    const entry = aspectPairEntryMajor(a, b, asp.type)
    if (entry) hits.push({ entry, orb: asp.orb ?? 99, idx })
  })
  hits.sort((x, y) => x.orb - y.orb || x.idx - y.idx)
  return hits.slice(0, Math.max(0, limit)).map((h) => h.entry)
}

export function getPlanet(astro: AstrologyLikeChart, name: string): PlanetBase | undefined {
  return (astro.planets ?? []).find((p) => p.name.toLowerCase() === name.toLowerCase())
}

export function planetsInHouse(astro: AstrologyLikeChart, house: number): PlanetBase[] {
  return (astro.planets ?? []).filter((p) => p.house === house)
}

export function houseCusp(astro: AstrologyLikeChart, index: number): { sign?: string } | undefined {
  const houses = astro.houses ?? []
  return houses[index - 1]
}

/**
 * Aspect type → tonal category.
 */
export function aspectTone(type: string): 'harmonious' | 'tense' | 'intense' | 'neutral' {
  if (type === 'trine' || type === 'sextile') return 'harmonious'
  if (type === 'square' || type === 'opposition') return 'tense'
  if (type === 'conjunction') return 'intense'
  return 'neutral'
}

/** Aspects involving a given planet name (case-insensitive). */
export function aspectsOf(astro: AstrologyLikeChart, planet: string): AspectHit[] {
  const aspects = astro.aspects ?? []
  const target = planet.toLowerCase()
  return aspects.filter(
    (a) => a.from?.name?.toLowerCase() === target || a.to?.name?.toLowerCase() === target
  )
}

/** Aspect between two named planets (case-insensitive). undefined if absent. */
export function aspectBetween(
  astro: AstrologyLikeChart,
  a: string,
  b: string
): AspectHit | undefined {
  const aspects = astro.aspects ?? []
  const aa = a.toLowerCase()
  const bb = b.toLowerCase()
  return aspects.find(
    (h) =>
      (h.from?.name?.toLowerCase() === aa && h.to?.name?.toLowerCase() === bb) ||
      (h.from?.name?.toLowerCase() === bb && h.to?.name?.toLowerCase() === aa)
  )
}

/** Returns Juno extra point either via asteroids or extraPoints. */
export function juno(astro: AstrologyLikeChart) {
  return astro.asteroids?.Juno || astro.extraPoints?.juno
}
export function vertex(astro: AstrologyLikeChart) {
  return astro.vertex || astro.extraPoints?.vertex
}
export function partOfFortune(astro: AstrologyLikeChart) {
  return astro.partOfFortune || astro.extraPoints?.partOfFortune
}
export function ceres(astro: AstrologyLikeChart) {
  return astro.asteroids?.Ceres || astro.extraPoints?.ceres
}
export function pallas(astro: AstrologyLikeChart) {
  return astro.asteroids?.Pallas
}
export function vesta(astro: AstrologyLikeChart) {
  return astro.asteroids?.Vesta
}
export function chiron(astro: AstrologyLikeChart) {
  return astro.chiron
}

/** Whether a fixed-star conjunction touches a given planet. */
export function fixedStarOn(astro: AstrologyLikeChart, planet: string): string[] {
  const stars = astro.fixedStars ?? []
  const target = planet.toLowerCase()
  return stars.filter((s) => s.planet?.toLowerCase() === target && s.orb < 2).map((s) => s.star)
}

export function outOfBoundsPlanets(astro: AstrologyLikeChart): string[] {
  return astro.declinations?.outOfBounds ?? []
}

// ─── Declination aspects (parallel / contraparallel) ─────────────
export interface DeclinationAspect {
  kind: 'parallel' | 'contraparallel'
  a: string
  b: string
  orb?: number
}

/**
 * Pull parallel + contraparallel declination aspects from the chart. The
 * Astrology-engine populates these under `declinations`. Returns [] when
 * missing — health P3 simply skips the line.
 */
export function declinationAspects(astro: AstrologyLikeChart): DeclinationAspect[] {
  const d = astro.declinations
  if (!d) return []
  const out: DeclinationAspect[] = []
  for (const p of d.parallel ?? []) {
    if (p.a && p.b) out.push({ kind: 'parallel', a: p.a, b: p.b, orb: p.orb })
  }
  for (const c of d.contraparallel ?? []) {
    if (c.a && c.b) out.push({ kind: 'contraparallel', a: c.a, b: c.b, orb: c.orb })
  }
  return out
}

// ─── Eclipses (multi) ──────────────────────────────────────────
export interface NearestEclipseEntry {
  type: 'solar' | 'lunar'
  date?: string
  sign?: string
  degree?: number
  relativeToBirth?: 'before' | 'after'
}

/**
 * Return up to one solar + one lunar eclipse most relevant to birth.
 * Prefers the `list` (multi) when present, else falls back to
 * nearestSolar / nearestLunar. Result order: solar first, lunar second.
 */
export function nearestEclipses(astro: AstrologyLikeChart): NearestEclipseEntry[] {
  const e = astro.eclipses
  if (!e) return []
  const out: NearestEclipseEntry[] = []
  // List form (richer): pick first solar + first lunar.
  if (e.list && e.list.length > 0) {
    const firstSolar = e.list.find((x) => x.type === 'solar')
    const firstLunar = e.list.find((x) => x.type === 'lunar')
    if (firstSolar) {
      out.push({
        type: 'solar',
        date: firstSolar.date,
        sign: firstSolar.sign,
        degree: firstSolar.degree,
        relativeToBirth: firstSolar.relativeToBirth,
      })
    }
    if (firstLunar) {
      out.push({
        type: 'lunar',
        date: firstLunar.date,
        sign: firstLunar.sign,
        degree: firstLunar.degree,
        relativeToBirth: firstLunar.relativeToBirth,
      })
    }
    if (out.length > 0) return out
  }
  // Fallback to legacy single fields.
  if (e.nearestSolar && (e.nearestSolar.date || e.nearestSolar.degree !== undefined)) {
    out.push({
      type: 'solar',
      date: e.nearestSolar.date,
      sign: e.nearestSolar.sign,
      degree: e.nearestSolar.degree,
    })
  }
  if (e.nearestLunar && (e.nearestLunar.date || e.nearestLunar.degree !== undefined)) {
    out.push({
      type: 'lunar',
      date: e.nearestLunar.date,
      sign: e.nearestLunar.sign,
      degree: e.nearestLunar.degree,
    })
  }
  return out
}

// ─── Solar Arc Direction summary ───────────────────────────────
export interface SolarArcSummary {
  /** Solar-arc planet sign positions (current). */
  planets: Array<{ name: string; sign?: string; ingressAge?: number }>
  /** Solar-arc MC sign + ingress age (when known). */
  mc?: { sign?: string; ingressAge?: number }
  /** Solar-arc ASC sign + ingress age (when known). */
  asc?: { sign?: string; ingressAge?: number }
  /** Upcoming sign ingress (age + planet) — used by decisive timing P5. */
  upcomingIngress?: { planet: string; sign?: string; ingressAge: number }
}

export function solarArcSummary(astro: AstrologyLikeChart): SolarArcSummary | undefined {
  const sa = astro.progressions?.solarArc
  if (!sa) return undefined
  const planets = sa.planets ?? []
  // Pick the planet with the smallest non-negative ingressAge — represents
  // the next solar-arc sign change a domain narrative can name.
  let upcoming: SolarArcSummary['upcomingIngress'] | undefined
  for (const p of planets) {
    if (typeof p.ingressAge !== 'number') continue
    if (!upcoming || p.ingressAge < upcoming.ingressAge) {
      upcoming = { planet: p.name, sign: p.sign, ingressAge: p.ingressAge }
    }
  }
  // MC ingress may also surface as a major timing window.
  if (sa.mc?.ingressAge !== undefined) {
    if (!upcoming || sa.mc.ingressAge < upcoming.ingressAge) {
      upcoming = { planet: 'MC', sign: sa.mc.sign, ingressAge: sa.mc.ingressAge }
    }
  }
  if (sa.asc?.ingressAge !== undefined) {
    if (!upcoming || sa.asc.ingressAge < upcoming.ingressAge) {
      upcoming = { planet: 'ASC', sign: sa.asc.sign, ingressAge: sa.asc.ingressAge }
    }
  }
  return {
    planets,
    mc: sa.mc,
    asc: sa.asc,
    upcomingIngress: upcoming,
  }
}

export function progressedSun(
  astro: AstrologyLikeChart
): { sign?: string; house?: number } | undefined {
  return astro.progressions?.secondary?.progressedSun
}

/** Solar return ASC sign. */
export function solarReturnAsc(astro: AstrologyLikeChart): string | undefined {
  return astro.solarReturn?.chart?.ascendant?.sign
}

/** Solar return planets in a given house. */
export function solarReturnPlanetsInHouse(astro: AstrologyLikeChart, house: number): string[] {
  const chart = astro.solarReturn?.chart
  if (!chart) return []
  return (chart.planets ?? []).filter((p) => p.house === house).map((p) => p.name)
}

/** Element dominant signature from the natal planets. */
export function elementDominance(astro: AstrologyLikeChart): { dominant?: string; weak?: string } {
  const planets = astro.planets ?? []
  if (planets.length === 0) return {}
  const els: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const SIGN_EL: Record<string, string> = {
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
  for (const p of planets) {
    const e = SIGN_EL[p.sign]
    if (e) els[e]++
  }
  const sorted = Object.entries(els).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0]?.[1] > 0 ? sorted[0][0] : undefined
  const weak = sorted[sorted.length - 1]?.[1] === 0 ? sorted[sorted.length - 1][0] : undefined
  return { dominant, weak }
}
