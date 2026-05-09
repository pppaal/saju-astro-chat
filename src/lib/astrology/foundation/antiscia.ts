// astrology/foundation/antiscia.ts
// Antiscia (반사점) — 0° Cancer / 0° Capricorn 축 mirror.
// Contra-antiscia = antiscia + 180° (즉 0° Aries / 0° Libra 축 mirror).

import type { ZodiacKo } from './types'

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export interface AntisciaResult {
  source: { longitude: number; sign: ZodiacKo; degreeInSign: number }
  antiscion: { longitude: number; sign: ZodiacKo; degreeInSign: number }
  contraAntiscion: { longitude: number; sign: ZodiacKo; degreeInSign: number }
}

function pos(longitude: number): { longitude: number; sign: ZodiacKo; degreeInSign: number } {
  const lon = ((longitude % 360) + 360) % 360
  const signIdx = Math.floor(lon / 30)
  return {
    longitude: lon,
    sign: ZODIAC_ORDER[signIdx],
    degreeInSign: lon % 30,
  }
}

/**
 * Antiscia 산출.
 * Mirror axis: 0° Cancer (=90°) / 0° Capricorn (=270°).
 * Formula: antiscion = (180° - λ) mod 360°.
 * 검산: λ=90° (0°Cancer) → 90° (자기 자신).  λ=0° (0°Aries) → 180° (0°Libra).
 */
export function getAntiscia(longitude: number): AntisciaResult {
  const lon = ((longitude % 360) + 360) % 360
  const antisLon = ((180 - lon) % 360 + 360) % 360
  const contraLon = (antisLon + 180) % 360
  return {
    source: pos(lon),
    antiscion: pos(antisLon),
    contraAntiscion: pos(contraLon),
  }
}
