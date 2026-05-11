// src/lib/prediction/life-prediction-engine/index.ts
// Unified exports for Life Prediction Engine modules

// Re-export types
export type * from './types';

// Re-export functions from modules
export { analyzeMultiYearTrend } from './multi-year-trend';
export { analyzePastDate, analyzePastPeriod } from './past-retrospective';
export { findOptimalEventTiming } from './event-timing';
export { findWeeklyOptimalTiming } from './weekly-timing';
export { generateComprehensivePrediction } from './comprehensive';
