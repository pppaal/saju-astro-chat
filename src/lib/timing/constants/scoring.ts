/**
 * Scoring constants for life prediction engine
 * Centralized magic numbers for better maintainability
 */

/**
 * 십신(Ten Gods) scoring weights
 * Higher scores indicate more favorable influence
 */
export const SIBSIN_SCORES = {
  '정관': 15,
  '정재': 12,
  '정인': 10,
  '식신': 8,
  '편관': 5,
  '편재': 5,
  '편인': 3,
  '상관': 0,
  '비견': -3,
  '겁재': -8,
} as const;

/**
 * Scoring weights and modifiers
 */
export const SCORING_WEIGHTS = {
  /** Branch interaction weight (지지 상호작용 가중치) */
  BRANCH_INTERACTION: 0.3,
  BRANCH_INTERACTION_MINOR: 0.2,

  /** Daeun (대운) modifier weight */
  DAEUN_MODIFIER: 0.3,
  DAEUN_MODIFIER_MINOR: 0.25,

  /** Yongsin (용신) bonus score */
  YONGSIN_BONUS: 12,
  YONGSIN_BONUS_MINOR: 10,

  /** Kisin (기신) penalty score */
  KISIN_PENALTY: 10,
  KISIN_PENALTY_MINOR: 8,

  /** Base score for normalization */
  BASE_SCORE: 50,

  /** Solar term element match bonus */
  SOLAR_TERM_MATCH: 5,

  /** Lucky lunar mansion bonus */
  LUCKY_MANSION: 4,

  /** Unlucky lunar mansion penalty */
  UNLUCKY_MANSION: 3,

  /** Full moon energy bonus */
  FULL_MOON_BONUS: 3,

  /** New moon energy penalty */
  NEW_MOON_PENALTY: 2,
} as const;

/**
 * Event-specific scoring modifiers
 */
export const EVENT_SCORING = {
  /** Marriage favorable sibsin bonus */
  MARRIAGE_FAVORABLE_SIBSIN: 15,

  /** Marriage unfavorable sibsin penalty */
  MARRIAGE_UNFAVORABLE_SIBSIN: 15,

  /** Career favorable sibsin bonus */
  CAREER_FAVORABLE_SIBSIN: 12,

  /** Career unfavorable sibsin penalty */
  CAREER_UNFAVORABLE_SIBSIN: 12,

  /** General favorable stage bonus */
  FAVORABLE_STAGE: 8,

  /** General favorable twelve stage bonus */
  FAVORABLE_TWELVE_STAGE: 12,

  /** General favorable element bonus */
  FAVORABLE_ELEMENT: 10,

  /** Business favorable condition bonus */
  BUSINESS_FAVORABLE: 10,

  /** Business unfavorable condition penalty */
  BUSINESS_UNFAVORABLE: 10,

  /** Business favorable twelve stage bonus */
  BUSINESS_FAVORABLE_STAGE: 15,

  /** Business favorable element bonus */
  BUSINESS_FAVORABLE_ELEMENT: 12,

  /** Investment favorable condition bonus */
  INVESTMENT_FAVORABLE: 8,

  /** Investment strong favorable bonus */
  INVESTMENT_STRONG: 10,

  /** Investment unfavorable penalty */
  INVESTMENT_UNFAVORABLE: 6,

  /** Investment strong unfavorable penalty */
  INVESTMENT_STRONG_UNFAVORABLE: 10,

  /** Transition favorable condition bonus */
  TRANSITION_FAVORABLE: 7,

  /** Element match bonus */
  ELEMENT_MATCH: 8,

  /** Health favorable sibsin bonus */
  HEALTH_FAVORABLE_SIBSIN: 12,

  /** Health unfavorable sibsin penalty */
  HEALTH_UNFAVORABLE_SIBSIN: 10,

  /** Health favorable twelve stage bonus */
  HEALTH_FAVORABLE_STAGE: 15,

  /** Health unfavorable twelve stage penalty */
  HEALTH_UNFAVORABLE_STAGE: 12,

  /** Surgery favorable sibsin bonus */
  SURGERY_FAVORABLE_SIBSIN: 15,

  /** Surgery unfavorable sibsin penalty */
  SURGERY_UNFAVORABLE_SIBSIN: 15,

  /** Surgery favorable twelve stage bonus */
  SURGERY_FAVORABLE_STAGE: 18,

  /** Surgery unfavorable twelve stage penalty */
  SURGERY_UNFAVORABLE_STAGE: 20,

  /** Surgery favorable element bonus */
  SURGERY_FAVORABLE_ELEMENT: 12,

  /** Surgery unfavorable element penalty */
  SURGERY_UNFAVORABLE_ELEMENT: 10,

  /** Move favorable sibsin bonus */
  MOVE_FAVORABLE_SIBSIN: 15,

  /** Travel favorable sibsin bonus */
  TRAVEL_FAVORABLE_SIBSIN: 12,

  /** Daeun favorable element bonus */
  DAEUN_FAVORABLE: 12,

  /** Daeun minor favorable element bonus */
  DAEUN_FAVORABLE_MINOR: 10,
} as const;

