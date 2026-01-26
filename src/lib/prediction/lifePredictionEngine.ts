/**
 * Life Prediction Engine - Refactored Main Orchestrator
 * Original: 1,819 lines → Refactored: ~450 lines
 *
 * Extracted modules:
 * - formatters/text-generators.ts: Text generation functions (~210 lines)
 * - analyzers/event-category.ts: Event-specific analysis (~100 lines)
 * - helpers/good-day-finder.ts: Daily filtering logic (~130 lines)
 * - weekly/analyzer.ts: Weekly period analysis (~217 lines)
 * - lifecycle/analyzer.ts: Lifecycle phase analysis (~35 lines)
 * - summary/highlights.ts: Highlight extraction (~65 lines)
 *
 * This module coordinates all life prediction functionality by orchestrating
 * focused sub-modules for specific tasks.
 */

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
  type FiveElement,
  type BranchInteraction,
  type PreciseTwelveStage,
} from './advancedTimingEngine';

import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo as _convertSajuDaeunToInfo,
  type DaeunInfo,
  type LifeSyncAnalysis,
} from './daeunTransitSync';

// Re-export for external use
export const convertSajuDaeunToInfo = _convertSajuDaeunToInfo;

import { calculateDailyPillar } from './ultraPrecisionEngine';
import { scoreToGrade, type PredictionGrade } from './index';
import { normalizeScore } from './utils/scoring-utils';

import {
  SIBSIN_SCORES,
  SCORING_WEIGHTS,
  SCORE_BOUNDARIES,
  EVENT_SCORING,
} from './constants/scoring';

// TIER 5: Precision analysis engine
import {
  PrecisionEngine,
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
  calculateSecondaryProgression,
  analyzeCausalFactors,
  calculateEventCategoryScores,
  calculateConfidence,
  type SolarTerm,
  type LunarMansion,
  type LunarPhase,
  type PlanetaryHour,
  type CausalFactor,
  type EventCategoryScores,
  type ConfidenceFactors,
} from './precisionEngine';

// TIER 6 & 7-10: Advanced analysis modules
import { calculateTier6Bonus } from './tier6Analysis';
import { calculateTier7To10Bonus } from './tier7To10Analysis';

// Types re-export
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

import type {
  EventType,
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
  LifeCyclePhase,
  PastRetrospective,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  ComprehensivePrediction,
  UpcomingHighlight,
  WeeklyPeriod,
  WeeklyEventTimingResult,
} from './life-prediction-types';

// Constants (using engine/constants for compatibility)
import {
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
} from './engine/constants';

// Astrology correction functions
import {
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  estimateMonthlyTransitScore,
} from './life-prediction-astro';

// Helper functions
import {
  detectShinsals,
  calculateCompoundLuckScore,
  calculateMethodAlignment,
  calculateDataCompleteness,
} from './life-prediction-helpers';

// Strategy pattern for event timing
import { EventTimingStrategyFactory } from './strategies/StrategyFactory';
import type { ScoringContext } from './strategies/types';

// ============================================================
// EXTRACTED MODULES - imported functions
// ============================================================
import {
  generateTrendSummary,
  generateEventAdvice,
  generateWeeklySummary,
} from './life-prediction/formatters/text-generators';

import {
  generateDetailedEventAnalysis,
} from './life-prediction/analyzers/event-category';

import {
  findSpecificGoodDays,
} from './life-prediction/helpers/good-day-finder';

import {
  analyzeWeekPeriod,
} from './life-prediction/weekly/analyzer';

import {
  analyzeLifeCycles,
} from './life-prediction/lifecycle/analyzer';

import {
  extractUpcomingHighlights,
} from './life-prediction/summary/highlights';

