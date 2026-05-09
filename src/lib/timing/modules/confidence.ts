// src/lib/prediction/modules/confidence.ts
// 신뢰도 계산 모듈

import type { ConfidenceFactors, ConfidenceGrade, UnifiedConfidenceResult } from './types'

// ============================================================
// 기본 신뢰도 계산
// ============================================================

/**
 * 통합 신뢰도 점수 계산
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  const birthTimeScore = {
    exact: 100,
    within_hour: 80,
    within_2hours: 60,
    unknown: 40,
  }[factors.birthTimeAccuracy]

  const weights = {
    birthTime: 0.25,
    methodAlignment: 0.3,
    dataCompleteness: 0.25,
    historicalValidation: 0.2,
  }

  let confidence =
    birthTimeScore * weights.birthTime +
    factors.methodAlignment * weights.methodAlignment +
    factors.dataCompleteness * weights.dataCompleteness

  if (factors.historicalValidation !== undefined) {
    confidence += factors.historicalValidation * weights.historicalValidation
  } else {
    // 검증 데이터 없으면 다른 요소로 재분배
    confidence = confidence / 0.8
  }

  return Math.round(Math.min(100, Math.max(0, confidence)))
}

// ============================================================
// 통합 신뢰도 시스템
// ============================================================

/**
 * 통합 신뢰도 계산 (확장 버전)
 */
export function calculateUnifiedConfidence(
  factors: ConfidenceFactors & {
    predictionType?: 'daily' | 'monthly' | 'yearly' | 'lifetime'
    eastWestHarmony?: number
  }
): UnifiedConfidenceResult {
  const birthTimeScore = {
    exact: 100,
    within_hour: 80,
    within_2hours: 60,
    unknown: 40,
  }[factors.birthTimeAccuracy]

  // 예측 기간에 따른 가중치 조정
  const predictionType = factors.predictionType || 'daily'
  const weights = getWeightsForPredictionType(predictionType)

  // 개별 점수 계산
  const breakdown = {
    birthTime: { score: birthTimeScore, weight: weights.birthTime },
    dataCompleteness: { score: factors.dataCompleteness, weight: weights.dataCompleteness },
    methodAlignment: { score: factors.methodAlignment, weight: weights.methodAlignment },
    historicalValidation:
      factors.historicalValidation !== undefined
        ? { score: factors.historicalValidation, weight: weights.historicalValidation }
        : undefined,
  }

  // 동서양 조화도 보정
  let eastWestBonus = 0
  if (factors.eastWestHarmony !== undefined) {
    eastWestBonus = (factors.eastWestHarmony - 50) * 0.1 // 최대 ±5점
  }

  // 종합 점수 계산
  let totalWeight = weights.birthTime + weights.dataCompleteness + weights.methodAlignment
  let score =
    birthTimeScore * weights.birthTime +
    factors.dataCompleteness * weights.dataCompleteness +
    factors.methodAlignment * weights.methodAlignment

  if (breakdown.historicalValidation) {
    score += breakdown.historicalValidation.score * weights.historicalValidation
    totalWeight += weights.historicalValidation
  }

  score = score / totalWeight + eastWestBonus
  score = Math.round(Math.min(100, Math.max(0, score)))

  // 등급 결정
  const grade = getConfidenceGrade(score)

  // 해석 생성
  const interpretation = generateConfidenceInterpretation(score, grade, predictionType)

  // 추천사항 생성
  const recommendations = generateConfidenceRecommendations(factors, score)

  return {
    score,
    grade,
    breakdown: {
      birthTime: breakdown.birthTime,
      dataCompleteness: breakdown.dataCompleteness,
      methodAlignment: breakdown.methodAlignment,
      historicalValidation: breakdown.historicalValidation,
    },
    interpretation,
    recommendations,
  }
}

