/**
 * Lifecycle Analyzer Module
 * Extracted from lifePredictionEngine.ts
 *
 * Functions for analyzing lifecycle phases based on daeun (major fortune cycles)
 */

import type { YearlyScore, LifeCyclePhase } from '../../life-prediction-types';
import type { DaeunInfo } from '../../daeunTransitSync';
import { generatePhaseTheme, generatePhaseRecommendations } from '../formatters/text-generators';

/**
 * Analyze lifecycle phases based on yearly scores and daeun list
 * Groups years by daeun periods and determines energy level for each phase
 *
 * @param yearlyScores - Array of yearly score data
 * @param daeunList - Array of daeun (major fortune cycle) information
 * @returns Array of lifecycle phases with themes and recommendations
 */
export function analyzeLifeCycles(yearlyScores: YearlyScore[], daeunList: DaeunInfo[]): LifeCyclePhase[] {
  const phases: LifeCyclePhase[] = [];

  // 대운 기반 주기 분석
  for (const daeun of daeunList) {
    const yearsInDaeun = yearlyScores.filter(y => y.daeun === daeun);
    if (yearsInDaeun.length === 0) {continue;}

    const avgScore = yearsInDaeun.reduce((sum, y) => sum + y.score, 0) / yearsInDaeun.length;

    let energy: LifeCyclePhase['energy'];
    if (avgScore >= 70) {energy = 'peak';}
    else if (avgScore >= 55) {energy = 'rising';}
    else if (avgScore >= 40) {energy = 'declining';}
    else {energy = 'dormant';}

    const theme = generatePhaseTheme(daeun, energy);
    const recommendations = generatePhaseRecommendations(energy, daeun.element);

    phases.push({
      name: `${daeun.stem}${daeun.branch} 대운`,
      startYear: yearsInDaeun[0].year,
      endYear: yearsInDaeun[yearsInDaeun.length - 1].year,
      startAge: daeun.startAge,
      endAge: daeun.endAge,
      theme,
      energy,
      recommendations,
    });
  }

  return phases;
}