// Re-export prompt context generators
export {
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from './prompt-contexts';

// ============================================================
// 1. Multi-Year Trend Analysis
// ============================================================

export function analyzeMultiYearTrend(
  input: LifePredictionInput,
  startYear: number,
  endYear: number
): MultiYearTrend {
  const currentYear = new Date().getFullYear();
  const yearlyScores: YearlyScore[] = [];
  const daeunTransitions: DaeunTransitionPoint[] = [];

  const daeunList = input.daeunList || [];

  for (let year = startYear; year <= endYear; year++) {
    const age = year - input.birthYear;
    if (age < 0) {continue;}

    const yearGanji = calculateYearlyGanji(year);
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);
    const sibsin = calculateSibsin(input.dayStem, yearGanji.stem);
    const allBranches = [input.dayBranch, input.monthBranch, input.yearBranch, yearGanji.branch];
    const branchInteractions = analyzeBranchInteractions(allBranches);
    const daeun = daeunList.find(d => age >= d.startAge && age <= d.endAge);

    let score = twelveStage.score;
    score += SIBSIN_SCORES[sibsin as keyof typeof SIBSIN_SCORES] || 0;

    for (const inter of branchInteractions) {
      score += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION;
    }

    if (daeun) {
      const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
      score += (daeunStage.score - SCORING_WEIGHTS.BASE_SCORE) * SCORING_WEIGHTS.DAEUN_MODIFIER;
    }

    const yearElement = STEM_ELEMENT[yearGanji.stem];
    if (input.yongsin?.includes(yearElement)) {score += SCORING_WEIGHTS.YONGSIN_BONUS;}
    if (input.kisin?.includes(yearElement)) {score -= SCORING_WEIGHTS.KISIN_PENALTY;}

    score = normalizeScore(score);
    const grade = scoreToGrade(score);

    const themes: string[] = [];
    const opportunities: string[] = [];
    const challenges: string[] = [];

    if (twelveStage.energy === 'peak') {
      themes.push('전성기');
      opportunities.push('중요한 결정과 도전의 최적기');
    } else if (twelveStage.energy === 'rising') {
      themes.push('상승기');
      opportunities.push('새로운 시작과 성장');
    } else if (twelveStage.energy === 'declining') {
      themes.push('안정기');
      challenges.push('무리한 확장 자제');
    } else {
      themes.push('준비기');
      challenges.push('내면 성찰과 재충전 필요');
    }

    if (['정관', '정재', '정인'].includes(sibsin)) {
      opportunities.push(`${sibsin}운 - 안정적 발전`);
    } else if (['겁재', '상관'].includes(sibsin)) {
      challenges.push(`${sibsin}운 - 경쟁과 갈등 주의`);
    }

    yearlyScores.push({
      year,
      age,
      score,
      grade,
      yearGanji,
      twelveStage,
      sibsin,
      branchInteractions,
      daeun,
      themes,
      opportunities,
      challenges,
    });

    if (daeun && age === daeun.startAge && daeunList.indexOf(daeun) > 0) {
      const prevDaeun = daeunList[daeunList.indexOf(daeun) - 1];
      const prevStage = calculatePreciseTwelveStage(input.dayStem, prevDaeun.branch);
      const currStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);

      let impact: DaeunTransitionPoint['impact'];
      const scoreDiff = currStage.score - prevStage.score;
      if (scoreDiff >= 30) {impact = 'major_positive';}
      else if (scoreDiff >= 10) {impact = 'positive';}
      else if (scoreDiff <= -30) {impact = 'major_challenging';}
      else if (scoreDiff <= -10) {impact = 'challenging';}
      else {impact = 'neutral';}

      daeunTransitions.push({
        year,
        age,
        fromDaeun: prevDaeun,
        toDaeun: daeun,
        impact,
        description: `${prevDaeun.stem}${prevDaeun.branch} → ${daeun.stem}${daeun.branch} 대운 전환`,
      });
    }
  }

  const scores = yearlyScores.map(y => y.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const firstHalfAvg = scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
  const secondHalfAvg = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / (scores.length - Math.floor(scores.length / 2));

  let overallTrend: MultiYearTrend['overallTrend'];
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

  if (variance > 400) {
    overallTrend = 'volatile';
  } else if (secondHalfAvg - firstHalfAvg > 10) {
    overallTrend = 'ascending';
  } else if (firstHalfAvg - secondHalfAvg > 10) {
    overallTrend = 'descending';
  } else {
    overallTrend = 'stable';
  }

  const sortedByScore = [...yearlyScores].sort((a, b) => b.score - a.score);
  const peakYears = sortedByScore.slice(0, 3).map(y => y.year);
  const lowYears = sortedByScore.slice(-3).map(y => y.year);

  const lifeCycles = analyzeLifeCycles(yearlyScores, daeunList);
  const summary = generateTrendSummary(overallTrend, peakYears, lowYears, daeunTransitions, currentYear);

  return {
    startYear,
    endYear,
    yearlyScores,
    overallTrend,
    peakYears,
    lowYears,
    daeunTransitions,
    lifeCycles,
    summary,
  };
}

