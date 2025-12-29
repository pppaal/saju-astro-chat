// src/lib/prediction/ultraPrecisionEngine.ts
// 초정밀 타이밍 엔진 - 일진 + 공망 + 신살 + 통근투출 + 실시간 트랜짓
// TIER 5: Planetary Hours + Lunar Mansions + 분 단위 분석

import {
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
  calculateMonthlyGanji,
  calculateYearlyGanji,
  type BranchInteraction,
  type PreciseTwelveStage,
} from './advancedTimingEngine';

import { scoreToGrade, type PredictionGrade } from './index';

// TIER 5: 초정밀 분석 엔진 임포트
import {
  PrecisionEngine,
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
  type SolarTerm,
  type LunarMansion,
  type LunarPhase,
  type PlanetaryHour as PrecisionPlanetaryHour,
} from './precisionEngine';

// ============================================================
// 타입 정의
// ============================================================

export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type TwelveStage = '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

export interface UltraPrecisionScore {
  date: Date;
  year: number;
  month: number;
  day: number;

  // 일진 분석
  dailyPillar: DailyPillarAnalysis;

  // 공망 분석
  gongmang: GongmangAnalysis;

  // 신살 분석
  shinsal: ShinsalAnalysis;

  // 통근/투출 분석
  energyFlow: EnergyFlowAnalysis;

  // 트랜짓 통합
  transitIntegration: TransitIntegration;

  // 종합 점수
  totalScore: number;           // 0-100
  confidence: number;           // 0-100
  grade: PredictionGrade;

  // 해석
  dayQuality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
  themes: string[];
  bestActivities: string[];
  avoidActivities: string[];
  hourlyAdvice: HourlyAdvice[];
}

export interface DailyPillarAnalysis {
  stem: string;
  branch: string;
  element: FiveElement;
  sibsin: string;
  twelveStage: PreciseTwelveStage;
  branchInteractions: BranchInteraction[];
  score: number;
  description: string;
}

export interface GongmangAnalysis {
  emptyBranches: string[];      // 공망 지지 2개
  isToday空: boolean;           // 오늘이 공망인지
  affectedAreas: string[];      // 영향받는 영역
  score: number;                // 공망이면 -15~-25
  advice: string;
}

export interface ShinsalAnalysis {
  active: ShinsalHit[];
  score: number;
  interpretation: string;
}

export interface ShinsalHit {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  description: string;
  score: number;
  affectedArea: string;
}

export interface EnergyFlowAnalysis {
  tonggeun: TonggeunResult[];   // 통근 (지지에 뿌리)
  tuechul: TuechulResult[];     // 투출 (천간에 드러남)
  energyStrength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
  dominantElement: FiveElement;
  score: number;
  description: string;
}

export interface TonggeunResult {
  stem: string;
  rootBranch: string;
  strength: number;             // 0-100
  description: string;
}

export interface TuechulResult {
  hiddenStem: string;
  fromBranch: string;
  revealedIn: string;
  significance: string;
}

export interface TransitIntegration {
  planetaryHour: PlanetaryHour;
  moonPhase: MoonPhaseInfo;
  retrogradeWarnings: string[];
  aspectHighlights: string[];
  score: number;
}

export interface PlanetaryHour {
  planet: string;
  quality: 'beneficial' | 'neutral' | 'challenging';
  bestFor: string[];
}

export interface MoonPhaseInfo {
  phase: string;
  illumination: number;
  quality: 'growing' | 'full' | 'waning' | 'new';
  advice: string;
}

export interface HourlyAdvice {
  hour: number;                 // 0-23
  siGan: string;                // 시간 지지 (子, 丑, 寅...)
  quality: 'excellent' | 'good' | 'neutral' | 'caution';
  activity: string;
}

// ============================================================
// 일진(日辰) 계산
// ============================================================

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 특정 날짜의 일진(일간/일지) 계산
 * 기준일: 1900년 1월 1일 = 甲子일
 */
export function calculateDailyPillar(date: Date): { stem: string; branch: string } {
  const baseDate = new Date(1900, 0, 1); // 1900-01-01 = 甲子
  const diffTime = date.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 60갑자 주기
  const cycleIndex = ((diffDays % 60) + 60) % 60;
  const stemIndex = cycleIndex % 10;
  const branchIndex = cycleIndex % 12;

  return {
    stem: STEMS[stemIndex],
    branch: BRANCHES[branchIndex],
  };
}

/**
 * 일진 상세 분석
 */
