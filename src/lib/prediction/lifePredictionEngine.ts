// src/lib/prediction/lifePredictionEngine.ts
// 종합 인생 예측 엔진 - 다년간 트렌드 + 과거 회고 + 이벤트 타이밍

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
  type FiveElement,
  type BranchInteraction,
  type PreciseTwelveStage,
} from './advancedTimingEngine';

import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo as _convertSajuDaeunToInfo,
  type DaeunInfo,
  type LifeSyncAnalysis,
} from './daeunTransitSync';

// Re-export for external use
export const convertSajuDaeunToInfo = _convertSajuDaeunToInfo;

import {
  calculateDailyPillar,
} from './ultraPrecisionEngine';

import { scoreToGrade, type PredictionGrade } from './index';

// TIER 5: 초정밀 분석 엔진
import {
  PrecisionEngine,
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
  calculateSecondaryProgression,
  analyzeCausalFactors,
  calculateEventCategoryScores,
  calculateConfidence,
  type SolarTerm,
  type LunarMansion,
  type LunarPhase,
  type PlanetaryHour,
  type CausalFactor,
  type EventCategoryScores,
  type ConfidenceFactors,
} from './precisionEngine';

// TIER 6: 고급 분석 모듈
import { calculateTier6Bonus } from './tier6Analysis';
import { calculateTier7To10Bonus } from './tier7To10Analysis';

// ============================================================
// 분리된 모듈에서 import
// ============================================================

// 타입 re-export (하위 호환성)
export type {
  AstroDataForPrediction,
  TransitAspectForPrediction,
  OuterPlanetPosition,
  AdvancedAstroForPrediction,
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
  LifeCyclePhase,
  PastRetrospective,
  EventType,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  ComprehensivePrediction,
  UpcomingHighlight,
  WeeklyPeriod,
  WeeklyEventTimingResult,
  BonusResult,
  ShinsalInfo,
} from './life-prediction-types';

import type {
  EventType,
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
  LifeCyclePhase,
  PastRetrospective,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  ComprehensivePrediction,
  UpcomingHighlight,
  WeeklyPeriod,
  WeeklyEventTimingResult,
} from './life-prediction-types';

// 상수 import
import {
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  SIBSIN_SCORES,
  EVENT_NAMES,
  IMPORTANCE_WEIGHT,
} from './life-prediction-constants';

// 점성술 보정 함수 import
import {
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  estimateMonthlyTransitScore,
} from './life-prediction-astro';

// 헬퍼 함수 import
import {
  analyzeStemRelation,
  analyzeBranchRelation,
  detectShinsals,
  calculateCompoundLuckScore,
  calculateMethodAlignment,
  calculateDataCompleteness,
  determineLifeCycle,
  analyzeOverallTrend,
  generateYearlyThemes,
  generateOpportunities,
  generateChallenges,
} from './life-prediction-helpers';

// ============================================================
// 타입 정의는 life-prediction-types.ts에서 import
// 상수 정의는 life-prediction-constants.ts에서 import
// 점성술 보정 함수는 life-prediction-astro.ts에서 import
// 헬퍼 함수는 life-prediction-helpers.ts에서 import
// ============================================================

// NOTE: 아래 함수들은 분리된 모듈에서 import되므로 이 파일에서 삭제됨
// - calculateAstroBonus → life-prediction-astro.ts
// - calculateTransitBonus → life-prediction-astro.ts
// - estimateMonthlyTransitScore → life-prediction-astro.ts
// - calculateTransitHouseOverlay → life-prediction-astro.ts
// - calculateCompoundLuckScore → life-prediction-helpers.ts
// - analyzeStemRelation → life-prediction-helpers.ts
// - analyzeBranchRelation → life-prediction-helpers.ts

// ============================================================
// 1. 다년간 트렌드 분석
// ============================================================

