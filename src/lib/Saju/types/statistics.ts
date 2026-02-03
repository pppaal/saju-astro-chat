/**
 * Saju Statistics Types
 * Extracted from sajuStatistics.ts for better organization
 */

// 간소화된 사주 결과 인터페이스
interface SimplePillar {
  stem: string
  branch: string
}

interface SimpleFourPillars {
  year: SimplePillar
  month: SimplePillar
  day: SimplePillar
  hour: SimplePillar
}

export interface SajuResult {
  fourPillars: SimpleFourPillars
  dayMaster?: string
  [key: string]: unknown
}

export interface ElementDistribution {
  목: number
  화: number
  토: number
  금: number
  수: number
  total: number
}

export interface StemDistribution {
  [key: string]: number // 인덱스 시그니처
  甲: number
  乙: number
  丙: number
  丁: number
  戊: number
  己: number
  庚: number
  辛: number
  壬: number
  癸: number
  total: number
}

export interface BranchDistribution {
  [key: string]: number // 인덱스 시그니처
  子: number
  丑: number
  寅: number
  卯: number
  辰: number
  巳: number
  午: number
  未: number
  申: number
  酉: number
  戌: number
  亥: number
  total: number
}

export interface StatisticalSummary {
  mean: number
  median: number
  mode: number[]
  standardDeviation: number
  variance: number
  min: number
  max: number
  range: number
  quartiles: { q1: number; q2: number; q3: number }
  skewness: number
  kurtosis: number
}

export interface CorrelationResult {
  variable1: string
  variable2: string
  correlation: number // -1 to 1
  pValue: number
  significance: 'strong' | 'moderate' | 'weak' | 'none'
}

export interface FrequencyAnalysis {
  item: string
  count: number
  percentage: number
  rank: number
}

export interface PopulationStats {
  totalSamples: number
  elementDistribution: ElementDistribution
  stemDistribution: StemDistribution
  branchDistribution: BranchDistribution
  dayMasterDistribution: StemDistribution
  yinYangRatio: { yin: number; yang: number }
  monthDistribution: Record<number, number>
  hourDistribution: Record<number, number>
  genderDistribution: { male: number; female: number }
}

export interface RarityScore {
  overall: number // 0-100, 높을수록 희귀
  elementRarity: number
  stemRarity: number
  branchRarity: number
  combinationRarity: number
  description: string
}

export interface TrendAnalysis {
  period: string
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating'
  changeRate: number
  forecast: number[]
  confidence: number
}

export interface ClusterAnalysis {
  clusterId: number
  centroid: Record<string, number>
  members: SajuResult[]
  characteristics: string[]
  size: number
  percentage: number
}

export interface AnomalyDetection {
  isAnomaly: boolean
  anomalyScore: number // 0-1
  anomalousFeatures: string[]
  explanation: string
}
