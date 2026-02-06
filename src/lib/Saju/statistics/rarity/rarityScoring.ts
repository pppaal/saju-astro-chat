/**
 * rarityScoring.ts - 사주 희귀도 분석
 */

import type { SajuResult, PopulationStats, RarityScore } from '../../types/statistics'
import { getStemElement, getBranchElement } from '../helpers/elementHelpers'

/**
 * 사주 희귀도 점수 계산
 */
export function calculateRarityScore(
  saju: SajuResult,
  populationStats: PopulationStats
): RarityScore {
  const pillars = saju.fourPillars

  // 오행 희귀도
  const elements = [
    getStemElement(pillars.year.stem),
    getStemElement(pillars.month.stem),
    getStemElement(pillars.day.stem),
    getStemElement(pillars.hour.stem),
    getBranchElement(pillars.year.branch),
    getBranchElement(pillars.month.branch),
    getBranchElement(pillars.day.branch),
    getBranchElement(pillars.hour.branch),
  ]

  const elementCounts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const el of elements) {
    elementCounts[el]++
  }

  // 편중도 계산 (편중될수록 희귀)
  const elementValues = Object.values(elementCounts)
  const maxElement = Math.max(...elementValues)
  const minElement = Math.min(...elementValues)
  const elementRarity = ((maxElement - minElement) / 8) * 100

  // 천간 희귀도
  const dayMaster = pillars.day.stem
  const dmDistribution = populationStats.dayMasterDistribution
  const dmCount = (dmDistribution as Record<string, number>)[dayMaster] || 1
  const dmPercentage = dmCount / dmDistribution.total
  const stemRarity = (1 - dmPercentage) * 100

  // 지지 희귀도 (특수한 조합)
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch,
  ]
  const uniqueBranches = new Set(branches).size
  const branchRarity = ((4 - uniqueBranches) / 3) * 50 + (uniqueBranches === 4 ? 0 : 50)

  // 조합 희귀도 (특수 격국, 공망 등)
  let combinationRarity = 0

  // 종격 체크
  if (maxElement >= 6) {
    combinationRarity += 30 // 종격은 희귀
  }

  // 일행득기 체크
  if (Object.values(elementCounts).filter((v) => v === 0).length >= 2) {
    combinationRarity += 20
  }

  // 전체 희귀도
  const overall =
    elementRarity * 0.3 + stemRarity * 0.2 + branchRarity * 0.2 + combinationRarity * 0.3

  // 설명 생성
  let description: string
  if (overall >= 80) {
    description = '매우 희귀한 사주 구성입니다. 독특한 운명의 소유자입니다.'
  } else if (overall >= 60) {
    description = '다소 희귀한 사주 구성입니다. 특별한 재능이나 운명이 있을 수 있습니다.'
  } else if (overall >= 40) {
    description = '보통 수준의 사주 구성입니다.'
  } else {
    description = '일반적인 사주 구성입니다.'
  }

  return {
    overall: Math.min(100, Math.max(0, overall)),
    elementRarity,
    stemRarity,
    branchRarity,
    combinationRarity,
    description,
  }
}