export function analyzeMultiYearTrend(
  input: LifePredictionInput,
  startYear: number,
  endYear: number
): MultiYearTrend {
  const currentYear = new Date().getFullYear();
  const yearlyScores: YearlyScore[] = [];
  const daeunTransitions: DaeunTransitionPoint[] = [];

  // 대운 리스트 준비
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
    const sibsinScores: Record<string, number> = {
      '정관': 15, '정재': 12, '정인': 10, '식신': 8,
      '편관': 5, '편재': 5, '편인': 3, '상관': 0,
      '비견': -3, '겁재': -8,
    };
    score += sibsinScores[sibsin] || 0;

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

    score = Math.max(0, Math.min(100, score));

    // 등급 결정 (통일된 기준 사용)
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

function analyzeLifeCycles(yearlyScores: YearlyScore[], daeunList: DaeunInfo[]): LifeCyclePhase[] {
  const phases: LifeCyclePhase[] = [];

  // 대운 기반 주기 분석
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
// 2. 과거 회고 분석 (TIER 5 초정밀 버전)
// ============================================================

export function analyzePastDate(
  input: LifePredictionInput,
  targetDate: Date,
  options: { detailed?: boolean; includeHours?: boolean } = {}
): PastRetrospective {
  const { detailed = true, includeHours = false } = options;

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const age = year - input.birthYear;

  // 일진 계산
  const dailyPillar = calculateDailyPillar(targetDate);

  // 연/월 간지
  const yearGanji = calculateYearlyGanji(year);
  const monthGanji = calculateMonthlyGanji(year, month);

  // 12운성
  const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);

  // 십신
  const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);

  // 지지 상호작용
  const allBranches = [
    input.dayBranch, input.monthBranch, input.yearBranch,
    yearGanji.branch, monthGanji.branch, dailyPillar.branch,
  ];
  const branchInteractions = analyzeBranchInteractions(allBranches);

  // 대운 찾기
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);

  // === TIER 5: 절기, 28수, 달 위상 분석 ===
  const solarTerm = getSolarTermForDate(targetDate);
  const lunarMansion = getLunarMansion(targetDate);

  // 음력 일자 추정 (간단한 근사값 - 실제로는 음력 변환 필요)
  const lunarDay = ((day + 10) % 30) + 1; // 근사값
  const lunarPhase = getLunarPhase(lunarDay);

  // 행성시 (선택적)
  const planetaryHours = includeHours ? calculatePlanetaryHours(targetDate) : undefined;

  // 점수 계산 (강화된 버전)
  let score = twelveStage.score;

  const sibsinScores: Record<string, number> = {
    '정관': 15, '정재': 12, '정인': 10, '식신': 8,
    '편관': 5, '편재': 5, '편인': 3, '상관': 0,
    '비견': -3, '겁재': -8,
  };
  score += sibsinScores[sibsin] || 0;

  for (const inter of branchInteractions) {
    score += inter.score * 0.2;
  }

  if (daeun) {
    const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
    score += (daeunStage.score - 50) * 0.25;
  }

  // TIER 5: 절기/28수/달 위상 보정
  if (solarTerm.element === STEM_ELEMENT[input.dayStem]) {
    score += 5; // 절기 오행 일치
  }
  if (lunarMansion.isAuspicious) {
    score += 4; // 길한 28수
  } else {
    score -= 3; // 흉한 28수
  }
  if (lunarPhase === 'full_moon') {
    score += 3; // 보름달 에너지
  } else if (lunarPhase === 'new_moon') {
    score -= 2; // 삭일은 에너지 저하
  }

  // 용신/기신 보정
  const dayElement = STEM_ELEMENT[dailyPillar.stem];
  if (input.yongsin?.includes(dayElement)) score += 10;
  if (input.kisin?.includes(dayElement)) score -= 8;

  score = Math.max(0, Math.min(100, score));

  // 등급 결정 (통일된 기준 사용)
  const grade = scoreToGrade(score);

  // === TIER 5: 인과 요인 분석 ===
  const causalFactors = analyzeCausalFactors(
    input.dayStem,
    input.dayBranch,
    dailyPillar.stem,
    dailyPillar.branch,
    daeun?.stem,
    daeun?.branch,
    input.yongsin,
    input.kisin
  );

  // === TIER 5: 사건 유형별 점수 ===
  const yongsinActive = input.yongsin?.includes(dayElement) || false;
  const kisinActive = input.kisin?.includes(dayElement) || false;

  const shinsals = detectShinsals(input, dailyPillar);
  const eventCategoryScores = calculateEventCategoryScores(
    sibsin,
    twelveStage.stage,
    branchInteractions.map(b => ({ type: b.type, score: b.score })),
    shinsals,
    yongsinActive,
    kisinActive
  );

  // === TIER 5: 신뢰도 계산 ===
  const confidenceFactors: ConfidenceFactors = {
    birthTimeAccuracy: input.birthHour !== undefined ? 'exact' : 'unknown',
    methodAlignment: calculateMethodAlignment(twelveStage, solarTerm, lunarMansion),
    dataCompleteness: calculateDataCompleteness(input),
  };
  const confidence = calculateConfidence(confidenceFactors);

  // 테마 생성 (확장)
  const themes: string[] = [];
  themes.push(`${twelveStage.stage} - ${twelveStage.lifePhase.split(' - ')[0]}`);
  themes.push(`${sibsin}운`);
  themes.push(`${solarTerm.nameKo} 절기`);
  themes.push(`${lunarMansion.nameKo}수(${lunarMansion.name})`);
  if (daeun) {
    themes.push(`${daeun.stem}${daeun.branch} 대운 시기`);
  }

  // 왜 그런 일이 있었는지 분석 (강화)
  const whyItHappened: string[] = [];

  // 인과 요인 기반 분석
  for (const factor of causalFactors.slice(0, 5)) {
    whyItHappened.push(`[${factor.factor}] ${factor.description}`);
  }

  if (score >= 70) {
    whyItHappened.push('에너지가 높은 시기로 좋은 일이 일어나기 쉬웠습니다.');
    if (['정관', '정재', '정인'].includes(sibsin)) {
      whyItHappened.push(`${sibsin}운으로 안정적인 발전이 있었습니다.`);
    }
  } else if (score <= 40) {
    whyItHappened.push('에너지가 낮은 시기로 도전이 있었을 수 있습니다.');
    if (['겁재', '상관'].includes(sibsin)) {
      whyItHappened.push(`${sibsin}운으로 경쟁이나 갈등이 있었을 수 있습니다.`);
    }
  }

  // 28수 기반 분석
  if (!lunarMansion.isAuspicious) {
    whyItHappened.push(`${lunarMansion.nameKo}수(${lunarMansion.name}) - ${lunarMansion.badFor.join(', ')}에 불리한 날`);
  } else if (lunarMansion.goodFor.length > 0) {
    whyItHappened.push(`${lunarMansion.nameKo}수(${lunarMansion.name}) - ${lunarMansion.goodFor.join(', ')}에 유리한 날`);
  }

  // 절기 기반 분석
  whyItHappened.push(`${solarTerm.nameKo} 절기의 ${solarTerm.element} 에너지가 영향을 미쳤습니다.`);

  for (const inter of branchInteractions) {
    if (inter.impact === 'positive') {
      whyItHappened.push(`${inter.description} - 긍정적 에너지 흐름`);
    } else if (inter.impact === 'negative') {
      whyItHappened.push(`${inter.description} - 충돌과 변화의 에너지`);
    }
  }

  // 교훈
  const lessonsLearned: string[] = [];
  if (twelveStage.energy === 'peak') {
    lessonsLearned.push('전성기의 에너지를 잘 활용했는지 돌아보세요.');
  } else if (twelveStage.energy === 'dormant') {
    lessonsLearned.push('휴식과 재충전의 시간이 필요했던 때입니다.');
  }
  lessonsLearned.push(twelveStage.advice);

  // 인과 요인에서 교훈 추출
  for (const factor of causalFactors) {
    if (factor.impact === 'major_positive' || factor.impact === 'major_negative') {
      lessonsLearned.push(`${factor.factor}의 영향을 이해하고 활용하세요.`);
    }
  }

  // === TIER 5: 사건별 상세 분석 ===
  const detailedAnalysis = detailed ? generateDetailedEventAnalysis(
    eventCategoryScores,
    causalFactors,
    sibsin,
    twelveStage.stage,
    solarTerm,
    lunarMansion
  ) : undefined;

  return {
    targetDate,
    dailyPillar,
    score,
    grade,
    yearGanji,
    monthGanji,
    twelveStage,
    sibsin,
    branchInteractions,
    daeun,
    themes,
    whyItHappened,
    lessonsLearned,

    // TIER 5 추가 필드
    solarTerm,
    lunarMansion,
    lunarDay,
    lunarPhase,
    planetaryHours,
    causalFactors,
    eventCategoryScores,
    confidence,
    detailedAnalysis,
  };
}

