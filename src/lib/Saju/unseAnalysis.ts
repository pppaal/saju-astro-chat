// src/lib/Saju/unseAnalysis.ts
// 대운/세운 종합 분석 모듈 - 200% 급 심화 분석

import { FiveElement } from './types';
import { getStemElement, getBranchElement, getStemByIndex, getBranchByIndex } from './stemBranchUtils';

// 인덱스로 이름 가져오기 (로컬 래퍼)
function getStemName(index: number): string {
  return getStemByIndex(index).name;
}

function getBranchName(index: number): string {
  return getBranchByIndex(index).name;
}

// ============================================================
// 타입 정의
// ============================================================

interface Pillar { stem: string; branch: string; }
interface SajuPillars { year: Pillar; month: Pillar; day: Pillar; hour: Pillar; }

export type UnseType = '대운' | '세운' | '월운' | '일운';

export interface UnseInfo {
  type: UnseType;
  stem: string;
  branch: string;
  startAge?: number;
  endAge?: number;
  year?: number;
}

export interface UnseInteractionDetail {
  target: '년주' | '월주' | '일주' | '시주';
  targetPillar: Pillar;
  interactions: { type: string; description: string; impact: 'positive' | 'negative' | 'neutral'; score: number; }[];
}

export interface UnseYongsinMatch {
  yongsin: FiveElement[];
  kisin: FiveElement[];
  unseElement: FiveElement;
  match: 'yongsin' | 'kisin' | 'neutral';
  score: number;
  description: string;
}

export interface UnseTwelveStage {
  stage: string;
  description: string;
  energy: 'rising' | 'peak' | 'declining' | 'dormant';
  score: number;
}

export interface UnseSibsinRelation {
  sibsin: string;
  description: string;
  aspect: 'career' | 'wealth' | 'relationship' | 'health' | 'reputation';
  impact: 'positive' | 'negative' | 'neutral';
}

export interface UnseComprehensiveAnalysis {
  unseInfo: UnseInfo;
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  yongsinMatch: UnseYongsinMatch;
  twelveStage: UnseTwelveStage;
  sibsinRelations: UnseSibsinRelation[];
  interactions: UnseInteractionDetail[];
  themes: string[];
  opportunities: string[];
  challenges: string[];
  advice: string[];
  summary: string;
}

export interface DaeunPeriodAnalysis {
  periodIndex: number;
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  analysis: UnseComprehensiveAnalysis;
  keyYears: number[];
  transitionAdvice: string;
}

export interface LifeCycleAnalysis {
  currentDaeun: DaeunPeriodAnalysis;
  currentSeun: UnseComprehensiveAnalysis;
  daeunHistory: DaeunPeriodAnalysis[];
  futureDaeun: DaeunPeriodAnalysis[];
  lifePeaks: { age: number; reason: string }[];
  lifeChallenges: { age: number; reason: string }[];
  overallLifePattern: string;
}

// ============================================================
// 십성(십신) 계산
// ============================================================

const STEM_YIN_YANG: Record<string, '양' | '음'> = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
  '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음'
};

const SIBSIN_NAMES = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const;
type SibsinName = typeof SIBSIN_NAMES[number];

function getSibsin(dayStem: string, targetStem: string): SibsinName {
  const dayElement = getStemElement(dayStem);
  const targetElement = getStemElement(targetStem);
  const dayYinYang = STEM_YIN_YANG[dayStem];
  const targetYinYang = STEM_YIN_YANG[targetStem];
  const samePolarity = dayYinYang === targetYinYang;

  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
  const dayIdx = elements.indexOf(dayElement);
  const targetIdx = elements.indexOf(targetElement);

  const diff = (targetIdx - dayIdx + 5) % 5;
  const baseIndex = diff * 2;
  const sibsinIndex = samePolarity ? baseIndex : baseIndex + 1;

  return SIBSIN_NAMES[sibsinIndex];
}

// ============================================================
// 12운성 계산
// ============================================================