// ============================================================
// 2. Past Date Retrospective Analysis (TIER 5)
// ============================================================

export function analyzePastDate(
  input: LifePredictionInput,
  targetDate: Date,
  options: { detailed?: boolean; includeHours?: boolean } = {}
): PastRetrospective {
  const { detailed = true, includeHours = false } = options;

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const age = year - input.birthYear;

  const dailyPillar = calculateDailyPillar(targetDate);
  const yearGanji = calculateYearlyGanji(year);
  const monthGanji = calculateMonthlyGanji(year, month);
  const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);
  const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);

  const allBranches = [
    input.dayBranch, input.monthBranch, input.yearBranch,
    yearGanji.branch, monthGanji.branch, dailyPillar.branch,
  ];
  const branchInteractions = analyzeBranchInteractions(allBranches);
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);

  // TIER 5: Solar term, lunar mansion, lunar phase
  const solarTerm = getSolarTermForDate(targetDate);
  const lunarMansion = getLunarMansion(targetDate);
  const lunarDay = ((day + 10) % 30) + 1;
  const lunarPhase = getLunarPhase(lunarDay);
  const planetaryHours = includeHours ? calculatePlanetaryHours(targetDate) : undefined;

  let score = twelveStage.score;
  score += SIBSIN_SCORES[sibsin as keyof typeof SIBSIN_SCORES] || 0;

  for (const inter of branchInteractions) {
    score += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION_MINOR;
  }

  if (daeun) {
    const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
    score += (daeunStage.score - SCORING_WEIGHTS.BASE_SCORE) * SCORING_WEIGHTS.DAEUN_MODIFIER_MINOR;
  }

  if (solarTerm.element === STEM_ELEMENT[input.dayStem]) {
    score += SCORING_WEIGHTS.SOLAR_TERM_MATCH;
  }
  if (lunarMansion.isAuspicious) {
    score += SCORING_WEIGHTS.LUCKY_MANSION;
  } else {
    score -= SCORING_WEIGHTS.UNLUCKY_MANSION;
  }
  if (lunarPhase === 'full_moon') {
    score += SCORING_WEIGHTS.FULL_MOON_BONUS;
  } else if (lunarPhase === 'new_moon') {
    score -= SCORING_WEIGHTS.NEW_MOON_PENALTY;
  }

  const dayElement = STEM_ELEMENT[dailyPillar.stem];
  if (input.yongsin?.includes(dayElement)) {score += SCORING_WEIGHTS.YONGSIN_BONUS_MINOR;}
  if (input.kisin?.includes(dayElement)) {score -= SCORING_WEIGHTS.KISIN_PENALTY_MINOR;}

  score = normalizeScore(score, SCORE_BOUNDARIES.MIN, SCORE_BOUNDARIES.MAX);
  const grade = scoreToGrade(score);

  const causalFactors = analyzeCausalFactors(
    input.dayStem,
    input.dayBranch,
    dailyPillar.stem,
    dailyPillar.branch,
    daeun?.stem,
    daeun?.branch,
    input.yongsin,
    input.kisin
  );

  const yongsinActive = input.yongsin?.includes(dayElement) || false;
  const kisinActive = input.kisin?.includes(dayElement) || false;
  const shinsals = detectShinsals(input, dailyPillar);
  const eventCategoryScores = calculateEventCategoryScores(
    sibsin,
    twelveStage.stage,
    branchInteractions.map(b => ({ type: b.type, score: b.score })),
    shinsals,
    yongsinActive,
    kisinActive
  );

  const confidenceFactors: ConfidenceFactors = {
    birthTimeAccuracy: input.birthHour !== undefined ? 'exact' : 'unknown',
    methodAlignment: calculateMethodAlignment(twelveStage, solarTerm, lunarMansion),
    dataCompleteness: calculateDataCompleteness(input),
  };
  const confidence = calculateConfidence(confidenceFactors);

  const themes: string[] = [];
  themes.push(`${twelveStage.stage} - ${twelveStage.lifePhase.split(' - ')[0]}`);
  themes.push(`${sibsin}운`);
  themes.push(`${solarTerm.nameKo} 절기`);
  themes.push(`${lunarMansion.nameKo}수(${lunarMansion.name})`);
  if (daeun) {
    themes.push(`${daeun.stem}${daeun.branch} 대운 시기`);
  }

  const whyItHappened: string[] = [];
  for (const factor of causalFactors.slice(0, 5)) {
    whyItHappened.push(`[${factor.factor}] ${factor.description}`);
  }

  if (score >= 70) {
    whyItHappened.push('에너지가 높은 시기로 좋은 일이 일어나기 쉬웠습니다.');
    if (['정관', '정재', '정인'].includes(sibsin)) {
      whyItHappened.push(`${sibsin}운으로 안정적인 발전이 있었습니다.`);
    }
  } else if (score <= 40) {
    whyItHappened.push('에너지가 낮은 시기로 도전이 있었을 수 있습니다.');
    if (['겁재', '상관'].includes(sibsin)) {
      whyItHappened.push(`${sibsin}운으로 경쟁이나 갈등이 있었을 수 있습니다.`);
    }
  }

  if (!lunarMansion.isAuspicious) {
    whyItHappened.push(`${lunarMansion.nameKo}수(${lunarMansion.name}) - ${lunarMansion.badFor.join(', ')}에 불리한 날`);
  } else if (lunarMansion.goodFor.length > 0) {
    whyItHappened.push(`${lunarMansion.nameKo}수(${lunarMansion.name}) - ${lunarMansion.goodFor.join(', ')}에 유리한 날`);
  }

  whyItHappened.push(`${solarTerm.nameKo} 절기의 ${solarTerm.element} 에너지가 영향을 미쳤습니다.`);

  for (const inter of branchInteractions) {
    if (inter.impact === 'positive') {
      whyItHappened.push(`${inter.description} - 긍정적 에너지 흐름`);
    } else if (inter.impact === 'negative') {
      whyItHappened.push(`${inter.description} - 충돌과 변화의 에너지`);
    }
  }

  const lessonsLearned: string[] = [];
  if (twelveStage.energy === 'peak') {
    lessonsLearned.push('전성기의 에너지를 잘 활용했는지 돌아보세요.');
  } else if (twelveStage.energy === 'dormant') {
    lessonsLearned.push('휴식과 재충전의 시간이 필요했던 때입니다.');
  }
  lessonsLearned.push(twelveStage.advice);

  for (const factor of causalFactors) {
    if (factor.impact === 'major_positive' || factor.impact === 'major_negative') {
      lessonsLearned.push(`${factor.factor}의 영향을 이해하고 활용하세요.`);
    }
  }

  const detailedAnalysis = detailed ? generateDetailedEventAnalysis(
    eventCategoryScores,
    causalFactors,
    sibsin,
    twelveStage.stage,
    solarTerm,
    lunarMansion
  ) : undefined;

  return {
    targetDate,
    dailyPillar,
    score,
    grade,
    yearGanji,
    monthGanji,
    twelveStage,
    sibsin,
    branchInteractions,
    daeun,
    themes,
    whyItHappened,
    lessonsLearned,
    solarTerm,
    lunarMansion,
    lunarDay,
    lunarPhase,
    planetaryHours,
    causalFactors,
    eventCategoryScores,
    confidence,
    detailedAnalysis,
  };
}