// NOTE: detectShinsals, calculateMethodAlignment, calculateDataCompleteness는
// life-prediction-helpers.ts에서 import됨

// 사건별 상세 분석 생성
function generateDetailedEventAnalysis(
  scores: EventCategoryScores,
  causalFactors: CausalFactor[],
  sibsin: string,
  twelveStage: string,
  solarTerm: SolarTerm,
  lunarMansion: LunarMansion
): PastRetrospective['detailedAnalysis'] {
  const generateCategoryAnalysis = (
    category: keyof EventCategoryScores,
    categoryName: string
  ) => {
    const score = scores[category];
    const factors: string[] = [];
    const whyHappened: string[] = [];

    // 십신 영향
    const sibsinEffect = getSibsinEffect(sibsin, category);
    if (sibsinEffect) factors.push(sibsinEffect);

    // 12운성 영향
    const stageEffect = getStageEffect(twelveStage, category);
    if (stageEffect) factors.push(stageEffect);

    // 인과 요인 중 해당 영역 관련
    for (const cf of causalFactors) {
      if (cf.affectedAreas.some(a =>
        a.includes(categoryName) ||
        (category === 'career' && (a.includes('커리어') || a.includes('사업'))) ||
        (category === 'finance' && (a.includes('재물') || a.includes('재정'))) ||
        (category === 'relationship' && (a.includes('관계') || a.includes('대인'))) ||
        (category === 'health' && a.includes('건강')) ||
        (category === 'travel' && (a.includes('여행') || a.includes('이동'))) ||
        (category === 'education' && (a.includes('학업') || a.includes('교육')))
      )) {
        factors.push(cf.factor);
        whyHappened.push(cf.description);
      }
    }

    // 28수 영향
    if (category === 'relationship' && lunarMansion.goodFor.includes('결혼')) {
      factors.push(`${lunarMansion.nameKo}수 - 관계에 길`);
    }

    // 절기 영향
    if (category === 'health' && solarTerm.element === '토') {
      factors.push(`${solarTerm.nameKo} - 건강 안정기`);
    }

    return { score, factors: factors.slice(0, 5), whyHappened: whyHappened.slice(0, 3) };
  };

  return {
    career: generateCategoryAnalysis('career', '직업'),
    finance: generateCategoryAnalysis('finance', '재정'),
    relationship: generateCategoryAnalysis('relationship', '관계'),
    health: generateCategoryAnalysis('health', '건강'),
    travel: generateCategoryAnalysis('travel', '여행'),
    education: generateCategoryAnalysis('education', '교육'),
  };
}

