// src/lib/prediction/index.ts
// 예측 시스템 통합 모듈

// ========================================
// 통일된 점수-등급 변환 시스템
// ========================================

export type PredictionGrade = 'S' | 'A+' | 'A' | 'B' | 'C' | 'D';

export interface StandardizedScore {
  score: number;
  grade: PredictionGrade;
  label: string;
  labelEn: string;
}

/**
 * 점수를 0-100 범위로 정규화하고 등급을 반환
 * 모든 예측 엔진에서 이 함수를 사용해야 함
 *
 * 등급 기준:
 * S: 90점 이상 - 최적기
 * A+: 80-89점 - 매우 좋은 시기
 * A: 70-79점 - 좋은 시기
 * B: 60-69점 - 괜찮은 시기
 * C: 50-59점 - 보통
 * D: 50점 미만 - 주의 필요
 */
export function standardizeScore(rawScore: number): StandardizedScore {
  // 0-100 범위로 정규화
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let grade: PredictionGrade;
  let label: string;
  let labelEn: string;

  if (score >= 90) {
    grade = 'S';
    label = '최적기';
    labelEn = 'Optimal';
  } else if (score >= 80) {
    grade = 'A+';
    label = '매우 좋은 시기';
    labelEn = 'Excellent';
  } else if (score >= 70) {
    grade = 'A';
    label = '좋은 시기';
    labelEn = 'Good';
  } else if (score >= 60) {
    grade = 'B';
    label = '괜찮은 시기';
    labelEn = 'Fair';
  } else if (score >= 50) {
    grade = 'C';
    label = '보통';
    labelEn = 'Average';
  } else {
    grade = 'D';
    label = '주의 필요';
    labelEn = 'Caution';
  }

  return { score, grade, label, labelEn };
}

/**
 * 등급만 빠르게 계산
 */
export function scoreToGrade(score: number): PredictionGrade {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

/**
 * 등급에 해당하는 최소 점수
 */
export function gradeToMinScore(grade: PredictionGrade): number {
  switch (grade) {
    case 'S': return 90;
    case 'A+': return 80;
    case 'A': return 70;
    case 'B': return 60;
    case 'C': return 50;
    case 'D': return 0;
  }
}

// ========================================
// 모듈 내보내기
// ========================================

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
