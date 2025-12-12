// src/lib/Saju/fortuneSimulator.ts
// 복합 운세 시뮬레이션 (500% 급 모듈)

import { FiveElement, SajuPillars, SibsinKind } from './types';
import { STEMS, BRANCHES, FIVE_ELEMENT_RELATIONS } from './constants';

// ============================================================
// 헬퍼 함수
// ============================================================

function getStemElement(stem: string): FiveElement {
  const found = STEMS.find(s => s.name === stem);
  return found?.element as FiveElement || '토';
}

function getBranchElement(branch: string): FiveElement {
  const found = BRANCHES.find(b => b.name === branch);
  return found?.element as FiveElement || '토';
}

// ============================================================
// 타입 정의
// ============================================================

/** 시뮬레이션 시간 단위 */
export type TimeUnit = 'day' | 'month' | 'year' | 'daeun';

/** 운세 영역 */
export type FortuneArea =
  | 'career'    // 직업/사업
  | 'wealth'    // 재물
  | 'love'      // 연애/결혼
  | 'health'    // 건강
  | 'study'     // 학업/시험
  | 'travel'    // 이동/여행
  | 'family'    // 가족
  | 'social';   // 인간관계

/** 시간 포인트 */
export interface TimePoint {
  year: number;
  month?: number;
  day?: number;
  stem: string;
  branch: string;
}

/** 영역별 운세 점수 */
export interface AreaFortune {
  area: FortuneArea;
  score: number;           // 0-100
  trend: 'rising' | 'stable' | 'falling';
  peak?: TimePoint;        // 정점 시기
  trough?: TimePoint;      // 저점 시기
  keyFactors: string[];    // 주요 영향 요인
  advice: string;
}

/** 시간대별 운세 스냅샷 */
export interface FortuneSnapshot {
  timePoint: TimePoint;
  overallScore: number;
  areas: AreaFortune[];
  dominantElement: FiveElement;
  activeInteractions: string[];  // 활성화된 합충형
  keywords: string[];
}

/** 운세 흐름 분석 */
export interface FortuneFlow {
  startPoint: TimePoint;
  endPoint: TimePoint;
  snapshots: FortuneSnapshot[];
  overallTrend: 'ascending' | 'plateau' | 'descending' | 'fluctuating';
  bestPeriod: TimePoint;
  challengingPeriod: TimePoint;
  turningPoints: TimePoint[];
}

/** 시나리오 시뮬레이션 */
export interface ScenarioResult {
  scenario: string;
  probability: number;      // 확률 (0-1)
  optimalTiming: TimePoint[];
  riskPeriods: TimePoint[];
  recommendations: string[];
}

/** 의사결정 시뮬레이션 */
export interface DecisionSimulation {
  decision: string;
  options: Array<{
    option: string;
    score: number;
    pros: string[];
    cons: string[];
    bestTiming: TimePoint;
  }>;
  recommendation: string;
}

/** 인생 주기 시뮬레이션 */
export interface LifeCycleSimulation {
  birthYear: number;
  currentAge: number;
  phases: Array<{
    ageRange: [number, number];
    phaseName: string;
    theme: string;
    overallScore: number;
    keyAreas: FortuneArea[];
    challenges: string[];
    opportunities: string[];
  }>;
  currentPhase: string;
  nextMilestone: { age: number; event: string };
}

// ============================================================
// 60갑자 순환 데이터
// ============================================================

const SIXTY_CYCLE: Array<{ stem: string; branch: string }> = [];
for (let i = 0; i < 60; i++) {
  SIXTY_CYCLE.push({
    stem: STEMS[i % 10].name,
    branch: BRANCHES[i % 12].name,
  });
}

// ============================================================
// 핵심 시뮬레이션 함수
// ============================================================

/**
 * 특정 시점의 운세 스냅샷 생성
 */
