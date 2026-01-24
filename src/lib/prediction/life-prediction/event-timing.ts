/**
 * Event Timing Module
 * 이벤트 타이밍 분석 (최적 시기 찾기, 주간 분석)
 */

import type {
  LifePredictionInput,
  EventType,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  WeeklyPeriod,
  WeeklyEventTimingResult,
  PredictionGrade,
} from './types';
import { EVENT_FAVORABLE_CONDITIONS, STEM_ELEMENT, EVENT_NAMES } from './constants';
import { normalizeScore } from '../utils/scoring-utils';
import { calculateAstroBonus, calculateTransitBonus, calculateTransitHouseOverlay } from './astro-bonus';
import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  analyzeBranchInteractions,
} from '../advancedTimingEngine';
import { calculateDailyPillar } from '../ultraPrecisionEngine';
import {
  getSolarTermForDate,
  calculateSecondaryProgression,
} from '../precisionEngine';
import { calculateTier6Bonus } from '../tier6Analysis';
import { calculateTier7To10Bonus } from '../tier7To10Analysis';
import {
  detectShinsals,
  calculateCompoundLuckScore,
} from '../life-prediction-helpers';
import { findSpecificGoodDays } from './helpers/good-day-finder';

// ============================================================
// Helper Functions
// ============================================================

/**
 * 점수를 등급으로 변환
 */
