// src/lib/prediction/life-prediction-engine/past-retrospective.ts
// Past Date Retrospective Analysis Module (TIER 5)
// Extracted from lifePredictionEngine.ts

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
} from '../advancedTimingEngine';

import { calculateDailyPillar } from '../ultraPrecisionEngine';
import { scoreToGrade } from '../index';
import { normalizeScore } from '../utils/scoring-utils';

import {
  SIBSIN_SCORES,
  SCORING_WEIGHTS,
  SCORE_BOUNDARIES,
} from '../constants/scoring';

import {
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
  analyzeCausalFactors,
  calculateEventCategoryScores,
  calculateConfidence,
  type ConfidenceFactors,
} from '../precisionEngine';

import { STEM_ELEMENT } from '../engine/constants';

import {
  detectShinsals,
  calculateMethodAlignment,
  calculateDataCompleteness,
} from '../life-prediction-helpers';

import {
  generateDetailedEventAnalysis,
} from '../life-prediction/analyzers/event-category';

import type {
  LifePredictionInput,
  PastRetrospective,
} from '../life-prediction-types';

/**
 * Past Date Retrospective Analysis (TIER 5)
 * Analyzes a specific past date with precision factors
 */
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

/**
 * Analyze Past Period
 * Analyzes multiple dates in a past period
 */
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
