// src/lib/prediction/index.ts
// 예측 시스템 통합 모듈

export {
  // Types
  type MonthlyTimingScore,
  type TransitEffect,
  type RetrogradeEffect,
  type PredictionConfidence,
  type ConfidenceFactor,
  type YearlyPrediction,
  type QuarterAnalysis,
  type FiveElement,
  type TwelveStage,

  // Functions
  calculateMonthlyTimingScore,
  calculateDetailedConfidence,
  generateYearlyPrediction,
  generatePredictionPromptContext,
} from './timingScore';

export {
  // Types
  type DaeunInfo,
  type TransitInfo,
  type SyncPoint,
  type LifeSyncAnalysis,

  // Functions
  analyzeDaeunTransitSync,
  generateDaeunTransitPromptContext,
  convertSajuDaeunToInfo,
} from './daeunTransitSync';

export {
  // Types
  type LayeredTimingScore,
  type LayerAnalysis,
  type LayerInteraction,
  type BranchInteraction,
  type PreciseTwelveStage,
  type TimingAdvice,
  type MultiLayerInput,
  type AdvancedTimingInput,

  // Functions
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
  analyzeMultiLayer,
  calculateMonthlyGanji,
  calculateYearlyGanji,
  calculateAdvancedMonthlyScore,
  generateAdvancedTimingPromptContext,
} from './advancedTimingEngine';

export {
  // Types
  type UltraPrecisionScore,
  type DailyPillarAnalysis,
  type GongmangAnalysis,
  type ShinsalAnalysis,
  type ShinsalHit,
  type EnergyFlowAnalysis,
  type TonggeunResult,
  type TuechulResult,
  type TransitIntegration,
  type PlanetaryHour,
  type MoonPhaseInfo,
  type HourlyAdvice,
  type CalculateDailyScoreInput,

  // Functions
  calculateDailyPillar,
  analyzeDailyPillar,
  calculateGongmang,
  analyzeGongmang,
  analyzeShinsal,
  analyzeTonggeun,
  analyzeTuechul,
  analyzeEnergyFlow,
  generateHourlyAdvice,
  calculateUltraPrecisionScore,
  generateUltraPrecisionPromptContext,
  generateWeeklyPrediction,
} from './ultraPrecisionEngine';

export {
  // Types
  type ActivityType,
  type DateRecommendation,
  type RecommendedHour,
  type DateSearchInput,
  type YongsinActivation,

  // Functions
  findBestDates,
  findYongsinActivationPeriods,
  generateSpecificDatePromptContext,
  generateYongsinPromptContext,
} from './specificDateEngine';

// 종합 인생 예측 엔진
export {
  // Types
  type LifePredictionInput,
  type MultiYearTrend,
  type YearlyScore,
  type DaeunTransitionPoint,
  type LifeCyclePhase,
  type PastRetrospective,
  type EventType,
  type EventTimingResult,
  type OptimalPeriod,
  type AvoidPeriod,
  type ComprehensivePrediction,
  type UpcomingHighlight,

  // Functions
  analyzeMultiYearTrend,
  analyzePastDate,
  analyzePastPeriod,
  findOptimalEventTiming,
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from './lifePredictionEngine';
