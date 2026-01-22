/**
 * Prompt Context Generators for Life Prediction
 * Generates context strings for AI prompts from prediction results
 */

import type {
  ComprehensivePrediction,
  EventTimingResult,
  PastRetrospective,
  EventType,
} from './lifePredictionEngine';

/**
 * Generate prompt context from comprehensive life prediction
 * @param prediction - Comprehensive prediction result
 * @param lang - Language (ko or en)
 * @returns Formatted context string for AI prompts
 */
export function generateLifePredictionPromptContext(
  prediction: ComprehensivePrediction,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push('=== 종합 인생 예측 분석 ===');
    lines.push(`분석 기간: ${prediction.multiYearTrend.startYear}~${prediction.multiYearTrend.endYear}년`);
    lines.push(`전체 트렌드: ${prediction.multiYearTrend.overallTrend}`);
    lines.push(`신뢰도: ${prediction.confidence}%`);
    lines.push('');

    lines.push('--- 연도별 운세 ---');
    for (const year of prediction.multiYearTrend.yearlyScores.slice(0, 10)) {
      lines.push(`${year.year}년 (${year.age}세): ${year.grade}등급 (${Math.round(year.score)}점) - ${year.sibsin}, ${year.twelveStage.stage}`);
      if (year.opportunities.length > 0) {
        lines.push(`  기회: ${year.opportunities.slice(0, 2).join(', ')}`);
      }
      if (year.challenges.length > 0) {
        lines.push(`  주의: ${year.challenges.slice(0, 2).join(', ')}`);
      }
    }
    lines.push('');

    if (prediction.multiYearTrend.daeunTransitions.length > 0) {
      lines.push('--- 대운 전환점 ---');
      for (const trans of prediction.multiYearTrend.daeunTransitions) {
        lines.push(`${trans.year}년 (${trans.age}세): ${trans.description} [${trans.impact}]`);
      }
      lines.push('');
    }

    lines.push('--- 다가오는 주요 시점 ---');
    for (const highlight of prediction.upcomingHighlights.slice(0, 5)) {
      lines.push(`[${highlight.type}] ${highlight.title}`);
      lines.push(`  ${highlight.description}`);
      lines.push(`  행동: ${highlight.actionItems.slice(0, 2).join(', ')}`);
    }
    lines.push('');

    lines.push(`요약: ${prediction.multiYearTrend.summary}`);

  } else {
    lines.push('=== Comprehensive Life Prediction ===');
    lines.push(`year range: ${prediction.multiYearTrend.startYear}-${prediction.multiYearTrend.endYear}`);
    lines.push(`Trend: ${prediction.multiYearTrend.overallTrend}`);
    lines.push(`Confidence: ${prediction.confidence}%`);
    lines.push('');

    for (const year of prediction.multiYearTrend.yearlyScores.slice(0, 10)) {
      lines.push(`${year.year} (Age ${year.age}): Grade ${year.grade} (${Math.round(year.score)})`);
    }
  }

  return lines.join('\n');
}

/**
 * Event type names mapping for internationalization
 */
const EVENT_NAMES: Record<EventType, { ko: string; en: string }> = {
  marriage: { ko: '결혼', en: 'Marriage' },
  career: { ko: '취업/이직', en: 'Career' },
  investment: { ko: '투자', en: 'Investment' },
  move: { ko: '이사', en: 'Move' },
  study: { ko: '학업/시험', en: 'Study' },
  health: { ko: '건강관리', en: 'Health' },
  relationship: { ko: '인간관계', en: 'Relationship' },
};

/**
 * Generate prompt context from event timing analysis
 * @param result - Event timing result
 * @param lang - Language (ko or en)
 * @returns Formatted context string for AI prompts
 */
export function generateEventTimingPromptContext(
  result: EventTimingResult,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== ${EVENT_NAMES[result.eventType].ko} (${result.eventType}) 최적 타이밍 분석 ===`);
    lines.push(`검색 범위: ${result.searchRange.startYear}~${result.searchRange.endYear}년`);
    lines.push('');

    lines.push('--- 최적 시기 (상위 5개) ---');
    for (const period of result.optimalPeriods.slice(0, 5)) {
      const monthStr = `${period.startDate.getFullYear()}년 ${period.startDate.getMonth() + 1}월`;
      lines.push(`${monthStr}: ${period.grade}등급 (${Math.round(period.score)}점)`);
      lines.push(`  이유: ${period.reasons.slice(0, 3).join(', ')}`);
      if (period.specificDays && period.specificDays.length > 0) {
        const days = period.specificDays.map(d => `${d.getDate()}일`).join(', ');
        lines.push(`  추천일: ${days}`);
      }
    }
    lines.push('');

    if (result.avoidPeriods.length > 0) {
      lines.push('--- 피해야 할 시기 ---');
      for (const period of result.avoidPeriods.slice(0, 3)) {
        const monthStr = `${period.startDate.getFullYear()}년 ${period.startDate.getMonth() + 1}월`;
        lines.push(`${monthStr}: ${period.reasons.slice(0, 2).join(', ')}`);
      }
      lines.push('');
    }

    lines.push(`조언: ${result.advice}`);

  } else {
    lines.push(`=== ${EVENT_NAMES[result.eventType].en} Optimal Timing ===`);
    lines.push(`Range: ${result.searchRange.startYear}-${result.searchRange.endYear}`);
    lines.push('');

    for (const period of result.optimalPeriods.slice(0, 5)) {
      const monthStr = `${period.startDate.getFullYear()}/${period.startDate.getMonth() + 1}`;
      lines.push(`${monthStr}: Grade ${period.grade} (${Math.round(period.score)})`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate prompt context from past date analysis
 * @param retrospective - Past retrospective result
 * @param lang - Language (ko or en)
 * @returns Formatted context string for AI prompts
 */
export function generatePastAnalysisPromptContext(
  retrospective: PastRetrospective,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];
  const dateStr = retrospective.targetDate.toISOString().split('T')[0];

  if (lang === 'ko') {
    lines.push(`=== ${dateStr} 과거 분석 ===`);
    lines.push(`일진: ${retrospective.dailyPillar.stem}${retrospective.dailyPillar.branch}`);
    lines.push(`등급: ${retrospective.grade} (${Math.round(retrospective.score)}점)`);
    lines.push(`점수: ${Math.round(retrospective.score)}점`);
    lines.push(`12운성: ${retrospective.twelveStage.stage}`);
    lines.push(`십신: ${retrospective.sibsin}`);
    lines.push('');

    lines.push('--- 왜 그랬을까? ---');
    for (const reason of retrospective.whyItHappened) {
      lines.push(`• ${reason}`);
    }
    lines.push('');

    lines.push('--- 배운 점 ---');
    for (const lesson of retrospective.lessonsLearned) {
      lines.push(`• ${lesson}`);
    }

  } else {
    lines.push(`=== Past Analysis: ${dateStr} ===`);
    lines.push(`Daily: ${retrospective.dailyPillar.stem}${retrospective.dailyPillar.branch}`);
    lines.push(`Grade: ${retrospective.grade} (${Math.round(retrospective.score)})`);
  }

  return lines.join('\n');
}
