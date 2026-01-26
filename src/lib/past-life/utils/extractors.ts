/**
 * Data extraction functions for past-life analysis
 * Functions to extract relevant data from Saju and Astro data structures
 */

import type { HeavenlyStem, HouseNumber } from '../data/types';
import { isValidHeavenlyStem } from './helpers';

interface Planet {
  name?: string;
  house?: number;
}

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

interface AstroData {
  planets?: Planet[];
}

/**
 * Find a planet's house by its name
 */
export function findPlanetHouse(
  astro: AstroData | null,
  planetName: string
): HouseNumber | null {
  if (!astro?.planets) {
    return null;
  }

  const planet = astro.planets.find((p: Planet) =>
    p.name?.toLowerCase().includes(planetName.toLowerCase())
  );

  if (planet?.house && planet.house >= 1 && planet.house <= 12) {
    return planet.house as HouseNumber;
  }

  return null;
}

/**
 * Find a planet's house by checking multiple name aliases
 */
export function findPlanetByAliases(
  astro: AstroData | null,
  aliases: readonly string[]
): HouseNumber | null {
  for (const alias of aliases) {
    const house = findPlanetHouse(astro, alias);
    if (house) {
      return house;
    }
  }
  return null;
}

/**
 * Extract the day master character (천간) from Saju data
 */
export function extractDayMasterChar(saju: SajuData | null): HeavenlyStem | null {
  if (!saju) {
    return null;
  }

  // Try multiple sources for the day master character
  const sources = [
    saju.dayMaster?.name,
    saju.dayMaster?.heavenlyStem,
    typeof saju.pillars?.day?.heavenlyStem === 'string'
      ? saju.pillars.day.heavenlyStem
      : (saju.pillars?.day?.heavenlyStem as { name?: string })?.name,
    saju.fourPillars?.day?.heavenlyStem,
  ];

  const dayMasterStr = sources.find(s => s && s.trim().length > 0);
  if (!dayMasterStr) {
    return null;
  }

  const firstChar = dayMasterStr.charAt(0);
  return isValidHeavenlyStem(firstChar) ? firstChar : null;
}
