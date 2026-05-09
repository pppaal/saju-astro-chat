// src/lib/astrology/dignities.ts
//
// Essential dignities — the closest astrology equivalent of saju's 격국·용신.
// A planet's strength depends heavily on the sign it sits in:
//
//   rulership   — planet rules the sign      (strongest, +5)
//   exaltation  — planet is exalted          (very strong, +4)
//   triplicity  — planet rules the element   (mild support, +2)
//   detriment   — planet is in opposite sign (weakened, -3)
//   fall        — planet is fallen           (most weakened, -4)
//   peregrine   — none of the above          (neutral, 0)
//
// We keep both traditional (7-planet) rulership and modern co-rulership for
// outer planets so callers can pick a flavour. Default uses the traditional
// system for the seven visible planets and modern rulership for outer ones.

import type { AstroPlanetName, ZodiacName } from '../interpretations'

export type DignityKind =
  | 'rulership'
  | 'exaltation'
  | 'triplicity'
  | 'detriment'
  | 'fall'
  | 'peregrine'

export interface DignityResult {
  kind: DignityKind
  /** Numerical strength (-4 to +5). */
  score: number
  /** Korean label for UI. */
  label: string
}

// Traditional rulerships — Sun rules Leo, Moon rules Cancer, others rule
// two signs (day + night). Modern outers added below.
const RULERSHIP: Record<AstroPlanetName, ZodiacName[]> = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mercury: ['Gemini', 'Virgo'],
  Venus: ['Taurus', 'Libra'],
  Mars: ['Aries', 'Scorpio'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Saturn: ['Capricorn', 'Aquarius'],
  // Modern co-rulers
  Uranus: ['Aquarius'],
  Neptune: ['Pisces'],
  Pluto: ['Scorpio'],
  Ascendant: [],
}

// Detriment = the sign opposite a planet's rulership.
const DETRIMENT: Record<AstroPlanetName, ZodiacName[]> = {
  Sun: ['Aquarius'],
  Moon: ['Capricorn'],
  Mercury: ['Sagittarius', 'Pisces'],
  Venus: ['Aries', 'Scorpio'],
  Mars: ['Libra', 'Taurus'],
  Jupiter: ['Gemini', 'Virgo'],
  Saturn: ['Cancer', 'Leo'],
  Uranus: ['Leo'],
  Neptune: ['Virgo'],
  Pluto: ['Taurus'],
  Ascendant: [],
}

// Exaltation per Ptolemy.
const EXALTATION: Partial<Record<AstroPlanetName, ZodiacName>> = {
  Sun: 'Aries',
  Moon: 'Taurus',
  Mercury: 'Virgo',
  Venus: 'Pisces',
  Mars: 'Capricorn',
  Jupiter: 'Cancer',
  Saturn: 'Libra',
}

// Fall = sign opposite exaltation.
const FALL: Partial<Record<AstroPlanetName, ZodiacName>> = {
  Sun: 'Libra',
  Moon: 'Scorpio',
  Mercury: 'Pisces',
  Venus: 'Virgo',
  Mars: 'Cancer',
  Jupiter: 'Capricorn',
  Saturn: 'Aries',
}

// Triplicity rulers (Dorothean) — daytime / nighttime / participating.
// Used as a mild bonus when the planet rules the element of its sign.
const TRIPLICITY_FIRE: AstroPlanetName[] = ['Sun', 'Jupiter', 'Saturn']
const TRIPLICITY_EARTH: AstroPlanetName[] = ['Venus', 'Moon', 'Mars']
const TRIPLICITY_AIR: AstroPlanetName[] = ['Saturn', 'Mercury', 'Jupiter']
const TRIPLICITY_WATER: AstroPlanetName[] = ['Venus', 'Mars', 'Moon']

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

const TRIPLICITY_TABLE: Record<'fire' | 'earth' | 'air' | 'water', AstroPlanetName[]> = {
  fire: TRIPLICITY_FIRE,
  earth: TRIPLICITY_EARTH,
  air: TRIPLICITY_AIR,
  water: TRIPLICITY_WATER,
}

