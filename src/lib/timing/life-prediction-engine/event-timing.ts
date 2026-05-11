// src/lib/prediction/life-prediction-engine/event-timing.ts
// Event Timing Analysis Module (TIER 5+)
// Extracted from lifePredictionEngine.ts

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
} from '../advancedTimingEngine';

import { scoreToGrade } from '../index';
import { normalizeScore } from '../utils/scoring-utils';

import {
  SCORING_WEIGHTS,
} from '../constants/scoring';

import {
  getSolarTermForDate,
  calculateSecondaryProgression,
} from '../precisionEngine';

import { STEM_ELEMENT } from '../engine/constants';

import {
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  estimateMonthlyTransitScore,
} from '../life-prediction-astro';

import {
  calculateCompoundLuckScore,
} from '../life-prediction-helpers';

import { EventTimingStrategyFactory } from '../strategies/StrategyFactory';
import type { ScoringContext } from '../strategies/types';

import { calculateTier6Bonus } from '../tier6Analysis';
import { calculateTier7To10Bonus } from '../tier7To10Analysis';

import {
  findSpecificGoodDays,
} from '../life-prediction/helpers/good-day-finder';

import { generateEventAdvice } from '../life-prediction/formatters/text-generators';

import type {
  LifePredictionInput,
  EventType,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
} from '../life-prediction-types';

/**
 * Find Optimal Event Timing (TIER 5+)
 * Finds the best time periods for specific life events
 */
