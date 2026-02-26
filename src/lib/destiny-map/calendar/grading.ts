/**
 * Destiny Calendar Grading Module (통합 버전)
 * 점수 기반 등급 결정 로직 + Memoization
 *
 * grading.ts와 grading-optimized.ts를 통합
 */

import type { ImportanceGrade } from './types'
import { GRADE_THRESHOLDS } from './scoring-config'
import { memoize } from '@/lib/cache/memoize'

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export interface GradeInput {
  score: number
  isBirthdaySpecial: boolean
  crossVerified: boolean
  sajuPositive: boolean
  astroPositive: boolean
  totalStrengthCount: number
  sajuBadCount: number
  hasChung: boolean
  hasXing: boolean
  hasNoMajorRetrograde: boolean
  retrogradeCount: number
  totalBadCount: number
}

export interface GradeReason {
  type: 'positive' | 'negative' | 'neutral'
  factorKey: string
  impact: number // 점수 영향 (-1 ~ +1)
  descriptionKey: string // i18n 키
}

export interface GradeResult {
  grade: ImportanceGrade
  adjustedScore: number
  gradeBonus: number
  gradeReasons: GradeReason[]
}

// ═══════════════════════════════════════════════════════════
// 캐시 키 생성
// ═══════════════════════════════════════════════════════════

function getGradeInputKey(input: GradeInput): string {
  return `grade:${input.score}:${input.isBirthdaySpecial ? 1 : 0}:${input.crossVerified ? 1 : 0}:${input.sajuPositive ? 1 : 0}:${input.astroPositive ? 1 : 0}:${input.totalStrengthCount}:${input.sajuBadCount}:${input.hasChung ? 1 : 0}:${input.hasXing ? 1 : 0}:${input.hasNoMajorRetrograde ? 1 : 0}:${input.retrogradeCount}:${input.totalBadCount}`
}

// ═══════════════════════════════════════════════════════════
// 등급 임계값 상수
// ═══════════════════════════════════════════════════════════

const BONUS_LIMITS = {
  MIN: -6,
  MAX: 4,
} as const

// ═══════════════════════════════════════════════════════════
// 단순 등급 계산 (Memoized)
// ═══════════════════════════════════════════════════════════

const calculateSimpleGradeMemo = memoize(
  (score: number): ImportanceGrade => {
    if (score >= GRADE_THRESHOLDS.grade0) {
      return 0
    }
    if (score >= GRADE_THRESHOLDS.grade1) {
      return 1
    }
    if (score >= GRADE_THRESHOLDS.grade2) {
      return 2
    }
    if (score >= GRADE_THRESHOLDS.grade3) {
      return 3
    }
    return 4
  },
  {
    keyFn: (score) => `simple:${score}`,
    ttl: 1000 * 60 * 60, // 1 hour
  }
)

// ═══════════════════════════════════════════════════════════
// 복합 등급 계산 (Memoized + gradeReasons 포함)
// ═══════════════════════════════════════════════════════════

