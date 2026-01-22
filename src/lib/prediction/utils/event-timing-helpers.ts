/**
 * Helper functions for event timing analysis
 * Extracted from findOptimalEventTiming to improve readability
 */

import type {
  LifePredictionInput,
  EventType,
  OptimalPeriod,
} from '../life-prediction-types';

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  analyzeBranchInteractions,
  type PreciseTwelveStage,
} from '../advancedTimingEngine';

import {
  getSolarTermForDate,
  calculateSecondaryProgression,
  PrecisionEngine,
  type SolarTerm,
} from '../precisionEngine';

import {
  EVENT_SCORING,
  SCORING_WEIGHTS,
} from '../constants/scoring';

import { EVENT_FAVORABLE_CONDITIONS } from '../life-prediction-constants';

interface ProgressionAnalysis {
  bonus: number;
  reason: string;
}

interface MonthlyScoreData {
  score: number;
  reasons: string[];
  avoidReasons: string[];
}

/**
 * Calculate progression bonus for a given month
 */
export function calculateProgressionBonus(
  eventType: EventType,
  birthDate: Date,
  targetDate: Date
): ProgressionAnalysis {
  let bonus = 0;
  let reason = '';

  const progression = calculateSecondaryProgression(birthDate, targetDate);

  // 진행 달의 위상에 따른 보정
  if (progression.moon.phase === 'Full') {
    bonus += EVENT_SCORING.BUSINESS_FAVORABLE;
    reason = '진행 보름달 - 결실기';
  } else if (progression.moon.phase === 'New') {
    bonus += EVENT_SCORING.FAVORABLE_STAGE;
    reason = '진행 초승달 - 새 시작';
  }

  // 이벤트별 진행 행성 위치 분석
  if (eventType === 'marriage' || eventType === 'relationship') {
    if (progression.venus.sign === 'Libra' || progression.venus.sign === 'Taurus') {
      bonus += EVENT_SCORING.FAVORABLE_STAGE;
      reason = `진행 금성 ${progression.venus.sign} - 관계 길`;
    }
  } else if (eventType === 'career') {
    if (progression.sun.house === 10 || progression.sun.house === 1) {
      bonus += EVENT_SCORING.BUSINESS_FAVORABLE;
      reason = `진행 태양 ${progression.sun.house}하우스 - 커리어 상승`;
    }
  }

  return { bonus, reason };
}

/**
 * Calculate base score for sibsin and twelve stages
 */
export function calculateSibsinStageScore(
  eventType: EventType,
  sibsin: string,
  twelveStage: PreciseTwelveStage
): MonthlyScoreData {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  let score = 50;
  const reasons: string[] = [];
  const avoidReasons: string[] = [];

  // 유리한 십신
  if (conditions.favorableSibsin.includes(sibsin)) {
    score += EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN;
    reasons.push(`${sibsin}운 - ${eventType}에 유리`);
  }
  if (conditions.avoidSibsin.includes(sibsin)) {
    score -= EVENT_SCORING.MARRIAGE_UNFAVORABLE_SIBSIN;
    avoidReasons.push(`${sibsin}운 - ${eventType}에 불리`);
  }

  // 유리한 12운성
  if (conditions.favorableStages.includes(twelveStage.stage)) {
    score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
    reasons.push(`${twelveStage.stage} - 에너지 상승기`);
  }
  if (conditions.avoidStages.includes(twelveStage.stage)) {
    score -= EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN;
    avoidReasons.push(`${twelveStage.stage} - 에너지 저하기`);
  }

  return { score, reasons, avoidReasons };
}

/**
 * Apply element-based scoring adjustments
 */
export function applyElementScoring(
  eventType: EventType,
  input: LifePredictionInput,
  monthElement: string,
  score: number,
  reasons: string[],
  avoidReasons: string[]
): number {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  let adjustedScore = score;

  // 유리한 오행
  if (conditions.favorableElements.includes(monthElement)) {
    adjustedScore += EVENT_SCORING.FAVORABLE_STAGE;
    reasons.push(`${monthElement} 기운 - 조화`);
  }

  // 용신/기신
  if (input.yongsin?.includes(monthElement)) {
    adjustedScore += EVENT_SCORING.BUSINESS_FAVORABLE;
    reasons.push('용신 월');
  }
  if (input.kisin?.includes(monthElement)) {
    adjustedScore -= EVENT_SCORING.BUSINESS_UNFAVORABLE;
    avoidReasons.push('기신 월');
  }

  return adjustedScore;
}

/**
 * Apply solar term scoring adjustments
 */