export function analyzePastPeriod(
  input: LifePredictionInput,
  startDate: Date,
  endDate: Date,
  options: { sampleSize?: number; enableTier5?: boolean } = {}
): PastRetrospective[] {
  const { sampleSize, enableTier5 = true } = options;
  const results: PastRetrospective[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;

  const analyzeDate = (date: Date) => analyzePastDate(input, date, {
    detailed: enableTier5,
    includeHours: enableTier5,
  });

  if (sampleSize && sampleSize > 0 && sampleSize < totalDays) {
    const step = totalDays / sampleSize;
    for (let i = 0; i < sampleSize; i++) {
      const offset = Math.floor(i * step);
      const date = new Date(startDate);
      date.setDate(date.getDate() + offset);
      results.push(analyzeDate(date));
    }
    return results;
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    results.push(analyzeDate(new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return results;
}

// ============================================================
// 3. Event Timing Analysis (TIER 5+)
// ============================================================

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

  if (optimalPeriods.length == 0 && candidatePeriods.length > 0) {
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

// ============================================================
// 3-1. Weekly Event Timing Analysis
// ============================================================

export function findWeeklyOptimalTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startDate: Date,
  searchWeeksOrEndDate: number | Date = 4
): WeeklyEventTimingResult {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (!conditions) {
    return {
      eventType,
      searchWeeks: 0,
      searchRange: { startDate, endDate: startDate },
      weeklyPeriods: [],
      bestWeek: null,
      worstWeek: null,
      overallAdvice: `Unknown event type: ${eventType}`,
      summary: `Unknown event type: ${eventType}`,
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const searchWeeks = typeof searchWeeksOrEndDate === 'number'
    ? Math.max(1, Math.floor(searchWeeksOrEndDate))
    : Math.max(1, Math.ceil(((searchWeeksOrEndDate as Date).getTime() - startDate.getTime()) / (7 * dayMs)));

  const actualEndDate = searchWeeksOrEndDate instanceof Date
    ? new Date(searchWeeksOrEndDate.getTime())
    : new Date(startDate.getTime() + searchWeeks * 7 * dayMs);

  const weeklyPeriods: WeeklyPeriod[] = [];

  const currentWeekStart = new Date(startDate);
  const dayOfWeek = currentWeekStart.getDay();
  if (dayOfWeek !== 1) {
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  }

  let weekNumber = 1;

  while (weekNumber <= searchWeeks) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAnalysis = analyzeWeekPeriod(input, currentWeekStart, weekEnd, eventType, conditions);
    const bestDay = weekAnalysis.bestDay || weekAnalysis.bestDays?.[0] || new Date(currentWeekStart);
    const bestDayScore = weekAnalysis.bestDayScore ?? weekAnalysis.score;

    weeklyPeriods.push({
      startDate: new Date(currentWeekStart),
      endDate: weekEnd,
      weekNumber,
      averageScore: weekAnalysis.score,
      bestDay,
      bestDayScore,
      grade: scoreToGrade(weekAnalysis.score),
      summary: `${eventType} week ${weekNumber} average ${weekAnalysis.score}`,
      reasons: weekAnalysis.reasons,
      bestDays: weekAnalysis.bestDays,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
  }

  const sortedByScore = [...weeklyPeriods].sort((a, b) => b.averageScore - a.averageScore);
  const bestWeek = sortedByScore[0] || null;
  const worstWeek = sortedByScore[sortedByScore.length - 1] || null;

  const overallAdvice = generateWeeklySummary(eventType, weeklyPeriods, bestWeek);

  return {
    eventType,
    searchWeeks,
    searchRange: { startDate, endDate: actualEndDate },
    weeklyPeriods,
    bestWeek,
    worstWeek,
    overallAdvice,
    summary: overallAdvice,
  };
}

// ============================================================
// 4. Comprehensive Prediction Generation
// ============================================================

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

  let lifeSync: LifeSyncAnalysis | undefined;
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
