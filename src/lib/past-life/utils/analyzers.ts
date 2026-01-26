/**
 * Analysis functions for past-life analysis
 * Complex analysis logic for karmic debts and scoring
 */

import type { GeokgukType, HeavenlyStem, HouseNumber, PastLifeResult } from '../data/types';
import { KARMIC_DEBT_CONFIG, KARMIC_PATTERN_MATCHERS, KARMA_SCORE_CONFIG } from '../data/constants';

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

/**
 * Analyze karmic debts from Saju unlucky list
 */
export function analyzeKarmicDebts(
  saju: SajuData | null,
  isKo: boolean
): PastLifeResult['karmicDebts'] {
  const karmicDebts: PastLifeResult['karmicDebts'] = [];
  const unluckyList = saju?.advancedAnalysis?.sinsal?.unluckyList || [];

  for (const item of unluckyList.slice(0, KARMIC_DEBT_CONFIG.MAX_ITEMS)) {
    const name = typeof item === 'string' ? item : item?.name || item?.shinsal || '';
    if (!name) {
      continue;
    }

    // Check each pattern
    for (const [patternKey, patternData] of Object.entries(KARMIC_DEBT_CONFIG.PATTERNS)) {
      const searchTerms = KARMIC_PATTERN_MATCHERS[patternKey];
      if (searchTerms?.some(term => name.includes(term))) {
        const data = isKo ? patternData.ko : patternData.en;
        karmicDebts.push(data);
        break;
      }
    }
  }

  return karmicDebts;
}

/**
 * Calculate the overall karma score
 */
export function calculateKarmaScore(
  geokgukType: GeokgukType | null,
  northNodeHouse: HouseNumber | null,
  saturnHouse: HouseNumber | null,
  dayMasterChar: HeavenlyStem | null,
  karmicDebtsCount: number
): number {
  let score = KARMA_SCORE_CONFIG.BASE_SCORE;

  if (geokgukType) {
    score += KARMA_SCORE_CONFIG.BONUS.GEOKGUK;
  }
  if (northNodeHouse) {
    score += KARMA_SCORE_CONFIG.BONUS.NORTH_NODE;
  }
  if (saturnHouse) {
    score += KARMA_SCORE_CONFIG.BONUS.SATURN;
  }
  if (dayMasterChar) {
    score += KARMA_SCORE_CONFIG.BONUS.DAY_MASTER;
  }
  if (karmicDebtsCount > 0) {
    score += karmicDebtsCount * KARMA_SCORE_CONFIG.BONUS.PER_KARMIC_DEBT;
  }

  return Math.min(
    KARMA_SCORE_CONFIG.MAX_SCORE,
    Math.max(KARMA_SCORE_CONFIG.MIN_SCORE, score)
  );
}
