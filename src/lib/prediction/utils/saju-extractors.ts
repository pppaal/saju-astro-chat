/**
 * Saju Data Extraction Helpers
 * Common patterns for extracting pillar data from Saju structures
 */

/**
 * Generic Saju structure interface (matches common patterns in codebase)
 */
interface SajuPillar {
  heavenlyStem?: { name?: string } | string;
  earthlyBranch?: { name?: string } | string;
}

interface SajuPillars {
  year?: SajuPillar;
  month?: SajuPillar;
  day?: SajuPillar;
  time?: SajuPillar;
}

interface SajuStructure {
  pillars?: SajuPillars;
  dayMaster?: { heavenlyStem?: string } | string;
}

/**
 * Extract pillar data with default fallbacks
 */
export function extractPillarData(saju: SajuStructure | undefined): {
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  timeBranch: string;
} {
  const getStemName = (pillar: SajuPillar | undefined): string => {
    if (!pillar) return '甲';
    const stem = pillar.heavenlyStem;
    if (typeof stem === 'string') return stem;
    if (stem && typeof stem === 'object' && 'name' in stem) return stem.name || '甲';
    return '甲';
  };

  const getBranchName = (pillar: SajuPillar | undefined): string => {
    if (!pillar) return '子';
    const branch = pillar.earthlyBranch;
    if (typeof branch === 'string') return branch;
    if (branch && typeof branch === 'object' && 'name' in branch) return branch.name || '子';
    return '子';
  };

  const dayMaster = saju?.dayMaster;
  const dayStem = typeof dayMaster === 'string'
    ? dayMaster
    : (dayMaster && typeof dayMaster === 'object' && 'heavenlyStem' in dayMaster)
      ? dayMaster.heavenlyStem || '甲'
      : '甲';

  return {
    dayStem,
    dayBranch: getBranchName(saju?.pillars?.day),
    monthBranch: getBranchName(saju?.pillars?.month),
    yearBranch: getBranchName(saju?.pillars?.year),
    timeBranch: getBranchName(saju?.pillars?.time),
  };
}

/**
 * Extract all heavenly stems from four pillars
 */
export function extractAllStems(saju: SajuStructure | undefined): string[] {
  const getStemName = (pillar: SajuPillar | undefined): string | null => {
    if (!pillar) return null;
    const stem = pillar.heavenlyStem;
    if (typeof stem === 'string') return stem;
    if (stem && typeof stem === 'object' && 'name' in stem) return stem.name || null;
    return null;
  };

  const dayMaster = saju?.dayMaster;
  const dayStem = typeof dayMaster === 'string'
    ? dayMaster
    : (dayMaster && typeof dayMaster === 'object' && 'heavenlyStem' in dayMaster)
      ? dayMaster.heavenlyStem
      : null;

  return [
    getStemName(saju?.pillars?.year),
    getStemName(saju?.pillars?.month),
    dayStem,
    getStemName(saju?.pillars?.time),
  ].filter((x): x is string => Boolean(x));
}

/**
 * Extract all earthly branches from four pillars
 */
export function extractAllBranches(saju: SajuStructure | undefined): string[] {
  const getBranchName = (pillar: SajuPillar | undefined): string | null => {
    if (!pillar) return null;
    const branch = pillar.earthlyBranch;
    if (typeof branch === 'string') return branch;
    if (branch && typeof branch === 'object' && 'name' in branch) return branch.name || null;
    return null;
  };

  return [
    getBranchName(saju?.pillars?.year),
    getBranchName(saju?.pillars?.month),
    getBranchName(saju?.pillars?.day),
    getBranchName(saju?.pillars?.time),
  ].filter((x): x is string => Boolean(x));
}
