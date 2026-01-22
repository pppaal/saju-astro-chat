/**
 * Score Normalization Utilities
 */

import { SCORE_THRESHOLDS } from '../life-prediction-constants';

export function normalizeScore(
  score: number,
  min: number = SCORE_THRESHOLDS.MIN,
  max: number = SCORE_THRESHOLDS.MAX
): number {
  return Math.max(min, Math.min(max, score));
}

export function normalizedAverage(scores: number[]): number {
  if (scores.length === 0) return SCORE_THRESHOLDS.AVERAGE;
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return normalizeScore(avg);
}

export function getScoreGrade(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
  if (score >= SCORE_THRESHOLDS.AVERAGE) return 'average';
  if (score >= SCORE_THRESHOLDS.CAUTION) return 'caution';
  return 'poor';
}
