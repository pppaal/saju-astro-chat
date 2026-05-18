// src/lib/fusion/lifeReport/signals/astroSignals.ts
// Helpers that extract domain-relevant signals from AstrologyLikeChart.
// Every helper is defensive — missing fields return undefined/[].

import type { PlanetBase, AspectHit } from '@/lib/astrology/foundation/types'
import type { AstrologyLikeChart } from '../types'

export function getPlanet(
  astro: AstrologyLikeChart,
  name: string
): PlanetBase | undefined {
  return (astro.planets ?? []).find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  )
}

export function planetsInHouse(
  astro: AstrologyLikeChart,
  house: number
): PlanetBase[] {
  return (astro.planets ?? []).filter((p) => p.house === house)
}

export function houseCusp(
  astro: AstrologyLikeChart,
  index: number
): { sign?: string } | undefined {
  const houses = astro.houses ?? []
  return houses[index - 1]
}

/**
 * Aspect type → tonal category.
 */
export function aspectTone(
  type: string
): 'harmonious' | 'tense' | 'intense' | 'neutral' {
  if (type === 'trine' || type === 'sextile') return 'harmonious'
  if (type === 'square' || type === 'opposition') return 'tense'
  if (type === 'conjunction') return 'intense'
  return 'neutral'
}

/** Aspects involving a given planet name (case-insensitive). */
export function aspectsOf(
  astro: AstrologyLikeChart,
  planet: string
): AspectHit[] {
  const aspects = astro.aspects ?? []
  const target = planet.toLowerCase()
  return aspects.filter(
    (a) =>
      a.from?.name?.toLowerCase() === target ||
      a.to?.name?.toLowerCase() === target
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
      (h.from?.name?.toLowerCase() === aa &&
        h.to?.name?.toLowerCase() === bb) ||
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
export function fixedStarOn(
  astro: AstrologyLikeChart,
  planet: string
): string[] {
  const stars = astro.fixedStars ?? []
  const target = planet.toLowerCase()
  return stars
    .filter((s) => s.planet?.toLowerCase() === target && s.orb < 2)
    .map((s) => s.star)
}

export function outOfBoundsPlanets(astro: AstrologyLikeChart): string[] {
  return astro.declinations?.outOfBounds ?? []
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
export function solarReturnPlanetsInHouse(
  astro: AstrologyLikeChart,
  house: number
): string[] {
  const chart = astro.solarReturn?.chart
  if (!chart) return []
  return (chart.planets ?? [])
    .filter((p) => p.house === house)
    .map((p) => p.name)
}

/** Element dominant signature from the natal planets. */
export function elementDominance(
  astro: AstrologyLikeChart
): { dominant?: string; weak?: string } {
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
  const weak = sorted[sorted.length - 1]?.[1] === 0
    ? sorted[sorted.length - 1][0]
    : undefined
  return { dominant, weak }
}