export function analyzeDailyPillar(
  date: Date,
  dayStem: string,
  dayBranch: string,
  monthBranch: string,
  yearBranch: string
): DailyPillarAnalysis {
  const daily = calculateDailyPillar(date);
  const element = getStemElement(daily.stem);
  const sibsin = calculateSibsin(dayStem, daily.stem);
  const twelveStage = calculatePreciseTwelveStage(dayStem, daily.branch);

  // 일지와 사주 지지들의 상호작용
  const allBranches = [dayBranch, monthBranch, yearBranch, daily.branch];
  const branchInteractions = analyzeBranchInteractions(allBranches);

  // 점수 계산
  let score = twelveStage.score;

  // 지지 상호작용 반영
  for (const inter of branchInteractions) {
    if (inter.branches.includes(daily.branch)) {
      score += inter.score * 0.5;
    }
  }

  // 십신 영향
  const sibsinScores: Record<string, number> = {
    '정관': 15, '정재': 12, '정인': 10, '식신': 8,
    '편관': 5, '편재': 5, '편인': 3, '상관': 0,
    '비견': -3, '겁재': -8,
  };
  score += sibsinScores[sibsin] || 0;

  score = Math.max(0, Math.min(100, score));

  return {
    stem: daily.stem,
    branch: daily.branch,
    element,
    sibsin,
    twelveStage,
    branchInteractions: branchInteractions.filter(i => i.branches.includes(daily.branch)),
    score,
    description: `${daily.stem}${daily.branch}일 (${sibsin}운, ${twelveStage.stage})`,
  };
}

// ============================================================
// 공망(空亡) 계산
// ============================================================

/**
 * 공망 지지 계산
 * 일주의 순(旬)에 따라 2개의 빈 지지 결정
 */
export function calculateGongmang(dayStem: string, dayBranch: string): string[] {
  // 60갑자에서 순(旬) 찾기
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);

  // 순의 시작점 (갑일)
  const xunStart = (branchIdx - stemIdx + 12) % 12;

  // 공망은 순의 마지막 2개 지지
  // 갑자순 → 戌亥 공망, 갑술순 → 申酉 공망...
  const gongmangStart = (xunStart + 10) % 12;

  return [
    BRANCHES[gongmangStart],
    BRANCHES[(gongmangStart + 1) % 12],
  ];
}

/**
 * 공망 분석
 */
export function analyzeGongmang(
  dayStem: string,
  dayBranch: string,
  targetBranch: string
): GongmangAnalysis {
  const emptyBranches = calculateGongmang(dayStem, dayBranch);
  const isEmpty = emptyBranches.includes(targetBranch);

  const affectedAreas: string[] = [];
  if (isEmpty) {
    // 공망된 지지의 의미에 따른 영향 영역
    const branchMeanings: Record<string, string[]> = {
      '子': ['재물', '시작'],
      '丑': ['재물', '축적'],
      '寅': ['활동', '사업'],
      '卯': ['문서', '계약'],
      '辰': ['변화', '이동'],
      '巳': ['문서', '학업'],
      '午': ['명예', '승진'],
      '未': ['인간관계', '협력'],
      '申': ['변화', '이동'],
      '酉': ['결실', '수확'],
      '戌': ['저장', '마무리'],
      '亥': ['은밀', '계획'],
    };
    affectedAreas.push(...(branchMeanings[targetBranch] || []));
  }

  const score = isEmpty ? -20 : 0;
  const advice = isEmpty
    ? `${targetBranch}가 공망입니다. ${affectedAreas.join(', ')} 관련 일은 신중히 진행하세요.`
    : '공망 영향 없음';

  return {
    emptyBranches,
    isToday空: isEmpty,
    affectedAreas,
    score,
    advice,
  };
}

// ============================================================
// 신살(神殺) 분석
// ============================================================

interface ShinsalRule {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  check: (dayBranch: string, targetBranch: string) => boolean;
  score: number;
  description: string;
  affectedArea: string;
}

