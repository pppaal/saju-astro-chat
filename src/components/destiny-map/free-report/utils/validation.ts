/**
 * Zodiac sign + house number validators used by free-report/utils/houses.ts.
 *
 * This file used to carry a much larger validation toolkit (five-element
 * normalization, heavenly-stem aliases, saju/astro feature detection,
 * combined analysis-input validator). All of that grew up around an
 * analyzer pipeline that has since been replaced — none of those exports
 * had live consumers. Trimmed down to just the two validators houses.ts
 * actually imports.
 */

import type { ZodiacSign, HouseNumber } from '../types/core'

// ========== Zodiac Sign Validation ==========

const VALID_ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]

export function normalizeZodiacSign(sign: unknown): ZodiacSign | null {
  if (typeof sign !== 'string' || !sign.trim()) {
    return null
  }
  const normalized = sign.toLowerCase().trim()
  if (VALID_ZODIAC_SIGNS.includes(normalized as ZodiacSign)) {
    return normalized as ZodiacSign
  }
  return null
}

// ========== House Number Validation ==========

export function validateHouseNumber(house: unknown): HouseNumber | null {
  if (typeof house !== 'number') return null
  if (!Number.isInteger(house)) return null
  if (house < 1 || house > 12) return null
  return house as HouseNumber
}
