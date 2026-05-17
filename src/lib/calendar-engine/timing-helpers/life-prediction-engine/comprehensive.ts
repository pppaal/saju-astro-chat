// src/lib/prediction/life-prediction-engine/comprehensive.ts
// Comprehensive Prediction Generation Module
// Extracted from lifePredictionEngine.ts

import {
  analyzeDaeunTransitSync,
} from '../daeunTransitSync';

import { analyzeMultiYearTrend } from './multi-year-trend';

import {
  extractUpcomingHighlights,
} from '../life-prediction/summary/highlights';

import type {
  LifePredictionInput,
  ComprehensivePrediction,
} from '../life-prediction-types';

/**
 * Generate Comprehensive Prediction
 * Creates a complete life prediction report
 */
export function generateComprehensivePrediction(
  input: LifePredictionInput,
  yearsRangeOrOptions: number | { startYear?: number; endYear?: number } = 10
): ComprehensivePrediction {
  const currentYear = new Date().getFullYear();
  let startYear = currentYear - 2;
  let endYear = currentYear + 10;

  if (typeof yearsRangeOrOptions === 'number') {
    endYear = currentYear + yearsRangeOrOptions;
  } else if (yearsRangeOrOptions) {
    if (typeof yearsRangeOrOptions.startYear === 'number') {
      startYear = yearsRangeOrOptions.startYear;
    }
    if (typeof yearsRangeOrOptions.endYear === 'number') {
      endYear = yearsRangeOrOptions.endYear;
    } else if (typeof yearsRangeOrOptions.startYear === 'number') {
      endYear = yearsRangeOrOptions.startYear + 10;
    }
  }

  if (endYear < startYear) {
    [startYear, endYear] = [endYear, startYear];
  }

  const multiYearTrend = analyzeMultiYearTrend(input, startYear, endYear);

  let lifeSync;
  if (input.daeunList && input.daeunList.length > 0) {
    const currentAge = currentYear - input.birthYear;
    lifeSync = analyzeDaeunTransitSync(input.daeunList, input.birthYear, currentAge);
  }

  const upcomingHighlights = extractUpcomingHighlights(multiYearTrend, lifeSync, currentYear);

  let confidence = 60;
  if (input.daeunList && input.daeunList.length > 0) {confidence += 15;}
  if (input.yongsin && input.yongsin.length > 0) {confidence += 10;}
  if (input.birthHour !== undefined) {confidence += 10;}
  confidence = Math.min(95, confidence);

  return {
    input,
    generatedAt: new Date(),
    multiYearTrend,
    upcomingHighlights,
    lifeSync,
    confidence,
  };
}
