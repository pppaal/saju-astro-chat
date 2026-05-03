/**
 * Shared sign / element / aspect math helpers.
 *
 * Used to be duplicated across 8+ files in src/lib/compatibility/* and
 * src/lib/match/*. This module is the single source of truth.
 */

export type ElementEn = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export const ZODIAC_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export type ZodiacSign = (typeof ZODIAC_ORDER)[number]

/** 0..6 minimum step distance between two zodiac signs. -1 if unknown. */
export function signDistance(s1?: string, s2?: string): number {
  if (!s1 || !s2) return -1
  const i1 = ZODIAC_ORDER.indexOf(s1 as ZodiacSign)
  const i2 = ZODIAC_ORDER.indexOf(s2 as ZodiacSign)
  if (i1 < 0 || i2 < 0) return -1
  const diff = Math.abs(i1 - i2) % 12
  return Math.min(diff, 12 - diff)
}

export type Aspect = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | null

/** Map sign distance → traditional aspect class. Null when no clean aspect. */
export function aspectFromDistance(d: number): Aspect {
  if (d === 0) return 'conjunction'
  if (d === 2) return 'sextile'
  if (d === 3) return 'square'
  if (d === 4) return 'trine'
  if (d === 6) return 'opposition'
  return null
}

/** Score for a sign-based aspect, calibrated 0-100. */
export const ASPECT_SCORE: Record<Exclude<Aspect, null>, number> = {
  conjunction: 90,
  trine: 85,
  sextile: 70,
  opposition: 60,
  square: 35,
}

export function aspectStrengthScore(distance: number): number {
  if (distance < 0) return 0
  switch (distance) {
    case 0: return 95
    case 4: return 90
    case 2: return 75
    case 6: return 70
    case 3: return 35
    case 1: return 50
    case 5: return 45
    default: return 50
  }
}

// ============================================================
// 5-element relations
// ============================================================

export const ELEMENT_GENERATES: Record<ElementEn, ElementEn> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

export const ELEMENT_CONTROLS: Record<ElementEn, ElementEn> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

const KO_TO_EN_ELEMENT: Record<string, ElementEn> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

export function normalizeElementEn(raw: string | undefined): ElementEn {
  if (!raw) return 'earth'
  const lower = raw.toLowerCase()
  if (
    lower === 'wood' ||
    lower === 'fire' ||
    lower === 'earth' ||
    lower === 'metal' ||
    lower === 'water'
  ) {
    return lower
  }
  return KO_TO_EN_ELEMENT[raw] || 'earth'
}

export type ElementRel = 'same' | 'support' | 'drain' | 'control' | 'controlled' | 'unknown'

/** Returns the relation of element `a` to element `b`. */
export function elementRel(a?: string, b?: string): ElementRel {
  if (!a || !b) return 'unknown'
  const ax = normalizeElementEn(a)
  const bx = normalizeElementEn(b)
  if (ax === bx) return 'same'
  if (ELEMENT_GENERATES[bx] === ax) return 'support' // b generates a
  if (ELEMENT_GENERATES[ax] === bx) return 'drain' // a generates b
  if (ELEMENT_CONTROLS[ax] === bx) return 'control' // a controls b
  if (ELEMENT_CONTROLS[bx] === ax) return 'controlled' // b controls a
  return 'unknown'
}

// ============================================================
// Element compatibility (fire-air / earth-water classic pairing)
// ============================================================

export const COMPATIBLE_ASTRO_ELEMENT: Record<string, string> = {
  fire: 'air',
  air: 'fire',
  earth: 'water',
  water: 'earth',
}

export function elementsCompatible(e1?: string, e2?: string): boolean {
  if (!e1 || !e2) return false
  return COMPATIBLE_ASTRO_ELEMENT[e1.toLowerCase()] === e2.toLowerCase()
}