function scoreToGrade(score: number): PredictionGrade {
  if (score >= 85) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

/**
 * 월별 트랜짓 점수 추정 (미래 월용)
 */
function estimateMonthlyTransitScore(
  _input: LifePredictionInput,
  _eventType: EventType,
  _year: number,
  _month: number
): { bonus: number; reasons: string[] } {
  // 기본 구현 - 외행성은 천천히 이동하므로 대략적인 추정만
  // 토성, 목성 등 외행성 이동 추정은 복잡하므로 기본값 반환
  return { bonus: 0, reasons: [] };
}

// ============================================================
// Event Advice Generation
// ============================================================

function generateEventAdvice(
  eventType: EventType,
  optimalPeriods: OptimalPeriod[],
  avoidPeriods: AvoidPeriod[],
  nextBest: OptimalPeriod | null
): string {
  let advice = `${EVENT_NAMES[eventType]}에 대한 타이밍 분석 결과입니다. `;

  if (optimalPeriods.length > 0) {
    const bestPeriod = optimalPeriods[0];
    const monthStr = `${bestPeriod.startDate.getFullYear()}년 ${bestPeriod.startDate.getMonth() + 1}월`;
    advice += `가장 좋은 시기는 ${monthStr}입니다 (${bestPeriod.grade}등급, ${Math.round(bestPeriod.score)}점). `;
  }

  if (nextBest && optimalPeriods[0] !== nextBest) {
    const monthStr = `${nextBest.startDate.getFullYear()}년 ${nextBest.startDate.getMonth() + 1}월`;
    advice += `다가오는 최적 시기는 ${monthStr}입니다. `;
  }

  if (avoidPeriods.length > 0) {
    const worstPeriod = avoidPeriods[0];
    const monthStr = `${worstPeriod.startDate.getFullYear()}년 ${worstPeriod.startDate.getMonth() + 1}월`;
    advice += `${monthStr}은 피하는 것이 좋습니다.`;
  }

  return advice;
}

// ============================================================
// Main Event Timing Analysis
// ============================================================

/**
 * 이벤트 최적 타이밍 찾기 (월 단위)
 */
export function findOptimalEventTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startYear: number,
  endYear: number,
  options: { useProgressions?: boolean; useSolarTerms?: boolean } = {}
): EventTimingResult {
  const { useProgressions = true, useSolarTerms = true } = options;

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (!conditions) {
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
  const currentDate = new Date();
  const birthDate = new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1);

  // 월별 분석
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const midMonth = new Date(year, month - 1, 15);

      // 이미 지난 달은 건너뛰기
      if (monthEnd < currentDate) continue;

      const age = year - input.birthYear;
      const monthGanji = calculateMonthlyGanji(year, month);
      const yearGanji = calculateYearlyGanji(year);
      const twelveStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);
      const sibsin = calculateSibsin(input.dayStem, monthGanji.stem);

      // 절기 분석
      const solarTerm = useSolarTerms ? getSolarTermForDate(midMonth) : null;

      // 진행법 분석
      let progressionBonus = 0;
      let progressionReason = '';
      if (useProgressions) {
        const progression = calculateSecondaryProgression(birthDate, midMonth);

        if (progression.moon.phase === 'Full') {
          progressionBonus += 10;
          progressionReason = '진행 보름달 - 결실기';
        } else if (progression.moon.phase === 'New') {
          progressionBonus += 8;
          progressionReason = '진행 초승달 - 새 시작';
        }

        if (eventType === 'marriage' || eventType === 'relationship') {
          if (progression.venus.sign === 'Libra' || progression.venus.sign === 'Taurus') {
            progressionBonus += 8;
            progressionReason = `진행 금성 ${progression.venus.sign} - 관계 길`;
          }
        } else if (eventType === 'career') {
          if (progression.sun.house === 10 || progression.sun.house === 1) {
            progressionBonus += 10;
            progressionReason = `진행 태양 ${progression.sun.house}하우스 - 커리어 상승`;
          }
        }
      }

      // 점수 계산
      let score = 50;
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      // 십신 분석
      if (conditions.favorableSibsin.includes(sibsin)) {
        score += 15;
        reasons.push(`${sibsin}운 - ${eventType}에 유리`);
      }
      if (conditions.avoidSibsin.includes(sibsin)) {
        score -= 15;
        avoidReasons.push(`${sibsin}운 - ${eventType}에 불리`);
      }

      // 12운성 분석
      if (conditions.favorableStages.includes(twelveStage.stage)) {
        score += 12;
        reasons.push(`${twelveStage.stage} - 에너지 상승기`);
      }
      if (conditions.avoidStages.includes(twelveStage.stage)) {
        score -= 12;
        avoidReasons.push(`${twelveStage.stage} - 에너지 저하기`);
      }

      // 오행 분석
      const monthElement = STEM_ELEMENT[monthGanji.stem];
      if (conditions.favorableElements.includes(monthElement)) {
        score += 8;
        reasons.push(`${monthElement} 기운 - 조화`);
      }

      // 용신/기신
      if (input.yongsin?.includes(monthElement)) {
        score += 10;
        reasons.push('용신 월');
      }
      if (input.kisin?.includes(monthElement)) {
        score -= 10;
        avoidReasons.push('기신 월');
      }

      // 절기 보정
      if (solarTerm) {
        if (conditions.favorableElements.includes(solarTerm.element)) {
          score += 6;
          reasons.push(`${solarTerm.nameKo} 절기 - ${solarTerm.element} 기운`);
        }
        if (input.yongsin?.includes(solarTerm.element)) {
          score += 5;
          reasons.push(`절기 용신 활성 (${solarTerm.element})`);
        }
      }

      // 진행법 보정
      if (progressionBonus > 0) {
        score += progressionBonus;
        reasons.push(progressionReason);
      }

      // 지지 상호작용
      const allBranches = [input.dayBranch, input.monthBranch, yearGanji.branch, monthGanji.branch];
      const interactions = analyzeBranchInteractions(allBranches);
      for (const inter of interactions) {
        if (inter.impact === 'positive') {
          score += inter.score * 0.3;
          if (inter.type === '삼합' || inter.type === '육합') {
            reasons.push(inter.description);
          }
        } else if (inter.impact === 'negative') {
          score += inter.score * 0.3;
          if (inter.type === '충') {
            avoidReasons.push(inter.description);
          }
        }
      }

      // 대운 영향
      const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
      if (daeun) {
        const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
        if (conditions.favorableStages.includes(daeunStage.stage)) {
          score += 8;
          reasons.push(`대운 ${daeunStage.stage} - 장기적 지원`);
        }

        if (solarTerm && daeun.element === solarTerm.element) {
          score += 7;
          reasons.push(`대운-절기 동기화 (${daeun.element})`);
        }
      }

      // 점성 보정
      const astroBonus = calculateAstroBonus(input, eventType);
      score += astroBonus.bonus;
      reasons.push(...astroBonus.reasons);
      avoidReasons.push(...astroBonus.penalties);

      // 트랜짓 보정
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

      // 복합 운 분석
      const compoundLuck = calculateCompoundLuckScore(input, eventType, year, month);
      score += compoundLuck.bonus;
      reasons.push(...compoundLuck.reasons);
      avoidReasons.push(...compoundLuck.penalties);

      // TIER 6 분석
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

      // TIER 7-10 분석
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

      // 분류
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

  // 정렬
  optimalPeriods.sort((a, b) => b.score - a.score);
  avoidPeriods.sort((a, b) => a.score - b.score);

  // 다음 최적 시기
  const futureOptimal = optimalPeriods.filter(p => p.startDate > currentDate);
  const nextBestWindow = futureOptimal.length > 0 ? futureOptimal[0] : null;

  // 조언 생성
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
// Weekly Event Timing Analysis
// ============================================================

/**
 * 주간 기간 분석
 */
