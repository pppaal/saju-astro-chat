/**
 * Destiny Calendar Grading Module
 * 점수 기반 등급 결정 로직
 */

import type { ImportanceGrade } from './types';
import { GRADE_THRESHOLDS } from './scoring-config';

export interface GradeInput {
  score: number;
  isBirthdaySpecial: boolean;
  crossVerified: boolean;
  sajuPositive: boolean;
  astroPositive: boolean;
  totalStrengthCount: number;
  sajuBadCount: number;
  hasChung: boolean;
  hasXing: boolean;
  hasNoMajorRetrograde: boolean;
  retrogradeCount: number;
  totalBadCount: number;
}

export interface GradeResult {
  grade: ImportanceGrade;
  adjustedScore: number;
  gradeBonus: number;
}

/**
 * 점수 기반 등급 결정 (5등급 시스템)
 *
 * Grade 0: 최고의날 (72+ AND 충/형 없음) ~5%
 * Grade 1: 좋은날 (65-71) ~15%
 * Grade 2: 보통날 (45-64) ~50%
 * Grade 3: 안좋은날 (30-44) ~25%
 * Grade 4: 최악의날 (<30) ~5%
 */
function calculateSimpleGrade(score: number): ImportanceGrade {
  if (score >= GRADE_THRESHOLDS.grade0) return 0;
  if (score >= GRADE_THRESHOLDS.grade1) return 1;
  if (score >= GRADE_THRESHOLDS.grade2) return 2;
  if (score >= GRADE_THRESHOLDS.grade3) return 3;
  return 4;
}

export function calculateGrade(score: number): ImportanceGrade;
export function calculateGrade(input: GradeInput): GradeResult;
export function calculateGrade(input: GradeInput | number): GradeResult | ImportanceGrade {
  if (typeof input === 'number') {
    return calculateSimpleGrade(input);
  }

  let gradeBonus = 0;

  // 보너스 조건
  if (input.isBirthdaySpecial) gradeBonus += 2;
  if (input.crossVerified && input.sajuPositive && input.astroPositive) gradeBonus += 2;
  if (input.totalStrengthCount >= 5 && input.sajuBadCount === 0) gradeBonus += 1;

  // 페널티 조건
  if (input.hasChung && input.hasXing) gradeBonus -= 4;
  else if (input.hasChung || input.hasXing) gradeBonus -= 2;
  if (input.totalBadCount >= 3) gradeBonus -= 3;
  else if (input.totalBadCount >= 2) gradeBonus -= 1;
  if (!input.hasNoMajorRetrograde && input.retrogradeCount >= 2) gradeBonus -= 2;

  // 보너스/페널티 제한
  gradeBonus = Math.max(-6, Math.min(4, gradeBonus));

  const adjustedScore = input.score + gradeBonus;

  // 5등급 시스템
  let grade: ImportanceGrade;
  const hasChungOrXing = input.hasChung || input.hasXing;

  if (adjustedScore >= 72 && !hasChungOrXing) {
    grade = 0; // 최고의날 (~5%)
  } else if (adjustedScore >= 65) {
    grade = 1; // 좋은날 (~15%)
  } else if (adjustedScore >= 45) {
    grade = 2; // 보통날 (~50%)
  } else if (adjustedScore >= 30) {
    grade = 3; // 안좋은날 (~25%)
  } else {
    grade = 4; // 최악의날 (~5%)
  }

  return { grade, adjustedScore, gradeBonus };
}

export function getCategoryScore(score: number): ImportanceGrade {
  return calculateSimpleGrade(score);
}

/**
 * 등급별 타이틀/설명 키 반환
 */
export function getGradeKeys(grade: ImportanceGrade): { titleKey: string; descKey: string } {
  switch (grade) {
    case 0:
      return { titleKey: "calendar.bestDay", descKey: "calendar.bestDayDesc" };
    case 1:
      return { titleKey: "calendar.goodDay", descKey: "calendar.goodDayDesc" };
    case 2:
      return { titleKey: "calendar.normalDay", descKey: "calendar.normalDayDesc" };
    case 3:
      return { titleKey: "calendar.badDay", descKey: "calendar.badDayDesc" };
    case 4:
    default:
      return { titleKey: "calendar.worstDay", descKey: "calendar.worstDayDesc" };
  }
}

/**
 * 등급별 추천 키 반환
 */
export function getGradeRecommendations(grade: ImportanceGrade): string[] {
  switch (grade) {
    case 0:
      return ["majorDecision", "wedding", "contract", "bigDecision"];
    case 1:
      return ["majorDecision", "contract"];
    case 2:
      return [];
    case 3:
      return ["rest", "meditation"];
    case 4:
      return ["rest", "meditation", "avoidBigDecisions"];
    default:
      return [];
  }
}

/**
 * 등급에 따라 경고 필터링
 */
export function filterWarningsByGrade(grade: ImportanceGrade, warningKeys: string[]): string[] {
  if (grade <= 1) {
    // Grade 0, 1: 모든 경고 제거
    return [];
  }

  if (grade === 2) {
    // Grade 2: 심각한 경고만 제거
    const severeWarnings = ["extremeCaution", "confusion", "conflict", "accident", "injury", "betrayal"];
    return warningKeys.filter(key => !severeWarnings.includes(key));
  }

  if (grade === 3 && warningKeys.length === 0) {
    return ["caution"];
  }

  if (grade === 4) {
    // Grade 4 (최악): 기본 경고 추가
    const baseWarnings = ["extremeCaution", "health"];
    return [...new Set([...baseWarnings, ...warningKeys])];
  }

  return warningKeys;
}