const TWELVE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const;
type TwelveStageType = typeof TWELVE_STAGES[number];

const STAGE_START: Record<string, number> = {
  '甲': 0, '乙': 0, '丙': 3, '丁': 3, '戊': 3,
  '己': 3, '庚': 6, '辛': 6, '壬': 9, '癸': 9
};

const YANG_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getTwelveStage(dayStem: string, branch: string): TwelveStageType {
  const isYang = STEM_YIN_YANG[dayStem] === '양';
  const startIdx = STAGE_START[dayStem] || 0;
  const branchIdx = YANG_BRANCHES.indexOf(branch);

  if (isYang) {
    const stageIdx = (branchIdx - startIdx + 12) % 12;
    return TWELVE_STAGES[stageIdx];
  } else {
    const stageIdx = (startIdx - branchIdx + 12) % 12;
    return TWELVE_STAGES[stageIdx];
  }
}

// ============================================================
// 운세 상호작용 분석
// ============================================================

const YUKAP: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '卯': '戌', '辰': '酉', '巳': '申',
  '午': '未', '未': '午', '申': '巳', '酉': '辰', '戌': '卯', '亥': '寅'
};

const SAMHAP: Record<string, string[]> = {
  '水局': ['申', '子', '辰'], '火局': ['寅', '午', '戌'],
  '木局': ['亥', '卯', '未'], '金局': ['巳', '酉', '丑']
};

const CHUNG: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
  '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳'
};

function analyzeUnseInteractions(unseBranch: string, pillars: SajuPillars): UnseInteractionDetail[] {
  const results: UnseInteractionDetail[] = [];
  const pillarNames: ('year' | 'month' | 'day' | 'hour')[] = ['year', 'month', 'day', 'hour'];
  const pillarKorean: Record<string, '년주' | '월주' | '일주' | '시주'> = {
    year: '년주', month: '월주', day: '일주', hour: '시주'
  };

  for (const name of pillarNames) {
    const pillar = pillars[name];
    const interactions: UnseInteractionDetail['interactions'] = [];

    if (YUKAP[unseBranch] === pillar.branch) {
      interactions.push({ type: '육합', description: `${unseBranch}와 ${pillar.branch}의 육합`, impact: 'positive', score: 15 });
    }

    for (const [, members] of Object.entries(SAMHAP)) {
      if (members.includes(unseBranch) && members.includes(pillar.branch)) {
        interactions.push({ type: '삼합', description: `${unseBranch}와 ${pillar.branch}의 삼합`, impact: 'positive', score: 20 });
        break;
      }
    }

    if (CHUNG[unseBranch] === pillar.branch) {
      interactions.push({ type: '충', description: `${unseBranch}와 ${pillar.branch}의 충`, impact: 'negative', score: -20 });
    }

    results.push({ target: pillarKorean[name], targetPillar: pillar, interactions });
  }

  return results;
}

// ============================================================
// 용신 매칭 분석
// ============================================================

function analyzeYongsinMatch(unseStem: string, unseBranch: string, yongsin: FiveElement[], kisin: FiveElement[]): UnseYongsinMatch {
  const stemElement = getStemElement(unseStem);
  const branchElement = getBranchElement(unseBranch);
  const unseElements = [stemElement, branchElement];

  let yongsinCount = 0;
  let kisinCount = 0;

  for (const elem of unseElements) {
    if (yongsin.includes(elem)) yongsinCount++;
    if (kisin.includes(elem)) kisinCount++;
  }

  let match: 'yongsin' | 'kisin' | 'neutral';
  let score: number;
  let description: string;

  if (yongsinCount > kisinCount) {
    match = 'yongsin';
    score = 20 + (yongsinCount * 10);
    description = '용신 운으로 전반적인 운세가 상승합니다.';
  } else if (kisinCount > yongsinCount) {
    match = 'kisin';
    score = -10 - (kisinCount * 10);
    description = '기신 운으로 조심스러운 행보가 필요합니다.';
  } else {
    match = 'neutral';
    score = 0;
    description = '중립적인 운세입니다.';
  }

  return { yongsin, kisin, unseElement: stemElement, match, score, description };
}

