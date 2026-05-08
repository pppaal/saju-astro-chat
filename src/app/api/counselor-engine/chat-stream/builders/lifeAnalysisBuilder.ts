/**
 * Life Analysis Builder
 *
 * 인생 예측 및 과거 분석 섹션 구성
 */

import {
  analyzePastDate,
  generatePastAnalysisPromptContext,
  analyzeMultiYearTrend,
  findOptimalEventTiming,
  type LifePredictionInput,
  type EventType,
} from '@/lib/prediction/lifePredictionEngine';
import { generateEventTimingPromptContext } from '@/lib/prediction/prompt-contexts';
import { extractBirthYear, extractBirthMonth, extractBirthDay } from '@/lib/prediction/utils';
import { logger } from '@/lib/logger';
import type { SajuDataStructure, AstroDataStructure } from '../lib/types';
import { extractAllStemsAndBranches } from '../helpers/pillarExtractors';

/**
 * 과거 분석 섹션 구성
 */
export function buildPastAnalysisSection(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  birthDate: string,
  gender: 'male' | 'female',
  question: string,
  lang: string
): string {
  const pastKeywords = ['그때', '당시', '과거', '작년', '년', '월'];
  const hasPastKeyword = pastKeywords.some((kw) => question.includes(kw));

  if (!hasPastKeyword || !saju?.dayMaster) {
    return '';
  }

  try {
    // 연도 추출 (정규식)
    const yearMatch = question.match(/(\d{4})\s*년/);
    if (!yearMatch) {
      return '';
    }

    const targetYear = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();

    if (targetYear > currentYear || targetYear < 1900) {
      return '';
    }

    const birthYear = extractBirthYear(birthDate);
    const birthMonth = extractBirthMonth(birthDate);
    const birthDay = extractBirthDay(birthDate);

    const { allStems, allBranches } = extractAllStemsAndBranches(saju);

    const input: LifePredictionInput = {
      birthYear,
      birthMonth,
      birthDay,
      gender,
      dayStem: saju.dayMaster?.heavenlyStem || '甲',
      dayBranch: saju?.pillars?.day?.earthlyBranch?.name || '子',
      monthBranch: allBranches[1],
      yearBranch: allBranches[0],
      allStems,
      allBranches,
    };

    const targetDate = new Date(targetYear, 0, 1);
    const pastAnalysis = analyzePastDate(input, targetDate);
    const promptContext = generatePastAnalysisPromptContext(
      pastAnalysis,
      lang as 'ko' | 'en'
    );

    return promptContext;
  } catch (e) {
    logger.warn('[lifeAnalysisBuilder] Past analysis error:', e);
    return '';
  }
}

/**
 * 다년간 인생 예측 섹션 구성
 */
export function buildMultiYearTrendSection(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  birthDate: string,
  gender: 'male' | 'female',
  theme: string,
  lang: string
): string {
  const longTermThemes = [
    'future',
    'life-plan',
    'career',
    'marriage',
    'investment',
    'money',
    'love',
  ];

  if (!longTermThemes.includes(theme) || !saju?.dayMaster) {
    return '';
  }

  try {
    const currentYear = new Date().getFullYear();
    const birthYear = extractBirthYear(birthDate);
    const birthMonth = extractBirthMonth(birthDate);
    const birthDay = extractBirthDay(birthDate);
    const startYear = currentYear - 2;
    const endYear = currentYear + 8;

    const { allStems, allBranches } = extractAllStemsAndBranches(saju);

    const input: LifePredictionInput = {
      birthYear,
      birthMonth,
      birthDay,
      gender,
      dayStem: saju.dayMaster?.heavenlyStem || '甲',
      dayBranch: saju?.pillars?.day?.earthlyBranch?.name || '子',
      monthBranch: allBranches[1],
      yearBranch: allBranches[0],
      allStems,
      allBranches,
    };

    // 다년간 트렌드 분석
    const trendAnalysis = analyzeMultiYearTrend(input, startYear, endYear);

    // 이벤트별 최적 시기 (테마에 따라)
    const eventMap: Record<string, EventType> = {
      'marriage': 'marriage',
      'love': 'relationship',
      'career': 'career',
      'investment': 'investment',
      'money': 'investment',
    };

    const eventType = eventMap[theme];
    let eventTimingContext = '';

    if (eventType) {
      const eventTiming = findOptimalEventTiming(
        input,
        eventType,
        startYear,
        endYear
      );
      eventTimingContext = generateEventTimingPromptContext(
        eventTiming,
        lang as 'ko' | 'en'
      );
    }

    // MultiYearTrend를 간단한 문자열로 변환
    const peakYearsStr = trendAnalysis.peakYears.slice(0, 3).join(', ');
    const lowYearsStr = trendAnalysis.lowYears.slice(0, 3).join(', ');

    const trendSummary = [
      `=== ${lang === 'ko' ? '다년간 인생 예측' : 'Multi-Year Life Prediction'} ===`,
      `${lang === 'ko' ? '분석 기간' : 'Period'}: ${startYear}-${endYear}`,
      `${lang === 'ko' ? '총 기간 수' : 'Total Periods'}: ${trendAnalysis.yearlyScores.length}`,
      `${lang === 'ko' ? '전체 트렌드' : 'Overall Trend'}: ${trendAnalysis.overallTrend}`,
      `${lang === 'ko' ? '최고의 해' : 'Peak Years'}: ${peakYearsStr || 'N/A'}`,
      `${lang === 'ko' ? '도전의 해' : 'Challenge Years'}: ${lowYearsStr || 'N/A'}`,
      '',
      trendAnalysis.summary,
      '',
      `${lang === 'ko' ? '위 분석을 바탕으로 인생 전반의 흐름을 설명하고 조언을 제공하세요.' : 'Based on the analysis above, explain the overall life flow and provide advice.'}`,
    ].join('\n');

    return `${trendSummary}\n\n${eventTimingContext}`.trim();
  } catch (e) {
    logger.warn('[lifeAnalysisBuilder] Multi-year trend error:', e);
    return '';
  }
}