const calculateComplexGradeMemo = memoize(
  (input: GradeInput): GradeResult => {
    let gradeBonus = 0
    const gradeReasons: GradeReason[] = []

    // ─────────────────────────────────────────────────────
    // 보너스 조건
    // ─────────────────────────────────────────────────────

    if (input.isBirthdaySpecial) {
      gradeBonus += 2
      gradeReasons.push({
        type: 'positive',
        factorKey: 'birthdaySpecial',
        impact: 0.8,
        descriptionKey: 'calendar.reasons.birthdaySpecial',
      })
    }

    if (input.crossVerified && input.sajuPositive && input.astroPositive) {
      gradeBonus += 2
      gradeReasons.push({
        type: 'positive',
        factorKey: 'crossVerifiedPositive',
        impact: 0.7,
        descriptionKey: 'calendar.reasons.crossVerifiedPositive',
      })
    }

    if (input.totalStrengthCount >= 5 && input.sajuBadCount === 0) {
      gradeBonus += 1
      gradeReasons.push({
        type: 'positive',
        factorKey: 'manyStrengths',
        impact: 0.5,
        descriptionKey: 'calendar.reasons.manyStrengths',
      })
    }

    // ─────────────────────────────────────────────────────
    // 페널티 조건
    // ─────────────────────────────────────────────────────

    if (input.hasChung && input.hasXing) {
      gradeBonus -= 4
      gradeReasons.push({
        type: 'negative',
        factorKey: 'chungAndXing',
        impact: -1.0,
        descriptionKey: 'calendar.reasons.chungAndXing',
      })
    } else if (input.hasChung) {
      gradeBonus -= 2
      gradeReasons.push({
        type: 'negative',
        factorKey: 'chung',
        impact: -0.7,
        descriptionKey: 'calendar.reasons.chung',
      })
    } else if (input.hasXing) {
      gradeBonus -= 2
      gradeReasons.push({
        type: 'negative',
        factorKey: 'xing',
        impact: -0.6,
        descriptionKey: 'calendar.reasons.xing',
      })
    }

    if (input.totalBadCount >= 3) {
      gradeBonus -= 3
      gradeReasons.push({
        type: 'negative',
        factorKey: 'manyBadFactors',
        impact: -0.8,
        descriptionKey: 'calendar.reasons.manyBadFactors',
      })
    } else if (input.totalBadCount >= 2) {
      gradeBonus -= 1
      gradeReasons.push({
        type: 'negative',
        factorKey: 'someBadFactors',
        impact: -0.4,
        descriptionKey: 'calendar.reasons.someBadFactors',
      })
    }

    if (!input.hasNoMajorRetrograde && input.retrogradeCount >= 2) {
      gradeBonus -= 2
      gradeReasons.push({
        type: 'negative',
        factorKey: 'multipleRetrogrades',
        impact: -0.6,
        descriptionKey: 'calendar.reasons.multipleRetrogrades',
      })
    }

    // ─────────────────────────────────────────────────────
    // 보너스/페널티 제한 및 등급 결정
    // ─────────────────────────────────────────────────────

    gradeBonus = Math.max(BONUS_LIMITS.MIN, Math.min(BONUS_LIMITS.MAX, gradeBonus))
    const adjustedScore = input.score + gradeBonus

    let grade: ImportanceGrade
    const hasBothChungAndXing = input.hasChung && input.hasXing

    if (adjustedScore >= GRADE_THRESHOLDS.grade0 && !hasBothChungAndXing) {
      grade = 0
    } else if (adjustedScore >= GRADE_THRESHOLDS.grade1) {
      grade = 1
    } else if (adjustedScore >= GRADE_THRESHOLDS.grade2) {
      grade = 2
    } else if (adjustedScore >= GRADE_THRESHOLDS.grade3) {
      grade = 3
    } else {
      grade = 4
    }

    // 등급에 따른 기본 이유 추가
    if (grade >= 3 && gradeReasons.filter((r) => r.type === 'negative').length === 0) {
      gradeReasons.push({
        type: 'negative',
        factorKey: 'lowBaseScore',
        impact: -0.5,
        descriptionKey: 'calendar.reasons.lowBaseScore',
      })
    }

    // 부정적 이유가 가장 중요한 순서대로 정렬
    gradeReasons.sort((a, b) => a.impact - b.impact)

    return { grade, adjustedScore, gradeBonus, gradeReasons }
  },
  {
    keyFn: getGradeInputKey,
    ttl: 1000 * 60 * 60, // 1 hour
  }
)

// ═══════════════════════════════════════════════════════════
// 메인 calculateGrade 함수 (오버로드)
// ═══════════════════════════════════════════════════════════

export function calculateGrade(score: number): ImportanceGrade
export function calculateGrade(input: GradeInput): GradeResult
export function calculateGrade(input: GradeInput | number): GradeResult | ImportanceGrade {
  if (typeof input === 'number') {
    return calculateSimpleGradeMemo(input)
  }
  return calculateComplexGradeMemo(input)
}

export function getCategoryScore(score: number): ImportanceGrade {
  return calculateSimpleGradeMemo(score)
}

// ═══════════════════════════════════════════════════════════
// 등급별 타이틀/설명 키 (Memoized)
// ═══════════════════════════════════════════════════════════