// ============================================================
// 12운성 에너지 분석
// ============================================================

function analyzeTwelveStageEnergy(stage: TwelveStageType): UnseTwelveStage {
  const stageInfo: Record<TwelveStageType, { energy: UnseTwelveStage['energy']; score: number; description: string }> = {
    '장생': { energy: 'rising', score: 15, description: '새로운 시작의 기운입니다.' },
    '목욕': { energy: 'rising', score: 5, description: '정화와 변화의 시기입니다.' },
    '관대': { energy: 'rising', score: 20, description: '자립의 시기입니다.' },
    '건록': { energy: 'peak', score: 25, description: '활동력 최고조입니다.' },
    '제왕': { energy: 'peak', score: 30, description: '정점의 시기입니다.' },
    '쇠': { energy: 'declining', score: 0, description: '성숙의 시기입니다.' },
    '병': { energy: 'declining', score: -10, description: '휴식이 필요한 시기입니다.' },
    '사': { energy: 'declining', score: -15, description: '정리의 시기입니다.' },
    '묘': { energy: 'dormant', score: -20, description: '잠복의 시기입니다.' },
    '절': { energy: 'dormant', score: -10, description: '전환점입니다.' },
    '태': { energy: 'rising', score: 5, description: '잉태의 시기입니다.' },
    '양': { energy: 'rising', score: 10, description: '성장 준비의 시기입니다.' }
  };

  return { stage, ...stageInfo[stage] };
}

// ============================================================
// 십성 영향 분석
// ============================================================

function analyzeSibsinImpact(sibsin: SibsinName): UnseSibsinRelation {
  const sibsinInfo: Record<SibsinName, Omit<UnseSibsinRelation, 'sibsin'>> = {
    '비견': { description: '경쟁과 협력의 에너지', aspect: 'relationship', impact: 'neutral' },
    '겁재': { description: '적극적인 활동력', aspect: 'wealth', impact: 'negative' },
    '식신': { description: '창의력과 표현력 상승', aspect: 'career', impact: 'positive' },
    '상관': { description: '기존 질서에 대한 도전', aspect: 'career', impact: 'neutral' },
    '편재': { description: '투기적 재물운', aspect: 'wealth', impact: 'neutral' },
    '정재': { description: '안정적인 재물운', aspect: 'wealth', impact: 'positive' },
    '편관': { description: '도전과 시련', aspect: 'reputation', impact: 'neutral' },
    '정관': { description: '직장운 상승', aspect: 'career', impact: 'positive' },
    '편인': { description: '학문과 사색', aspect: 'health', impact: 'neutral' },
    '정인': { description: '학업운과 지원', aspect: 'career', impact: 'positive' }
  };

  return { sibsin, ...sibsinInfo[sibsin] };
}

// ============================================================
// 종합 분석 함수
// ============================================================