export function generateFortuneSnapshot(
  pillars: SajuPillars,
  timePoint: TimePoint,
  options?: { areas?: FortuneArea[] }
): FortuneSnapshot {
  const areas = options?.areas || ['career', 'wealth', 'love', 'health'] as FortuneArea[];
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);
  const unseElement = getStemElement(timePoint.stem);

  // 각 영역별 운세 계산
  const areaFortunes = areas.map(area => calculateAreaFortune(pillars, timePoint, area));

  // 종합 점수
  const overallScore = Math.round(
    areaFortunes.reduce((sum, a) => sum + a.score, 0) / areaFortunes.length
  );

  // 활성화된 상호작용
  const activeInteractions = detectActiveInteractions(pillars, timePoint);

  // 키워드 생성
  const keywords = generateKeywords(areaFortunes, unseElement, activeInteractions);

  return {
    timePoint,
    overallScore,
    areas: areaFortunes,
    dominantElement: unseElement,
    activeInteractions,
    keywords,
  };
}

function calculateAreaFortune(
  pillars: SajuPillars,
  timePoint: TimePoint,
  area: FortuneArea
): AreaFortune {
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);
  const unseElement = getStemElement(timePoint.stem);
  const unseBranchElement = getBranchElement(timePoint.branch);

  // 기본 점수
  let score = 50;

  // 영역별 관련 오행 및 십성
  const areaConfig: Record<FortuneArea, { relatedElements: FiveElement[]; boost: string[]; penalty: string[] }> = {
    career: {
      relatedElements: ['금', '토'],
      boost: ['정관', '편관', '정인'],
      penalty: ['상관'],
    },
    wealth: {
      relatedElements: ['토', '금'],
      boost: ['정재', '편재', '식신'],
      penalty: ['겁재', '비견'],
    },
    love: {
      relatedElements: ['화', '목'],
      boost: ['정관', '정재', '식신'],
      penalty: ['편관', '상관'],
    },
    health: {
      relatedElements: ['목', '수'],
      boost: ['정인', '비견'],
      penalty: ['편관', '상관'],
    },
    study: {
      relatedElements: ['수', '목'],
      boost: ['정인', '편인', '식신'],
      penalty: ['편재', '겁재'],
    },
    travel: {
      relatedElements: ['화', '수'],
      boost: ['편관', '편인', '식신'],
      penalty: ['정관', '정인'],
    },
    family: {
      relatedElements: ['토', '목'],
      boost: ['정인', '비견', '식신'],
      penalty: ['편관', '상관'],
    },
    social: {
      relatedElements: ['화', '토'],
      boost: ['비견', '식신', '정관'],
      penalty: ['편관', '겁재'],
    },
  };

  const config = areaConfig[area];

  // 운세 오행과 영역 관련 오행 매칭
  if (config.relatedElements.includes(unseElement)) {
    score += 15;
  }
  if (config.relatedElements.includes(unseBranchElement)) {
    score += 10;
  }

  // 일간과의 관계
  if (unseElement === dayElement) {
    score += 5; // 비화
  } else if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === unseElement) {
    score += 12; // 생조
  } else if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === unseElement) {
    score -= 10; // 극입
  }

  // 랜덤 변동 요소 (실제로는 더 정교한 계산 필요)
  score += Math.floor(Math.random() * 10) - 5;
  score = Math.max(0, Math.min(100, score));

  // 트렌드 결정
  const trend: AreaFortune['trend'] = score >= 60 ? 'rising' : score <= 40 ? 'falling' : 'stable';

  const keyFactors = [
    `${unseElement} 기운 영향`,
    `일간 ${dayElement}과의 ${getRelationName(dayElement, unseElement)} 관계`,
  ];

  const advice = generateAreaAdvice(area, score, unseElement);

  return { area, score, trend, keyFactors, advice };
}

function getRelationName(dayElement: FiveElement, unseElement: FiveElement): string {
  if (dayElement === unseElement) return '비화';
  if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === unseElement) return '생조';
  if (FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement] === unseElement) return '설기';
  if (FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement] === unseElement) return '극출';
  if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === unseElement) return '극입';
  return '중립';
}

