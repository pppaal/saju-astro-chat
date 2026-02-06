/**
 * trendAnalysis.ts - 시계열 추세 분석
 */

import type { TrendAnalysis } from '../../types/statistics'

/**
 * 시계열 추세 분석
 */
export function analyzeTrend(values: number[], labels: string[]): TrendAnalysis {
  if (values.length < 2) {
    return {
      period: labels.join(' - '),
      trend: 'stable',
      changeRate: 0,
      forecast: [],
      confidence: 0,
    }
  }

  // 변화율 계산
  const changes: number[] = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }

  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length
  const changeVariance =
    changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length

  // 추세 판단
  let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating'
  if (changeVariance > Math.abs(avgChange) * 2) {
    trend = 'fluctuating'
  } else if (avgChange > 0.1) {
    trend = 'increasing'
  } else if (avgChange < -0.1) {
    trend = 'decreasing'
  } else {
    trend = 'stable'
  }

  // 간단한 선형 예측
  const forecast: number[] = []
  const lastValue = values[values.length - 1]
  for (let i = 1; i <= 3; i++) {
    forecast.push(lastValue + avgChange * i)
  }

  // 신뢰도 (변동성 반비례)
  const confidence = Math.max(0, Math.min(100, 100 - changeVariance * 10))

  return {
    period: `${labels[0]} - ${labels[labels.length - 1]}`,
    trend,
    changeRate: avgChange,
    forecast,
    confidence,
  }
}
