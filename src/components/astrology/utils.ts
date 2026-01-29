// src/components/astrology/utils.ts
// Utility functions for ResultDisplay component

import type { LocaleKey } from './types'
import { ASPECT_LABELS, PLANET_IMAGES } from './constants'

// Re-export localization utilities from centralized module
export {
  normalizeLocale,
  splitSignAndDegree,
  localizeSignLabel,
  localizePlanetLabel,
  pickLabels,
  parseHM,
  getOriginalPlanetName,
} from '@/lib/astrology/localization'

/**
 * Localize an aspect type to target locale
 */
export function localizeAspectType(type: string, loc: LocaleKey): string {
  const key = String(type || '').toLowerCase() as keyof typeof ASPECT_LABELS.en
  return ASPECT_LABELS[loc]?.[key] || type
}

/**
 * Get planet image path from planet name
 */
export function getPlanetImage(planetName: string): string | null {
  // Direct match
  if (PLANET_IMAGES[planetName]) {
    return PLANET_IMAGES[planetName]
  }

  // Map localized names to English
  const nameMap: Record<string, string> = {
    태양: 'Sun',
    달: 'Moon',
    수성: 'Mercury',
    금성: 'Venus',
    화성: 'Mars',
    목성: 'Jupiter',
    토성: 'Saturn',
    천왕성: 'Uranus',
    해왕성: 'Neptune',
    명왕성: 'Pluto',
    진월교점: 'True Node',
    키론: 'Chiron',
    행운점: 'Fortune',
    // Chinese
    太阳: 'Sun',
    月亮: 'Moon',
    水星: 'Mercury',
    金星: 'Venus',
    火星: 'Mars',
    木星: 'Jupiter',
    土星: 'Saturn',
    天王星: 'Uranus',
    海王星: 'Neptune',
    冥王星: 'Pluto',
  }

  const englishName = nameMap[planetName]
  if (englishName && PLANET_IMAGES[englishName]) {
    return PLANET_IMAGES[englishName]
  }

  return null
}

/**
 * Get CSS color classes for aspect types
 */
export function getAspectColor(type: string): string {
  const t = type.toLowerCase()
  if (t === 'conjunction') {
    return 'text-amber-300 bg-amber-500/10 border-amber-500/30'
  }
  if (t === 'trine') {
    return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
  }
  if (t === 'sextile') {
    return 'text-blue-300 bg-blue-500/10 border-blue-500/30'
  }
  if (t === 'square') {
    return 'text-red-300 bg-red-500/10 border-red-500/30'
  }
  if (t === 'opposition') {
    return 'text-orange-300 bg-orange-500/10 border-orange-500/30'
  }
  return 'text-purple-300 bg-purple-500/10 border-purple-500/30'
}

/**
 * Log content access for analytics
 */
export async function logContentAccess(params: {
  service: string
  contentType: string
  locale: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await fetch('/api/content-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    // Silently ignore logging failures
  }
}