function analyzeWeekPeriod(
  input: LifePredictionInput,
  weekStart: Date,
  weekEnd: Date,
  eventType: EventType,
  conditions: typeof EVENT_FAVORABLE_CONDITIONS['marriage']
): { score: number; reasons: string[]; bestDays: Date[] } {
  const dailyScores: { date: Date; score: number; reasons: string[] }[] = [];

  const current = new Date(weekStart);
  while (current <= weekEnd) {
    const dailyPillar = calculateDailyPillar(current);
    const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);
    const year = current.getFullYear();
    const age = year - input.birthYear;

    // 기본 점수
    let dayScore = 30 + (twelveStage.score * 0.4);
    const dayReasons: string[] = [];

    // 십신 점수
    if (conditions.favorableSibsin.includes(sibsin)) {
      const sibsinBonus = sibsin === '정관' || sibsin === '정재' ? 12 :
                          sibsin === '정인' || sibsin === '식신' ? 10 : 8;
      dayScore += sibsinBonus;
      dayReasons.push(`${sibsin}일`);
    }
    if (conditions.avoidSibsin.includes(sibsin)) {
      const sibsinPenalty = sibsin === '겁재' ? 12 : sibsin === '상관' ? 10 : 8;
      dayScore -= sibsinPenalty;
    }

    // 12운성 보정
    if (conditions.favorableStages.includes(twelveStage.stage)) {
      const stageBonus = twelveStage.stage === '제왕' ? 10 :
                         twelveStage.stage === '건록' ? 9 : 7;
      dayScore += stageBonus;
      dayReasons.push(twelveStage.stage);
    }
    if (conditions.avoidStages.includes(twelveStage.stage)) {
      dayScore -= 8;
    }

    // 오행 조화
    const dayElement = STEM_ELEMENT[dailyPillar.stem];
    if (conditions.favorableElements.includes(dayElement)) {
      dayScore += 5;
    }

    // 용신/기신
    if (input.yongsin?.includes(dayElement)) {
      dayScore += 15;
      dayReasons.push('용신일');
    }
    if (input.kisin?.includes(dayElement)) {
      dayScore -= 12;
    }

    // 지지 상호작용
    const yearGanji = calculateYearlyGanji(year);
    const branches = [input.dayBranch, input.monthBranch, input.yearBranch, dailyPillar.branch, yearGanji.branch];
    const interactions = analyzeBranchInteractions(branches);
    for (const inter of interactions) {
      if (inter.impact === 'positive') {
        const interBonus = inter.type === '삼합' ? 8 : inter.type === '육합' ? 6 : inter.score * 0.2;
        dayScore += interBonus;
        if (inter.type === '삼합' || inter.type === '육합') {
          dayReasons.push(inter.type);
        }
      } else if (inter.impact === 'negative') {
        const interPenalty = inter.type === '충' ? 10 : inter.type === '형' ? 7 : Math.abs(inter.score) * 0.2;
        dayScore -= interPenalty;
        if (inter.type === '충') {
          dayReasons.push(`${inter.type} 주의`);
        }
      }
    }

    // 대운 분석
    const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
    if (daeun) {
      const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
      const daeunSibsin = calculateSibsin(input.dayStem, daeun.stem);

      if (conditions.favorableStages.includes(daeunStage.stage)) {
        dayScore += 6;
        dayReasons.push(`대운 ${daeunStage.stage}`);
      }

      if (conditions.favorableSibsin.includes(daeunSibsin)) {
        dayScore += 5;
      }

      if (daeun.element === dayElement) {
        dayScore += 4;
      }
    }

    // 세운 분석
    const yearSibsin = calculateSibsin(input.dayStem, yearGanji.stem);
    const yearStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);
    if (conditions.favorableSibsin.includes(yearSibsin)) {
      dayScore += 4;
    }
    if (conditions.favorableStages.includes(yearStage.stage)) {
      dayScore += 3;
    }

    // 신살 분석
    const shinsals = detectShinsals(input, dailyPillar);
    for (const sh of shinsals) {
      if (sh.type === 'lucky') {
        if (sh.name === '천을귀인') {
          dayScore += 10;
          dayReasons.push('천을귀인');
        } else if (sh.name === '역마') {
          if (eventType === 'move') {
            dayScore += 10;
            dayReasons.push('역마');
          } else if (eventType === 'career') {
            dayScore += 5;
          }
        } else if (sh.name === '문창' && eventType === 'study') {
          dayScore += 8;
          dayReasons.push('문창');
        } else if (sh.name === '천덕' || sh.name === '월덕') {
          dayScore += 6;
        }
      } else if (sh.type === 'unlucky') {
        if (sh.name === '겁살') {
          dayScore -= 10;
        } else if (sh.name === '화개') {
          if (eventType === 'study') dayScore += 5;
          else dayScore -= 3;
        } else {
          dayScore -= 5;
        }
      }
    }

    // 절기 분석
    const solarTerm = getSolarTermForDate(current);
    if (conditions.favorableElements.includes(solarTerm.element)) {
      dayScore += 3;
    }
    if (input.yongsin?.includes(solarTerm.element)) {
      dayScore += 4;
    }

    // 점성 데이터
    if (input.astroChart) {
      const astroBonus = calculateAstroBonus(input, eventType);
      dayScore += astroBonus.bonus * 0.5;
    }

    dayScore = Math.max(15, Math.min(95, dayScore));
    dailyScores.push({ date: new Date(current), score: Math.round(dayScore), reasons: dayReasons });

    current.setDate(current.getDate() + 1);
  }

  // 주간 평균 점수 계산
  const sortedScores = dailyScores.map(d => d.score).sort((a, b) => a - b);
  const trimmedScores = sortedScores.length > 3
    ? sortedScores.slice(1, -1)
    : sortedScores;
  const avgScore = trimmedScores.reduce((sum, s) => sum + s, 0) / trimmedScores.length;

  // 상위 이유들 수집
  const allReasons = dailyScores.flatMap(d => d.reasons);
  const reasonCounts = allReasons.reduce((acc, r) => {
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const importanceWeight: Record<string, number> = {
    '용신일': 3, '천을귀인': 2.5, '제왕': 2, '건록': 2,
    '삼합': 1.8, '육합': 1.5, '대운': 1.5, '역마': 1.5,
  };

  const topReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      score: count * (Object.entries(importanceWeight).find(([k]) => reason.includes(k))?.[1] || 1)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.reason);

  // 최고의 날들
  const bestDays = dailyScores
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 5) return scoreDiff;
      return b.reasons.length - a.reasons.length;
    })
    .slice(0, 3)
    .map(d => d.date);

  return {
    score: Math.round(avgScore),
    reasons: topReasons,
    bestDays,
  };
}

