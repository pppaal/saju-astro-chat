/**
 * Input validation utilities for saju and astro data
 * Provides type guards and validators to ensure data safety
 */

import type { ZodiacSign, HouseNumber, FiveElement } from '../types/core'
import type { SajuData, AstroData } from '../types'

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

/**
 * Validates and normalizes a zodiac sign to standard lowercase format
 *
 * @param sign - Input sign string
 * @returns Normalized zodiac sign or null if invalid
 */
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

/**
 * Validates house number is within valid range (1-12)
 *
 * @param house - Input house number
 * @returns Validated house number or null if invalid
 */
export function validateHouseNumber(house: unknown): HouseNumber | null {
  if (typeof house !== 'number') {
    return null
  }
  if (!Number.isInteger(house)) {
    return null
  }
  if (house < 1 || house > 12) {
    return null
  }

  return house as HouseNumber
}

// ========== Five Element Validation ==========

const ELEMENT_ALIASES: Record<string, FiveElement> = {
  // English
  wood: 'wood',
  fire: 'fire',
  earth: 'earth',
  metal: 'metal',
  water: 'water',
  // Korean
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
  // Alternative
  tree: 'wood',
  soil: 'earth',
  ground: 'earth',
}

/**
 * Validates and normalizes five element
 */
export function normalizeFiveElement(element: unknown): FiveElement | null {
  if (typeof element !== 'string' || !element.trim()) {
    return null
  }

  const normalized = element.toLowerCase().trim()
  return ELEMENT_ALIASES[normalized] || null
}

// ========== Saju Data Validation ==========

/**
 * Checks if saju has valid five elements data
 */
export function hasFiveElements(saju: SajuData | undefined): boolean {
  if (!saju) {
    return false
  }

  const elements = saju.fiveElements || saju.elements
  if (!elements || typeof elements !== 'object') {
    return false
  }

  const entries = Object.entries(elements)
  return entries.length > 0 && entries.some(([, v]) => typeof v === 'number' && v > 0)
}

// ========== Astro Data Validation ==========

/**
 * Checks if astro has extra points (Chiron, Lilith, etc.)
 */
export function hasExtraPoints(astro: AstroData | undefined): boolean {
  if (!astro) {
    return false
  }

  return !!(
    astro.extraPoints?.chiron ||
    astro.extraPoints?.lilith ||
    astro.extraPoints?.vertex ||
    astro.extraPoints?.partOfFortune
  )
}
