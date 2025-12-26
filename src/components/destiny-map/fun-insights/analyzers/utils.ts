// Shared utilities for all analyzers
// This file eliminates duplicate code patterns across analyzer files

import type { SajuData, AstroData, PlanetData } from '../types';
import { tianGanMap, elementKeyMap } from '../data/constants';

/**
 * Language helper - returns localized text based on language setting
 */
export function t<T extends string>(isKo: boolean, ko: T, en: T): T {
  return isKo ? ko : en;
}

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
  if (!saju?.dayMaster) return null;

  const rawDayMaster = typeof saju.dayMaster === 'string'
    ? saju.dayMaster
    : (saju.dayMaster.name || saju.dayMaster.heavenlyStem);

  if (!rawDayMaster) return null;

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
 * Get strongest element from saju data
 */
export function getStrongestElement(saju: SajuData | undefined): string | null {
  const sorted = extractFiveElementsSorted(saju);
  return sorted[0]?.[0] || null;
}

/**
 * Get weakest element from saju data
 */
export function getWeakestElement(saju: SajuData | undefined): string | null {
  const sorted = extractFiveElementsSorted(saju);
  return sorted[sorted.length - 1]?.[0] || null;
}

/**
 * Extract planet data by name from astro data
 */
export function extractPlanetSign(
  astro: AstroData | undefined,
  planetName: string
): string | null {
  if (!astro?.planets) return null;

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
 * Extract multiple planet signs at once
 */
export function extractPlanetSigns(
  astro: AstroData | undefined,
  planetNames: string[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const name of planetNames) {
    result[name.toLowerCase()] = extractPlanetSign(astro, name);
  }
  return result;
}

/**
 * Convert Korean element name to English key
 */
export function toElementKey(koreanElement: string): string {
  return elementKeyMap[koreanElement] || koreanElement.toLowerCase();
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

/**
 * Create common analysis context from saju and astro data
 */
export function createAnalysisContext(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): AnalysisContext {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);
  const fiveElements = extractFiveElementsSorted(saju);

  return {
    isKo,
    dayMasterName,
    fiveElements,
    strongestElement: fiveElements[0]?.[0] || null,
    weakestElement: fiveElements[fiveElements.length - 1]?.[0] || null,
    sunSign: extractPlanetSign(astro, 'sun'),
    moonSign: extractPlanetSign(astro, 'moon'),
  };
}
