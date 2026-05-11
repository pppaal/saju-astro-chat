/**
 * Highlights Extractor Module
 * Extracted from lifePredictionEngine.ts
 *
 * Functions for extracting and formatting upcoming highlights from multi-year trends
 */

import type { MultiYearTrend, UpcomingHighlight } from '../../life-prediction-types';
import type { LifeSyncAnalysis } from '../../daeunTransitSync';

/**
 * Extract upcoming highlights from multi-year trend analysis
 * Identifies peak years, daeun transitions, and major life sync points
 *
 * @param trend - Multi-year trend analysis result
 * @param lifeSync - Life sync analysis (daeun-transit synchronization) if available
 * @param currentYear - Current year for filtering future events
 * @returns Array of upcoming highlights (up to 10)
 */
export function extractUpcomingHighlights(
  trend: MultiYearTrend,
  lifeSync: LifeSyncAnalysis | undefined,
  currentYear: number
): UpcomingHighlight[] {
  const highlights: UpcomingHighlight[] = [];
  const today = new Date();

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
