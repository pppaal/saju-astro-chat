/**
 * Life Prediction Constants
 * Centralized constants for life prediction scoring and analysis
 */

// Re-export from engine/constants
export { STEM_ELEMENT, EVENT_FAVORABLE_CONDITIONS } from './engine/constants';

/**
 * Sibsin (Ten Gods) score mapping
 * Used for calculating fortune scores across different prediction types
 */
export const SIBSIN_SCORES: Record<string, number> = {
  '정관': 15,  // Proper Official
  '정재': 12,  // Proper Wealth
  '정인': 10,  // Proper Seal
  '식신': 8,   // Eating God
  '편관': 5,   // Partial Official
  '편재': 5,   // Partial Wealth
  '편인': 3,   // Partial Seal
  '상관': 0,   // Hurting Officer
  '비견': -3,  // Shoulder
  '겁재': -8,  // Robbery
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
