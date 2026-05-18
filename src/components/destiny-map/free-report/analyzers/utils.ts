// Shared utilities for all analyzers
// This file eliminates duplicate code patterns across analyzer files

import type { SajuData, AstroData, PlanetData } from '../types';
import { tianGanMap } from '../data/constants';

// Re-export from utils/ directory for backwards compatibility
export * from './utils/index';

/**
 * Select language from a bilingual object
 */
export function selectLang<T>(isKo: boolean, obj: { ko: T; en: T }): T {
  return isKo ? obj.ko : obj.en;
}

/**
 * Extract day master name from saju data, converting Chinese to Korean if needed
 */
export function extractDayMaster(saju: SajuData | undefined): string | null {
  if (!saju?.dayMaster) {return null;}

  const rawDayMaster = typeof saju.dayMaster === 'string'
    ? saju.dayMaster
    : (saju.dayMaster.name || saju.dayMaster.heavenlyStem);

  if (!rawDayMaster) {return null;}

  // Convert Chinese character to Korean if needed
  return tianGanMap[rawDayMaster] || rawDayMaster;
}

/**
 * Extract and sort five elements from saju data
 * Returns array of [element, value] tuples sorted by value (descending by default)
 */
export function extractFiveElementsSorted(
  saju: SajuData | undefined,
  ascending: boolean = false
): [string, number][] {
  const fiveElements = saju?.fiveElements || {};
  const entries = Object.entries(fiveElements) as [string, number][];

  if (ascending) {
    return entries.sort(([, a], [, b]) => a - b);
  }
  return entries.sort(([, a], [, b]) => b - a);
}

/**
 * Extract planet data by name from astro data
 */
export function extractPlanetSign(
  astro: AstroData | undefined,
  planetName: string
): string | null {
  if (!astro?.planets) {return null;}

  if (Array.isArray(astro.planets)) {
    const planet = astro.planets.find(
      (p: PlanetData) => p.name?.toLowerCase() === planetName.toLowerCase()
    );
    return planet?.sign?.toLowerCase() || null;
  }

  // Handle case where planets is a Record
  const planet = (astro.planets as Record<string, { sign?: string }>)[planetName.toLowerCase()];
  return planet?.sign?.toLowerCase() || null;
}

/**
 * Remove duplicates from an array while maintaining order
 */
export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Base analysis context - common data extraction for all analyzers
 */
export interface AnalysisContext {
  isKo: boolean;
  dayMasterName: string | null;
  fiveElements: [string, number][];
  strongestElement: string | null;
  weakestElement: string | null;
  sunSign: string | null;
  moonSign: string | null;
}

