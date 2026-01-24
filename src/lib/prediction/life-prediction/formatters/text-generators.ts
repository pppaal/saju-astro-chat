/**
 * Text Generators Module
 * Extracted from lifePredictionEngine.ts
 *
 * Functions for generating human-readable text summaries, themes, and recommendations
 * across various prediction contexts (phases, trends, weekly summaries, events)
 */

import type { FiveElement } from '../../advancedTimingEngine';
import type { DaeunInfo } from '../../daeunTransitSync';
import type {
  LifeCyclePhase,
  MultiYearTrend,
  DaeunTransitionPoint,
  OptimalPeriod,
  AvoidPeriod,
  EventType,
  WeeklyPeriod,
} from '../../life-prediction-types';
import { EVENT_NAMES_FULL } from '../constants';

/**
 * Generate a theme description for a lifecycle phase based on daeun and energy level
 * @param daeun - The daeun (major fortune cycle) information
 * @param energy - The energy level of the phase (peak, rising, declining, dormant)
 * @returns A descriptive theme string
 */
export function generatePhaseTheme(daeun: DaeunInfo, energy: LifeCyclePhase['energy']): string {
  const elementThemes: Record<FiveElement, string> = {
    '목': '성장과 확장',
    '화': '열정과 표현',
    '토': '안정과 축적',
    '금': '결실과 정리',
    '수': '지혜와 유연함',
  };

  const energyThemes: Record<LifeCyclePhase['energy'], string> = {
    'peak': '최고조 활동기',
    'rising': '상승 발전기',
    'declining': '안정 수확기',
    'dormant': '휴식 충전기',
  };

  return `${elementThemes[daeun.element]} - ${energyThemes[energy]}`;
}

/**
 * Generate actionable recommendations for a lifecycle phase
 * @param energy - The energy level of the phase
 * @param element - The five element of the phase
 * @returns An array of recommendation strings
 */
export function generatePhaseRecommendations(energy: LifeCyclePhase['energy'], element: FiveElement): string[] {
  const recommendations: string[] = [];

  switch (energy) {
    case 'peak':
      recommendations.push('중요한 결정과 큰 프로젝트 추진');
      recommendations.push('적극적인 도전과 확장');
      recommendations.push('리더십 발휘와 책임 수용');
      break;
    case 'rising':
      recommendations.push('새로운 시작과 계획 수립');
      recommendations.push('학습과 자기 개발');
      recommendations.push('인맥 확장과 네트워킹');
      break;
    case 'declining':
      recommendations.push('기존 성과의 정리와 보존');
      recommendations.push('무리한 확장보다 안정 추구');
      recommendations.push('후계 양성과 지식 전수');
      break;
    case 'dormant':
      recommendations.push('내면 성찰과 재충전');
      recommendations.push('건강 관리와 휴식');
      recommendations.push('다음 주기를 위한 조용한 준비');
      break;
  }

  // 오행별 추가 조언
  switch (element) {
    case '목':
      recommendations.push('창의적 활동과 새로운 아이디어 개발');
      break;
    case '화':
      recommendations.push('열정을 표현하되 과열 주의');
      break;
    case '토':
      recommendations.push('부동산, 안정적 투자에 유리');
      break;
    case '금':
      recommendations.push('결단력 있는 정리와 선택');
      break;
    case '수':
      recommendations.push('유연한 대응과 지혜로운 판단');
      break;
  }

  return recommendations;
}

/**
 * Generate a comprehensive summary for multi-year trend analysis
 * @param trend - The overall trend direction
 * @param peakYears - Array of peak years
 * @param lowYears - Array of low-energy years
 * @param transitions - Array of daeun transition points
 * @param currentYear - The current year for reference
 * @returns A summary string describing the trend
 */
