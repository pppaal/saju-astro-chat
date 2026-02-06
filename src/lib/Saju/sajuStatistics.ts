/**
 * sajuStatistics.ts - 사주 통계 분석 엔진 (1000% 레벨)
 *
 * 사주 데이터의 통계적 분석, 분포 분석, 상관관계 분석, 인구 통계
 *
 * ✅ REFACTORING COMPLETED:
 * - Original 1053 lines modularized into statistics/ directory
 * - Types in ./types/statistics.ts
 * - This file is now a facade that re-exports from modules
 *
 * Module structure:
 * - statistics/helpers/elementHelpers.ts: Element helper functions
 * - statistics/core/basicStats.ts: Basic statistical functions
 * - statistics/core/distributionAnalysis.ts: Distribution calculations
 * - statistics/frequency/frequencyAnalysis.ts: Frequency analysis
 * - statistics/rarity/rarityScoring.ts: Rarity score calculation
 * - statistics/correlation/correlationAnalysis.ts: Correlation analysis
 * - statistics/cluster/clusterAnalysis.ts: K-means clustering
 * - statistics/anomaly/anomalyDetection.ts: Anomaly detection
 * - statistics/population/populationStats.ts: Population statistics
 * - statistics/trend/trendAnalysis.ts: Trend analysis
 * - statistics/report/statisticsReport.ts: Report generation
 */

// Re-export everything from the statistics module
export * from './statistics'
