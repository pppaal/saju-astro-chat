/**
 * Ganji Calculation Helpers
 * Wrapper functions for common ganji calculation patterns
 */

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
} from '../advancedTimingEngine';

type Ganji = { stem: string; branch: string };

/**
 * Calculate both year and month ganji in one call
 * @param year - Year number
 * @param month - Month number (1-12)
 * @returns Object with yearGanji and monthGanji
 */
export function calculateYearMonthGanji(year: number, month: number): {
  yearGanji: Ganji;
  monthGanji: Ganji;
} {
  return {
    yearGanji: calculateYearlyGanji(year),
    monthGanji: calculateMonthlyGanji(year, month),
  };
}

/**
 * Daeun info structure used for finding daeun by age
 */
export interface DaeunCycle {
  age: number;
  startAge?: number;
  endAge?: number;
  heavenlyStem?: string;
  earthlyBranch?: string;
  element?: string;
  sibsin?: string;
  [key: string]: string | number | undefined;
}

/**
 * Find the daeun (10-year cycle) for a given age
 * @param daeunList - List of daeun cycles
 * @param age - Current age
 * @returns Matching daeun or undefined
 */
export function findDaeunForAge(
  daeunList: DaeunCycle[] | undefined,
  age: number
): DaeunCycle | undefined {
  if (!daeunList || daeunList.length === 0) {return undefined;}

  return daeunList.find(d => {
    // Check if age is within daeun range
    if (d.startAge !== undefined && d.endAge !== undefined) {
      return age >= d.startAge && age <= d.endAge;
    }
    // Fallback: assume 10-year cycles starting from daeun.age
    const start = d.age;
    const end = d.age + 9;
    return age >= start && age <= end;
  });
}

/**
 * Get daeun stem and branch if available
 * @param daeun - Daeun cycle object
 * @returns Object with stem and branch, or undefined
 */
export function getDaeunGanji(
  daeun: DaeunCycle | undefined
): { stem: string; branch: string } | undefined {
  if (!daeun) {return undefined;}
  if (!daeun.heavenlyStem || !daeun.earthlyBranch) {return undefined;}

  return {
    stem: daeun.heavenlyStem,
    branch: daeun.earthlyBranch,
  };
}