// 십신의 영역별 영향
function getSibsinEffect(sibsin: string, category: keyof EventCategoryScores): string | null {
  const effects: Record<string, Partial<Record<keyof EventCategoryScores, string>>> = {
    '정관': { career: '정관운 - 승진/안정', relationship: '정관운 - 귀인 만남' },
    '편관': { career: '편관운 - 경쟁/도전', health: '편관운 - 스트레스 주의' },
    '정재': { finance: '정재운 - 안정적 수입', relationship: '정재운 - 좋은 인연' },
    '편재': { finance: '편재운 - 투자 기회', travel: '편재운 - 활동적' },
    '정인': { education: '정인운 - 학업 성취', health: '정인운 - 건강 양호' },
    '편인': { education: '편인운 - 창의적 학습', travel: '편인운 - 이동운' },
    '식신': { health: '식신운 - 건강 좋음', finance: '식신운 - 수입 증가' },
    '상관': { career: '상관운 - 변화 가능', education: '상관운 - 학업 진전' },
    '비견': { relationship: '비견운 - 협력 기회' },
    '겁재': { finance: '겁재운 - 지출 주의', relationship: '겁재운 - 경쟁 관계' },
  };

  return effects[sibsin]?.[category] || null;
}

// 12운성의 영역별 영향
function getStageEffect(stage: string, category: keyof EventCategoryScores): string | null {
  const effects: Record<string, Partial<Record<keyof EventCategoryScores, string>>> = {
    '장생': { education: '장생 - 새로운 시작', health: '장생 - 에너지 충만' },
    '목욕': { relationship: '목욕 - 새로운 만남', travel: '목욕 - 이동 활발' },
    '관대': { career: '관대 - 성장기', relationship: '관대 - 인기 상승' },
    '건록': { career: '건록 - 직업 안정', finance: '건록 - 수입 증가' },
    '제왕': { career: '제왕 - 전성기', finance: '제왕 - 재물 최고조' },
    '쇠': { health: '쇠 - 건강 관리', career: '쇠 - 현상 유지' },
    '병': { health: '병 - 건강 주의', career: '병 - 활동 제한' },
    '사': { health: '사 - 재충전 필요', finance: '사 - 지출 주의' },
    '묘': { career: '묘 - 휴식기', health: '묘 - 회복 필요' },
    '절': { career: '절 - 전환기', relationship: '절 - 관계 정리' },
    '태': { education: '태 - 잉태기', relationship: '태 - 새 인연' },
    '양': { education: '양 - 성장 준비', health: '양 - 회복 중' },
  };

  return effects[stage]?.[category] || null;
}

