/**
 * Date Recommendation Builder
 * Builds specific date recommendation sections for chat responses
 */

import type { ActivityType } from '@/lib/prediction/specificDateEngine';
import {
  findBestDates,
  findYongsinActivationPeriods,
  generateSpecificDatePromptContext,
  generateYongsinPromptContext,
} from '@/lib/prediction/specificDateEngine';
import { logger } from '@/lib/logger';

interface SajuData {
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  allStems: string[];
  allBranches: string[];
  primaryYongsin?: string;
}

interface DateRecommendationOptions {
  activity: ActivityType;
  sajuData: SajuData;
  lang: 'ko' | 'en';
  searchDays?: number;
  topN?: number;
}

/**
 * Build specific date recommendation section
 * @param options - Date recommendation options
 * @returns Formatted section string or empty string if no recommendations
 */
export function buildDateRecommendationSection(
  options: DateRecommendationOptions
): string {
  const { activity, sajuData, lang, searchDays = 60, topN = 5 } = options;
  const sections: string[] = [];

  try {
    // Find best dates for activity
    const recommendations = findBestDates({
      activity,
      dayStem: sajuData.dayStem,
      dayBranch: sajuData.dayBranch,
      monthBranch: sajuData.monthBranch,
      yearBranch: sajuData.yearBranch,
      allStems: sajuData.allStems,
      allBranches: sajuData.allBranches,
      yongsin: sajuData.primaryYongsin,
      startDate: new Date(),
      searchDays,
      topN,
    });

    if (recommendations.length > 0) {
      const header = [
        '',
        '═══════════════════════════════════════════════════════════════',
        lang === 'ko'
          ? `[📅 ${activity} 최적 날짜 추천]`
          : `[📅 Best Dates for ${activity}]`,
        '═══════════════════════════════════════════════════════════════',
      ].join('\n');

      const content = generateSpecificDatePromptContext(recommendations, activity, lang);

      const footer = lang === 'ko'
        ? '위 구체적 날짜와 시간을 기반으로 사용자에게 추천하세요. 각 날짜의 점수와 이유를 설명하세요.'
        : 'Recommend specific dates and times based on the above. Explain the scores and reasons.';

      sections.push(header, content, '', footer, '');

      logger.warn(
        `[chat-stream] Specific date recommendations: ${recommendations.length} for ${activity}`
      );
    }

    // Add yongsin activation periods if available
    if (sajuData.primaryYongsin) {
      const activations = findYongsinActivationPeriods(
        sajuData.primaryYongsin,
        sajuData.dayStem,
        new Date(),
        searchDays
      );

      if (activations.length > 0) {
        sections.push(
          '',
          generateYongsinPromptContext(
            activations.slice(0, 5),
            sajuData.primaryYongsin,
            lang
          )
        );

        logger.warn(
          `[chat-stream] Yongsin activation periods: ${activations.length} for ${sajuData.primaryYongsin}`
        );
      }
    }
  } catch (error) {
    logger.warn('[chat-stream] Failed to generate specific date recommendations:', error);
  }

  return sections.join('\n');
}

/**
 * Extract saju data from saju object
 * @param saju - Saju data structure
 * @returns Extracted saju data for date recommendations
 */
export function extractSajuDataForRecommendation(saju: any): SajuData | null {
  const dayStem = saju?.dayMaster?.heavenlyStem?.name || saju?.pillars?.day?.heavenlyStem?.name;
  const dayBranch = saju?.dayMaster?.earthlyBranch?.name || saju?.pillars?.day?.earthlyBranch?.name;

  if (!dayStem || !dayBranch) {
    return null;
  }

  const monthBranch = saju?.pillars?.month?.earthlyBranch?.name || '子';
  const yearBranch = saju?.pillars?.year?.earthlyBranch?.name || '子';

  const allStems = [
    saju?.pillars?.year?.heavenlyStem?.name,
    saju?.pillars?.month?.heavenlyStem?.name,
    dayStem,
    saju?.pillars?.time?.heavenlyStem?.name,
  ].filter((x): x is string => Boolean(x));

  const allBranches = [
    yearBranch,
    monthBranch,
    dayBranch,
    saju?.pillars?.time?.earthlyBranch?.name,
  ].filter((x): x is string => Boolean(x));

  const primaryYongsin = saju?.advancedAnalysis?.yongsin?.primary;

  return {
    dayStem,
    dayBranch,
    monthBranch,
    yearBranch,
    allStems,
    allBranches,
    primaryYongsin,
  };
}