export function findOptimalEventTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startYear: number,
  endYear: number,
  options: { useProgressions?: boolean; useSolarTerms?: boolean } = {}
): EventTimingResult {
  const { useProgressions = true, useSolarTerms = true } = options;

  // Get event-specific strategy
  const strategy = EventTimingStrategyFactory.getStrategy(eventType);
  if (!strategy) {
    return {
      eventType,
      searchRange: { startYear, endYear },
      optimalPeriods: [],
      avoidPeriods: [],
      nextBestWindow: null,
      advice: `Unknown event type: ${eventType}`,
    };
  }

  const optimalPeriods: OptimalPeriod[] = [];
  const avoidPeriods: AvoidPeriod[] = [];
  const candidatePeriods: OptimalPeriod[] = [];
  const currentDate = new Date();
  const birthDate = new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1);

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const midMonth = new Date(year, month - 1, 15);
      const age = year - input.birthYear;

      const monthGanji = calculateMonthlyGanji(year, month);
      const yearGanji = calculateYearlyGanji(year);
      const twelveStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);
      const sibsin = calculateSibsin(input.dayStem, monthGanji.stem);
      const monthElement = STEM_ELEMENT[monthGanji.stem];

      const solarTerm = useSolarTerms ? getSolarTermForDate(midMonth) : null;
      const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
      const progression = useProgressions ? calculateSecondaryProgression(birthDate, midMonth) : undefined;

      // Build scoring context
      const context: ScoringContext = {
        year,
        month,
        age,
        dayStem: input.dayStem,
        dayBranch: input.dayBranch,
        monthBranch: monthGanji.branch,
        yearBranch: yearGanji.branch,
        monthElement,
        twelveStage,
        sibsin,
        yongsin: input.yongsin,
        kisin: input.kisin,
        daeun,
        solarTerm: solarTerm || undefined,
        progression,
      };

      // Calculate score using strategy pattern
      const result = strategy.calculateBaseScore(context);
      strategy.applySibsinBonus(context, result);
      strategy.applyTwelveStageBonus(context, result);
      strategy.applyElementBonus(context, result);
      strategy.applyYongsinKisinBonus(context, result);
      strategy.applySolarTermBonus(context, result);
      strategy.applyProgressionBonus(context, result);
      strategy.applyDaeunBonus(context, result);

      let score = result.score;
      const reasons = [...result.reasons];
      const avoidReasons = [...result.avoidReasons];

      // Branch interactions
      const allBranches = [input.dayBranch, input.monthBranch, yearGanji.branch, monthGanji.branch];
      const interactions = analyzeBranchInteractions(allBranches);
      for (const inter of interactions) {
        if (inter.impact === 'positive') {
          score += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION;
          if (inter.type === '삼합' || inter.type === '육합') {
            reasons.push(inter.description);
          }
        } else if (inter.impact === 'negative') {
          score += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION;
          if (inter.type === '충') {
            avoidReasons.push(inter.description);
          }
        }
      }

      // Astro bonuses
      const astroBonus = calculateAstroBonus(input, eventType);
      score += astroBonus.bonus;
      reasons.push(...astroBonus.reasons);
      avoidReasons.push(...astroBonus.penalties);

      // Transit bonuses
      if (year === new Date().getFullYear() && month === new Date().getMonth() + 1) {
        const transitBonus = calculateTransitBonus(input, eventType);
        score += transitBonus.bonus;
        reasons.push(...transitBonus.reasons);
        avoidReasons.push(...transitBonus.penalties);

        const houseOverlay = calculateTransitHouseOverlay(input, eventType);
        score += houseOverlay.bonus;
        reasons.push(...houseOverlay.reasons);
      } else {
        const transitEstimate = estimateMonthlyTransitScore(input, eventType, year, month);
        score += transitEstimate.bonus;
        reasons.push(...transitEstimate.reasons);
      }

      // Compound luck
      const compoundLuck = calculateCompoundLuckScore(input, eventType, year, month);
      score += compoundLuck.bonus;
      reasons.push(...compoundLuck.reasons);
      avoidReasons.push(...compoundLuck.penalties);

      // Tier 6 bonuses
      const tier6Input = {
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
        dayStem: input.dayStem,
        dayBranch: input.dayBranch,
        monthBranch: input.monthBranch,
        yearBranch: input.yearBranch,
        yongsin: input.yongsin,
        kisin: input.kisin,
        advancedAstro: input.advancedAstro,
      };
      const tier6 = calculateTier6Bonus(tier6Input, eventType, year, month);
      score += tier6.total;
      reasons.push(...tier6.progression.reasons);
      reasons.push(...tier6.shinsal.reasons);
      reasons.push(...tier6.dayPillar.reasons);
      avoidReasons.push(...tier6.progression.penalties);
      avoidReasons.push(...tier6.shinsal.penalties);
      avoidReasons.push(...tier6.dayPillar.warnings);

      // Tier 7-10 bonuses
      const tier7To10Input = {
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
        birthHour: input.birthHour,
        dayStem: input.dayStem,
        dayBranch: input.dayBranch,
        monthStem: input.allStems?.[1] || '',
        monthBranch: input.monthBranch,
        yearStem: input.allStems?.[0] || '',
        yearBranch: input.yearBranch,
        hourStem: input.allStems?.[3],
        hourBranch: input.allBranches?.[3],
        allStems: input.allStems,
        allBranches: input.allBranches,
        yongsin: input.yongsin,
        kisin: input.kisin,
        advancedAstro: input.advancedAstro,
      };
      const tier7To10 = calculateTier7To10Bonus(tier7To10Input, eventType, year, month);
      score += tier7To10.total;
      reasons.push(...tier7To10.reasons);
      avoidReasons.push(...tier7To10.penalties);

      score = normalizeScore(score);

      candidatePeriods.push({
        startDate: monthStart,
        endDate: monthEnd,
        score,
        grade: scoreToGrade(score),
        reasons,
      });

      if (score >= 70) {
        const grade = scoreToGrade(score);
        const specificDays = findSpecificGoodDays(input, monthStart, monthEnd, eventType, {
          useLunarMansions: true,
          usePlanetaryHours: false,
        });

        optimalPeriods.push({
          startDate: monthStart,
          endDate: monthEnd,
          score,
          grade,
          reasons,
          specificDays,
        });
      } else if (score <= 35) {
        avoidPeriods.push({
          startDate: monthStart,
          endDate: monthEnd,
          score,
          reasons: avoidReasons,
        });
      }
    }
  }

  if (optimalPeriods.length === 0 && candidatePeriods.length > 0) {
    candidatePeriods.sort((a, b) => b.score - a.score);
    const fallback = candidatePeriods.slice(0, 3).map(p => ({
      ...p,
      specificDays: findSpecificGoodDays(input, p.startDate, p.endDate, eventType, {
        useLunarMansions: true,
        usePlanetaryHours: false,
      }),
    }));
    optimalPeriods.push(...fallback);
  }

  optimalPeriods.sort((a, b) => b.score - a.score);
  avoidPeriods.sort((a, b) => a.score - b.score);

  const futureOptimal = optimalPeriods.filter(p => p.startDate > currentDate);
  const nextBestWindow = futureOptimal.length > 0 ? futureOptimal[0] : null;

  const advice = generateEventAdvice(eventType, optimalPeriods, avoidPeriods, nextBestWindow);

  return {
    eventType,
    searchRange: { startYear, endYear },
    optimalPeriods: optimalPeriods.slice(0, 10),
    avoidPeriods: avoidPeriods.slice(0, 5),
    nextBestWindow,
    advice,
  };
}
