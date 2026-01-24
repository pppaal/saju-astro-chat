/**
 * Life Prediction Module
 * 인생 예측 관련 모듈 barrel export
 */

// Types
export type {
  AstroDataForPrediction,
  TransitAspectForPrediction,
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
  LifeCyclePhase,
  PastRetrospective,
  EventType,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  WeeklyPeriod,
  WeeklyEventTimingResult,
  ComprehensivePrediction,
  UpcomingHighlight,
  BonusResult,
  EventFavorableConditions,
  PredictionGrade,
  CausalFactor,
  ConfidenceFactors,
  EventCategoryScores,
  SolarTerm,
  LunarMansion,
} from './types';

// Constants
export {
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  ASTRO_EVENT_CONDITIONS,
  TRANSIT_EVENT_CONDITIONS,
  EVENT_HOUSES,
  SIBSIN_SCORES,
  SIBSIN_SCORES_RELATIVE,
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  BRANCH_CLASHES,
  BRANCH_PUNISHMENTS,
  EVENT_NAMES,
  EVENT_NAMES_FULL,
} from './constants';

// Astro Bonus Calculations
export {
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  calculateCombinedAstroBonus,
} from './astro-bonus';

// Relation Analysis
export {
  analyzeStemRelation,
  analyzeBranchRelation,
  analyzeMultiLayerInteraction,
  analyzeDaeunTransition,
  generateEnergyRecommendations,
} from './relation-analysis';

// Multi-Year Trend Analysis
export { analyzeMultiYearTrend } from './multi-year';

// Event Timing Analysis
export {
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
} from './event-timing';

// Comprehensive Prediction
export {
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from './comprehensive';