const SHINSAL_RULES: ShinsalRule[] = [
  // 길신
  {
    name: '천을귀인',
    type: 'lucky',
    check: (day, target) => {
      const rules: Record<string, string[]> = {
        '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'],
        '丁': ['亥', '酉'], '戊': ['丑', '未'], '己': ['子', '申'],
        '庚': ['丑', '未'], '辛': ['寅', '午'], '壬': ['卯', '巳'],
        '癸': ['卯', '巳'],
      };
      // 일간 기준으로 확인해야 하지만, 여기서는 간략화
      return false; // 일간 정보 필요
    },
    score: 20,
    description: '귀인의 도움을 받는 날',
    affectedArea: '전반적 행운',
  },
  {
    name: '역마',
    type: 'special',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '申', '申': '寅', '巳': '亥', '亥': '巳',
        '子': '午', '午': '子', '卯': '酉', '酉': '卯',
        '辰': '戌', '戌': '辰', '丑': '未', '未': '丑',
      };
      return rules[day] === target;
    },
    score: 10,
    description: '이동, 변화, 활동이 활발한 날',
    affectedArea: '이동/변화',
  },
  {
    name: '도화',
    type: 'special',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '卯', '午': '卯', '戌': '卯',
        '申': '酉', '子': '酉', '辰': '酉',
        '巳': '午', '酉': '午', '丑': '午',
        '亥': '子', '卯': '子', '未': '子',
      };
      return rules[day] === target;
    },
    score: 5,
    description: '매력, 인기, 연애운이 높은 날',
    affectedArea: '연애/인기',
  },
  {
    name: '화개',
    type: 'lucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '戌', '午': '戌', '戌': '戌',
        '申': '辰', '子': '辰', '辰': '辰',
        '巳': '丑', '酉': '丑', '丑': '丑',
        '亥': '未', '卯': '未', '未': '未',
      };
      return rules[day] === target;
    },
    score: 12,
    description: '학문, 예술, 영성이 빛나는 날',
    affectedArea: '학문/예술',
  },
  // 흉신
  {
    name: '겁살',
    type: 'unlucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '亥', '午': '亥', '戌': '亥',
        '申': '巳', '子': '巳', '辰': '巳',
        '巳': '寅', '酉': '寅', '丑': '寅',
        '亥': '申', '卯': '申', '未': '申',
      };
      return rules[day] === target;
    },
    score: -15,
    description: '손실, 위험에 주의해야 하는 날',
    affectedArea: '재물/안전',
  },
  {
    name: '재살',
    type: 'unlucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '子', '午': '子', '戌': '子',
        '申': '午', '子': '午', '辰': '午',
        '巳': '卯', '酉': '卯', '丑': '卯',
        '亥': '酉', '卯': '酉', '未': '酉',
      };
      return rules[day] === target;
    },
    score: -12,
    description: '재물 손실, 분쟁에 주의',
    affectedArea: '재물/분쟁',
  },
  {
    name: '백호',
    type: 'unlucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '申', '午': '申', '戌': '申',
        '申': '寅', '子': '寅', '辰': '寅',
        '巳': '亥', '酉': '亥', '丑': '亥',
        '亥': '巳', '卯': '巳', '未': '巳',
      };
      return rules[day] === target;
    },
    score: -18,
    description: '사고, 건강 문제에 각별히 주의',
    affectedArea: '건강/안전',
  },
];

/**
 * 신살 분석
 */
export function analyzeShinsal(dayBranch: string, targetBranch: string): ShinsalAnalysis {
  const active: ShinsalHit[] = [];

  for (const rule of SHINSAL_RULES) {
    if (rule.check(dayBranch, targetBranch)) {
      active.push({
        name: rule.name,
        type: rule.type,
        description: rule.description,
        score: rule.score,
        affectedArea: rule.affectedArea,
      });
    }
  }

  const totalScore = active.reduce((sum, s) => sum + s.score, 0);

  const luckyCount = active.filter(s => s.type === 'lucky').length;
  const unluckyCount = active.filter(s => s.type === 'unlucky').length;

  let interpretation = '';
  if (luckyCount > unluckyCount) {
    interpretation = `길신 ${luckyCount}개 활성 - 전반적으로 좋은 기운`;
  } else if (unluckyCount > luckyCount) {
    interpretation = `흉신 ${unluckyCount}개 활성 - 신중한 하루 필요`;
  } else if (active.length > 0) {
    interpretation = '길흉 혼재 - 상황에 따라 판단 필요';
  } else {
    interpretation = '특별한 신살 없음 - 평범한 흐름';
  }

  return {
    active,
    score: totalScore,
    interpretation,
  };
}

// ============================================================
// 통근/투출 분석
// ============================================================

const HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '戊', '庚'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

/**
 * 통근 분석 (천간이 지지에 뿌리를 두고 있는지)
 */
export function analyzeTonggeun(stem: string, branches: string[]): TonggeunResult[] {
  const results: TonggeunResult[] = [];

  for (const branch of branches) {
    const hiddenStems = HIDDEN_STEMS[branch] || [];
    if (hiddenStems.includes(stem)) {
      // 정기(첫 번째)가 더 강함
      const isJeonggi = hiddenStems[0] === stem;
      const strength = isJeonggi ? 100 : hiddenStems[1] === stem ? 70 : 40;

      results.push({
        stem,
        rootBranch: branch,
        strength,
        description: `${stem}이 ${branch}에 ${isJeonggi ? '정기로' : '여기로'} 통근`,
      });
    }
  }

  return results;
}

/**
 * 투출 분석 (지장간이 천간으로 드러나는지)
 */
