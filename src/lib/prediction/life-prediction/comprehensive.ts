/**
 * Comprehensive Prediction Module
 * 종합 예측 생성 및 프롬프트 컨텍스트 생성
 */

import type {
  LifePredictionInput,
  MultiYearTrend,
  ComprehensivePrediction,
  UpcomingHighlight,
  EventTimingResult,
  PastRetrospective,
  EventType,
} from './types';
import { analyzeMultiYearTrend } from './multi-year';
import { analyzeDaeunTransitSync, type LifeSyncAnalysis } from '../daeunTransitSync';

// ============================================================
// Comprehensive Prediction Generation
// ============================================================

/**
 * 다가오는 하이라이트 추출
 */
function extractUpcomingHighlights(
  trend: MultiYearTrend,
  lifeSync: LifeSyncAnalysis | undefined,
  currentYear: number
): UpcomingHighlight[] {
  const highlights: UpcomingHighlight[] = [];

  // 피크 연도
  for (const peakYear of trend.peakYears) {
    if (peakYear >= currentYear) {
      const yearData = trend.yearlyScores.find(y => y.year === peakYear);
      if (yearData) {
        highlights.push({
          type: 'peak',
          date: new Date(peakYear, 0, 1),
          title: `${peakYear}년 최고 운세`,
          description: `${yearData.grade}등급 (${Math.round(yearData.score)}점) - ${yearData.themes.join(', ')}`,
          score: yearData.score,
          actionItems: yearData.opportunities,
        });
      }
    }
  }

  // 대운 전환점
  for (const transition of trend.daeunTransitions) {
    if (transition.year >= currentYear) {
      highlights.push({
        type: 'transition',
        date: new Date(transition.year, 0, 1),
        title: `${transition.year}년 대운 전환`,
        description: transition.description,
        score: transition.impact.includes('positive') ? 75 : transition.impact.includes('challenging') ? 35 : 50,
        actionItems: transition.impact.includes('positive')
          ? ['새로운 시작에 적합', '중요한 계획 추진']
          : ['변화에 대한 준비', '신중한 접근 필요'],
      });
    }
  }

  // 대운-트랜짓 동기화 포인트
  if (lifeSync) {
    for (const point of lifeSync.majorTransitions.slice(0, 3)) {
      if (point.year >= currentYear) {
        highlights.push({
          type: point.synergyType === 'amplify' ? 'opportunity' : point.synergyType === 'clash' ? 'challenge' : 'transition',
          date: new Date(point.year, 0, 1),
          title: `${point.age}세 (${point.year}년) 주요 전환점`,
          description: point.themes.slice(0, 2).join(', '),
          score: point.synergyScore,
          actionItems: point.synergyType === 'amplify' ? point.opportunities : point.challenges,
        });
      }
    }
  }

  // 정렬 (날짜순)
  highlights.sort((a, b) => a.date.getTime() - b.date.getTime());

  return highlights.slice(0, 10);
}

/**
 * 종합 예측 생성
 */
export function generateComprehensivePrediction(
  input: LifePredictionInput,
  yearsRange: number = 10
): ComprehensivePrediction {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const endYear = currentYear + yearsRange;

  // 다년간 트렌드
  const multiYearTrend = analyzeMultiYearTrend(input, startYear, endYear);

  // 대운-트랜짓 동기화 (대운 정보가 있는 경우)
  let lifeSync: LifeSyncAnalysis | undefined;
  if (input.daeunList && input.daeunList.length > 0) {
    const currentAge = currentYear - input.birthYear;
    lifeSync = analyzeDaeunTransitSync(input.daeunList, input.birthYear, currentAge);
  }

  // 다가오는 하이라이트 추출
  const upcomingHighlights = extractUpcomingHighlights(multiYearTrend, lifeSync, currentYear);

  // 신뢰도 계산
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

// ============================================================
// Prompt Context Generation
// ============================================================

/**
 * 종합 인생 예측 프롬프트 컨텍스트 생성
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
    lines.push(`Period: ${prediction.multiYearTrend.startYear}-${prediction.multiYearTrend.endYear}`);
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
 * 이벤트 타이밍 프롬프트 컨텍스트 생성
 */
export function generateEventTimingPromptContext(
  result: EventTimingResult,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  const eventNames: Record<EventType, { ko: string; en: string }> = {
    marriage: { ko: '결혼', en: 'Marriage' },
    career: { ko: '취업/이직', en: 'Career' },
    investment: { ko: '투자', en: 'Investment' },
    move: { ko: '이사', en: 'Move' },
    study: { ko: '학업/시험', en: 'Study' },
    health: { ko: '건강관리', en: 'Health' },
    relationship: { ko: '인간관계', en: 'Relationship' },
  };

  if (lang === 'ko') {
    lines.push(`=== ${eventNames[result.eventType].ko} 최적 타이밍 분석 ===`);
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
    lines.push(`=== ${eventNames[result.eventType].en} Optimal Timing ===`);
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
 * 과거 분석 프롬프트 컨텍스트 생성
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
