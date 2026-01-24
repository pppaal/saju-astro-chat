/**
 * Life Prediction Constants
 * Centralized constants for life prediction scoring and analysis
 */

import { BRANCH_CLASHES, BRANCH_PUNISHMENTS } from './life-prediction/constants';
import { MOON_PHASE_NAMES } from './life-prediction-astro';
import {
  CHEONEL_MAP,
  YEOKMA_MAP,
  MUNCHANG_MAP,
  GEOPSAL_MAP,
  STAGE_EVENT_EFFECTS,
} from './life-prediction-helpers';

// Re-export from life-prediction/constants
export {
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  ASTRO_EVENT_CONDITIONS,
  TRANSIT_EVENT_CONDITIONS,
  EVENT_HOUSES,
  // MOON_PHASE_NAMES, // Not exported from life-prediction/constants
  // EVENT_NAMES - defined locally below
  // IMPORTANCE_WEIGHT - defined locally below
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  // CLASHES, // Alias not exported
  // PUNISHMENTS, // Alias not exported
  // CHEONEL_MAP, // Not exported
  // YEOKMA_MAP, // Not exported
  // MUNCHANG_MAP, // Not exported
  // GEOPSAL_MAP, // Not exported
  // STAGE_EVENT_EFFECTS // Not exported
} from './life-prediction/constants';

export {
  MOON_PHASE_NAMES,
  CHEONEL_MAP,
  YEOKMA_MAP,
  MUNCHANG_MAP,
  GEOPSAL_MAP,
  STAGE_EVENT_EFFECTS,
};

export const CLASHES = BRANCH_CLASHES;
export const PUNISHMENTS = BRANCH_PUNISHMENTS;

/**
 * Sibsin (Ten Gods) score mapping (0-100 scale)
 * Used for calculating fortune scores across different prediction types
 */
export const SIBSIN_SCORES: Record<string, number> = {
  '정관': 80,  // Proper Official - highest positive
  '정재': 75,  // Proper Wealth
  '정인': 70,  // Proper Seal
  '식신': 65,  // Eating God
  '편재': 60,  // Partial Wealth
  '편관': 55,  // Partial Official
  '상관': 50,  // Hurting Officer - neutral
  '편인': 48,  // Partial Seal
  '비견': 47,  // Shoulder
  '겁재': 45,  // Robbery - lowest
};

/**
 * Score thresholds and ranges
 */
export const SCORE_THRESHOLDS = {
  MIN: 0,
  MAX: 100,
  BASELINE_MONTHLY: 50,
  BASELINE_WEEKLY: 30,
  RANGE_LOW: 30,
  RANGE_HIGH: 70,
  VARIANCE_VOLATILE: 400,
  EXCELLENT: 80,
  GOOD: 65,
  AVERAGE: 50,
  CAUTION: 35,
} as const;

/**
 * Event type Korean names
 */
export const EVENT_TYPE_NAMES_KO: Record<string, string> = {
  marriage: '결혼',
  career: '커리어',
  investment: '투자',
  move: '이사',
  study: '학업',
  health: '건강',
  relationship: '인간관계',
  business: '사업',
  travel: '여행',
  surgery: '수술',
};

/**
 * Event names (simplified version for tests)
 */
export const EVENT_NAMES: Record<string, string> = EVENT_TYPE_NAMES_KO;

/**
 * Cycle Importance Weights (sum to 1.0)
 * Used for weighting different time cycles in predictions
 */
export const IMPORTANCE_WEIGHT = {
  daeun: 0.30,  // 대운 (decade) - 30%
  seun: 0.35,   // 세운 (annual) - highest weight 35%
  wolun: 0.25,  // 월운 (monthly) - 25%
  iljin: 0.10,  // 일진 (daily) - 10%
} as const;

/**
 * Event type keywords for categorization
 */
export const EVENT_KEYWORDS: Record<string, string[]> = {
  marriage: ['결혼', 'wedding', 'marry'],
  career: ['개업', '취업', '창업', 'business', 'job', 'career'],
  investment: ['계약', '투자', '매매', 'contract', 'investment', 'deal'],
  move: ['이사', '이전', 'move', 'relocation'],
  study: ['학업', '시험', '교육', 'study', 'exam', 'education'],
  health: ['건강', '수술', '치료', 'health', 'surgery', 'treatment'],
  relationship: ['관계', '인연', 'relationship', 'connection'],
};
