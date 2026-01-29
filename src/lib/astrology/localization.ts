// src/lib/astrology/localization.ts
/**
 * Centralized localization utilities for astrology features
 * Used by both API routes and client components
 */

import type { LocaleKey } from '@/components/astrology/types'
import { SIGNS, PLANET_LABELS, LABELS } from '@/components/astrology/constants'

/**
 * Normalize locale string to supported locale key
 */
export function normalizeLocale(l?: string): LocaleKey {
  const k = (l || 'en').split('-')[0] as LocaleKey
  return k in SIGNS ? k : 'en'
}

/**
 * Get localized labels for a given locale
 */
export function pickLabels(locale?: string) {
  const key = (locale || 'en').split('-')[0] as keyof typeof LABELS
  return LABELS[key] ?? LABELS.en
}

/**
 * Split formatted position into sign and degree parts
 * @example "Aries 15°30'" => { signPart: "Aries", degreePart: "15°30'" }
 */
export function splitSignAndDegree(text: string): { signPart: string; degreePart: string } {
  const s = String(text || '').trim()
  const m = s.match(/^(\S+)\s+(.*)$/)
  if (!m) {
    return { signPart: s, degreePart: '' }
  }
  return { signPart: m[1], degreePart: m[2] }
}

/**
 * Find index of a sign name across all locales
 * Returns -1 if not found
 */
export function findSignIndex(name: string): number {
  // Direct match
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name)
    if (idx >= 0) {
      return idx
    }
  }

  // Fuzzy match (remove non-letter characters and compare lowercase)
  const cleaned = name.replace(/[^\p{L}]/gu, '').toLowerCase()
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(
      (s) => s.replace(/[^\p{L}]/gu, '').toLowerCase() === cleaned
    )
    if (idx >= 0) {
      return idx
    }
  }

  return -1
}

/**
 * Localize a sign label to target locale
 * @example localizeSignLabel("Aries", "ko") => "양자리"
 */
export function localizeSignLabel(inputSign: string, target: LocaleKey): string {
  const idx = findSignIndex(inputSign)
  if (idx >= 0) {
    return SIGNS[target][idx] || SIGNS.en[idx]
  }

  // Try splitting if it's a formatted string like "Aries 15°30'"
  const { signPart } = splitSignAndDegree(inputSign)
  const idx2 = findSignIndex(signPart)
  if (idx2 >= 0) {
    return SIGNS[target][idx2] || SIGNS.en[idx2]
  }

  return inputSign
}

/**
 * Localize a planet label to target locale
 * @example localizePlanetLabel("Sun", "ko") => "태양"
 */
export function localizePlanetLabel(inputName: string, target: LocaleKey): string {
  type PlanetKey = keyof typeof PLANET_LABELS.en
  const enKeys = Object.keys(PLANET_LABELS.en) as PlanetKey[]

  // Direct match in English keys
  if (enKeys.includes(inputName as PlanetKey)) {
    return PLANET_LABELS[target][inputName as PlanetKey] || String(inputName)
  }

  // Reverse lookup: find English key from localized name
  for (const labels of Object.values(PLANET_LABELS)) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        return PLANET_LABELS[target][enKey] || PLANET_LABELS.en[enKey]
      }
    }
  }

  return inputName
}

/**
 * Parse time string with AM/PM support
 * @example parseHM("3:30 PM") => { h: 15, m: 30 }
 * @example parseHM("15:30") => { h: 15, m: 30 }
 * @throws Error if time format is invalid
 */
export function parseHM(input: string): { h: number; m: number } {
  const s = String(input).trim().toUpperCase()
  const ampm = (s.match(/\s?(AM|PM)$/) || [])[1]
  const core = s.replace(/\s?(AM|PM)$/, '')
  const [hhRaw, mmRaw = '0'] = core.split(':')
  let h = Number(hhRaw)
  const m = Number(mmRaw)

  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error('Enter a valid time (HH:mm or HH:mm AM/PM).')
  }

  // Handle AM/PM conversion
  if (ampm === 'PM' && h < 12) {
    h += 12
  }
  if (ampm === 'AM' && h === 12) {
    h = 0
  }

  // Validate range
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error('Time must be within 00:00-23:59.')
  }

  return { h, m }
}

/**
 * Get original English planet name from localized name
 * @example getOriginalPlanetName("태양") => "Sun"
 */
export function getOriginalPlanetName(localizedName: string): string {
  for (const [_locale, labels] of Object.entries(PLANET_LABELS)) {
    for (const [key, value] of Object.entries(labels)) {
      if (value === localizedName) {
        return key
      }
    }
  }
  return localizedName
}

/**
 * Re-export types for convenience
 */
export type { LocaleKey }
