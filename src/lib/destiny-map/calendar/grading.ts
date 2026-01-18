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
  /** 등급 결정에 영향을 준 주요 요인들 */
  gradeReasons: GradeReason[];
}

export interface GradeReason {
  type: 'positive' | 'negative' | 'neutral';
  factorKey: string;
  impact: number; // 점수 영향 (-1 ~ +1)
  descriptionKey: string; // i18n 키
}

/**
 * 점수 기반 등급 결정 (5등급 시스템)
 *
 * Updated 2026-01-17: Thresholds lowered for better distribution
 * Grade 0: 최고의날 (68+ AND 충/형 없음) ~5%
 * Grade 1: 좋은날 (62-67) ~15%
 * Grade 2: 보통날 (42-61) ~50%
 * Grade 3: 안좋은날 (28-41) ~25%
 * Grade 4: 최악의날 (<28) ~5%
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
  const gradeReasons: GradeReason[] = [];

  // 보너스 조건
  if (input.isBirthdaySpecial) {
    gradeBonus += 2;
    gradeReasons.push({
      type: 'positive',
      factorKey: 'birthdaySpecial',
      impact: 0.8,
      descriptionKey: 'calendar.reasons.birthdaySpecial',
    });
  }
  if (input.crossVerified && input.sajuPositive && input.astroPositive) {
    gradeBonus += 2;
    gradeReasons.push({
      type: 'positive',
      factorKey: 'crossVerifiedPositive',
      impact: 0.7,
      descriptionKey: 'calendar.reasons.crossVerifiedPositive',
    });
  }
  if (input.totalStrengthCount >= 5 && input.sajuBadCount === 0) {
    gradeBonus += 1;
    gradeReasons.push({
      type: 'positive',
      factorKey: 'manyStrengths',
      impact: 0.5,
      descriptionKey: 'calendar.reasons.manyStrengths',
    });
  }

  // 페널티 조건 - 구체적 이유 추적
  if (input.hasChung && input.hasXing) {
    gradeBonus -= 4;
    gradeReasons.push({
      type: 'negative',
      factorKey: 'chungAndXing',
      impact: -1.0,
      descriptionKey: 'calendar.reasons.chungAndXing',
    });
  } else if (input.hasChung) {
    gradeBonus -= 2;
    gradeReasons.push({
      type: 'negative',
      factorKey: 'chung',
      impact: -0.7,
      descriptionKey: 'calendar.reasons.chung',
    });
  } else if (input.hasXing) {
    gradeBonus -= 2;
    gradeReasons.push({
      type: 'negative',
      factorKey: 'xing',
      impact: -0.6,
      descriptionKey: 'calendar.reasons.xing',
    });
  }

  if (input.totalBadCount >= 3) {
    gradeBonus -= 3;
    gradeReasons.push({
      type: 'negative',
      factorKey: 'manyBadFactors',
      impact: -0.8,
      descriptionKey: 'calendar.reasons.manyBadFactors',
    });
  } else if (input.totalBadCount >= 2) {
    gradeBonus -= 1;
    gradeReasons.push({
      type: 'negative',
      factorKey: 'someBadFactors',
      impact: -0.4,
      descriptionKey: 'calendar.reasons.someBadFactors',
    });
  }

  if (!input.hasNoMajorRetrograde && input.retrogradeCount >= 2) {
    gradeBonus -= 2;
    gradeReasons.push({
      type: 'negative',
      factorKey: 'multipleRetrogrades',
      impact: -0.6,
      descriptionKey: 'calendar.reasons.multipleRetrogrades',
    });
  }

  // 보너스/페널티 제한
  gradeBonus = Math.max(-6, Math.min(4, gradeBonus));

  const adjustedScore = input.score + gradeBonus;

  // 5등급 시스템
  let grade: ImportanceGrade;
  // Grade 0 조건 완화: 충과 형이 "둘 다" 있을 때만 제외
  const hasBothChungAndXing = input.hasChung && input.hasXing;

  if (adjustedScore >= 68 && !hasBothChungAndXing) {
    grade = 0; // 최고의날 (~5-8%)
  } else if (adjustedScore >= 62) {
    grade = 1; // 좋은날 (~15%)
  } else if (adjustedScore >= 42) {
    grade = 2; // 보통날 (~50%)
  } else if (adjustedScore >= 28) {
    grade = 3; // 안좋은날 (~25%)
  } else {
    grade = 4; // 최악의날 (~5%)
  }

  // 등급에 따른 기본 이유 추가 (부정적 요소가 없을 때도 설명 제공)
  if (grade >= 3 && gradeReasons.filter(r => r.type === 'negative').length === 0) {
    // 점수가 낮은데 특별한 부정 요소가 없으면 기본 점수 낮음 이유
    gradeReasons.push({
      type: 'negative',
      factorKey: 'lowBaseScore',
      impact: -0.5,
      descriptionKey: 'calendar.reasons.lowBaseScore',
    });
  }

  // 부정적 이유가 가장 중요한 순서대로 정렬
  gradeReasons.sort((a, b) => a.impact - b.impact);

  return { grade, adjustedScore, gradeBonus, gradeReasons };
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