export function analyzeTuechul(stems: string[], branches: string[]): TuechulResult[] {
  const results: TuechulResult[] = [];

  for (const branch of branches) {
    const hiddenStems = HIDDEN_STEMS[branch] || [];
    for (const hidden of hiddenStems) {
      if (stems.includes(hidden)) {
        results.push({
          hiddenStem: hidden,
          fromBranch: branch,
          revealedIn: '천간',
          significance: `${branch}의 ${hidden}이 천간에 투출 - 해당 오행 기운 강화`,
        });
      }
    }
  }

  return results;
}

/**
 * 종합 에너지 흐름 분석
 */
export function analyzeEnergyFlow(
  dayStem: string,
  allStems: string[],
  allBranches: string[]
): EnergyFlowAnalysis {
  const tonggeun = analyzeTonggeun(dayStem, allBranches);
  const tuechul = analyzeTuechul(allStems, allBranches);

  // 에너지 강도 판정
  const tonggeunStrength = tonggeun.reduce((sum, t) => sum + t.strength, 0);
  const tuechulCount = tuechul.length;

  let energyStrength: EnergyFlowAnalysis['energyStrength'];
  if (tonggeunStrength >= 150 && tuechulCount >= 2) {
    energyStrength = 'very_strong';
  } else if (tonggeunStrength >= 100 || tuechulCount >= 2) {
    energyStrength = 'strong';
  } else if (tonggeunStrength >= 50 || tuechulCount >= 1) {
    energyStrength = 'moderate';
  } else if (tonggeunStrength > 0) {
    energyStrength = 'weak';
  } else {
    energyStrength = 'very_weak';
  }

  // 주도 오행
  const dominantElement = getStemElement(dayStem);

  // 점수 계산
  let score = 50;
  if (energyStrength === 'very_strong') score += 25;
  else if (energyStrength === 'strong') score += 15;
  else if (energyStrength === 'moderate') score += 5;
  else if (energyStrength === 'weak') score -= 10;
  else score -= 20;

  const description = `${dominantElement} 에너지 ${energyStrength} - 통근 ${tonggeun.length}개, 투출 ${tuechul.length}개`;

  return {
    tonggeun,
    tuechul,
    energyStrength,
    dominantElement,
    score,
    description,
  };
}

// ============================================================
// 시간대별 조언
// ============================================================

export function generateHourlyAdvice(dayStem: string, dayBranch: string): HourlyAdvice[] {
  const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const advice: HourlyAdvice[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // 2시간씩 하나의 지지
    const branchIdx = Math.floor(((hour + 1) % 24) / 2);
    const siGan = hourBranches[branchIdx];

    // 일지와 시지의 관계
    const interactions = analyzeBranchInteractions([dayBranch, siGan]);
    const hasPositive = interactions.some(i => i.impact === 'positive');
    const hasNegative = interactions.some(i => i.impact === 'negative');

    let quality: HourlyAdvice['quality'];
    let activity: string;

    if (hasPositive && !hasNegative) {
      quality = 'excellent';
      activity = '중요한 일, 계약, 면접';
    } else if (hasPositive) {
      quality = 'good';
      activity = '일반 업무, 미팅';
    } else if (hasNegative) {
      quality = 'caution';
      activity = '휴식, 재충전';
    } else {
      quality = 'neutral';
      activity = '루틴 업무';
    }

    advice.push({ hour, siGan, quality, activity });
  }

  return advice;
}

// ============================================================
// 헬퍼 함수
// ============================================================

function getStemElement(stem: string): FiveElement {
  const mapping: Record<string, FiveElement> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };
  return mapping[stem] || '토';
}

// ============================================================
// 종합 일별 점수 계산
// ============================================================

export interface CalculateDailyScoreInput {
  date: Date;
  dayStem: string;              // 사주 일간
  dayBranch: string;            // 사주 일지
  monthBranch: string;          // 사주 월지
  yearBranch: string;           // 사주 년지
  allStems: string[];           // 모든 천간
  allBranches: string[];        // 모든 지지
  moonPhase?: MoonPhaseInfo;    // 달 위상 (선택)
}

