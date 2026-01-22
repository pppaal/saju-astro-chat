/**
 * Weekly Analyzer Module
 * Extracted from lifePredictionEngine.ts
 *
 * Complex weekly period analysis with 10-layer scoring system
 * Analyzes a full week (7 days) to determine optimal timing within that period
 */

import type { EventType, LifePredictionInput } from '../../life-prediction-types';
import {
  calculateDailyPillar,
} from '../../ultraPrecisionEngine';
import {
  calculatePreciseTwelveStage,
  calculateSibsin,
  calculateYearlyGanji,
} from '../../advancedTimingEngine';
import {
  analyzeBranchInteractions,
} from '../../advancedTimingEngine';
import {
  getSolarTermForDate,
} from '../../precisionEngine';
import { detectShinsals } from '../../life-prediction-helpers';
import { calculateAstroBonus } from '../../life-prediction-astro';
import { normalizeScore } from '../../utils/scoring-utils';
import { EVENT_FAVORABLE_CONDITIONS, STEM_ELEMENT } from '../../engine/constants';

/**
 * Analyze a week period for event timing with comprehensive 10-layer scoring
 *
 * Scoring layers:
 * 1. Sibsin (ten gods) - event-specific differential
 * 2. Twelve stages - additional adjustment
 * 3. Five element harmony
 * 4. Yongsin/Kisin (vital) - high weight
 * 5. Branch interactions (including daily pillar)
 * 6. Daeun + yearly fortune compound analysis
 * 7. Yearly fortune (annual cycle) analysis
 * 8. Shinsal (extended) analysis
 * 9. Solar term analysis
 * 10. Astrology data (if available)
 *
 * @param input - Life prediction input
 * @param weekStart - Week start date (typically Monday)
 * @param weekEnd - Week end date (typically Sunday)
 * @param eventType - Type of event to analyze for
 * @param conditions - Event favorable conditions
 * @returns Analysis result with score, reasons, and best days
 */
export function analyzeWeekPeriod(
  input: LifePredictionInput,
  weekStart: Date,
  weekEnd: Date,
  eventType: EventType,
  conditions: typeof EVENT_FAVORABLE_CONDITIONS['marriage']
): { score: number; reasons: string[]; bestDays: Date[]; bestDay: Date; bestDayScore: number } {
  const dailyScores: { date: Date; score: number; reasons: string[] }[] = [];

  const current = new Date(weekStart);
  while (current <= weekEnd) {
    const dailyPillar = calculateDailyPillar(current);
    const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const age = year - input.birthYear;

    // 기본 점수 - 12운성 기본 점수로 시작 (더 합리적)
    let dayScore = twelveStage.score; // 12운성 기반 점수 (0-100)
    // 50점 기준으로 정규화
    dayScore = 30 + (dayScore * 0.4); // 30~70 범위로 조정
    const dayReasons: string[] = [];

    // === 1. 십신 점수 (이벤트별 차등) ===
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

    // === 2. 12운성 추가 보정 ===
    if (conditions.favorableStages.includes(twelveStage.stage)) {
      const stageBonus = twelveStage.stage === '제왕' ? 10 :
                         twelveStage.stage === '건록' ? 9 : 7;
      dayScore += stageBonus;
      dayReasons.push(twelveStage.stage);
    }
    if (conditions.avoidStages.includes(twelveStage.stage)) {
      dayScore -= 8;
    }

    // === 3. 오행 조화 ===
    const dayElement = STEM_ELEMENT[dailyPillar.stem];
    if (conditions.favorableElements.includes(dayElement)) {
      dayScore += 5;
    }

    // === 4. 용신/기신 (매우 중요) ===
    if (input.yongsin?.includes(dayElement)) {
      dayScore += 15; // 용신은 큰 가중치
      dayReasons.push('용신일');
    }
    if (input.kisin?.includes(dayElement)) {
      dayScore -= 12;
    }

    // === 5. 지지 상호작용 (일지 포함) ===
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

    // === 6. 대운 + 세운 복합 분석 ===
    const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
    if (daeun) {
      const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
      const daeunSibsin = calculateSibsin(input.dayStem, daeun.stem);

      // 대운 12운성
      if (conditions.favorableStages.includes(daeunStage.stage)) {
        dayScore += 6;
        dayReasons.push(`대운 ${daeunStage.stage}`);
      }

      // 대운 십신
      if (conditions.favorableSibsin.includes(daeunSibsin)) {
        dayScore += 5;
      }

      // 대운-일진 동기화 (오행 일치)
      if (daeun.element === dayElement) {
        dayScore += 4;
      }
    }

    // === 7. 세운(연운) 분석 ===
    const yearSibsin = calculateSibsin(input.dayStem, yearGanji.stem);
    const yearStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);
    if (conditions.favorableSibsin.includes(yearSibsin)) {
      dayScore += 4;
    }
    if (conditions.favorableStages.includes(yearStage.stage)) {
      dayScore += 3;
    }

    // === 8. 신살 분석 (확장) ===
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
          // 화개는 학업에는 좋음
          if (eventType === 'study') dayScore += 5;
          else dayScore -= 3;
        } else {
          dayScore -= 5;
        }
      }
    }

    // === 9. 절기 분석 ===
    const solarTerm = getSolarTermForDate(current);
    if (conditions.favorableElements.includes(solarTerm.element)) {
      dayScore += 3;
    }
    if (input.yongsin?.includes(solarTerm.element)) {
      dayScore += 4;
    }

    // === 10. 점성술 데이터 (있는 경우) ===
    if (input.astroChart) {
      const astroBonus = calculateAstroBonus(input, eventType);
      dayScore += astroBonus.bonus * 0.5; // 일별 분석이므로 절반 가중치
    }

    // 점수 정규화 (0-100, 하지만 극단값 방지)
    dayScore = normalizeScore(dayScore, 15, 95);
    dailyScores.push({ date: new Date(current), score: Math.round(dayScore), reasons: dayReasons });

    current.setDate(current.getDate() + 1);
  }

  // 주간 가중 평균 점수 계산 (최고/최저 제외)
  const sortedScores = dailyScores.map(d => d.score).sort((a, b) => a - b);
  const trimmedScores = sortedScores.length > 3
    ? sortedScores.slice(1, -1)
    : sortedScores;
  const avgScore = trimmedScores.reduce((sum, s) => sum + s, 0) / trimmedScores.length;

  // 상위 이유들 수집 (빈도 + 중요도 기반)
  const allReasons = dailyScores.flatMap(d => d.reasons);
  const reasonCounts = allReasons.reduce((acc, r) => {
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 중요도 가중치
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

  // 최고의 날들 (상위 3개, 점수와 이유 개수 고려)
  const sortedDays = [...dailyScores]
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 5) return scoreDiff;
      return b.reasons.length - a.reasons.length; // 점수 비슷하면 이유 많은 날 우선
    });
  const bestDayEntry = sortedDays[0];
  const bestDays = sortedDays.slice(0, 3).map(d => d.date);

  return {
    score: Math.round(avgScore),
    reasons: topReasons,
    bestDays,
    bestDay: bestDayEntry ? bestDayEntry.date : new Date(weekStart),
    bestDayScore: bestDayEntry ? bestDayEntry.score : Math.round(avgScore),
  };
}