function getWeightsForPredictionType(type: string): {
  birthTime: number
  dataCompleteness: number
  methodAlignment: number
  historicalValidation: number
} {
  // 예측 기간에 따라 가중치 조정
  switch (type) {
    case 'daily':
      return {
        birthTime: 0.35,
        dataCompleteness: 0.25,
        methodAlignment: 0.25,
        historicalValidation: 0.15,
      }
    case 'monthly':
      return {
        birthTime: 0.3,
        dataCompleteness: 0.25,
        methodAlignment: 0.3,
        historicalValidation: 0.15,
      }
    case 'yearly':
      return {
        birthTime: 0.25,
        dataCompleteness: 0.25,
        methodAlignment: 0.3,
        historicalValidation: 0.2,
      }
    case 'lifetime':
      return {
        birthTime: 0.2,
        dataCompleteness: 0.3,
        methodAlignment: 0.3,
        historicalValidation: 0.2,
      }
    default:
      return {
        birthTime: 0.25,
        dataCompleteness: 0.25,
        methodAlignment: 0.3,
        historicalValidation: 0.2,
      }
  }
}

function getConfidenceGrade(score: number): ConfidenceGrade {
  if (score >= 95) {
    return 'A+'
  }
  if (score >= 85) {
    return 'A'
  }
  if (score >= 75) {
    return 'B+'
  }
  if (score >= 65) {
    return 'B'
  }
  if (score >= 55) {
    return 'C+'
  }
  if (score >= 45) {
    return 'C'
  }
  if (score >= 35) {
    return 'D'
  }
  return 'F'
}

function generateConfidenceInterpretation(
  score: number,
  grade: ConfidenceGrade,
  type: string
): string {
  const typeNames: Record<string, string> = {
    daily: '일간',
    monthly: '월간',
    yearly: '연간',
    lifetime: '평생',
  }

  if (score >= 85) {
    return `${typeNames[type] || ''} 예측 신뢰도가 매우 높습니다 (${grade}등급). 분석 결과를 충분히 참고하실 수 있습니다.`
  } else if (score >= 70) {
    return `${typeNames[type] || ''} 예측 신뢰도가 양호합니다 (${grade}등급). 대부분의 분석이 유의미합니다.`
  } else if (score >= 55) {
    return `${typeNames[type] || ''} 예측 신뢰도가 보통입니다 (${grade}등급). 참고 자료로 활용하세요.`
  } else {
    return `${typeNames[type] || ''} 예측 신뢰도가 낮습니다 (${grade}등급). 추가 정보가 있으면 정확도가 향상됩니다.`
  }
}

function generateConfidenceRecommendations(factors: ConfidenceFactors, score: number): string[] {
  const recommendations: string[] = []

  if (factors.birthTimeAccuracy === 'unknown') {
    recommendations.push('정확한 출생 시간을 입력하면 신뢰도가 크게 향상됩니다.')
  } else if (factors.birthTimeAccuracy === 'within_2hours') {
    recommendations.push('출생 시간을 1시간 단위로 좁히면 더 정확한 분석이 가능합니다.')
  }

  if (factors.dataCompleteness < 70) {
    recommendations.push('대운, 용신, 기신 정보를 추가하면 분석 정확도가 높아집니다.')
  }

  if (factors.methodAlignment < 60) {
    recommendations.push('동서양 분석 결과가 다를 수 있으니 상황에 맞게 활용하세요.')
  }

  if (recommendations.length === 0 && score >= 80) {
    recommendations.push('현재 데이터로 충분히 정확한 분석이 가능합니다.')
  }

  return recommendations
}

/**
 * 여러 엔진의 신뢰도를 통합
 */
export function combineConfidenceScores(
  scores: { source: string; score: number; weight?: number }[]
): { combined: number; breakdown: { source: string; contribution: number }[] } {
  if (scores.length === 0) {
    return { combined: 50, breakdown: [] }
  }

  const totalWeight = scores.reduce((sum, s) => sum + (s.weight || 1), 0)
  const combined = Math.round(
    scores.reduce((sum, s) => sum + s.score * (s.weight || 1), 0) / totalWeight
  )

  const breakdown = scores.map((s) => ({
    source: s.source,
    contribution: Math.round((s.score * (s.weight || 1)) / totalWeight),
  }))

  return { combined, breakdown }
}