/**
 * Score normalization boundaries
 */
export const SCORE_BOUNDARIES = {
  MIN: 0,
  MAX: 100,
  DEFAULT_MIN: 15,
  DEFAULT_MAX: 95,
} as const;

/**
 * Element balance thresholds
 */
export const ELEMENT_BALANCE = {
  /** Threshold for element excess (과다) */
  EXCESS_THRESHOLD: 0.3,

  /** Threshold for element deficiency (부족) */
  DEFICIENT_THRESHOLD: 0.1,
} as const;

/**
 * Twelve stages vitality scores (12운성 생명력 점수)
 */
export const TWELVE_STAGE_VITALITY = {
  '장생': 90,
  '목욕': 70,
  '관대': 85,
  '임관': 95,
  '제왕': 100,
  '쇠': 60,
  '병': 40,
  '사': 20,
  '묘': 30,
  '절': 10,
  '태': 50,
  '양': 75,
} as const;

/**
 * Health analysis scoring
 */
export const HEALTH_SCORING = {
  /** Score per balanced element */
  BALANCE_SCORE_PER_ELEMENT: 20,

  /** Penalty per vulnerable area */
  HEALTH_RISK_PER_AREA: 10,
} as const;

/**
 * Timing analysis limits
 */
export const TIMING_LIMITS = {
  /** Maximum years to analyze */
  MAX_YEARS: 10,

  /** Months per year */
  MONTHS_PER_YEAR: 12,

  /** Maximum optimal periods to return */
  MAX_OPTIMAL_PERIODS: 5,
} as const;

/**
 * API rate limits
 */
export const RATE_LIMITS = {
  /** Maximum compatibility requests per window */
  COMPATIBILITY_REQUESTS: 30,

  /** Rate limit window in seconds */
  WINDOW_SECONDS: 60,

  /** Maximum persons for compatibility analysis */
  MAX_PERSONS: 4,

  /** Minimum persons for compatibility analysis */
  MIN_PERSONS: 2,

  /** Maximum note length */
  MAX_NOTE_LENGTH: 240,
} as const;

/**
 * Tier analysis thresholds
 */
export const TIER_THRESHOLDS = {
  /** Tier 1: Basic gongmang/wongjin analysis */
  TIER_1_SCORE_WEIGHT: 1.0,

  /** Tier 2: Advanced element analysis */
  TIER_2_SCORE_WEIGHT: 1.2,

  /** Tier 3: Comprehensive analysis */
  TIER_3_SCORE_WEIGHT: 1.5,
} as const;

/**
 * Score grade mappings
 */
export const SCORE_GRADES = {
  EXCELLENT: { min: 85, grade: 'excellent' as const },
  VERY_GOOD: { min: 70, grade: 'very-good' as const },
  GOOD: { min: 55, grade: 'good' as const },
  FAIR: { min: 40, grade: 'fair' as const },
  POOR: { min: 0, grade: 'poor' as const },
} as const;