export function calculateUltraPrecisionScore(input: CalculateDailyScoreInput): UltraPrecisionScore {
  const { date, dayStem, dayBranch, monthBranch, yearBranch, allStems, allBranches, moonPhase } = input;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 1. 일진 분석
  const dailyPillar = analyzeDailyPillar(date, dayStem, dayBranch, monthBranch, yearBranch);

  // 2. 공망 분석
  const gongmang = analyzeGongmang(dayStem, dayBranch, dailyPillar.branch);

  // 3. 신살 분석
  const shinsal = analyzeShinsal(dayBranch, dailyPillar.branch);

  // 4. 에너지 흐름 분석
  const allBranchesWithDaily = [...allBranches, dailyPillar.branch];
  const allStemsWithDaily = [...allStems, dailyPillar.stem];
  const energyFlow = analyzeEnergyFlow(dayStem, allStemsWithDaily, allBranchesWithDaily);

  // 5. 시간대별 조언
  const hourlyAdvice = generateHourlyAdvice(dailyPillar.stem, dailyPillar.branch);

  // 6. 트랜짓 통합 (간략화)
  const transitIntegration: TransitIntegration = {
    planetaryHour: {
      planet: getPlanetaryHourPlanet(date),
      quality: 'neutral',
      bestFor: ['일반 활동'],
    },
    moonPhase: moonPhase || {
      phase: 'unknown',
      illumination: 50,
      quality: 'growing',
      advice: '달 정보 없음',
    },
    retrogradeWarnings: [],
    aspectHighlights: [],
    score: 0,
  };

  // 7. 종합 점수 계산
  let totalScore = 50;
  totalScore += (dailyPillar.score - 50) * 0.4;  // 일진 40%
  totalScore += gongmang.score * 0.15;           // 공망 15%
  totalScore += shinsal.score * 0.2;             // 신살 20%
  totalScore += (energyFlow.score - 50) * 0.25;  // 에너지 25%

  totalScore = Math.max(0, Math.min(100, totalScore));

  // 8. 신뢰도 (데이터 완전성)
  const confidence = 75 + (allBranches.length * 2);

  // 9. 등급 (통일된 기준 사용)
  const grade = scoreToGrade(totalScore);

  // 10. 일 품질
  let dayQuality: UltraPrecisionScore['dayQuality'];
  if (totalScore >= 80) dayQuality = 'excellent';
  else if (totalScore >= 60) dayQuality = 'good';
  else if (totalScore >= 40) dayQuality = 'neutral';
  else if (totalScore >= 25) dayQuality = 'caution';
  else dayQuality = 'avoid';

  // 11. 활동 추천
  const themes: string[] = [dailyPillar.description];
  const bestActivities: string[] = [];
  const avoidActivities: string[] = [];

  if (dailyPillar.twelveStage.energy === 'peak') {
    bestActivities.push('중요 결정', '계약', '면접', '프로젝트 시작');
  } else if (dailyPillar.twelveStage.energy === 'rising') {
    bestActivities.push('계획 수립', '학습', '네트워킹');
  }

  if (gongmang.isToday空) {
    avoidActivities.push(...gongmang.affectedAreas.map(a => `${a} 관련 중요 결정`));
  }

  for (const s of shinsal.active) {
    if (s.type === 'lucky') {
      bestActivities.push(s.affectedArea);
    } else if (s.type === 'unlucky') {
      avoidActivities.push(s.affectedArea);
    }
  }

  if (shinsal.active.length > 0) {
    themes.push(shinsal.interpretation);
  }

  return {
    date,
    year,
    month,
    day,
    dailyPillar,
    gongmang,
    shinsal,
    energyFlow,
    transitIntegration,
    totalScore,
    confidence: Math.min(100, confidence),
    grade,
    dayQuality,
    themes,
    bestActivities: [...new Set(bestActivities)].slice(0, 5),
    avoidActivities: [...new Set(avoidActivities)].slice(0, 5),
    hourlyAdvice,
  };
}

function getPlanetaryHourPlanet(date: Date): string {
  // 간략화된 행성 시간 (실제로는 일출 시간 기반 계산 필요)
  const dayOfWeek = date.getDay();
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  return planets[dayOfWeek];
}

// ============================================================
// 프롬프트 컨텍스트 생성
// ============================================================