function detectActiveInteractions(pillars: SajuPillars, timePoint: TimePoint): string[] {
  const interactions: string[] = [];
  const dayBranch = pillars.day.earthlyBranch.name;
  const unseBranch = timePoint.branch;

  // 충 체크
  const CHUNG_MAP: Record<string, string> = {
    '子': '午', '午': '子', '丑': '未', '未': '丑',
    '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
  };

  if (CHUNG_MAP[dayBranch] === unseBranch) {
    interactions.push(`일지 ${dayBranch}-${unseBranch} 충`);
  }

  // 합 체크
  const YUKHAP_MAP: Record<string, string> = {
    '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳', '午': '未', '未': '午',
  };

  if (YUKHAP_MAP[dayBranch] === unseBranch) {
    interactions.push(`일지 ${dayBranch}-${unseBranch} 육합`);
  }

  return interactions;
}

function generateKeywords(
  areaFortunes: AreaFortune[],
  dominantElement: FiveElement,
  interactions: string[]
): string[] {
  const keywords: string[] = [dominantElement];

  // 높은 점수 영역
  const highScoreAreas = areaFortunes.filter(a => a.score >= 70);
  for (const area of highScoreAreas) {
    keywords.push(getAreaKeyword(area.area));
  }

  // 상호작용 키워드
  if (interactions.some(i => i.includes('충'))) {
    keywords.push('변화', '주의');
  }
  if (interactions.some(i => i.includes('합'))) {
    keywords.push('조화', '기회');
  }

  return keywords;
}

function getAreaKeyword(area: FortuneArea): string {
  const map: Record<FortuneArea, string> = {
    career: '승진', wealth: '재물', love: '인연',
    health: '건강', study: '합격', travel: '이동',
    family: '화합', social: '인맥',
  };
  return map[area];
}

function generateAreaAdvice(area: FortuneArea, score: number, element: FiveElement): string {
  if (score >= 70) {
    return `${area} 운이 좋으니 적극적으로 추진하세요.`;
  } else if (score <= 40) {
    return `${area} 분야는 신중하게 접근하세요.`;
  }
  return `${area} 분야는 무난하게 진행됩니다.`;
}

/**
 * 기간별 운세 흐름 시뮬레이션
 */
export function simulateFortuneFlow(
  pillars: SajuPillars,
  startYear: number,
  endYear: number,
  options?: { unit?: TimeUnit; areas?: FortuneArea[] }
): FortuneFlow {
  const unit = options?.unit || 'year';
  const areas = options?.areas || ['career', 'wealth', 'love', 'health'] as FortuneArea[];
  const snapshots: FortuneSnapshot[] = [];

  // 년도별 스냅샷 생성
  for (let year = startYear; year <= endYear; year++) {
    const yearPillar = getYearPillar(year);
    const timePoint: TimePoint = {
      year,
      stem: yearPillar.stem,
      branch: yearPillar.branch,
    };
    const snapshot = generateFortuneSnapshot(pillars, timePoint, { areas });
    snapshots.push(snapshot);
  }

  // 전체 트렌드 분석
  const scores = snapshots.map(s => s.overallScore);
  const avgFirst = (scores[0] + (scores[1] || scores[0])) / 2;
  const avgLast = (scores[scores.length - 1] + (scores[scores.length - 2] || scores[scores.length - 1])) / 2;

  let overallTrend: FortuneFlow['overallTrend'];
  if (avgLast - avgFirst > 10) overallTrend = 'ascending';
  else if (avgFirst - avgLast > 10) overallTrend = 'descending';
  else if (Math.max(...scores) - Math.min(...scores) > 30) overallTrend = 'fluctuating';
  else overallTrend = 'plateau';

  // 최고/최저 시점
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const bestPeriod = snapshots.find(s => s.overallScore === maxScore)!.timePoint;
  const challengingPeriod = snapshots.find(s => s.overallScore === minScore)!.timePoint;

  // 전환점 감지
  const turningPoints: TimePoint[] = [];
  for (let i = 1; i < snapshots.length - 1; i++) {
    const prev = snapshots[i - 1].overallScore;
    const curr = snapshots[i].overallScore;
    const next = snapshots[i + 1].overallScore;

    if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
      turningPoints.push(snapshots[i].timePoint);
    }
  }

  return {
    startPoint: snapshots[0].timePoint,
    endPoint: snapshots[snapshots.length - 1].timePoint,
    snapshots,
    overallTrend,
    bestPeriod,
    challengingPeriod,
    turningPoints,
  };
}

