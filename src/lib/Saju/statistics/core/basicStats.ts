/**
 * basicStats.ts - 기초 통계 함수
 */

import type { StatisticalSummary } from '../../types/statistics'

/**
 * 배열의 통계적 요약
 */
export function calculateStatisticalSummary(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: [],
      standardDeviation: 0,
      variance: 0,
      min: 0,
      max: 0,
      range: 0,
      quartiles: { q1: 0, q2: 0, q3: 0 },
      skewness: 0,
      kurtosis: 0,
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  // 평균
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n

  // 중앙값
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]

  // 최빈값
  const frequency: Record<number, number> = {}
  let maxFreq = 0
  for (const v of sorted) {
    frequency[v] = (frequency[v] || 0) + 1
    if (frequency[v] > maxFreq) {
      maxFreq = frequency[v]
    }
  }
  const mode = Object.entries(frequency)
    .filter(([_, f]) => f === maxFreq)
    .map(([v]) => Number(v))

  // 분산과 표준편차
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
  const standardDeviation = Math.sqrt(variance)

  // 범위
  const min = sorted[0]
  const max = sorted[n - 1]
  const range = max - min

  // 사분위수
  const q1 = sorted[Math.floor(n * 0.25)]
  const q2 = median
  const q3 = sorted[Math.floor(n * 0.75)]

  // 왜도 (Skewness)
  const skewness =
    sorted.reduce((sum, v) => sum + Math.pow((v - mean) / standardDeviation, 3), 0) / n

  // 첨도 (Kurtosis)
  const kurtosis =
    sorted.reduce((sum, v) => sum + Math.pow((v - mean) / standardDeviation, 4), 0) / n - 3

  return {
    mean,
    median,
    mode,
    standardDeviation,
    variance,
    min,
    max,
    range,
    quartiles: { q1, q2, q3 },
    skewness,
    kurtosis,
  }
}

/**
 * 피어슨 상관계수 계산
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0
  }

  const n = x.length
  const meanX = x.reduce((sum, v) => sum + v, 0) / n
  const meanY = y.reduce((sum, v) => sum + v, 0) / n

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX
    const diffY = y[i] - meanY
    numerator += diffX * diffY
    denomX += diffX * diffX
    denomY += diffY * diffY
  }

  const denominator = Math.sqrt(denomX) * Math.sqrt(denomY)
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * 카이제곱 검정
 */
export function chiSquareTest(
  observed: number[],
  expected: number[]
): { chiSquare: number; pValue: number; significant: boolean } {
  if (observed.length !== expected.length) {
    return { chiSquare: 0, pValue: 1, significant: false }
  }

  let chiSquare = 0
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i]
    }
  }

  // 간략화된 p-value 추정 (자유도에 따른 임계값 비교)
  const df = observed.length - 1
  const criticalValues: Record<number, number> = {
    1: 3.84,
    2: 5.99,
    3: 7.81,
    4: 9.49,
    5: 11.07,
    6: 12.59,
    7: 14.07,
    8: 15.51,
    9: 16.92,
    10: 18.31,
  }

  const critical = criticalValues[df] || 3.84 + df * 2
  const significant = chiSquare > critical
  const pValue = significant ? 0.01 : 0.5 // 간략화

  return { chiSquare, pValue, significant }
}