export function analyzeUnseComprehensive(
  unseInfo: UnseInfo,
  pillars: SajuPillars,
  yongsin: FiveElement[] = [],
  kisin: FiveElement[] = []
): UnseComprehensiveAnalysis {
  const { stem, branch } = unseInfo;
  const dayStem = pillars.day.stem;

  const sibsin = getSibsin(dayStem, stem);
  const sibsinRelation = analyzeSibsinImpact(sibsin);
  const stage = getTwelveStage(dayStem, branch);
  const twelveStage = analyzeTwelveStageEnergy(stage);
  const interactions = analyzeUnseInteractions(branch, pillars);
  const yongsinMatch = analyzeYongsinMatch(stem, branch, yongsin, kisin);

  let totalScore = 50;
  totalScore += twelveStage.score;
  totalScore += yongsinMatch.score;
  for (const inter of interactions) {
    for (const i of inter.interactions) {
      totalScore += i.score;
    }
  }

  totalScore = Math.max(0, Math.min(100, totalScore));

  let grade: UnseComprehensiveAnalysis['grade'];
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 75) grade = 'A';
  else if (totalScore >= 60) grade = 'B';
  else if (totalScore >= 45) grade = 'C';
  else if (totalScore >= 30) grade = 'D';
  else grade = 'F';

  const themes: string[] = [];
  const opportunities: string[] = [];
  const challenges: string[] = [];
  const advice: string[] = [];

  if (['정관', '편관'].includes(sibsin)) {
    themes.push('직장/사회생활');
    opportunities.push('승진, 직업적 성장의 기회');
  }
  if (['정재', '편재'].includes(sibsin)) {
    themes.push('재물/경제');
    opportunities.push('재물 증식의 가능성');
  }
  if (['비견', '겁재'].includes(sibsin)) {
    themes.push('인간관계/경쟁');
    challenges.push('동료나 경쟁자와의 갈등 가능성');
  }

  if (['장생', '관대', '건록', '제왕'].includes(stage)) {
    advice.push('상승 기운을 활용해 적극적으로 행동하세요.');
  } else if (['쇠', '병', '사'].includes(stage)) {
    advice.push('내실을 다지고 건강 관리에 집중하세요.');
  } else {
    advice.push('새로운 시작을 준비하며 기반을 다지세요.');
  }

  const summary = `${unseInfo.type} ${stem}${branch}(${sibsin}운, ${stage})은 ${grade}등급(${totalScore}점)입니다. ${yongsinMatch.description}`;

  return {
    unseInfo, overallScore: totalScore, grade, yongsinMatch, twelveStage,
    sibsinRelations: [sibsinRelation], interactions, themes, opportunities, challenges, advice, summary
  };
}

// ============================================================
// 대운 기간 분석
// ============================================================

export function analyzeDaeunPeriod(
  stem: string, branch: string, startAge: number, periodIndex: number,
  pillars: SajuPillars, yongsin: FiveElement[] = [], kisin: FiveElement[] = [], birthYear?: number
): DaeunPeriodAnalysis {
  const endAge = startAge + 9;
  const unseInfo: UnseInfo = { type: '대운', stem, branch, startAge, endAge };
  const analysis = analyzeUnseComprehensive(unseInfo, pillars, yongsin, kisin);

  const keyYears: number[] = [];
  if (birthYear) {
    for (let age = startAge; age <= endAge; age++) {
      const year = birthYear + age;
      const yearBranchIdx = (year - 4) % 12;
      const yearBranch = YANG_BRANCHES[yearBranchIdx];
      if (YUKAP[branch] === yearBranch) {
        keyYears.push(year);
      }
    }
  }

  const transitionAdvice = analysis.grade === 'S' || analysis.grade === 'A'
    ? '이 대운은 전반적으로 좋은 시기입니다.'
    : analysis.grade === 'B' || analysis.grade === 'C'
    ? '안정적인 시기입니다. 기존 기반을 다지세요.'
    : '어려움이 예상되는 시기입니다. 보수적으로 행동하세요.';

  return { periodIndex, startAge, endAge, stem, branch, analysis, keyYears, transitionAdvice };
}

// ============================================================
// 인생 주기 종합 분석
// ============================================================

