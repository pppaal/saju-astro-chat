// src/lib/astrology/balance.ts
//
// Element + Modality + Polarity + Hemisphere distribution.
// Mirrors saju's 5행 강약·균형 analysis: a chart with no air planets struggles
// with abstraction, all-fire chart burns out, etc. Used as one of the input
// signals to the comprehensive report's domain scoring.

import type { ZodiacName } from './interpretations'

export type Element = 'fire' | 'earth' | 'air' | 'water'
export type Modality = 'cardinal' | 'fixed' | 'mutable'
export type Polarity = 'masculine' | 'feminine'

const SIGN_ELEMENT: Record<ZodiacName, Element> = {
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

const SIGN_MODALITY: Record<ZodiacName, Modality> = {
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

// Fire and air signs are masculine (yang); earth and water are feminine (yin).
const SIGN_POLARITY: Record<ZodiacName, Polarity> = {
  Aries: 'masculine',
  Leo: 'masculine',
  Sagittarius: 'masculine',
  Gemini: 'masculine',
  Libra: 'masculine',
  Aquarius: 'masculine',
  Taurus: 'feminine',
  Virgo: 'feminine',
  Capricorn: 'feminine',
  Cancer: 'feminine',
  Scorpio: 'feminine',
  Pisces: 'feminine',
}

export interface ChartBalance {
  elements: Record<Element, number>
  modalities: Record<Modality, number>
  polarity: Record<Polarity, number>
  hemispheres: {
    /** Houses 1-6 (private / self). */
    below: number
    /** Houses 7-12 (public / other). */
    above: number
    /** Houses 1-3, 10-12 (eastern / self-determined). */
    east: number
    /** Houses 4-9 (western / other-influenced). */
    west: number
  }
  total: number
  /** Element with the highest count — primary "voice" of the chart. */
  dominantElement: Element | null
  /** Element with zero or near-zero count — chart's blind spot. */
  weakestElement: Element | null
  dominantModality: Modality | null
  weakestModality: Modality | null
}

interface PlanetForBalance {
  name: string
  sign: ZodiacName
  house: number
}

/**
 * Compute element/modality/polarity/hemisphere distributions across the
 * planets the caller passes in. The caller decides which planets to include
 * — typically the 7 traditional + Asc + MC, sometimes outers too.
 */
export function calculateChartBalance(planets: PlanetForBalance[]): ChartBalance {
  const elements: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const modalities: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 }
  const polarity: Record<Polarity, number> = { masculine: 0, feminine: 0 }
  const hemispheres = { below: 0, above: 0, east: 0, west: 0 }

  for (const p of planets) {
    const el = SIGN_ELEMENT[p.sign]
    const mo = SIGN_MODALITY[p.sign]
    const po = SIGN_POLARITY[p.sign]
    if (el) elements[el] += 1
    if (mo) modalities[mo] += 1
    if (po) polarity[po] += 1
    if (p.house >= 1 && p.house <= 6) hemispheres.below += 1
    if (p.house >= 7 && p.house <= 12) hemispheres.above += 1
    if (p.house >= 1 && p.house <= 3) hemispheres.east += 1
    if (p.house >= 10 && p.house <= 12) hemispheres.east += 1
    if (p.house >= 4 && p.house <= 9) hemispheres.west += 1
  }

  const total = planets.length
  const dominantElement = pickDominant(elements)
  const weakestElement = pickWeakest(elements)
  const dominantModality = pickDominant(modalities)
  const weakestModality = pickWeakest(modalities)

  return {
    elements,
    modalities,
    polarity,
    hemispheres,
    total,
    dominantElement,
    weakestElement,
    dominantModality,
    weakestModality,
  }
}

function pickDominant<K extends string>(counts: Record<K, number>): K | null {
  let best: K | null = null
  let bestCount = -1
  for (const [key, value] of Object.entries(counts) as Array<[K, number]>) {
    if (value > bestCount) {
      best = key
      bestCount = value
    }
  }
  return bestCount > 0 ? best : null
}

function pickWeakest<K extends string>(counts: Record<K, number>): K | null {
  const entries = Object.entries(counts) as Array<[K, number]>
  if (entries.length === 0) return null
  entries.sort((a, b) => a[1] - b[1])
  return entries[0][1] === 0 ? entries[0][0] : null
}