const KIND_LABEL_KO: Record<DignityKind, string> = {
  rulership: '도미시일 (지배)',
  exaltation: '엑잘테이션 (고양)',
  triplicity: '트리플리시티 (요소 지배)',
  detriment: '디트리먼트 (약화)',
  fall: '폴 (추락)',
  peregrine: '페레그린 (중립)',
}

const KIND_SCORE: Record<DignityKind, number> = {
  rulership: 5,
  exaltation: 4,
  triplicity: 2,
  peregrine: 0,
  detriment: -3,
  fall: -4,
}

/**
 * Returns the planet's essential-dignity status in a given sign.
 * Highest-priority result wins (rulership > exaltation > triplicity > peregrine).
 * Detriment and fall are returned in place of peregrine when applicable.
 */
export function getEssentialDignity(
  planet: AstroPlanetName,
  sign: ZodiacName
): DignityResult {
  if (RULERSHIP[planet]?.includes(sign)) {
    return { kind: 'rulership', score: KIND_SCORE.rulership, label: KIND_LABEL_KO.rulership }
  }
  if (EXALTATION[planet] === sign) {
    return { kind: 'exaltation', score: KIND_SCORE.exaltation, label: KIND_LABEL_KO.exaltation }
  }
  if (FALL[planet] === sign) {
    return { kind: 'fall', score: KIND_SCORE.fall, label: KIND_LABEL_KO.fall }
  }
  if (DETRIMENT[planet]?.includes(sign)) {
    return { kind: 'detriment', score: KIND_SCORE.detriment, label: KIND_LABEL_KO.detriment }
  }
  const element = SIGN_ELEMENT[sign]
  if (element && TRIPLICITY_TABLE[element].includes(planet)) {
    return { kind: 'triplicity', score: KIND_SCORE.triplicity, label: KIND_LABEL_KO.triplicity }
  }
  return { kind: 'peregrine', score: KIND_SCORE.peregrine, label: KIND_LABEL_KO.peregrine }
}

/**
 * Returns the sign that rules the planet, used to chase house rulers.
 * Falls back to the modern outers' rulerships when only those are available.
 */
export function getRulerOfSign(sign: ZodiacName): AstroPlanetName | null {
  for (const [planet, signs] of Object.entries(RULERSHIP) as Array<
    [AstroPlanetName, ZodiacName[]]
  >) {
    if (signs.includes(sign)) {
      return planet
    }
  }
  return null
}

/**
 * Some traditional benefic / malefic categorisation. Used for aspect
 * scoring (e.g. Venus-Jupiter conjunction is unambiguously favourable;
 * Mars-Saturn is challenging).
 */
export type PlanetTone = 'great-benefic' | 'lesser-benefic' | 'neutral' | 'lesser-malefic' | 'great-malefic'

const PLANET_TONE: Record<AstroPlanetName, PlanetTone> = {
  Sun: 'neutral',
  Moon: 'neutral',
  Mercury: 'neutral',
  Venus: 'lesser-benefic',
  Mars: 'lesser-malefic',
  Jupiter: 'great-benefic',
  Saturn: 'great-malefic',
  Uranus: 'neutral',
  Neptune: 'neutral',
  Pluto: 'neutral',
  Ascendant: 'neutral',
}

export function getPlanetTone(planet: AstroPlanetName): PlanetTone {
  return PLANET_TONE[planet] ?? 'neutral'
}

/**
 * Pair score: combines the two planets' tones into an aspect-quality
 * modifier on a -2 to +2 scale. Conjunction with two benefics → +2,
 * with two malefics → -2, mixed → near 0. Used by aspectScoring.ts.
 */
export function getPairTone(
  a: AstroPlanetName,
  b: AstroPlanetName
): number {
  const map: Record<PlanetTone, number> = {
    'great-benefic': 2,
    'lesser-benefic': 1,
    neutral: 0,
    'lesser-malefic': -1,
    'great-malefic': -2,
  }
  return Math.round((map[getPlanetTone(a)] + map[getPlanetTone(b)]) / 2)
}
