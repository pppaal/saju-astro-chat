/**
 * Scoring Utilities for Life Prediction
 * Common scoring functions used across prediction engine
 */

// Inlined to avoid circular imports
const SCORE_THRESHOLDS = {
  MIN: 0,
  MAX: 100,
  EXCELLENT: 80,
  GOOD: 65,
  AVERAGE: 50,
  CAUTION: 35,
} as const;

/**
 * Normalize score to be within min-max range
 * @param score - Raw score to normalize
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 100)
 * @returns Normalized score within range
 */
export function normalizeScore(
  score: number,
  min: number = SCORE_THRESHOLDS.MIN,
  max: number = SCORE_THRESHOLDS.MAX
): number {
  return Math.max(min, Math.min(max, score));
}

/**
 * Convert score to grade (0-4)
 * @param score - Score value (0-100)
 * @returns Grade from 0 (best) to 4 (worst)
 */
export function scoreToGrade(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 0; // 80+
  if (score >= SCORE_THRESHOLDS.GOOD) return 1;      // 65-79
  if (score >= SCORE_THRESHOLDS.AVERAGE) return 2;   // 50-64
  if (score >= SCORE_THRESHOLDS.CAUTION) return 3;   // 35-49
  return 4;                                           // 0-34
}

/**
 * Get grade label in Korean
 * @param grade - Grade value (0-4)
 * @returns Korean label for the grade
 */
export function getGradeLabel(grade: 0 | 1 | 2 | 3 | 4): string {
  const labels = {
    0: '최상',
    1: '상',
    2: '중',
    3: '하',
    4: '최하',
  };
  return labels[grade];
}

/**
 * Calculate weighted average score
 * @param scores - Array of { value, weight } objects
 * @returns Weighted average
 */
export function calculateWeightedAverage(
  scores: Array<{ value: number; weight: number }>
): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
  return weightedSum / totalWeight;
}