export function generateUltraPrecisionPromptContext(
  scores: UltraPrecisionScore[],
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== 초정밀 일별 타이밍 분석 (일진+공망+신살+통근투출) ===`);
    lines.push('');

    for (const s of scores) {
      lines.push(`【${s.month}/${s.day}】 ${s.grade}등급 (${Math.round(s.totalScore)}점) | ${s.dayQuality}`);
      lines.push(`  일진: ${s.dailyPillar.stem}${s.dailyPillar.branch} (${s.dailyPillar.sibsin}, ${s.dailyPillar.twelveStage.stage})`);

      if (s.gongmang.isToday空) {
        lines.push(`  ⚠️ 공망: ${s.gongmang.advice}`);
      }

      if (s.shinsal.active.length > 0) {
        const shinsalStr = s.shinsal.active.map(sh => `${sh.name}(${sh.type === 'lucky' ? '길' : sh.type === 'unlucky' ? '흉' : '특'})`).join(', ');
        lines.push(`  신살: ${shinsalStr}`);
      }

      lines.push(`  에너지: ${s.energyFlow.description}`);
      lines.push(`  추천: ${s.bestActivities.slice(0, 3).join(', ') || '특별 추천 없음'}`);
      if (s.avoidActivities.length > 0) {
        lines.push(`  주의: ${s.avoidActivities.slice(0, 2).join(', ')}`);
      }

      // 좋은 시간대
      const excellentHours = s.hourlyAdvice.filter(h => h.quality === 'excellent').map(h => `${h.hour}시`);
      if (excellentHours.length > 0) {
        lines.push(`  최적 시간: ${excellentHours.join(', ')}`);
      }

      lines.push('');
    }
  } else {
    lines.push(`=== Ultra-Precision Daily Timing (Iljin+Gongmang+Shinsal+Energy) ===`);
    lines.push('');

    for (const s of scores) {
      lines.push(`【${s.month}/${s.day}】 Grade ${s.grade} (${Math.round(s.totalScore)}) | ${s.dayQuality}`);
      lines.push(`  Daily: ${s.dailyPillar.stem}${s.dailyPillar.branch} (${s.dailyPillar.sibsin})`);
      if (s.gongmang.isToday空) {
        lines.push(`  ⚠️ Empty: ${s.gongmang.emptyBranches.join(', ')}`);
      }
      lines.push(`  Energy: ${s.energyFlow.energyStrength}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================
// 주간 예측 생성
// ============================================================

export function generateWeeklyPrediction(
  startDate: Date,
  dayStem: string,
  dayBranch: string,
  monthBranch: string,
  yearBranch: string,
  allStems: string[],
  allBranches: string[]
): UltraPrecisionScore[] {
  const scores: UltraPrecisionScore[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const score = calculateUltraPrecisionScore({
      date,
      dayStem,
      dayBranch,
      monthBranch,
      yearBranch,
      allStems,
      allBranches,
    });

    scores.push(score);
  }

  return scores;
}

// ============================================================
// TIER 5: 분 단위 초정밀 분석 (Minute-Level Precision)
// ============================================================

export interface MinutePrecisionResult {
  datetime: Date;
  hour: number;
  minute: number;

  // 시간 지지 (시주)
  hourBranch: string;
  hourStem: string;

  // 행성시 분석
  planetaryHour: {
    planet: string;
    element: FiveElement;
    quality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
    goodFor: string[];
    startTime: Date;
    endTime: Date;
    percentComplete: number; // 해당 행성시의 진행률
  };

  // 28수 분석
  lunarMansion: {
    name: string;
    nameKo: string;
    element: FiveElement;
    isAuspicious: boolean;
    goodFor: string[];
    badFor: string[];
  };

  // 달 위상
  lunarPhase: {
    phase: LunarPhase;
    phaseName: string;
    influence: 'strong' | 'moderate' | 'weak';
  };

  // 절기 에너지
  solarTerm: {
    nameKo: string;
    element: FiveElement;
    energy: 'yang' | 'yin';
    seasonPhase: 'early' | 'mid' | 'late';
  };

  // 종합 점수
  score: number;
  grade: PredictionGrade;

  // 해당 시간에 최적인 활동
  optimalActivities: string[];
  avoidActivities: string[];

  // 정밀 조언
  advice: string;
}

/**
 * 특정 시간의 분 단위 정밀 분석
 */
export function analyzeMinutePrecision(
  datetime: Date,
  dayStem: string,
  dayBranch: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): MinutePrecisionResult {
  const hour = datetime.getHours();
  const minute = datetime.getMinutes();

  // 1. 시간 지지 계산 (2시간 단위)
  const HOUR_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const hourBranchIndex = Math.floor(((hour + 1) % 24) / 2);
  const hourBranch = HOUR_BRANCHES[hourBranchIndex];

  // 시간 천간 계산 (일간 기준)
  const dayStemIndex = STEMS.indexOf(dayStem);
  const hourStemStart = (dayStemIndex * 2) % 10;
  const hourStemIndex = (hourStemStart + hourBranchIndex) % 10;
  const hourStem = STEMS[hourStemIndex];

  // 2. 행성시 분석
  const planetaryHours = calculatePlanetaryHours(datetime);
  const currentPlanetaryHour = findCurrentPlanetaryHour(planetaryHours, datetime);

  // 3. 28수 분석
  const lunarMansion = getLunarMansion(datetime);

  // 4. 달 위상 분석
  const lunarDay = ((datetime.getDate() + 10) % 30) + 1; // 근사값
  const lunarPhase = getLunarPhase(lunarDay);
  const lunarPhaseName = PrecisionEngine.getLunarPhaseName(lunarPhase);

  // 5. 절기 분석
  const solarTerm = getSolarTermForDate(datetime);

  // 6. 종합 점수 계산
  let score = 50;
  const optimalActivities: string[] = [];
  const avoidActivities: string[] = [];

  // 시지-일지 상호작용
  const hourDayInteraction = analyzeBranchInteractions([dayBranch, hourBranch]);
  for (const inter of hourDayInteraction) {
    score += inter.score * 0.3;
    if (inter.impact === 'positive') {
      optimalActivities.push(`${inter.type} - ${inter.description.split('-')[0]}`);
    }
  }

  // 행성시 영향
  if (currentPlanetaryHour) {
    if (currentPlanetaryHour.quality === 'excellent') {
      score += 15;
      optimalActivities.push(...currentPlanetaryHour.goodFor.slice(0, 2));
    } else if (currentPlanetaryHour.quality === 'good') {
      score += 8;
      optimalActivities.push(...currentPlanetaryHour.goodFor.slice(0, 1));
    } else if (currentPlanetaryHour.quality === 'caution') {
      score -= 10;
      avoidActivities.push('중요 결정', '계약');
    }

    // 용신과 행성시 오행 조화
    if (yongsin?.includes(currentPlanetaryHour.element)) {
      score += 10;
      optimalActivities.push(`용신 ${currentPlanetaryHour.element} 활성화`);
    }
    if (kisin?.includes(currentPlanetaryHour.element)) {
      score -= 8;
      avoidActivities.push(`기신 ${currentPlanetaryHour.element} 주의`);
    }
  }

  // 28수 영향
  if (lunarMansion.isAuspicious) {
    score += 8;
    optimalActivities.push(...lunarMansion.goodFor.slice(0, 2));
  } else {
    score -= 5;
    avoidActivities.push(...lunarMansion.badFor.filter(b => b !== '대부분').slice(0, 2));
  }

  // 달 위상 영향
  if (lunarPhase === 'full_moon') {
    score += 5;
    optimalActivities.push('완성', '발표', '사교');
  } else if (lunarPhase === 'new_moon') {
    score += 3;
    optimalActivities.push('시작', '계획', '명상');
  }

  // 절기 에너지
  if (solarTerm.energy === 'yang') {
    optimalActivities.push('활동적 업무', '외부 활동');
  } else {
    optimalActivities.push('내부 작업', '정리', '휴식');
  }

  score = Math.max(0, Math.min(100, score));

  // 등급 결정 (통일된 기준 사용)
  const grade = scoreToGrade(score);

  // 정밀 조언 생성
  const advice = generateMinuteAdvice(
    currentPlanetaryHour,
    lunarMansion,
    lunarPhase,
    solarTerm,
    score
  );

  return {
    datetime,
    hour,
    minute,
    hourBranch,
    hourStem,
    planetaryHour: currentPlanetaryHour ? {
      planet: currentPlanetaryHour.planet,
      element: currentPlanetaryHour.element,
      quality: currentPlanetaryHour.quality,
      goodFor: currentPlanetaryHour.goodFor,
      startTime: currentPlanetaryHour.startTime,
      endTime: currentPlanetaryHour.endTime,
      percentComplete: calculatePercentComplete(currentPlanetaryHour, datetime),
    } : {
      planet: 'Unknown',
      element: '토',
      quality: 'neutral',
      goodFor: [],
      startTime: datetime,
      endTime: datetime,
      percentComplete: 0,
    },
    lunarMansion: {
      name: lunarMansion.name,
      nameKo: lunarMansion.nameKo,
      element: lunarMansion.element,
      isAuspicious: lunarMansion.isAuspicious,
      goodFor: lunarMansion.goodFor,
      badFor: lunarMansion.badFor,
    },
    lunarPhase: {
      phase: lunarPhase,
      phaseName: lunarPhaseName,
      influence: getLunarInfluence(lunarPhase),
    },
    solarTerm: {
      nameKo: solarTerm.nameKo,
      element: solarTerm.element,
      energy: solarTerm.energy,
      seasonPhase: solarTerm.seasonPhase,
    },
    score,
    grade,
    optimalActivities: [...new Set(optimalActivities)].slice(0, 5),
    avoidActivities: [...new Set(avoidActivities)].slice(0, 3),
    advice,
  };
}

// 현재 행성시 찾기
function findCurrentPlanetaryHour(
  hours: PrecisionPlanetaryHour[],
  datetime: Date
): PrecisionPlanetaryHour | null {
  for (const h of hours) {
    if (datetime >= h.startTime && datetime < h.endTime) {
      return h;
    }
  }
  return hours[0] || null;
}

// 행성시 진행률 계산
function calculatePercentComplete(hour: PrecisionPlanetaryHour, datetime: Date): number {
  const total = hour.endTime.getTime() - hour.startTime.getTime();
  const elapsed = datetime.getTime() - hour.startTime.getTime();
  return Math.round((elapsed / total) * 100);
}

// 달 위상 영향력
function getLunarInfluence(phase: LunarPhase): 'strong' | 'moderate' | 'weak' {
  if (phase === 'full_moon' || phase === 'new_moon') return 'strong';
  if (phase === 'first_quarter' || phase === 'last_quarter') return 'moderate';
  return 'weak';
}

// 분 단위 조언 생성
function generateMinuteAdvice(
  planetaryHour: PrecisionPlanetaryHour | null,
  lunarMansion: LunarMansion,
  lunarPhase: LunarPhase,
  solarTerm: SolarTerm,
  score: number
): string {
  const parts: string[] = [];

  if (planetaryHour) {
    const planetNames: Record<string, string> = {
      'Sun': '태양', 'Moon': '달', 'Mars': '화성', 'Mercury': '수성',
      'Jupiter': '목성', 'Venus': '금성', 'Saturn': '토성',
    };
    parts.push(`${planetNames[planetaryHour.planet] || planetaryHour.planet}의 시간`);

    if (planetaryHour.quality === 'excellent') {
      parts.push('- 최적의 시간대입니다');
    } else if (planetaryHour.quality === 'caution') {
      parts.push('- 신중한 접근이 필요합니다');
    }
  }

  parts.push(`${lunarMansion.nameKo}수(${lunarMansion.name})`);

  if (lunarPhase === 'full_moon') {
    parts.push('보름달의 강한 에너지');
  } else if (lunarPhase === 'new_moon') {
    parts.push('새로운 시작에 적합');
  }

  parts.push(`${solarTerm.nameKo} 절기`);

  if (score >= 70) {
    parts.push('- 좋은 시간대입니다');
  } else if (score <= 40) {
    parts.push('- 주의가 필요합니다');
  }

  return parts.join(', ');
}

/**
 * 특정 시간 범위의 최적 시간 찾기
 */
export function findOptimalMinutes(
  date: Date,
  startHour: number,
  endHour: number,
  dayStem: string,
  dayBranch: string,
  activityType?: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): { time: Date; score: number; reason: string }[] {
  const results: { time: Date; score: number; reason: string }[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) { // 30분 간격
      const datetime = new Date(date);
      datetime.setHours(hour, minute, 0, 0);

      const analysis = analyzeMinutePrecision(datetime, dayStem, dayBranch, yongsin, kisin);

      // 활동 유형에 따른 필터링
      if (activityType) {
        if (!analysis.optimalActivities.some(a =>
          a.includes(activityType) || activityType.includes(a.split(' ')[0])
        )) {
          continue;
        }
      }

      if (analysis.score >= 60) {
        results.push({
          time: datetime,
          score: analysis.score,
          reason: `${analysis.planetaryHour.planet}시 | ${analysis.lunarMansion.nameKo}수 | ${analysis.grade}등급`,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * 하루 중 최적/최악 시간대 분석
 */
export function analyzeDayTimeSlots(
  date: Date,
  dayStem: string,
  dayBranch: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): {
  best: { hour: number; score: number; reason: string }[];
  worst: { hour: number; score: number; reason: string }[];
  byActivity: Record<string, { hour: number; score: number }[]>;
} {
  const hourlyScores: { hour: number; score: number; analysis: MinutePrecisionResult }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const datetime = new Date(date);
    datetime.setHours(hour, 30, 0, 0); // 매시 30분 기준

    const analysis = analyzeMinutePrecision(datetime, dayStem, dayBranch, yongsin, kisin);
    hourlyScores.push({ hour, score: analysis.score, analysis });
  }

  // 정렬
  const sorted = [...hourlyScores].sort((a, b) => b.score - a.score);

  // 최고/최저
  const best = sorted.slice(0, 5).map(h => ({
    hour: h.hour,
    score: h.score,
    reason: `${h.analysis.planetaryHour.planet}시, ${h.analysis.grade}등급`,
  }));

  const worst = sorted.slice(-3).reverse().map(h => ({
    hour: h.hour,
    score: h.score,
    reason: h.analysis.avoidActivities[0] || '에너지 저하',
  }));

  // 활동별 최적 시간
  const activities = ['리더십', '계약', '학습', '연애', '운동', '명상'];
  const byActivity: Record<string, { hour: number; score: number }[]> = {};

  for (const activity of activities) {
    byActivity[activity] = hourlyScores
      .filter(h => h.analysis.optimalActivities.some(a => a.includes(activity)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(h => ({ hour: h.hour, score: h.score }));
  }

  return { best, worst, byActivity };
}

/**
 * 특정 시간의 빠른 점수 조회
 */
export function getQuickMinuteScore(
  datetime: Date,
  dayStem: string,
  dayBranch: string
): { score: number; grade: string; advice: string } {
  const analysis = analyzeMinutePrecision(datetime, dayStem, dayBranch);
  return {
    score: analysis.score,
    grade: analysis.grade,
    advice: analysis.advice,
  };
}
