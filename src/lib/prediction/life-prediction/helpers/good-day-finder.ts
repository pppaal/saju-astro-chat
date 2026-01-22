/**
 * Good Day Finder Module
 * Extracted from lifePredictionEngine.ts
 *
 * Functions for finding specific good days within a month based on event type and conditions
 */

import type { EventType, LifePredictionInput } from '../../life-prediction-types';
import {
  calculateDailyPillar,
} from '../../ultraPrecisionEngine';
import {
  calculatePreciseTwelveStage,
  calculateSibsin,
} from '../../advancedTimingEngine';
import {
  getSolarTermForDate,
  getLunarMansion,
} from '../../precisionEngine';
import { detectShinsals } from '../../life-prediction-helpers';
import { normalizeScore } from '../../utils/scoring-utils';
import {
  EVENT_SCORING,
} from '../../constants/scoring';
import { EVENT_FAVORABLE_CONDITIONS, STEM_ELEMENT } from '../../engine/constants';

/**
 * Find specific good days within a month for a given event type
 * Uses TIER 5 precision analysis including lunar mansions and shinsals
 *
 * @param input - Life prediction input data
 * @param monthStart - Start date of the month
 * @param monthEnd - End date of the month
 * @param eventType - Type of event to find good days for
 * @param options - Analysis options (lunar mansions, planetary hours)
 * @returns Array of optimal dates (up to 5)
 */
export function findSpecificGoodDays(
  input: LifePredictionInput,
  monthStart: Date,
  monthEnd: Date,
  eventType: EventType,
  options: { useLunarMansions?: boolean; usePlanetaryHours?: boolean } = {}
): Date[] {
  const { useLunarMansions = true, usePlanetaryHours = false } = options;

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  // 유효하지 않은 eventType이면 빈 배열 반환
  if (!conditions) {
    return [];
  }
  const goodDays: { date: Date; score: number; reasons: string[] }[] = [];

  const current = new Date(monthStart);
  while (current <= monthEnd) {
    const dailyPillar = calculateDailyPillar(current);
    const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);

    let score = 50;
    const reasons: string[] = [];

    // 기본 사주 분석
    if (conditions.favorableSibsin.includes(sibsin)) {
      score += EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN;
      reasons.push(`${sibsin}운`);
    }
    if (conditions.avoidSibsin.includes(sibsin)) score -= EVENT_SCORING.MARRIAGE_UNFAVORABLE_SIBSIN;
    if (conditions.favorableStages.includes(twelveStage.stage)) {
      score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
      reasons.push(twelveStage.stage);
    }
    if (conditions.avoidStages.includes(twelveStage.stage)) score -= EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN;

    // === TIER 5: 28수 분석 ===
    if (useLunarMansions) {
      const lunarMansion = getLunarMansion(current);

      // 이벤트별 28수 길흉 분석
      const eventKeywords: Record<EventType, string[]> = {
        marriage: ['결혼'],
        career: ['개업'],
        investment: ['계약'],
        move: ['이사'],
        study: ['학업'],
        health: [],
        relationship: ['결혼', '개업'],
      };

      const keywords = eventKeywords[eventType];

      if (lunarMansion.isAuspicious) {
        score += EVENT_SCORING.FAVORABLE_STAGE;
        if (keywords.some(k => lunarMansion.goodFor.includes(k))) {
          score += EVENT_SCORING.BUSINESS_FAVORABLE;
          reasons.push(`${lunarMansion.nameKo}수 - ${eventType}에 최적`);
        } else {
          reasons.push(`${lunarMansion.nameKo}수 - 길일`);
        }
      } else {
        score -= EVENT_SCORING.INVESTMENT_UNFAVORABLE;
        if (keywords.some(k => lunarMansion.badFor.includes(k))) {
          score -= EVENT_SCORING.BUSINESS_UNFAVORABLE;
        }
      }
    }

    // === TIER 5: 절기 분석 ===
    const solarTerm = getSolarTermForDate(current);
    const dayElement = STEM_ELEMENT[dailyPillar.stem];

    // 용신 활성 확인
    if (input.yongsin?.includes(dayElement)) {
      score += EVENT_SCORING.BUSINESS_FAVORABLE;
      reasons.push('용신일');
    }
    if (input.kisin?.includes(dayElement)) {
      score -= 8;
    }

    // 절기 에너지 조화
    if (conditions.favorableElements.includes(solarTerm.element)) {
      score += 5;
    }

    // === TIER 5: 신살 분석 ===
    const shinsals = detectShinsals(input, dailyPillar);
    for (const shinsal of shinsals) {
      if (shinsal.type === 'lucky') {
        if (shinsal.name === '천을귀인') {
          score += 12;
          reasons.push('천을귀인');
        } else if (shinsal.name === '역마' && eventType === 'move') {
          score += 10;
          reasons.push('역마');
        } else if (shinsal.name === '문창' && eventType === 'study') {
          score += 10;
          reasons.push('문창');
        }
      } else {
        if (shinsal.name === '겁살') {
          score -= 10;
        }
      }
    }

    // 점수 정규화
    score = normalizeScore(score);

    if (score >= 65) {
      goodDays.push({ date: new Date(current), score, reasons });
    }

    current.setDate(current.getDate() + 1);
  }

  return goodDays
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(d => d.date);
}