// 기간별 과거 분석
export function analyzePastPeriod(
  input: LifePredictionInput,
  startDate: Date,
  endDate: Date,
  options: { sampleSize?: number; enableTier5?: boolean } = {}
): PastRetrospective[] {
  const { sampleSize, enableTier5 = true } = options;
  const results: PastRetrospective[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;

  const analyzeDate = (date: Date) => analyzePastDate(input, date, {
    detailed: enableTier5,
    includeHours: enableTier5,
  });

  if (sampleSize && sampleSize > 0 && sampleSize < totalDays) {
    const step = totalDays / sampleSize;
    for (let i = 0; i < sampleSize; i++) {
      const offset = Math.floor(i * step);
      const date = new Date(startDate);
      date.setDate(date.getDate() + offset);
      results.push(analyzeDate(date));
    }
    return results;
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    results.push(analyzeDate(new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return results;
}

// ============================================================
// 3. 이벤트 타이밍 분석 (TIER 5 초정밀 버전)
// ============================================================

export function findOptimalEventTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startYear: number,
  endYear: number,
  options: { useProgressions?: boolean; useSolarTerms?: boolean } = {}
): EventTimingResult {
  const { useProgressions = true, useSolarTerms = true } = options;

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  // 유효하지 않은 eventType이면 빈 결과 반환
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
  const candidatePeriods: OptimalPeriod[] = [];

  const currentDate = new Date();

  // 생년월일 Date 객체 생성
  const birthDate = new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1);

  // 월별 분석
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const midMonth = new Date(year, month - 1, 15);

      // 이미 지난 달은 건너뛰기

      const age = year - input.birthYear;

      // 월 간지
      const monthGanji = calculateMonthlyGanji(year, month);
      const yearGanji = calculateYearlyGanji(year);

      // 12운성
      const twelveStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);

      // 십신
      const sibsin = calculateSibsin(input.dayStem, monthGanji.stem);

      // === TIER 5: 절기 분석 ===
      const solarTerm = useSolarTerms ? getSolarTermForDate(midMonth) : null;
      const solarTermMonth = solarTerm ? PrecisionEngine.getSolarTermMonth(midMonth) : month;

      // === TIER 5: 2차 진행법 (Progressions) ===
      let progressionBonus = 0;
      let progressionReason = '';
      if (useProgressions) {
        const progression = calculateSecondaryProgression(birthDate, midMonth);

        // 진행 달의 위상에 따른 보정
        if (progression.moon.phase === 'Full') {
          progressionBonus += 10;
          progressionReason = '진행 보름달 - 결실기';
        } else if (progression.moon.phase === 'New') {
          progressionBonus += 8;
          progressionReason = '진행 초승달 - 새 시작';
        }

        // 이벤트별 진행 행성 위치 분석
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

      // 유리한 십신
      if (conditions.favorableSibsin.includes(sibsin)) {
        score += 15;
        reasons.push(`${sibsin}운 - ${eventType}에 유리`);
      }
      if (conditions.avoidSibsin.includes(sibsin)) {
        score -= 15;
        avoidReasons.push(`${sibsin}운 - ${eventType}에 불리`);
      }

      // 유리한 12운성
      if (conditions.favorableStages.includes(twelveStage.stage)) {
        score += 12;
        reasons.push(`${twelveStage.stage} - 에너지 상승기`);
      }
      if (conditions.avoidStages.includes(twelveStage.stage)) {
        score -= 12;
        avoidReasons.push(`${twelveStage.stage} - 에너지 저하기`);
      }

      // 유리한 오행
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

      // === TIER 5: 절기 오행 보정 ===
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

      // === TIER 5: 진행법 보정 ===
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

        // === TIER 5: 대운-절기월 동기화 ===
        if (solarTerm && daeun.element === solarTerm.element) {
          score += 7;
          reasons.push(`대운-절기 동기화 (${daeun.element})`);
        }
      }

      // === 점성 데이터 보정 ===
      const astroBonus = calculateAstroBonus(input, eventType);
      score += astroBonus.bonus;
      reasons.push(...astroBonus.reasons);
      avoidReasons.push(...astroBonus.penalties);

      // === TIER 4: 트랜짓 데이터 보정 ===
      // 현재 월이면 실시간 트랜짓 데이터 사용, 미래 월이면 예상 계산
      if (year === new Date().getFullYear() && month === new Date().getMonth() + 1) {
        // 현재 월 - 실제 트랜짓 데이터 사용
        const transitBonus = calculateTransitBonus(input, eventType);
        score += transitBonus.bonus;
        reasons.push(...transitBonus.reasons);
        avoidReasons.push(...transitBonus.penalties);

        // 트랜짓 하우스 오버레이 분석
        const houseOverlay = calculateTransitHouseOverlay(input, eventType);
        score += houseOverlay.bonus;
        reasons.push(...houseOverlay.reasons);
      } else {
        // 미래 월 - 외행성 이동 추정 + 네이탈 애스펙트 계산
        const transitEstimate = estimateMonthlyTransitScore(input, eventType, year, month);
        score += transitEstimate.bonus;
        reasons.push(...transitEstimate.reasons);
      }

      // === TIER 5+: 대운-세운-월운 복합 시너지 분석 ===
      const compoundLuck = calculateCompoundLuckScore(input, eventType, year, month);
      score += compoundLuck.bonus;
      reasons.push(...compoundLuck.reasons);
      avoidReasons.push(...compoundLuck.penalties);

      // === TIER 6: 프로그레션 + 신살 + 일주론 통합 분석 ===
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

      // === TIER 7-10: 일진/시주 + 점성술 심화 + 격국/용신 + 통합 신뢰도 ===
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

      score = Math.max(0, Math.min(100, score));

      candidatePeriods.push({
        startDate: monthStart,
        endDate: monthEnd,
        score,
        grade: scoreToGrade(score),
        reasons,
      });


      // 분류
      if (score >= 70) {
        // 등급 결정 (통일된 기준 사용)
        const grade = scoreToGrade(score);

        // 해당 월의 좋은 날짜 찾기 (TIER 5 버전)
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
  if (optimalPeriods.length == 0 && candidatePeriods.length > 0) {
    candidatePeriods.sort((a, b) => b.score - a.score);
    const fallback = candidatePeriods.slice(0, 3).map(p => ({
      ...p,
      specificDays: findSpecificGoodDays(input, p.startDate, p.endDate, eventType, {
        useLunarMansions: true,
        usePlanetaryHours: false,
      }),
    }));
    optimalPeriods.push(...fallback);
  }

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

function findSpecificGoodDays(
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
      score += 15;
      reasons.push(`${sibsin}운`);
    }
    if (conditions.avoidSibsin.includes(sibsin)) score -= 15;
    if (conditions.favorableStages.includes(twelveStage.stage)) {
      score += 12;
      reasons.push(twelveStage.stage);
    }
    if (conditions.avoidStages.includes(twelveStage.stage)) score -= 12;

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
        score += 8;
        if (keywords.some(k => lunarMansion.goodFor.includes(k))) {
          score += 10;
          reasons.push(`${lunarMansion.nameKo}수 - ${eventType}에 최적`);
        } else {
          reasons.push(`${lunarMansion.nameKo}수 - 길일`);
        }
      } else {
        score -= 6;
        if (keywords.some(k => lunarMansion.badFor.includes(k))) {
          score -= 10;
        }
      }
    }

    // === TIER 5: 절기 분석 ===
    const solarTerm = getSolarTermForDate(current);
    const dayElement = STEM_ELEMENT[dailyPillar.stem];

    // 용신 활성 확인
    if (input.yongsin?.includes(dayElement)) {
      score += 10;
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
    score = Math.max(0, Math.min(100, score));

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

// ============================================================
// 3-1. 주간 단위 세분화 이벤트 타이밍 분석 (1~2주 간격)
// ============================================================

// WeeklyPeriod and WeeklyEventTimingResult are re-exported from life-prediction-types.ts

/**
 * 주간 단위로 세분화된 이벤트 타이밍 분석
 * @param input 사주 입력 데이터
 * @param eventType 이벤트 유형
 * @param startDate 시작일
 * @param endDate 종료일 (기본 3개월)
 */
export function findWeeklyOptimalTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startDate: Date,
  searchWeeksOrEndDate: number | Date = 4
): WeeklyEventTimingResult {
  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (!conditions) {
    return {
      eventType,
      searchWeeks: 0,
      searchRange: { startDate, endDate: startDate },
      weeklyPeriods: [],
      bestWeek: null,
      worstWeek: null,
      overallAdvice: `Unknown event type: ${eventType}`,
      summary: `Unknown event type: ${eventType}`,
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const searchWeeks = typeof searchWeeksOrEndDate === 'number'
    ? Math.max(1, Math.floor(searchWeeksOrEndDate))
    : Math.max(1, Math.ceil(((searchWeeksOrEndDate as Date).getTime() - startDate.getTime()) / (7 * dayMs)));

  const actualEndDate = searchWeeksOrEndDate instanceof Date
    ? new Date(searchWeeksOrEndDate.getTime())
    : new Date(startDate.getTime() + searchWeeks * 7 * dayMs);

  const weeklyPeriods: WeeklyPeriod[] = [];

  const currentWeekStart = new Date(startDate);
  // ??? ???? ??
  const dayOfWeek = currentWeekStart.getDay();
  if (dayOfWeek !== 1) {
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  }

  let weekNumber = 1;

  while (weekNumber <= searchWeeks) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAnalysis = analyzeWeekPeriod(input, currentWeekStart, weekEnd, eventType, conditions);
    const bestDay = weekAnalysis.bestDay || weekAnalysis.bestDays?.[0] || new Date(currentWeekStart);
    const bestDayScore = weekAnalysis.bestDayScore ?? weekAnalysis.score;

    weeklyPeriods.push({
      startDate: new Date(currentWeekStart),
      endDate: weekEnd,
      weekNumber,
      averageScore: weekAnalysis.score,
      bestDay,
      bestDayScore,
      grade: scoreToGrade(weekAnalysis.score),
      summary: `${eventType} week ${weekNumber} average ${weekAnalysis.score}`,
      reasons: weekAnalysis.reasons,
      bestDays: weekAnalysis.bestDays,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
  }

  const sortedByScore = [...weeklyPeriods].sort((a, b) => b.averageScore - a.averageScore);
  const bestWeek = sortedByScore[0] || null;
  const worstWeek = sortedByScore[sortedByScore.length - 1] || null;

  const overallAdvice = generateWeeklySummary(eventType, weeklyPeriods, bestWeek);

  return {
    eventType,
    searchWeeks,
    searchRange: { startDate, endDate: actualEndDate },
    weeklyPeriods,
    bestWeek,
    worstWeek,
    overallAdvice,
    summary: overallAdvice,
  };
}

function analyzeWeekPeriod(
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
    dayScore = Math.max(15, Math.min(95, dayScore));
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
      return b.reasons.length - a.reasons.length; // ?? ???? ?? ?? ? ??
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

/**
 * 주간 분석 요약 생성
 */
function generateWeeklySummary(
  eventType: EventType,
  weeklyPeriods: WeeklyPeriod[],
  bestWeek: WeeklyPeriod | null
): string {
  const eventNames: Record<EventType, string> = {
    marriage: '결혼',
    career: '취업/이직',
    investment: '투자',
    move: '이사',
    study: '학업/시험',
    health: '건강관리',
    relationship: '인간관계',
  };

  if (!bestWeek) {
    return `${eventNames[eventType]} 분석 결과가 없습니다.`;
  }

  const startStr = `${bestWeek.startDate.getMonth() + 1}/${bestWeek.startDate.getDate()}`;
  const endStr = `${bestWeek.endDate.getMonth() + 1}/${bestWeek.endDate.getDate()}`;

  let summary = `${eventNames[eventType]}에 가장 좋은 주간은 ${startStr}~${endStr} (${bestWeek.grade}등급, ${bestWeek.averageScore}점)입니다.`;

  const bestDayList = bestWeek.bestDays && bestWeek.bestDays.length > 0
    ? bestWeek.bestDays
    : [bestWeek.bestDay];

  if (bestDayList.length > 0) {
    const bestDayStr = bestDayList.slice(0, 2)
      .map(d => `${d.getMonth() + 1}/${d.getDate()}`)
      .join(', ');
    summary += ` ???? ${bestDayStr}???.`;
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

function generateEventAdvice(
  eventType: EventType,
  optimalPeriods: OptimalPeriod[],
  avoidPeriods: AvoidPeriod[],
  nextBest: OptimalPeriod | null
): string {
  const eventNames: Record<EventType, string> = {
    marriage: '결혼',
    career: '취업/이직',
    investment: '투자',
    move: '이사',
    study: '학업/시험',
    health: '건강관리',
    relationship: '인간관계',
  };

  let advice = `${eventNames[eventType]}에 대한 타이밍 분석 결과입니다. `;

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
// 4. 종합 예측 생성
// ============================================================

export function generateComprehensivePrediction(
  input: LifePredictionInput,
  yearsRangeOrOptions: number | { startYear?: number; endYear?: number } = 10
): ComprehensivePrediction {
  const currentYear = new Date().getFullYear();
  let startYear = currentYear - 2;
  let endYear = currentYear + 10;

  if (typeof yearsRangeOrOptions === 'number') {
    endYear = currentYear + yearsRangeOrOptions;
  } else if (yearsRangeOrOptions) {
    if (typeof yearsRangeOrOptions.startYear === 'number') {
      startYear = yearsRangeOrOptions.startYear;
    }
    if (typeof yearsRangeOrOptions.endYear === 'number') {
      endYear = yearsRangeOrOptions.endYear;
    } else if (typeof yearsRangeOrOptions.startYear === 'number') {
      endYear = yearsRangeOrOptions.startYear + 10;
    }
  }

  if (endYear < startYear) {
    [startYear, endYear] = [endYear, startYear];
  }

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
  if (input.daeunList && input.daeunList.length > 0) confidence += 15;
  if (input.yongsin && input.yongsin.length > 0) confidence += 10;
  if (input.birthHour !== undefined) confidence += 10;
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

function extractUpcomingHighlights(
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

// ============================================================
// 프롬프트 컨텍스트 생성
// ============================================================

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
    lines.push(`=== ${eventNames[result.eventType].ko} (${result.eventType}) 최적 타이밍 분석 ===`);
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