export function generateTrendSummary(
  trend: MultiYearTrend['overallTrend'],
  peakYears: number[],
  lowYears: number[],
  transitions: DaeunTransitionPoint[],
  currentYear: number
): string {
  let summary = '';

  switch (trend) {
    case 'ascending':
      summary = '전반적으로 상승하는 운세 흐름입니다. ';
      break;
    case 'descending':
      summary = '후반부로 갈수록 안정을 추구해야 하는 흐름입니다. ';
      break;
    case 'stable':
      summary = '안정적인 운세 흐름으로, 꾸준한 노력이 결실을 맺습니다. ';
      break;
    case 'volatile':
      summary = '변동이 큰 운세로, 유연한 대응이 중요합니다. ';
      break;
  }

  // 가까운 피크 연도
  const upcomingPeaks = peakYears.filter(y => y >= currentYear);
  if (upcomingPeaks.length > 0) {
    summary += `${upcomingPeaks[0]}년이 특히 좋은 시기입니다. `;
  }

  // 가까운 대운 전환
  const upcomingTransitions = transitions.filter(t => t.year >= currentYear);
  if (upcomingTransitions.length > 0) {
    const next = upcomingTransitions[0];
    if (next.impact.includes('positive')) {
      summary += `${next.year}년 대운 전환이 긍정적입니다.`;
    } else if (next.impact.includes('challenging')) {
      summary += `${next.year}년 대운 전환 시 신중한 대비가 필요합니다.`;
    }
  }

  return summary;
}

/**
 * Generate a summary for weekly event timing analysis
 * @param eventType - The type of event being analyzed
 * @param weeklyPeriods - Array of weekly period analyses
 * @param bestWeek - The best week for the event (if found)
 * @returns A summary string
 */
export function generateWeeklySummary(
  eventType: EventType,
  weeklyPeriods: WeeklyPeriod[],
  bestWeek: WeeklyPeriod | null
): string {
  if (!bestWeek) {
    return `${EVENT_NAMES_FULL[eventType].ko} 분석 결과가 없습니다.`;
  }

  const startStr = `${bestWeek.startDate.getMonth() + 1}/${bestWeek.startDate.getDate()}`;
  const endStr = `${bestWeek.endDate.getMonth() + 1}/${bestWeek.endDate.getDate()}`;

  let summary = `${EVENT_NAMES_FULL[eventType].ko}에 가장 좋은 주간은 ${startStr}~${endStr} (${bestWeek.grade}등급, ${bestWeek.averageScore}점)입니다.`;

  const bestDayList = bestWeek.bestDays && bestWeek.bestDays.length > 0
    ? bestWeek.bestDays
    : [bestWeek.bestDay];

  if (bestDayList.length > 0) {
    const bestDayStr = bestDayList.slice(0, 2)
      .map(d => `${d.getMonth() + 1}/${d.getDate()}`)
      .join(', ');
    summary += ` 특히 ${bestDayStr}일이 좋습니다.`;
  }

  // 점수 분포 분석
  const scores = weeklyPeriods.map(w => w.averageScore);
  const variance = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - (scores.reduce((a, b) => a + b) / scores.length), 2), 0) / scores.length);

  if (variance < 5) {
    summary += ' 전반적으로 안정적인 시기입니다.';
  } else if (variance > 15) {
    summary += ' 주간별 운세 변동이 크니 시기 선택이 중요합니다.';
  }

  return summary;
}

/**
 * Generate advice for event timing based on optimal and avoid periods
 * @param eventType - The type of event
 * @param optimalPeriods - Array of optimal periods found
 * @param avoidPeriods - Array of periods to avoid
 * @param nextBest - The next best upcoming period
 * @returns An advice string
 */
export function generateEventAdvice(
  eventType: EventType,
  optimalPeriods: OptimalPeriod[],
  avoidPeriods: AvoidPeriod[],
  nextBest: OptimalPeriod | null
): string {
  let advice = `${EVENT_NAMES_FULL[eventType].ko}에 대한 타이밍 분석 결과입니다. `;

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
