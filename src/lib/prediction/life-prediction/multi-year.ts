/**
 * Multi-Year Trend Analysis Module
 * 다년간 운세 트렌드 분석
 */

import type { FiveElement, PreciseTwelveStage } from '../advancedTimingEngine';
import type { DaeunInfo } from '../daeunTransitSync';
import type {
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
  LifeCyclePhase,
  PredictionGrade,
} from './types';
import { STEM_ELEMENT, SIBSIN_SCORES } from './constants';
import { normalizeScore } from '../utils/scoring-utils';
import {
  calculateYearlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  analyzeBranchInteractions,
} from '../advancedTimingEngine';

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
 * 인생 주기 테마 생성
 */
function generatePhaseTheme(daeun: DaeunInfo, energy: LifeCyclePhase['energy']): string {
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
 * 인생 주기 권장 사항 생성
 */
function generatePhaseRecommendations(energy: LifeCyclePhase['energy'], element: FiveElement): string[] {
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
 * 인생 주기 분석
 */
function analyzeLifeCycles(yearlyScores: YearlyScore[], daeunList: DaeunInfo[]): LifeCyclePhase[] {
  const phases: LifeCyclePhase[] = [];

  for (const daeun of daeunList) {
    const yearsInDaeun = yearlyScores.filter(y => y.daeun === daeun);
    if (yearsInDaeun.length === 0) continue;

    const avgScore = yearsInDaeun.reduce((sum, y) => sum + y.score, 0) / yearsInDaeun.length;

    let energy: LifeCyclePhase['energy'];
    if (avgScore >= 70) energy = 'peak';
    else if (avgScore >= 55) energy = 'rising';
    else if (avgScore >= 40) energy = 'declining';
    else energy = 'dormant';

    const theme = generatePhaseTheme(daeun, energy);
    const recommendations = generatePhaseRecommendations(energy, daeun.element);

    phases.push({
      name: `${daeun.stem}${daeun.branch} 대운`,
      startYear: yearsInDaeun[0].year,
      endYear: yearsInDaeun[yearsInDaeun.length - 1].year,
      startAge: daeun.startAge,
      endAge: daeun.endAge,
      theme,
      energy,
      recommendations,
    });
  }

  return phases;
}

/**
 * 트렌드 요약 생성
 */
function generateTrendSummary(
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

// ============================================================
// Main Multi-Year Analysis Function
// ============================================================

/**
 * 다년간 운세 트렌드 분석
 */
export function analyzeMultiYearTrend(
  input: LifePredictionInput,
  startYear: number,
  endYear: number
): MultiYearTrend {
  const currentYear = new Date().getFullYear();
  const yearlyScores: YearlyScore[] = [];
  const daeunTransitions: DaeunTransitionPoint[] = [];

  const daeunList = input.daeunList || [];

  for (let year = startYear; year <= endYear; year++) {
    const age = year - input.birthYear;
    if (age < 0) continue;

    // 해당 연도의 간지
    const yearGanji = calculateYearlyGanji(year);

    // 12운성 계산
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);

    // 십신 계산
    const sibsin = calculateSibsin(input.dayStem, yearGanji.stem);

    // 지지 상호작용
    const allBranches = [input.dayBranch, input.monthBranch, input.yearBranch, yearGanji.branch];
    const branchInteractions = analyzeBranchInteractions(allBranches);

    // 해당 나이의 대운 찾기
    const daeun = daeunList.find(d => age >= d.startAge && age <= d.endAge);

    // 점수 계산
    let score = twelveStage.score;

    // 십신 보정
    score += SIBSIN_SCORES[sibsin] || 0;

    // 지지 상호작용 보정
    for (const inter of branchInteractions) {
      score += inter.score * 0.3;
    }

    // 대운 보정
    if (daeun) {
      const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
      score += (daeunStage.score - 50) * 0.3;
    }

    // 용신/기신 보정
    const yearElement = STEM_ELEMENT[yearGanji.stem];
    if (input.yongsin?.includes(yearElement)) score += 12;
    if (input.kisin?.includes(yearElement)) score -= 10;

    score = normalizeScore(score);

    // 등급 결정
    const grade = scoreToGrade(score);

    // 테마/기회/도전 생성
    const themes: string[] = [];
    const opportunities: string[] = [];
    const challenges: string[] = [];

    // 12운성 기반
    if (twelveStage.energy === 'peak') {
      themes.push('전성기');
      opportunities.push('중요한 결정과 도전의 최적기');
    } else if (twelveStage.energy === 'rising') {
      themes.push('상승기');
      opportunities.push('새로운 시작과 성장');
    } else if (twelveStage.energy === 'declining') {
      themes.push('안정기');
      challenges.push('무리한 확장 자제');
    } else {
      themes.push('준비기');
      challenges.push('내면 성찰과 재충전 필요');
    }

    // 십신 기반
    if (['정관', '정재', '정인'].includes(sibsin)) {
      opportunities.push(`${sibsin}운 - 안정적 발전`);
    } else if (['겁재', '상관'].includes(sibsin)) {
      challenges.push(`${sibsin}운 - 경쟁과 갈등 주의`);
    }

    yearlyScores.push({
      year,
      age,
      score,
      grade,
      yearGanji,
      twelveStage,
      sibsin,
      branchInteractions,
      daeun,
      themes,
      opportunities,
      challenges,
    });

    // 대운 전환점 감지
    if (daeun && age === daeun.startAge && daeunList.indexOf(daeun) > 0) {
      const prevDaeun = daeunList[daeunList.indexOf(daeun) - 1];
      const prevStage = calculatePreciseTwelveStage(input.dayStem, prevDaeun.branch);
      const currStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);

      let impact: DaeunTransitionPoint['impact'];
      const scoreDiff = currStage.score - prevStage.score;
      if (scoreDiff >= 30) impact = 'major_positive';
      else if (scoreDiff >= 10) impact = 'positive';
      else if (scoreDiff <= -30) impact = 'major_challenging';
      else if (scoreDiff <= -10) impact = 'challenging';
      else impact = 'neutral';

      daeunTransitions.push({
        year,
        age,
        fromDaeun: prevDaeun,
        toDaeun: daeun,
        impact,
        description: `${prevDaeun.stem}${prevDaeun.branch} → ${daeun.stem}${daeun.branch} 대운 전환`,
      });
    }
  }

  // 전체 트렌드 분석
  const scores = yearlyScores.map(y => y.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const firstHalfAvg = scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
  const secondHalfAvg = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / (scores.length - Math.floor(scores.length / 2));

  let overallTrend: MultiYearTrend['overallTrend'];
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

  if (variance > 400) {
    overallTrend = 'volatile';
  } else if (secondHalfAvg - firstHalfAvg > 10) {
    overallTrend = 'ascending';
  } else if (firstHalfAvg - secondHalfAvg > 10) {
    overallTrend = 'descending';
  } else {
    overallTrend = 'stable';
  }

  // 피크/로우 연도
  const sortedByScore = [...yearlyScores].sort((a, b) => b.score - a.score);
  const peakYears = sortedByScore.slice(0, 3).map(y => y.year);
  const lowYears = sortedByScore.slice(-3).map(y => y.year);

  // 인생 주기 분석
  const lifeCycles = analyzeLifeCycles(yearlyScores, daeunList);

  // 요약 생성
  const summary = generateTrendSummary(overallTrend, peakYears, lowYears, daeunTransitions, currentYear);

  return {
    startYear,
    endYear,
    yearlyScores,
    overallTrend,
    peakYears,
    lowYears,
    daeunTransitions,
    lifeCycles,
    summary,
  };
}
