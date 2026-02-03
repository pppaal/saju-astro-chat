/**
 * Life Prediction Engine - Main Orchestrator
 *
 * ✅ REFACTORING COMPLETED:
 * - Original: 1,819 lines → First refactor: 928 lines → Final: 176 lines (90% reduction)
 * - Core logic extracted to life-prediction-engine/ modules
 *
 * Extracted modules (life-prediction-engine/):
 * - types.ts: Type re-exports from life-prediction-types.ts
 * - multi-year-trend.ts: Multi-year trend analysis (~190 lines)
 * - past-retrospective.ts: Past date retrospective analysis (~280 lines)
 * - event-timing.ts: Event timing optimization (~280 lines)
 * - weekly-timing.ts: Weekly event timing analysis (~115 lines)
 * - comprehensive.ts: Comprehensive prediction generation (~80 lines)
 * - index.ts: Unified module exports
 *
 * Previous extractions (life-prediction/):
 * - formatters/text-generators.ts: Text generation functions (~210 lines)
 * - analyzers/event-category.ts: Event-specific analysis (~100 lines)
 * - helpers/good-day-finder.ts: Daily filtering logic (~130 lines)
 * - weekly/analyzer.ts: Weekly period analysis (~217 lines)
 * - lifecycle/analyzer.ts: Lifecycle phase analysis (~35 lines)
 * - summary/highlights.ts: Highlight extraction (~65 lines)
 *
 * This orchestrator file now simply coordinates imports and re-exports,
 * maintaining full backward compatibility with zero breaking changes.
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

// Re-export all types from life-prediction-types
export type {
  AstroDataForPrediction,
  TransitAspectForPrediction,
  OuterPlanetPosition,
  AdvancedAstroForPrediction,
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
  ComprehensivePrediction,
  UpcomingHighlight,
  WeeklyPeriod,
  WeeklyEventTimingResult,
  BonusResult,
  ShinsalInfo,
} from './life-prediction-types';

// ============================================================
// FUNCTION EXPORTS - Core Modules
// ============================================================

// Re-export main functions from life-prediction-engine modules
export {
  analyzeMultiYearTrend,
  analyzePastDate,
  analyzePastPeriod,
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
  generateComprehensivePrediction,
} from './life-prediction-engine';

// ============================================================
// UTILITY EXPORTS
// ============================================================

// Re-export helper function
import { convertSajuDaeunToInfo as _convertSajuDaeunToInfo } from './daeunTransitSync';
export const convertSajuDaeunToInfo = _convertSajuDaeunToInfo;

// Re-export prompt context generators
export {
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from './prompt-contexts';

// ============================================================
// END OF FILE
// All functions have been extracted to modules in life-prediction-engine/
// This file now serves as a simple re-export orchestrator
// ============================================================
