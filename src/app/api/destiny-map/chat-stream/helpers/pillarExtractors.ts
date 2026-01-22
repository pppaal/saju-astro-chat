/**
 * Pillar Data Extractors
 *
 * Common utility functions for extracting pillar data from Saju structure.
 * These functions eliminate code duplication across the route handler.
 */

import type { SajuDataStructure, DaeunCycleItem } from "../lib/types";

/**
 * Extracted pillar data with stems and branches
 */
export interface PillarData {
  yearStem: string;
  monthStem: string;
  dayStem: string;
  timeStem: string;
  yearBranch: string;
  monthBranch: string;
  dayBranch: string;
  timeBranch: string;
}

/**
 * Extract pillar data (stems and branches) from Saju structure
 *
 * @param saju - Saju data structure
 * @returns Pillar data with all stems and branches
 */
export function extractPillarData(saju: SajuDataStructure | undefined): PillarData {
  const yearStem = saju?.pillars?.year?.heavenlyStem?.name || '甲';
  const monthStem = saju?.pillars?.month?.heavenlyStem?.name || '甲';
  const dayStem = saju?.dayMaster?.heavenlyStem || '甲';
  const timeStem = saju?.pillars?.time?.heavenlyStem?.name || '甲';

  const yearBranch = saju?.pillars?.year?.earthlyBranch?.name || '子';
  const monthBranch = saju?.pillars?.month?.earthlyBranch?.name || '子';
  const dayBranch = saju?.dayMaster?.name || '子';
  const timeBranch = saju?.pillars?.time?.earthlyBranch?.name || '子';

  return {
    yearStem,
    monthStem,
    dayStem,
    timeStem,
    yearBranch,
    monthBranch,
    dayBranch,
    timeBranch,
  };
}

/**
 * Extract all stems and branches as arrays
 *
 * @param saju - Saju data structure
 * @returns Object with allStems and allBranches arrays
 */
export function extractAllStemsAndBranches(saju: SajuDataStructure | undefined): {
  allStems: string[];
  allBranches: string[];
} {
  const pillars = extractPillarData(saju);

  return {
    allStems: [pillars.yearStem, pillars.monthStem, pillars.dayStem, pillars.timeStem],
    allBranches: [pillars.yearBranch, pillars.monthBranch, pillars.dayBranch, pillars.timeBranch],
  };
}

/**
 * Extract current Daeun based on age
 *
 * @param saju - Saju data structure
 * @param currentAge - Current age of the person
 * @returns Current Daeun info or undefined if not found
 */
export function extractCurrentDaeun(
  saju: SajuDataStructure | undefined,
  currentAge: number
): DaeunCycleItem | undefined {
  const daeunList = saju?.unse?.daeun as DaeunCycleItem[] | undefined;

  if (!daeunList || !Array.isArray(daeunList)) {
    return undefined;
  }

  return daeunList.find((d) => {
    const startAge = d.startAge || 0;
    // Assume each daeun lasts 10 years
    const endAge = startAge + 10;
    return currentAge >= startAge && currentAge < endAge;
  });
}

/**
 * Extract stems and branches as filtered arrays (removing undefined values)
 * Used for analysis functions that need clean arrays
 *
 * @param saju - Saju data structure
 * @returns Object with filtered stem and branch arrays
 */
export function extractFilteredStemsAndBranches(saju: SajuDataStructure | undefined): {
  stems: string[];
  branches: string[];
} {
  const allStemsArr = [
    saju?.pillars?.year?.heavenlyStem?.name,
    saju?.pillars?.month?.heavenlyStem?.name,
    saju?.dayMaster?.heavenlyStem,
    saju?.pillars?.time?.heavenlyStem?.name,
  ].filter((x): x is string => Boolean(x));

  const yearBranchVal = saju?.pillars?.year?.earthlyBranch?.name || '子';
  const monthBranchVal = saju?.pillars?.month?.earthlyBranch?.name || '子';
  const dayBranch = saju?.dayMaster?.name || '子';
  const timeBranchVal = saju?.pillars?.time?.earthlyBranch?.name;

  const allBranchesArr = [yearBranchVal, monthBranchVal, dayBranch, timeBranchVal]
    .filter((x): x is string => Boolean(x));

  return {
    stems: allStemsArr,
    branches: allBranchesArr,
  };
}
