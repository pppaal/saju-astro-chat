/**
 * statisticsReport.ts - 종합 통계 보고서 생성
 */

import type {
  SajuResult,
  PopulationStats,
  RarityScore,
  AnomalyDetection,
  ClusterAnalysis,
} from '../../types/statistics'
import { calculatePopulationStats } from '../population/populationStats'
import { analyzeGabjaFrequency } from '../frequency/frequencyAnalysis'
import { performClusterAnalysis } from '../cluster/clusterAnalysis'
import { calculateRarityScore } from '../rarity/rarityScoring'
import { detectAnomalies } from '../anomaly/anomalyDetection'

/**
 * 종합 통계 보고서 생성
 */
export function generateStatisticsReport(
  sajuList: SajuResult[],
  targetSaju?: SajuResult
): {
  populationStats: PopulationStats
  frequencyAnalysis: ReturnType<typeof analyzeGabjaFrequency>
  clusterAnalysis: ClusterAnalysis[]
  targetRarity?: RarityScore
  targetAnomaly?: AnomalyDetection
  insights: string[]
} {
  const populationStats = calculatePopulationStats(sajuList)
  const frequencyAnalysis = analyzeGabjaFrequency(sajuList)
  const clusterAnalysis = performClusterAnalysis(sajuList, 5)

  let targetRarity: RarityScore | undefined
  let targetAnomaly: AnomalyDetection | undefined

  if (targetSaju) {
    targetRarity = calculateRarityScore(targetSaju, populationStats)
    targetAnomaly = detectAnomalies(targetSaju, populationStats)
  }

  // 인사이트 생성
  const insights: string[] = []

  // 오행 분포 인사이트
  const elementDist = populationStats.elementDistribution
  const sortedElements = Object.entries(elementDist)
    .filter(([key]) => key !== 'total')
    .sort((a, b) => b[1] - a[1])

  insights.push(
    `전체 샘플에서 가장 많은 오행은 ${sortedElements[0][0]} (${((sortedElements[0][1] / elementDist.total) * 100).toFixed(1)}%)입니다.`
  )

  // 일간 분포 인사이트
  const dmDist = populationStats.dayMasterDistribution
  const sortedDM = Object.entries(dmDist)
    .filter(([key]) => key !== 'total')
    .sort((a, b) => b[1] - a[1])

  insights.push(
    `가장 흔한 일간은 ${sortedDM[0][0]} (${((sortedDM[0][1] / dmDist.total) * 100).toFixed(1)}%)입니다.`
  )

  // 음양 비율
  const yyRatio = populationStats.yinYangRatio
  const total = yyRatio.yin + yyRatio.yang
  if (total > 0) {
    insights.push(
      `음양 비율: 음 ${((yyRatio.yin / total) * 100).toFixed(1)}%, 양 ${((yyRatio.yang / total) * 100).toFixed(1)}%`
    )
  }

  // 클러스터 인사이트
  if (clusterAnalysis.length > 0) {
    const largestCluster = clusterAnalysis.sort((a, b) => b.size - a.size)[0]
    insights.push(
      `가장 큰 그룹은 "${largestCluster.characteristics.join(', ')}" 유형으로 전체의 ${largestCluster.percentage.toFixed(1)}%를 차지합니다.`
    )
  }

  return {
    populationStats,
    frequencyAnalysis,
    clusterAnalysis,
    targetRarity,
    targetAnomaly,
    insights,
  }
}
