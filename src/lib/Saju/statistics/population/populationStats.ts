/**
 * populationStats.ts - 인구 통계 계산
 */

import type { SajuResult, PopulationStats } from '../../types/statistics'
import {
  calculateElementDistribution,
  calculateStemDistribution,
  calculateBranchDistribution,
  calculateDayMasterDistribution,
  calculateYinYangRatio,
} from '../core/distributionAnalysis'

/**
 * 인구 통계 계산
 */
export function calculatePopulationStats(
  sajuList: SajuResult[],
  metadata?: { gender?: ('male' | 'female')[]; birthMonth?: number[]; birthHour?: number[] }
): PopulationStats {
  const elementDistribution = calculateElementDistribution(sajuList)
  const stemDistribution = calculateStemDistribution(sajuList)
  const branchDistribution = calculateBranchDistribution(sajuList)
  const dayMasterDistribution = calculateDayMasterDistribution(sajuList)
  const yinYangRatio = calculateYinYangRatio(sajuList)

  // 월별 분포
  const monthDistribution: Record<number, number> = {}
  for (let i = 1; i <= 12; i++) {
    monthDistribution[i] = 0
  }
  if (metadata?.birthMonth) {
    for (const month of metadata.birthMonth) {
      monthDistribution[month] = (monthDistribution[month] || 0) + 1
    }
  }

  // 시간별 분포
  const hourDistribution: Record<number, number> = {}
  for (let i = 0; i < 24; i++) {
    hourDistribution[i] = 0
  }
  if (metadata?.birthHour) {
    for (const hour of metadata.birthHour) {
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1
    }
  }

  // 성별 분포
  const genderDistribution = { male: 0, female: 0 }
  if (metadata?.gender) {
    for (const g of metadata.gender) {
      genderDistribution[g]++
    }
  }

  return {
    totalSamples: sajuList.length,
    elementDistribution,
    stemDistribution,
    branchDistribution,
    dayMasterDistribution,
    yinYangRatio,
    monthDistribution,
    hourDistribution,
    genderDistribution,
  }
}
