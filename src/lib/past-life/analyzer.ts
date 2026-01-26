/**
 * Past Life Analyzer
 * 전생 분석기 - Main orchestration for past-life reading generation
 */

import type { PastLifeResult } from './types';
import { getGeokgukType } from './utils/helpers';
import { extractDayMasterChar, findPlanetByAliases } from './utils/extractors';
import {
  buildSoulPattern,
  buildPastLife,
  buildSoulJourney,
  buildSaturnLesson,
  buildThisLifeMission,
  extractTalentsCarried,
} from './utils/builders';
import { analyzeKarmicDebts, calculateKarmaScore } from './utils/analyzers';
import { PLANET_ALIASES } from './data/constants';

// Type definitions for external data structures
interface SajuData {
  advancedAnalysis?: {
    geokguk?: {
      name?: string;
      type?: string;
    };
    sinsal?: {
      unluckyList?: Array<{ name?: string; shinsal?: string } | string>;
    };
  };
  dayMaster?: {
    name?: string;
    heavenlyStem?: string;
  };
  pillars?: {
    day?: {
      heavenlyStem?: string | { name?: string };
    };
  };
  fourPillars?: {
    day?: {
      heavenlyStem?: string;
    };
  };
}

interface Planet {
  name?: string;
  house?: number;
}

interface AstroData {
  planets?: Planet[];
}

/**
 * Analyze past life information from Saju and Astrology data
 *
 * @param saju - Saju (Four Pillars) data
 * @param astro - Astrology data (Western)
 * @param isKo - Whether to return results in Korean
 * @returns Complete past life reading result
 */
export function analyzePastLife(
  saju: SajuData | null,
  astro: AstroData | null,
  isKo: boolean
): PastLifeResult {
  // Extract basic data from Saju and Astro
  const geokguk = saju?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name || geokguk?.type;
  const geokgukType = getGeokgukType(geokName);
  const dayMasterChar = extractDayMasterChar(saju);
  const northNodeHouse = findPlanetByAliases(astro, PLANET_ALIASES.northNode);
  const saturnHouse = findPlanetByAliases(astro, PLANET_ALIASES.saturn);

  // Build each section using helper functions
  const soulPattern = buildSoulPattern(geokgukType, isKo);
  const pastLife = buildPastLife(geokgukType, isKo);
  const soulJourney = buildSoulJourney(northNodeHouse, isKo);
  const karmicDebts = analyzeKarmicDebts(saju, isKo);
  const saturnLesson = buildSaturnLesson(saturnHouse, isKo);
  const talentsCarried = extractTalentsCarried(geokgukType, isKo);
  const thisLifeMission = buildThisLifeMission(dayMasterChar, isKo);
  const karmaScore = calculateKarmaScore(
    geokgukType,
    northNodeHouse,
    saturnHouse,
    dayMasterChar,
    karmicDebts.length
  );

  return {
    soulPattern,
    pastLife,
    soulJourney,
    karmicDebts,
    saturnLesson,
    talentsCarried,
    thisLifeMission,
    karmaScore,
    geokguk: geokName,
    northNodeHouse: northNodeHouse ?? undefined,
    saturnHouse: saturnHouse ?? undefined,
    dayMaster: dayMasterChar ?? undefined,
  };
}
