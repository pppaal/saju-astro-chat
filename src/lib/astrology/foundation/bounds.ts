// astrology/foundation/bounds.ts
// Egyptian Terms (Bounds) — 각 사인을 5개 unequal 구간으로 분할, 각 구간 = 다른 행성.
// Vettius Valens / Ptolemy 보존 Egyptian 시스템.

import type { ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'

interface Bound {
  ruler: AstroPlanetName
  start: number  // degree in sign, 0-30
  end: number    // degree in sign, 0-30
}

const EGYPTIAN_BOUNDS: Record<ZodiacKo, Bound[]> = {
  Aries: [
    { ruler: 'Jupiter', start: 0, end: 6 },
    { ruler: 'Venus',   start: 6, end: 12 },
    { ruler: 'Mercury', start: 12, end: 20 },
    { ruler: 'Mars',    start: 20, end: 25 },
    { ruler: 'Saturn',  start: 25, end: 30 },
  ],
  Taurus: [
    { ruler: 'Venus',   start: 0, end: 8 },
    { ruler: 'Mercury', start: 8, end: 14 },
    { ruler: 'Jupiter', start: 14, end: 22 },
    { ruler: 'Saturn',  start: 22, end: 27 },
    { ruler: 'Mars',    start: 27, end: 30 },
  ],
  Gemini: [
    { ruler: 'Mercury', start: 0, end: 6 },
    { ruler: 'Jupiter', start: 6, end: 12 },
    { ruler: 'Venus',   start: 12, end: 17 },
    { ruler: 'Mars',    start: 17, end: 24 },
    { ruler: 'Saturn',  start: 24, end: 30 },
  ],
  Cancer: [
    { ruler: 'Mars',    start: 0, end: 7 },
    { ruler: 'Venus',   start: 7, end: 13 },
    { ruler: 'Mercury', start: 13, end: 19 },
    { ruler: 'Jupiter', start: 19, end: 26 },
    { ruler: 'Saturn',  start: 26, end: 30 },
  ],
  Leo: [
    { ruler: 'Jupiter', start: 0, end: 6 },
    { ruler: 'Venus',   start: 6, end: 11 },
    { ruler: 'Saturn',  start: 11, end: 18 },
    { ruler: 'Mercury', start: 18, end: 24 },
    { ruler: 'Mars',    start: 24, end: 30 },
  ],
  Virgo: [
    { ruler: 'Mercury', start: 0, end: 7 },
    { ruler: 'Venus',   start: 7, end: 17 },
    { ruler: 'Jupiter', start: 17, end: 21 },
    { ruler: 'Mars',    start: 21, end: 28 },
    { ruler: 'Saturn',  start: 28, end: 30 },
  ],
  Libra: [
    { ruler: 'Saturn',  start: 0, end: 6 },
    { ruler: 'Mercury', start: 6, end: 14 },
    { ruler: 'Jupiter', start: 14, end: 21 },
    { ruler: 'Venus',   start: 21, end: 28 },
    { ruler: 'Mars',    start: 28, end: 30 },
  ],
  Scorpio: [
    { ruler: 'Mars',    start: 0, end: 7 },
    { ruler: 'Venus',   start: 7, end: 11 },
    { ruler: 'Mercury', start: 11, end: 19 },
    { ruler: 'Jupiter', start: 19, end: 24 },
    { ruler: 'Saturn',  start: 24, end: 30 },
  ],
  Sagittarius: [
    { ruler: 'Jupiter', start: 0, end: 12 },
    { ruler: 'Venus',   start: 12, end: 17 },
    { ruler: 'Mercury', start: 17, end: 21 },
    { ruler: 'Saturn',  start: 21, end: 26 },
    { ruler: 'Mars',    start: 26, end: 30 },
  ],
  Capricorn: [
    { ruler: 'Mercury', start: 0, end: 7 },
    { ruler: 'Jupiter', start: 7, end: 14 },
    { ruler: 'Venus',   start: 14, end: 22 },
    { ruler: 'Saturn',  start: 22, end: 26 },
    { ruler: 'Mars',    start: 26, end: 30 },
  ],
  Aquarius: [
    { ruler: 'Mercury', start: 0, end: 7 },
    { ruler: 'Venus',   start: 7, end: 13 },
    { ruler: 'Jupiter', start: 13, end: 20 },
    { ruler: 'Mars',    start: 20, end: 25 },
    { ruler: 'Saturn',  start: 25, end: 30 },
  ],
  Pisces: [
    { ruler: 'Venus',   start: 0, end: 12 },
    { ruler: 'Jupiter', start: 12, end: 16 },
    { ruler: 'Mercury', start: 16, end: 19 },
    { ruler: 'Mars',    start: 19, end: 28 },
    { ruler: 'Saturn',  start: 28, end: 30 },
  ],
}

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export interface BoundResult {
  longitude: number
  sign: ZodiacKo
  degreeInSign: number
  ruler: AstroPlanetName
  range: { start: number; end: number }   // degree in sign
}

export function getEgyptianBound(longitude: number): BoundResult {
  const lon = ((longitude % 360) + 360) % 360
  const signIdx = Math.floor(lon / 30)
  const sign = ZODIAC_ORDER[signIdx]
  const degreeInSign = lon % 30
  const bounds = EGYPTIAN_BOUNDS[sign]

  for (const b of bounds) {
    if (degreeInSign >= b.start && degreeInSign < b.end) {
      return {
        longitude: lon,
        sign,
        degreeInSign,
        ruler: b.ruler,
        range: { start: b.start, end: b.end },
      }
    }
  }
  // 30° edge case → 마지막 bound
  const last = bounds[bounds.length - 1]
  return {
    longitude: lon,
    sign,
    degreeInSign,
    ruler: last.ruler,
    range: { start: last.start, end: last.end },
  }
}
