/**
 * statistics/index.ts - 사주 통계 분석 모듈 통합 exports
 */

// Types re-export
export type {
  SajuResult,
  ElementDistribution,
  StemDistribution,
  BranchDistribution,
  StatisticalSummary,
  CorrelationResult,
  FrequencyAnalysis,
  PopulationStats,
  RarityScore,
  TrendAnalysis,
  ClusterAnalysis,
  AnomalyDetection,
} from '../types/statistics'

// Helpers
export {
  getStemElement,
  getBranchElement,
  getStemYinYang,
  getBranchYinYang,
} from './helpers/elementHelpers'

// Core - Basic Stats
export {
  calculateStatisticalSummary,
  calculateCorrelation,
  chiSquareTest,
} from './core/basicStats'

// Core - Distribution
export {
  calculateElementDistribution,
  calculateStemDistribution,
  calculateBranchDistribution,
  calculateDayMasterDistribution,
  calculateYinYangRatio,
} from './core/distributionAnalysis'

// Frequency Analysis
export {
  performFrequencyAnalysis,
  analyzeGabjaFrequency,
} from './frequency/frequencyAnalysis'

// Rarity Scoring
export { calculateRarityScore } from './rarity/rarityScoring'

// Correlation Analysis
export { analyzeElementCorrelations } from './correlation/correlationAnalysis'

// Cluster Analysis
export { performClusterAnalysis } from './cluster/clusterAnalysis'

// Anomaly Detection
export { detectAnomalies } from './anomaly/anomalyDetection'

// Population Stats
export { calculatePopulationStats } from './population/populationStats'

// Trend Analysis
export { analyzeTrend } from './trend/trendAnalysis'

// Statistics Report
export { generateStatisticsReport } from './report/statisticsReport'
