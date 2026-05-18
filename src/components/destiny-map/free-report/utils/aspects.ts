/**
 * Aspect finding and analysis utilities
 */

import type { StandardPlanetName, AspectType } from '../types/core'
import type { AstroData } from '../types'
import { extractAspectPlanetName, normalizeAspectType } from './planets'

// ========== Aspect Info Types ==========

export interface AspectInfo {
  planet1: StandardPlanetName
  planet2: StandardPlanetName
  type: AspectType
  orb?: number
}

export interface DetailedAspectInfo extends AspectInfo {
  isHarmonious: boolean
  isChallenging: boolean
  strength: 'exact' | 'close' | 'wide'
}

// ========== Aspect Classification ==========

const HARMONIOUS_ASPECTS: AspectType[] = ['trine', 'sextile']

// ========== Aspect Finding ==========

/**
 * Find aspect between two specific planets
 *
 * @param astro - Astro data containing aspects
 * @param planet1 - First planet name (standardized)
 * @param planet2 - Second planet name (standardized)
 * @returns Aspect info if found, null otherwise
 */
export function findAspect(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName
): AspectInfo | null {
  if (!astro?.aspects || !Array.isArray(astro.aspects)) {
    return null
  }

  for (const aspect of astro.aspects) {
    const from = extractAspectPlanetName(aspect.from)
    const to = extractAspectPlanetName(aspect.to)
    const type = normalizeAspectType(aspect.type)

    if (!from || !to || !type) {
      continue
    }

    // Check both directions
    if ((from === planet1 && to === planet2) || (from === planet2 && to === planet1)) {
      return {
        planet1: from,
        planet2: to,
        type,
        orb: aspect.orb,
      }
    }
  }

  return null
}

/**
 * Check if a specific aspect exists between two planets
 */
function hasAspect(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName,
  aspectTypes?: AspectType[]
): boolean {
  const aspect = findAspect(astro, planet1, planet2)
  if (!aspect) {
    return false
  }

  if (aspectTypes && aspectTypes.length > 0) {
    return aspectTypes.includes(aspect.type)
  }

  return true
}

/**
 * Check if harmonious aspect exists between two planets
 */
export function hasHarmoniousAspect(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName
): boolean {
  return hasAspect(astro, planet1, planet2, HARMONIOUS_ASPECTS)
}

