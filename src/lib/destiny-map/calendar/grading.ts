/**
 * Destiny Calendar Grading Module
 * 점수 기반 등급 결정 로직
 */

import type { ImportanceGrade } from './types';

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
 * 점수 기반 등급 결정 (6등급 시스템 v7)
 * Grade 0: 천운 (adjustedScore 74+ AND 충+형 없음) ~3%
 * Grade 1: 아주 좋음 (adjustedScore 66+) ~12%
 * Grade 2: 좋음 (adjustedScore 56+) ~25%
 * Grade 3: 보통 (adjustedScore 45+) ~35%
 * Grade 4: 나쁨 (adjustedScore 35+) ~17%
 * Grade 5: 아주 나쁨 (adjustedScore 35 미만) ~5%
 */
export function calculateGrade(input: GradeInput): GradeResult {
  let gradeBonus = 0;

  // 보너스 조건
  if (input.isBirthdaySpecial) gradeBonus += 3;
  if (input.crossVerified && input.sajuPositive && input.astroPositive) gradeBonus += 2;
  if (input.totalStrengthCount >= 5 && input.sajuBadCount === 0) gradeBonus += 2;

  // 페널티 조건
  if (input.hasChung && input.hasXing) gradeBonus -= 3;
  if (input.totalBadCount >= 3) gradeBonus -= 2;
  if (!input.hasNoMajorRetrograde && input.retrogradeCount >= 3) gradeBonus -= 2;

  // 보너스/페널티 제한 (+-5)
  gradeBonus = Math.max(-5, Math.min(5, gradeBonus));

  const adjustedScore = input.score + gradeBonus;

  // 등급 판단 (6등급 시스템)
  let grade: ImportanceGrade;

  // 천운: adjustedScore 74+ AND 충도 없고 형도 없어야 함 (진정한 최고의 날)
  const hasChungOrXing = input.hasChung || input.hasXing;
  if (adjustedScore >= 74 && !hasChungOrXing) {
    grade = 0; // 천운
  } else if (adjustedScore >= 66) {
    grade = 1; // 아주좋음
  } else if (adjustedScore >= 56) {
    grade = 2; // 좋음
  } else if (adjustedScore >= 45) {
    grade = 3; // 보통
  } else if (adjustedScore >= 35) {
    grade = 4; // 나쁨
  } else {
    grade = 5; // 아주나쁨
  }

  return { grade, adjustedScore, gradeBonus };
}

/**
 * 등급별 타이틀/설명 키 반환
 */
export function getGradeKeys(grade: ImportanceGrade): { titleKey: string; descKey: string } {
  switch (grade) {
    case 0:
      return { titleKey: "calendar.cheununDay", descKey: "calendar.cheununDayDesc" };
    case 1:
      return { titleKey: "calendar.veryGoodDay", descKey: "calendar.veryGoodDayDesc" };
    case 2:
      return { titleKey: "calendar.goodDay", descKey: "calendar.goodDayDesc" };
    case 3:
      return { titleKey: "calendar.normalDay", descKey: "calendar.normalDayDesc" };
    case 4:
      return { titleKey: "calendar.badDay", descKey: "calendar.badDayDesc" };
    case 5:
    default:
      return { titleKey: "calendar.veryBadDay", descKey: "calendar.veryBadDayDesc" };
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
      return ["majorDecision"];
    case 4:
      return ["rest", "meditation"];
    case 5:
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

  if (grade === 4 && warningKeys.length === 0) {
    return ["health"];
  }

  if (grade === 5) {
    // Grade 5 (아주나쁨): 기본 경고 추가
    const baseWarnings = ["extremeCaution", "health"];
    return [...new Set([...baseWarnings, ...warningKeys])];
  }

  return warningKeys;
}