function getYearPillar(year: number): { stem: string; branch: string } {
  // 1984년이 甲子년
  const offset = (year - 1984) % 60;
  const index = offset < 0 ? offset + 60 : offset;
  return SIXTY_CYCLE[index];
}

/**
 * 시나리오 시뮬레이션
 */
export function simulateScenario(
  pillars: SajuPillars,
  scenario: string,
  yearRange: [number, number],
  options?: { targetAreas?: FortuneArea[] }
): ScenarioResult {
  const [startYear, endYear] = yearRange;
  const areas = options?.targetAreas || ['career', 'wealth'] as FortuneArea[];

  const flow = simulateFortuneFlow(pillars, startYear, endYear, { areas });

  // 최적 시기 찾기 (상위 20%)
  const sortedSnapshots = [...flow.snapshots].sort((a, b) => b.overallScore - a.overallScore);
  const topCount = Math.max(1, Math.floor(sortedSnapshots.length * 0.2));
  const optimalTiming = sortedSnapshots.slice(0, topCount).map(s => s.timePoint);

  // 위험 시기 찾기 (하위 20%)
  const bottomCount = Math.max(1, Math.floor(sortedSnapshots.length * 0.2));
  const riskPeriods = sortedSnapshots.slice(-bottomCount).map(s => s.timePoint);

  // 확률 계산 (간단한 휴리스틱)
  const avgScore = flow.snapshots.reduce((sum, s) => sum + s.overallScore, 0) / flow.snapshots.length;
  const probability = avgScore / 100;

  const recommendations = [
    `최적 시기: ${optimalTiming[0]?.year}년`,
    `주의 시기: ${riskPeriods[0]?.year}년`,
    flow.overallTrend === 'ascending' ? '전반적으로 상승세이니 계획을 추진하세요.' :
    flow.overallTrend === 'descending' ? '하락세이니 신중하게 접근하세요.' :
    '변동이 있으니 유연하게 대응하세요.',
  ];

  return { scenario, probability, optimalTiming, riskPeriods, recommendations };
}

/**
 * 의사결정 시뮬레이션
 */
export function simulateDecision(
  pillars: SajuPillars,
  decision: string,
  optionsList: string[],
  yearRange: [number, number]
): DecisionSimulation {
  const options = optionsList.map(option => {
    // 각 옵션에 대한 시나리오 시뮬레이션
    const scenario = simulateScenario(pillars, option, yearRange);

    const score = Math.round(scenario.probability * 100);
    const pros = score >= 60 ? ['좋은 시기에 실행 가능', '긍정적 흐름'] : ['도전적 경험'];
    const cons = score < 50 ? ['불리한 시기가 있음', '신중함 필요'] : ['경쟁 고려'];

    return {
      option,
      score,
      pros,
      cons,
      bestTiming: scenario.optimalTiming[0] || { year: yearRange[0], stem: '甲', branch: '子' },
    };
  });

  // 최고 점수 옵션 추천
  const bestOption = options.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  const recommendation = `${bestOption.option}이(가) 가장 유리합니다. ${bestOption.bestTiming.year}년이 최적 시기입니다.`;

  return { decision, options, recommendation };
}

/**
 * 인생 주기 시뮬레이션
 */