export function analyzeLifeCycle(
  pillars: SajuPillars,
  daeunList: { stem: string; branch: string; startAge: number }[],
  currentAge: number,
  yongsin: FiveElement[] = [],
  kisin: FiveElement[] = [],
  birthYear?: number
): LifeCycleAnalysis {
  const daeunHistory: DaeunPeriodAnalysis[] = [];
  const futureDaeun: DaeunPeriodAnalysis[] = [];
  let currentDaeun: DaeunPeriodAnalysis | null = null;

  const lifePeaks: { age: number; reason: string }[] = [];
  const lifeChallenges: { age: number; reason: string }[] = [];

  daeunList.forEach((daeun, index) => {
    const period = analyzeDaeunPeriod(daeun.stem, daeun.branch, daeun.startAge, index, pillars, yongsin, kisin, birthYear);
    const endAge = daeun.startAge + 9;

    if (currentAge >= daeun.startAge && currentAge <= endAge) {
      currentDaeun = period;
    } else if (currentAge > endAge) {
      daeunHistory.push(period);
    } else {
      futureDaeun.push(period);
    }

    if (period.analysis.grade === 'S' || period.analysis.grade === 'A') {
      lifePeaks.push({ age: daeun.startAge, reason: `${period.analysis.twelveStage.stage}운의 좋은 영향` });
    } else if (period.analysis.grade === 'D' || period.analysis.grade === 'F') {
      lifeChallenges.push({ age: daeun.startAge, reason: `운의 흐름이 약한 시기` });
    }
  });

  const currentYear = birthYear ? birthYear + currentAge : new Date().getFullYear();
  const yearStemIdx = (currentYear - 4) % 10;
  const yearBranchIdx = (currentYear - 4) % 12;
  const yearStem = getStemName(yearStemIdx);
  const yearBranch = getBranchName(yearBranchIdx);

  const currentSeun = analyzeUnseComprehensive(
    { type: '세운', stem: yearStem, branch: yearBranch, year: currentYear },
    pillars, yongsin, kisin
  );

  const peakCount = lifePeaks.length;
  const challengeCount = lifeChallenges.length;
  let overallLifePattern: string;

  if (peakCount > challengeCount * 2) {
    overallLifePattern = '전반적으로 순탄한 인생 흐름입니다.';
  } else if (challengeCount > peakCount * 2) {
    overallLifePattern = '도전과 극복의 인생입니다.';
  } else {
    overallLifePattern = '균형 잡힌 인생 흐름입니다.';
  }

  return {
    currentDaeun: currentDaeun || daeunHistory[daeunHistory.length - 1] || futureDaeun[0],
    currentSeun, daeunHistory, futureDaeun, lifePeaks, lifeChallenges, overallLifePattern
  };
}

// ============================================================
// 특정 연도 상세 분석
// ============================================================

export interface YearDetailAnalysis {
  year: number;
  age: number;
  seun: UnseComprehensiveAnalysis;
  daeun: DaeunPeriodAnalysis | null;
  combinedScore: number;
  combinedGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  monthlyForecast: { month: number; score: number; theme: string }[];
  yearSummary: string;
  bestMonths: number[];
  challengingMonths: number[];
}

export function analyzeSpecificYear(
  year: number, pillars: SajuPillars, birthYear: number,
  daeunList: { stem: string; branch: string; startAge: number }[],
  yongsin: FiveElement[] = [], kisin: FiveElement[] = []
): YearDetailAnalysis {
  const age = year - birthYear;

  const yearStemIdx = (year - 4) % 10;
  const yearBranchIdx = (year - 4) % 12;
  const yearStem = getStemName(yearStemIdx);
  const yearBranch = getBranchName(yearBranchIdx);

  const seun = analyzeUnseComprehensive({ type: '세운', stem: yearStem, branch: yearBranch, year }, pillars, yongsin, kisin);

  let daeun: DaeunPeriodAnalysis | null = null;
  for (let i = 0; i < daeunList.length; i++) {
    const d = daeunList[i];
    if (age >= d.startAge && age < d.startAge + 10) {
      daeun = analyzeDaeunPeriod(d.stem, d.branch, d.startAge, i, pillars, yongsin, kisin, birthYear);
      break;
    }
  }

  const daeunScore = daeun ? daeun.analysis.overallScore : 50;
  const combinedScore = Math.round((seun.overallScore * 0.4) + (daeunScore * 0.6));

  let combinedGrade: YearDetailAnalysis['combinedGrade'];
  if (combinedScore >= 90) combinedGrade = 'S';
  else if (combinedScore >= 75) combinedGrade = 'A';
  else if (combinedScore >= 60) combinedGrade = 'B';
  else if (combinedScore >= 45) combinedGrade = 'C';
  else if (combinedScore >= 30) combinedGrade = 'D';
  else combinedGrade = 'F';

  const monthlyForecast: YearDetailAnalysis['monthlyForecast'] = [];
  const bestMonths: number[] = [];
  const challengingMonths: number[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthBranchIdx = (month + 1) % 12;
    const monthBranch = getBranchName(monthBranchIdx);

    let monthScore = combinedScore;
    let theme = '평범한 달';

    if (YUKAP[yearBranch] === monthBranch) {
      monthScore += 10;
      theme = '합의 달';
      bestMonths.push(month);
    } else if (CHUNG[yearBranch] === monthBranch) {
      monthScore -= 15;
      theme = '충의 달';
      challengingMonths.push(month);
    }

    monthlyForecast.push({ month, score: Math.max(0, Math.min(100, monthScore)), theme });
  }

  const yearSummary = `${year}년 (만 ${age}세): ${combinedGrade}등급 (${combinedScore}점)`;

  return { year, age, seun, daeun, combinedScore, combinedGrade, monthlyForecast, yearSummary, bestMonths, challengingMonths };
}

