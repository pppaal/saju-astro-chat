/**
 * Optimized Destiny Calendar Grading Module
 * With memoization for performance
 */

import type { ImportanceGrade } from './types';
import { GRADE_THRESHOLDS } from './scoring-config';
import { memoize } from '@/lib/cache/memoize';

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
 * Generate cache key for grade calculation
 */
function getGradeInputKey(input: GradeInput): string {
  return `grade:${input.score}:${input.isBirthdaySpecial ? 1 : 0}:${input.crossVerified ? 1 : 0}:${input.sajuPositive ? 1 : 0}:${input.astroPositive ? 1 : 0}:${input.totalStrengthCount}:${input.sajuBadCount}:${input.hasChung ? 1 : 0}:${input.hasXing ? 1 : 0}:${input.hasNoMajorRetrograde ? 1 : 0}:${input.retrogradeCount}:${input.totalBadCount}`;
}

/**
 * Simple grade calculation (memoized)
 */
const calculateSimpleGradeMemo = memoize(
  (score: number): ImportanceGrade => {
    if (score >= GRADE_THRESHOLDS.grade0) return 0;
    if (score >= GRADE_THRESHOLDS.grade1) return 1;
    if (score >= GRADE_THRESHOLDS.grade2) return 2;
    if (score >= GRADE_THRESHOLDS.grade3) return 3;
    return 4;
  },
  {
    keyFn: (score) => `simple:${score}`,
    ttl: 1000 * 60 * 60, // 1 hour
  }
);

/**
 * Complex grade calculation (memoized)
 */
const calculateComplexGradeMemo = memoize(
  (input: GradeInput): GradeResult => {
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
    const hasBothChungAndXing = input.hasChung && input.hasXing;

    if (adjustedScore >= 68 && !hasBothChungAndXing) {
      grade = 0;
    } else if (adjustedScore >= 62) {
      grade = 1;
    } else if (adjustedScore >= 42) {
      grade = 2;
    } else if (adjustedScore >= 28) {
      grade = 3;
    } else {
      grade = 4;
    }

    return { grade, adjustedScore, gradeBonus };
  },
  {
    keyFn: getGradeInputKey,
    ttl: 1000 * 60 * 60, // 1 hour
  }
);

/**
 * Main calculateGrade function with memoization
 */
export function calculateGrade(score: number): ImportanceGrade;
export function calculateGrade(input: GradeInput): GradeResult;
export function calculateGrade(input: GradeInput | number): GradeResult | ImportanceGrade {
  if (typeof input === 'number') {
    return calculateSimpleGradeMemo(input);
  }

  return calculateComplexGradeMemo(input);
}

export function getCategoryScore(score: number): ImportanceGrade {
  return calculateSimpleGradeMemo(score);
}

/**
 * 등급별 타이틀/설명 키 반환 (memoized)
 */
export const getGradeTitleKey = memoize(
  (grade: ImportanceGrade): string => {
    switch (grade) {
      case 0:
        return 'destiny.calendar.grade.best.title';
      case 1:
        return 'destiny.calendar.grade.good.title';
      case 2:
        return 'destiny.calendar.grade.normal.title';
      case 3:
        return 'destiny.calendar.grade.bad.title';
      case 4:
        return 'destiny.calendar.grade.worst.title';
      default:
        return 'destiny.calendar.grade.normal.title';
    }
  },
  {
    keyFn: (grade) => `title:${grade}`,
  }
);

export const getGradeDescKey = memoize(
  (grade: ImportanceGrade): string => {
    switch (grade) {
      case 0:
        return 'destiny.calendar.grade.best.desc';
      case 1:
        return 'destiny.calendar.grade.good.desc';
      case 2:
        return 'destiny.calendar.grade.normal.desc';
      case 3:
        return 'destiny.calendar.grade.bad.desc';
      case 4:
        return 'destiny.calendar.grade.worst.desc';
      default:
        return 'destiny.calendar.grade.normal.desc';
    }
  },
  {
    keyFn: (grade) => `desc:${grade}`,
  }
);

/**
 * 등급별 색상 반환 (memoized)
 */
export const getGradeColor = memoize(
  (grade: ImportanceGrade): string => {
    switch (grade) {
      case 0:
        return 'text-yellow-600 dark:text-yellow-400';
      case 1:
        return 'text-green-600 dark:text-green-400';
      case 2:
        return 'text-blue-600 dark:text-blue-400';
      case 3:
        return 'text-orange-600 dark:text-orange-400';
      case 4:
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  },
  {
    keyFn: (grade) => `color:${grade}`,
  }
);

/**
 * 등급별 배경색 반환 (memoized)
 */
export const getGradeBgColor = memoize(
  (grade: ImportanceGrade): string => {
    switch (grade) {
      case 0:
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 1:
        return 'bg-green-50 dark:bg-green-900/20';
      case 2:
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 3:
        return 'bg-orange-50 dark:bg-orange-900/20';
      case 4:
        return 'bg-red-50 dark:bg-red-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20';
    }
  },
  {
    keyFn: (grade) => `bg:${grade}`,
  }
);
