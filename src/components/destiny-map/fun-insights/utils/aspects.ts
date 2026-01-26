/**
 * Aspect finding and analysis utilities
 */

import type { StandardPlanetName, AspectType } from '../types/core';
import type { AstroData, AspectData } from '../types';
import { extractAspectPlanetName, normalizeAspectType } from './planets';

// ========== Aspect Info Types ==========

export interface AspectInfo {
  planet1: StandardPlanetName;
  planet2: StandardPlanetName;
  type: AspectType;
  orb?: number;
}

export interface DetailedAspectInfo extends AspectInfo {
  isHarmonious: boolean;
  isChallenging: boolean;
  strength: 'exact' | 'close' | 'wide';
}

// ========== Aspect Classification ==========

const HARMONIOUS_ASPECTS: AspectType[] = ['trine', 'sextile'];
const CHALLENGING_ASPECTS: AspectType[] = ['square', 'opposition'];
const CONJUNCTION_NEUTRAL: AspectType[] = ['conjunction'];

/**
 * Checks if an aspect type is harmonious (trine, sextile)
 */
export function isHarmoniousAspect(type: AspectType): boolean {
  return HARMONIOUS_ASPECTS.includes(type);
}

/**
 * Checks if an aspect type is challenging (square, opposition)
 */
export function isChallengingAspect(type: AspectType): boolean {
  return CHALLENGING_ASPECTS.includes(type);
}

/**
 * Get aspect strength based on orb
 */
export function getAspectStrength(orb: number | undefined): 'exact' | 'close' | 'wide' {
  if (orb === undefined) {return 'close';}
  if (orb <= 1) {return 'exact';}
  if (orb <= 3) {return 'close';}
  return 'wide';
}

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
  if (!astro?.aspects || !Array.isArray(astro.aspects)) {return null;}

  for (const aspect of astro.aspects) {
    const from = extractAspectPlanetName(aspect.from);
    const to = extractAspectPlanetName(aspect.to);
    const type = normalizeAspectType(aspect.type);

    if (!from || !to || !type) {continue;}

    // Check both directions
    if ((from === planet1 && to === planet2) || (from === planet2 && to === planet1)) {
      return {
        planet1: from,
        planet2: to,
        type,
        orb: aspect.orb
      };
    }
  }

  return null;
}

/**
 * Find aspect with detailed info
 */
export function findAspectDetailed(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName
): DetailedAspectInfo | null {
  const basic = findAspect(astro, planet1, planet2);
  if (!basic) {return null;}

  return {
    ...basic,
    isHarmonious: isHarmoniousAspect(basic.type),
    isChallenging: isChallengingAspect(basic.type),
    strength: getAspectStrength(basic.orb)
  };
}

/**
 * Find all aspects involving a specific planet
 */
export function findPlanetAspects(
  astro: AstroData | undefined,
  planet: StandardPlanetName
): AspectInfo[] {
  if (!astro?.aspects || !Array.isArray(astro.aspects)) {return [];}

  const results: AspectInfo[] = [];

  for (const aspect of astro.aspects) {
    const from = extractAspectPlanetName(aspect.from);
    const to = extractAspectPlanetName(aspect.to);
    const type = normalizeAspectType(aspect.type);

    if (!from || !to || !type) {continue;}

    if (from === planet || to === planet) {
      results.push({
        planet1: from,
        planet2: to,
        type,
        orb: aspect.orb
      });
    }
  }

  return results;
}

/**
 * Find all harmonious aspects involving a planet
 */
export function findHarmoniousAspects(
  astro: AstroData | undefined,
  planet: StandardPlanetName
): AspectInfo[] {
  return findPlanetAspects(astro, planet)
    .filter(a => isHarmoniousAspect(a.type));
}

/**
 * Find all challenging aspects involving a planet
 */
export function findChallengingAspects(
  astro: AstroData | undefined,
  planet: StandardPlanetName
): AspectInfo[] {
  return findPlanetAspects(astro, planet)
    .filter(a => isChallengingAspect(a.type));
}

/**
 * Check if a specific aspect exists between two planets
 */
export function hasAspect(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName,
  aspectTypes?: AspectType[]
): boolean {
  const aspect = findAspect(astro, planet1, planet2);
  if (!aspect) {return false;}

  if (aspectTypes && aspectTypes.length > 0) {
    return aspectTypes.includes(aspect.type);
  }

  return true;
}

/**
 * Check if harmonious aspect exists between two planets
 */
export function hasHarmoniousAspect(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName
): boolean {
  return hasAspect(astro, planet1, planet2, HARMONIOUS_ASPECTS);
}

/**
 * Check if challenging aspect exists between two planets
 */
export function hasChallengingAspect(
  astro: AstroData | undefined,
  planet1: StandardPlanetName,
  planet2: StandardPlanetName
): boolean {
  return hasAspect(astro, planet1, planet2, CHALLENGING_ASPECTS);
}

// ========== Aspect Summary ==========

/**
 * Get aspect type description
 */
export function getAspectTypeDescription(type: AspectType, isKo: boolean): string {
  const descriptions: Record<AspectType, { ko: string; en: string }> = {
    conjunction: { ko: '합(0°)', en: 'Conjunction (0°)' },
    opposition: { ko: '충(180°)', en: 'Opposition (180°)' },
    square: { ko: '스퀘어(90°)', en: 'Square (90°)' },
    trine: { ko: '트라인(120°)', en: 'Trine (120°)' },
    sextile: { ko: '섹스타일(60°)', en: 'Sextile (60°)' },
    quincunx: { ko: '퀸컨스(150°)', en: 'Quincunx (150°)' },
    semisextile: { ko: '세미섹스타일(30°)', en: 'Semisextile (30°)' },
    semisquare: { ko: '세미스퀘어(45°)', en: 'Semisquare (45°)' },
    sesquiquadrate: { ko: '세스퀴쿼드레이트(135°)', en: 'Sesquiquadrate (135°)' },
  };

  return isKo ? descriptions[type].ko : descriptions[type].en;
}

/**
 * Count aspects by type for a planet
 */
export function countAspectsByType(
  astro: AstroData | undefined,
  planet: StandardPlanetName
): Record<AspectType, number> {
  const aspects = findPlanetAspects(astro, planet);
  const counts: Record<AspectType, number> = {
    conjunction: 0,
    opposition: 0,
    square: 0,
    trine: 0,
    sextile: 0,
    quincunx: 0,
    semisextile: 0,
    semisquare: 0,
    sesquiquadrate: 0,
  };

  for (const aspect of aspects) {
    counts[aspect.type]++;
  }

  return counts;
}
