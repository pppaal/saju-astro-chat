// src/lib/fusion/lifeReport/signals/astroSynthesis.ts
// Ported (and trimmed) from /lib/astrology/foundation/synthesis.ts.
// Element / modality balance + dominant-planet detection used by headline
// and karma sections. Defensive — every helper tolerates missing data.

import type { AstrologyLikeChart } from '../types'
import type { PlanetBase } from '@/lib/astrology/foundation/types'

export type AstroElement = 'fire' | 'earth' | 'air' | 'water'
export type AstroModality = 'cardinal' | 'fixed' | 'mutable'

const SIGN_TO_ELEMENT: Record<string, AstroElement> = {
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

const SIGN_TO_MODALITY: Record<string, AstroModality> = {
  Aries: 'cardinal',
  Cancer: 'cardinal',
  Libra: 'cardinal',
  Capricorn: 'cardinal',
  Taurus: 'fixed',
  Leo: 'fixed',
  Scorpio: 'fixed',
  Aquarius: 'fixed',
  Gemini: 'mutable',
  Virgo: 'mutable',
  Sagittarius: 'mutable',
  Pisces: 'mutable',
}

export interface ElementBalance {
  fire: number
  earth: number
  air: number
  water: number
  dominant: AstroElement
  lacking: AstroElement | null
}

export interface ModalityBalance {
  cardinal: number
  fixed: number
  mutable: number
  dominant: AstroModality
}

export function elementBalance(astro: AstrologyLikeChart): ElementBalance | null {
  const planets = astro.planets ?? []
  if (planets.length === 0) return null
  const counts: Record<AstroElement, number> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0,
  }
  let total = 0
  for (const p of planets) {
    const el = p.sign ? SIGN_TO_ELEMENT[p.sign] : undefined
    if (el) {
      counts[el]++
      total++
    }
  }
  if (total === 0) return null
  const pct = (n: number) => Math.round((n / total) * 100)
  const fire = pct(counts.fire)
  const earth = pct(counts.earth)
  const air = pct(counts.air)
  const water = pct(counts.water)
  const ranked: Array<[AstroElement, number]> = [
    ['fire', fire],
    ['earth', earth],
    ['air', air],
    ['water', water],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  const dominant = ranked[0][0]
  const lacking = ranked[3][1] < 15 ? ranked[3][0] : null
  return { fire, earth, air, water, dominant, lacking }
}

export function modalityBalance(
  astro: AstrologyLikeChart
): ModalityBalance | null {
  const planets = astro.planets ?? []
  if (planets.length === 0) return null
  const counts: Record<AstroModality, number> = {
    cardinal: 0,
    fixed: 0,
    mutable: 0,
  }
  let total = 0
  for (const p of planets) {
    const m = p.sign ? SIGN_TO_MODALITY[p.sign] : undefined
    if (m) {
      counts[m]++
      total++
    }
  }
  if (total === 0) return null
  const pct = (n: number) => Math.round((n / total) * 100)
  const ranked: Array<[AstroModality, number]> = [
    ['cardinal', pct(counts.cardinal)],
    ['fixed', pct(counts.fixed)],
    ['mutable', pct(counts.mutable)],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  return {
    cardinal: pct(counts.cardinal),
    fixed: pct(counts.fixed),
    mutable: pct(counts.mutable),
    dominant: ranked[0][0],
  }
}

/**
 * Dominant planet = planet involved in the most natal aspects (count-based).
 * If the chart carries no aspect array we approximate by the planet
 * closest to ASC/MC, falling back to the Sun.
 */
export function dominantPlanet(astro: AstrologyLikeChart): string | null {
  const aspects = astro.aspects ?? []
  if (aspects.length > 0) {
    const counts: Record<string, number> = {}
    for (const a of aspects) {
      const fromName = a.from?.name
      const toName = a.to?.name
      if (fromName) counts[fromName] = (counts[fromName] || 0) + 1
      if (toName && toName !== fromName)
        counts[toName] = (counts[toName] || 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) return sorted[0][0]
  }
  // fallback — sun
  const planets = astro.planets ?? []
  const sun = planets.find((p) => p.name === 'Sun')
  return sun ? sun.name : null
}

/** Most-occupied house, ignoring counts < 2. */
export function emphasizedHouse(astro: AstrologyLikeChart): number | null {
  const planets = astro.planets ?? []
  const counts: Record<number, number> = {}
  for (const p of planets) {
    const h = p.house
    if (!h) continue
    counts[h] = (counts[h] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0 || sorted[0][1] < 2) return null
  return Number(sorted[0][0])
}

export function findPlanet(
  astro: AstrologyLikeChart,
  name: string
): PlanetBase | undefined {
  return (astro.planets ?? []).find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  )
}

export function northNode(astro: AstrologyLikeChart): PlanetBase | undefined {
  return (astro.planets ?? []).find((p) => p.name === 'True Node' || p.name === 'North Node')
}
