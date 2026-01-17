/**
 * @file Life Prediction Engine modules
 *
 * This directory contains modularized components for the life prediction engine.
 *
 * Available modules:
 * - types.ts: All type definitions and interfaces
 * - constants.ts: Constants and configuration data
 *
 * Main analysis functions remain in lifePredictionEngine.ts for backward compatibility:
 * - analyzeMultiYearTrend() - Multi-year trend analysis
 * - analyzePastDate() - Past date retrospective
 * - findOptimalEventTiming() - Event timing optimization
 * - findWeeklyOptimalTiming() - Weekly event timing
 * - generateComprehensivePrediction() - Comprehensive prediction
 * - generateLifePredictionPromptContext() - AI prompt generation
 */

// Re-export types
export * from './types';

// Re-export constants
export * from './constants';

// Re-export main functions from lifePredictionEngine for backward compatibility
export {
  // Re-export utility
  convertSajuDaeunToInfo,

  // Main analysis functions
  analyzeMultiYearTrend,
  analyzePastDate,
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
  generateComprehensivePrediction,

  // Prompt context generators
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from '../lifePredictionEngine';