export function simulateLifeCycle(
  pillars: SajuPillars,
  birthYear: number,
  currentYear: number
): LifeCycleSimulation {
  const currentAge = currentYear - birthYear + 1; // 한국식 나이

  // 인생 주기 정의
  const phaseDefinitions = [
    { ageRange: [1, 12] as [number, number], phaseName: '성장기', theme: '학습과 기초 형성' },
    { ageRange: [13, 22] as [number, number], phaseName: '청소년기', theme: '정체성 탐색과 학업' },
    { ageRange: [23, 35] as [number, number], phaseName: '청년기', theme: '진로와 관계 형성' },
    { ageRange: [36, 50] as [number, number], phaseName: '장년기', theme: '성취와 안정' },
    { ageRange: [51, 65] as [number, number], phaseName: '중년기', theme: '성숙과 전환' },
    { ageRange: [66, 100] as [number, number], phaseName: '노년기', theme: '지혜와 여유' },
  ];

  const phases = phaseDefinitions.map(phase => {
    const [startAge, endAge] = phase.ageRange;
    const midYear = birthYear + Math.floor((startAge + endAge) / 2);
    const yearPillar = getYearPillar(midYear);

    const timePoint: TimePoint = { year: midYear, ...yearPillar };
    const snapshot = generateFortuneSnapshot(pillars, timePoint);

    const keyAreas = snapshot.areas
      .filter(a => a.score >= 60)
      .map(a => a.area);

    const challenges = snapshot.areas
      .filter(a => a.score < 50)
      .map(a => `${a.area} 분야 주의`);

    const opportunities = snapshot.areas
      .filter(a => a.score >= 70)
      .map(a => `${a.area} 분야 기회`);

    return {
      ...phase,
      overallScore: snapshot.overallScore,
      keyAreas,
      challenges,
      opportunities,
    };
  });

  // 현재 주기 찾기
  const currentPhase = phases.find(p =>
    currentAge >= p.ageRange[0] && currentAge <= p.ageRange[1]
  )?.phaseName || '알 수 없음';

  // 다음 마일스톤
  const nextMilestoneAge = currentAge < 30 ? 30 :
    currentAge < 40 ? 40 :
    currentAge < 50 ? 50 :
    currentAge < 60 ? 60 : 70;

  const nextMilestone = {
    age: nextMilestoneAge,
    event: `${nextMilestoneAge}세 전환점`,
  };

  return {
    birthYear,
    currentAge,
    phases,
    currentPhase,
    nextMilestone,
  };
}

/**
 * 월별 운세 시뮬레이션 (1년)
 */
export function simulateMonthlyFortune(
  pillars: SajuPillars,
  year: number
): FortuneSnapshot[] {
  const monthlySnapshots: FortuneSnapshot[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthBranchIndex = (month + 1) % 12; // 寅월부터 시작
    const monthBranch = BRANCHES[monthBranchIndex].name;

    // 월간 계산 (간략화)
    const yearPillar = getYearPillar(year);
    const yearStemIndex = STEMS.findIndex(s => s.name === yearPillar.stem);
    const monthStemIndex = (yearStemIndex * 2 + month) % 10;
    const monthStem = STEMS[monthStemIndex].name;

    const timePoint: TimePoint = {
      year,
      month,
      stem: monthStem,
      branch: monthBranch,
    };

    const snapshot = generateFortuneSnapshot(pillars, timePoint);
    monthlySnapshots.push(snapshot);
  }

  return monthlySnapshots;
}

/**
 * 특정 이벤트 최적 시기 찾기
 */
export function findOptimalTiming(
  pillars: SajuPillars,
  event: string,
  yearRange: [number, number],
  targetArea: FortuneArea
): TimePoint[] {
  const [startYear, endYear] = yearRange;
  const candidates: Array<{ timePoint: TimePoint; score: number }> = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearPillar = getYearPillar(year);
    const timePoint: TimePoint = { year, ...yearPillar };
    const snapshot = generateFortuneSnapshot(pillars, timePoint, { areas: [targetArea] });
    const areaScore = snapshot.areas.find(a => a.area === targetArea)?.score || 50;

    candidates.push({ timePoint, score: areaScore });
  }

  // 상위 3개 반환
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.timePoint);
}