export function applySolarTermScoring(
  eventType: EventType,
  input: LifePredictionInput,
  solarTerm: SolarTerm | null,
  score: number,
  reasons: string[]
): number {
  if (!solarTerm) return score;

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  let adjustedScore = score;

  if (conditions.favorableElements.includes(solarTerm.element)) {
    adjustedScore += SCORING_WEIGHTS.SOLAR_TERM_MATCH + 1;
    reasons.push(`${solarTerm.nameKo} 절기 - ${solarTerm.element} 기운`);
  }
  if (input.yongsin?.includes(solarTerm.element)) {
    adjustedScore += SCORING_WEIGHTS.SOLAR_TERM_MATCH;
    reasons.push(`절기 용신 활성 (${solarTerm.element})`);
  }

  return adjustedScore;
}

/**
 * Apply branch interaction scoring
 */
export function applyBranchInteractionScoring(
  input: LifePredictionInput,
  yearBranch: string,
  monthBranch: string,
  score: number,
  reasons: string[],
  avoidReasons: string[]
): number {
  const allBranches = [input.dayBranch, input.monthBranch, yearBranch, monthBranch];
  const interactions = analyzeBranchInteractions(allBranches);
  let adjustedScore = score;

  for (const inter of interactions) {
    if (inter.impact === 'positive') {
      adjustedScore += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION;
      if (inter.type === '삼합' || inter.type === '육합') {
        reasons.push(inter.description);
      }
    } else if (inter.impact === 'negative') {
      adjustedScore += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION;
      if (inter.type === '충') {
        avoidReasons.push(inter.description);
      }
    }
  }

  return adjustedScore;
}

/**
 * Apply daeun (major luck cycle) scoring
 */
export function applyDaeunScoring(
  eventType: EventType,
  input: LifePredictionInput,
  age: number,
  solarTerm: SolarTerm | null,
  score: number,
  reasons: string[]
): number {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
  let adjustedScore = score;

  if (daeun) {
    const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
    if (conditions.favorableStages.includes(daeunStage.stage)) {
      adjustedScore += EVENT_SCORING.FAVORABLE_STAGE;
      reasons.push(`대운 ${daeunStage.stage} - 장기적 지원`);
    }

    // TIER 5: 대운-절기월 동기화
    if (solarTerm && daeun.element === solarTerm.element) {
      adjustedScore += EVENT_SCORING.TRANSITION_FAVORABLE;
      reasons.push(`대운-절기 동기화 (${daeun.element})`);
    }
  }

  return adjustedScore;
}

/**
 * Calculate monthly score for event timing
 * This is the main scoring function that aggregates all factors
 */
export interface MonthlyTimingInput {
  input: LifePredictionInput;
  eventType: EventType;
  year: number;
  month: number;
  age: number;
  useProgressions?: boolean;
  useSolarTerms?: boolean;
}

export interface MonthlyTimingResult {
  score: number;
  reasons: string[];
  avoidReasons: string[];
  monthStart: Date;
  monthEnd: Date;
  midMonth: Date;
}

/**
 * Calculate comprehensive monthly score for event timing
 */
export function calculateMonthlyEventScore(params: MonthlyTimingInput): MonthlyTimingResult {
  const {
    input,
    eventType,
    year,
    month,
    age,
    useProgressions = true,
    useSolarTerms = true,
  } = params;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const midMonth = new Date(year, month - 1, 15);

  // 월 간지
  const monthGanji = calculateMonthlyGanji(year, month);
  const yearGanji = calculateYearlyGanji(year);

  // 12운성 & 십신
  const twelveStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);
  const sibsin = calculateSibsin(input.dayStem, monthGanji.stem);

  // TIER 5: 절기 분석
  const solarTerm = useSolarTerms ? getSolarTermForDate(midMonth) : null;

  // TIER 5: 2차 진행법
  let progressionBonus = 0;
  let progressionReason = '';
  if (useProgressions) {
    const birthDate = new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1);
    const progression = calculateProgressionBonus(eventType, birthDate, midMonth);
    progressionBonus = progression.bonus;
    progressionReason = progression.reason;
  }

  // 기본 점수 계산
  const baseScore = calculateSibsinStageScore(eventType, sibsin, twelveStage);
  let score = baseScore.score;
  const reasons = [...baseScore.reasons];
  const avoidReasons = [...baseScore.avoidReasons];

  // 오행 보정
  const monthElement = monthGanji.stem; // Note: should use STEM_ELEMENT mapping
  score = applyElementScoring(eventType, input, monthElement, score, reasons, avoidReasons);

  // 절기 보정
  score = applySolarTermScoring(eventType, input, solarTerm, score, reasons);

  // 진행법 보정
  if (progressionBonus > 0) {
    score += progressionBonus;
    reasons.push(progressionReason);
  }

  // 지지 상호작용
  score = applyBranchInteractionScoring(
    input,
    yearGanji.branch,
    monthGanji.branch,
    score,
    reasons,
    avoidReasons
  );

  // 대운 영향
  score = applyDaeunScoring(eventType, input, age, solarTerm, score, reasons);

  return {
    score,
    reasons,
    avoidReasons,
    monthStart,
    monthEnd,
    midMonth,
  };
}