// ============================================================
// 다년간 운세 트렌드 분석
// ============================================================

export interface MultiYearTrend {
  years: YearDetailAnalysis[];
  overallTrend: 'ascending' | 'descending' | 'stable' | 'fluctuating';
  bestYear: { year: number; score: number };
  worstYear: { year: number; score: number };
  averageScore: number;
  trendDescription: string;
}

export function analyzeMultiYearTrend(
  startYear: number, endYear: number, pillars: SajuPillars, birthYear: number,
  daeunList: { stem: string; branch: string; startAge: number }[],
  yongsin: FiveElement[] = [], kisin: FiveElement[] = []
): MultiYearTrend {
  const years: YearDetailAnalysis[] = [];
  let bestYear = { year: startYear, score: 0 };
  let worstYear = { year: startYear, score: 100 };
  let totalScore = 0;

  for (let year = startYear; year <= endYear; year++) {
    const analysis = analyzeSpecificYear(year, pillars, birthYear, daeunList, yongsin, kisin);
    years.push(analysis);
    totalScore += analysis.combinedScore;

    if (analysis.combinedScore > bestYear.score) {
      bestYear = { year, score: analysis.combinedScore };
    }
    if (analysis.combinedScore < worstYear.score) {
      worstYear = { year, score: analysis.combinedScore };
    }
  }

  const averageScore = totalScore / years.length;

  const firstHalf = years.slice(0, Math.floor(years.length / 2));
  const secondHalf = years.slice(Math.floor(years.length / 2));
  const firstAvg = firstHalf.reduce((sum, y) => sum + y.combinedScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, y) => sum + y.combinedScore, 0) / secondHalf.length;

  const maxScore = Math.max(...years.map(y => y.combinedScore));
  const minScore = Math.min(...years.map(y => y.combinedScore));
  const volatility = maxScore - minScore;

  let overallTrend: MultiYearTrend['overallTrend'];
  if (volatility > 30) overallTrend = 'fluctuating';
  else if (secondAvg - firstAvg > 10) overallTrend = 'ascending';
  else if (firstAvg - secondAvg > 10) overallTrend = 'descending';
  else overallTrend = 'stable';

  const trendDescriptions: Record<MultiYearTrend['overallTrend'], string> = {
    ascending: '점진적으로 상승하는 운세입니다.',
    descending: '운세가 하향 곡선을 그리고 있습니다.',
    stable: '안정적인 운세 흐름입니다.',
    fluctuating: '기복이 있는 운세입니다.'
  };

  return { years, overallTrend, bestYear, worstYear, averageScore, trendDescription: trendDescriptions[overallTrend] };
}