/**
 * 주간 분석 요약 생성
 */
function generateWeeklySummary(
  eventType: EventType,
  weeklyPeriods: WeeklyPeriod[],
  bestWeek: WeeklyPeriod | null
): string {
  if (!bestWeek) {
    return `${EVENT_NAMES[eventType]} 분석 결과가 없습니다.`;
  }

  const startStr = `${bestWeek.startDate.getMonth() + 1}/${bestWeek.startDate.getDate()}`;
  const endStr = `${bestWeek.endDate.getMonth() + 1}/${bestWeek.endDate.getDate()}`;

  let summary = `${EVENT_NAMES[eventType]}에 가장 좋은 주간은 ${startStr}~${endStr} (${bestWeek.grade}등급, ${bestWeek.score}점)입니다.`;

  if (bestWeek.bestDays.length > 0) {
    const bestDayStr = bestWeek.bestDays.slice(0, 2)
      .map(d => `${d.getMonth() + 1}/${d.getDate()}`)
      .join(', ');
    summary += ` 특히 ${bestDayStr}일이 좋습니다.`;
  }

  // 점수 분포 분석
  const scores = weeklyPeriods.map(w => w.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length);

  if (variance < 5) {
    summary += ' 전반적으로 안정적인 시기입니다.';
  } else if (variance > 15) {
    summary += ' 주간별 운세 변동이 크니 시기 선택이 중요합니다.';
  }

  return summary;
}

/**
 * 주간 단위 이벤트 타이밍 분석
 */
export function findWeeklyOptimalTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startDate: Date,
  endDate?: Date
): WeeklyEventTimingResult {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (!conditions) {
    return {
      eventType,
      searchRange: { startDate, endDate: endDate || new Date() },
      weeklyPeriods: [],
      bestWeek: null,
      worstWeek: null,
      summary: `Unknown event type: ${eventType}`,
    };
  }

  // 기본 3개월 분석
  const actualEndDate = endDate || new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const weeklyPeriods: WeeklyPeriod[] = [];

  const currentWeekStart = new Date(startDate);
  // 월요일로 정렬
  const dayOfWeek = currentWeekStart.getDay();
  if (dayOfWeek !== 1) {
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  }

  let weekNumber = 1;

  while (currentWeekStart < actualEndDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAnalysis = analyzeWeekPeriod(input, currentWeekStart, weekEnd, eventType, conditions);

    weeklyPeriods.push({
      startDate: new Date(currentWeekStart),
      endDate: weekEnd,
      weekNumber,
      score: weekAnalysis.score,
      grade: scoreToGrade(weekAnalysis.score),
      reasons: weekAnalysis.reasons,
      bestDays: weekAnalysis.bestDays,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
  }

  // 정렬
  const sortedByScore = [...weeklyPeriods].sort((a, b) => b.score - a.score);
  const bestWeek = sortedByScore[0] || null;
  const worstWeek = sortedByScore[sortedByScore.length - 1] || null;

  // 요약 생성
  const summary = generateWeeklySummary(eventType, weeklyPeriods, bestWeek);

  return {
    eventType,
    searchRange: { startDate, endDate: actualEndDate },
    weeklyPeriods,
    bestWeek,
    worstWeek,
    summary,
  };
}
