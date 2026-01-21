/**
 * Scoring constants used throughout the application
 */

/**
 * Score thresholds for determining quality levels
 * Used consistently across compatibility, calendar, and prediction features
 */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 70,
  AVERAGE: 60,
  BELOW_AVERAGE: 40,
  POOR: 30,
  MIN: 0,
  MAX: 100,
} as const;

/**
 * Result limits for slicing and displaying items
 */
export const RESULT_LIMITS = {
  MAX_HIGHLIGHTS: 5,
  MAX_OPPORTUNITIES: 3,
  MAX_CAUTIONS: 3,
  MAX_ADVICE: 5,
  MAX_KARMIC_DEBTS: 3,
  MAX_LIFE_LESSONS: 5,
  MAX_PREDICTIONS: 10,
  MAX_EVENTS: 20,
} as const;

/**
 * Lunar calendar approximation constants
 */
export const LUNAR_APPROXIMATION = {
  DAY_OFFSET: 10,
  CYCLE_LENGTH: 30,
} as const;

/**
 * Helper function to clamp a score between min and max values
 */
export function clampScore(
  score: number,
  min: number = SCORE_THRESHOLDS.MIN,
  max: number = SCORE_THRESHOLDS.MAX
): number {
  return Math.max(min, Math.min(max, score));
}

/**
 * Get quality level based on score
 */
export function getQualityLevel(score: number): 'excellent' | 'good' | 'average' | 'below_average' | 'poor' {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
  if (score >= SCORE_THRESHOLDS.AVERAGE) return 'average';
  if (score >= SCORE_THRESHOLDS.BELOW_AVERAGE) return 'below_average';
  return 'poor';
}

/**
 * Get grade based on score (0-3 scale)
 */
export function getGrade(score: number): 0 | 1 | 2 | 3 {
  if (score >= SCORE_THRESHOLDS.GOOD) return 0; // Excellent
  if (score >= SCORE_THRESHOLDS.AVERAGE) return 1; // Good
  if (score >= SCORE_THRESHOLDS.BELOW_AVERAGE) return 2; // Average
  return 3; // Poor
}
