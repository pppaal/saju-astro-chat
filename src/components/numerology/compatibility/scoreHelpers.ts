// src/components/numerology/compatibility/scoreHelpers.ts
// 점수 관련 헬퍼 함수들

import { SCORE_THRESHOLDS } from '@/constants/scoring';

/**
 * 점수에 따른 설명 문자열 반환
 */
export function getScoreDescription(score: number, locale: string): string {
  if (locale === 'ko') {
    if (score >= 90) return '천생연분! 최상의 궁합입니다';
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return '매우 좋은 궁합입니다';
    if (score >= SCORE_THRESHOLDS.GOOD) return '좋은 궁합입니다';
    if (score >= SCORE_THRESHOLDS.AVERAGE) return '보통의 궁합입니다';
    if (score >= 50) return '노력이 필요한 궁합입니다';
    return '어려운 궁합이지만 극복 가능합니다';
  }
  if (score >= 90) return 'Perfect match! Exceptional compatibility';
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'Excellent compatibility';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'Good compatibility';
  if (score >= SCORE_THRESHOLDS.AVERAGE) return 'Average compatibility';
  if (score >= 50) return 'Compatibility requires effort';
  return 'Challenging but possible with dedication';
}

/**
 * 점수에 따른 색상 반환
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return '#4ade80';
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return '#60a5fa';
  if (score >= SCORE_THRESHOLDS.GOOD) return '#fbbf24';
  if (score >= SCORE_THRESHOLDS.AVERAGE) return '#fb923c';
  return '#f87171';
}

/**
 * 점수에 따른 이모지 반환
 */
export function getScoreEmoji(score: number): string {
  if (score >= 90) return '💯';
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return '😍';
  if (score >= SCORE_THRESHOLDS.GOOD) return '😊';
  if (score >= SCORE_THRESHOLDS.AVERAGE) return '🙂';
  return '😐';
}

/**
 * 점수에 따른 등급 반환
 */
export function getGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'A';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
