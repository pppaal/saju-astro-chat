/**
 * anomalyDetection.ts - 이상치 탐지
 */

import type { SajuResult, PopulationStats, AnomalyDetection } from '../../types/statistics'
import { getStemElement, getBranchElement } from '../helpers/elementHelpers'

/**
 * 이상치 탐지
 */
export function detectAnomalies(
  saju: SajuResult,
  populationStats: PopulationStats
): AnomalyDetection {
  const anomalousFeatures: string[] = []
  let anomalyScore = 0

  const pillars = saju.fourPillars

  // 오행 분포 이상
  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem]
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch,
  ]

  for (const stem of stems) {
    const el = getStemElement(stem)
    if (el in elements) {
      ;(elements as Record<string, number>)[el]++
    }
  }
  for (const branch of branches) {
    const el = getBranchElement(branch)
    if (el in elements) {
      ;(elements as Record<string, number>)[el]++
    }
  }

  // 극단적 편중 (7개 이상)
  for (const [el, count] of Object.entries(elements)) {
    if (count >= 7) {
      anomalousFeatures.push(`${el} 극단적 편중 (${count}/8)`)
      anomalyScore += 0.3
    }
  }

  // 완전 부재
  const missingElements = Object.entries(elements).filter(([_, count]) => count === 0)
  if (missingElements.length >= 2) {
    anomalousFeatures.push(`다중 오행 부재 (${missingElements.map(([el]) => el).join(', ')})`)
    anomalyScore += 0.2 * missingElements.length
  }

  // 일간 희귀도
  const dayMaster = pillars.day.stem
  const dmDist = populationStats.dayMasterDistribution
  const dmPercentage = ((dmDist as Record<string, number>)[dayMaster] || 0) / dmDist.total
  if (dmPercentage < 0.05) {
    anomalousFeatures.push(`희귀한 일간 (${dayMaster})`)
    anomalyScore += 0.15
  }

  // 같은 지지 반복
  const branchCounts: Record<string, number> = {}
  for (const branch of branches) {
    branchCounts[branch] = (branchCounts[branch] || 0) + 1
  }
  for (const [branch, count] of Object.entries(branchCounts)) {
    if (count >= 3) {
      anomalousFeatures.push(`지지 삼중 (${branch})`)
      anomalyScore += 0.2
    }
  }

  const isAnomaly = anomalyScore > 0.5
  let explanation: string

  if (anomalyScore > 0.7) {
    explanation = '매우 특이한 사주 구성입니다. 일반적인 해석 방법으로는 한계가 있을 수 있습니다.'
  } else if (anomalyScore > 0.5) {
    explanation = '다소 특이한 사주 구성입니다. 특별한 관점에서의 해석이 필요합니다.'
  } else if (anomalyScore > 0.3) {
    explanation = '약간의 특이점이 있지만 정상 범주입니다.'
  } else {
    explanation = '일반적인 사주 구성입니다.'
  }

  return {
    isAnomaly,
    anomalyScore: Math.min(1, anomalyScore),
    anomalousFeatures,
    explanation,
  }
}