const GRADE_KEYS: Record<ImportanceGrade, { titleKey: string; descKey: string }> = {
  0: { titleKey: 'calendar.bestDay', descKey: 'calendar.bestDayDesc' },
  1: { titleKey: 'calendar.goodDay', descKey: 'calendar.goodDayDesc' },
  2: { titleKey: 'calendar.normalDay', descKey: 'calendar.normalDayDesc' },
  3: { titleKey: 'calendar.badDay', descKey: 'calendar.badDayDesc' },
  4: { titleKey: 'calendar.worstDay', descKey: 'calendar.worstDayDesc' },
}

export function getGradeKeys(grade: ImportanceGrade): { titleKey: string; descKey: string } {
  return GRADE_KEYS[grade] || GRADE_KEYS[2]
}

export const getGradeTitleKey = memoize(
  (grade: ImportanceGrade): string => GRADE_KEYS[grade]?.titleKey || GRADE_KEYS[2].titleKey,
  { keyFn: (grade) => `title:${grade}` }
)

export const getGradeDescKey = memoize(
  (grade: ImportanceGrade): string => GRADE_KEYS[grade]?.descKey || GRADE_KEYS[2].descKey,
  { keyFn: (grade) => `desc:${grade}` }
)

// ═══════════════════════════════════════════════════════════
// 등급별 추천 키
// ═══════════════════════════════════════════════════════════

const GRADE_RECOMMENDATIONS: Record<ImportanceGrade, string[]> = {
  0: ['majorDecision', 'wedding', 'contract', 'bigDecision'],
  1: ['majorDecision', 'contract'],
  2: [],
  3: ['rest', 'meditation'],
  4: ['rest', 'meditation', 'avoidBigDecisions'],
}

export function getGradeRecommendations(grade: ImportanceGrade): string[] {
  return GRADE_RECOMMENDATIONS[grade] || []
}

// ═══════════════════════════════════════════════════════════
// 등급에 따라 경고 필터링
// ═══════════════════════════════════════════════════════════

const SEVERE_WARNINGS = [
  'extremeCaution',
  'confusion',
  'conflict',
  'accident',
  'injury',
  'betrayal',
]
const BASE_WORST_WARNINGS = ['extremeCaution', 'health']

export function filterWarningsByGrade(grade: ImportanceGrade, warningKeys: string[]): string[] {
  if (grade <= 1) {
    return [] // Grade 0, 1: 모든 경고 제거
  }

  if (grade === 2) {
    return warningKeys.filter((key) => !SEVERE_WARNINGS.includes(key))
  }

  if (grade === 3 && warningKeys.length === 0) {
    return ['caution']
  }

  if (grade === 4) {
    return [...new Set([...BASE_WORST_WARNINGS, ...warningKeys])]
  }

  return warningKeys
}

// ═══════════════════════════════════════════════════════════
// 등급별 색상 (Memoized)
// ═══════════════════════════════════════════════════════════

const GRADE_COLORS: Record<ImportanceGrade, string> = {
  0: 'text-yellow-600 dark:text-yellow-400',
  1: 'text-green-600 dark:text-green-400',
  2: 'text-blue-600 dark:text-blue-400',
  3: 'text-orange-600 dark:text-orange-400',
  4: 'text-red-600 dark:text-red-400',
}

const GRADE_BG_COLORS: Record<ImportanceGrade, string> = {
  0: 'bg-yellow-50 dark:bg-yellow-900/20',
  1: 'bg-green-50 dark:bg-green-900/20',
  2: 'bg-blue-50 dark:bg-blue-900/20',
  3: 'bg-orange-50 dark:bg-orange-900/20',
  4: 'bg-red-50 dark:bg-red-900/20',
}

export const getGradeColor = memoize(
  (grade: ImportanceGrade): string => GRADE_COLORS[grade] || 'text-gray-600 dark:text-gray-400',
  { keyFn: (grade) => `color:${grade}` }
)

export const getGradeBgColor = memoize(
  (grade: ImportanceGrade): string => GRADE_BG_COLORS[grade] || 'bg-gray-50 dark:bg-gray-900/20',
  { keyFn: (grade) => `bg:${grade}` }
)
