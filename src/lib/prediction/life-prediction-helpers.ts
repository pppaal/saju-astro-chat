/**
 * 생애 예측 엔진 헬퍼 함수
 * lifePredictionEngine.ts에서 분리된 유틸리티/헬퍼 함수들
 */

import type { FiveElement } from './advancedTimingEngine';
import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
} from './advancedTimingEngine';

import type { DaeunInfo } from './daeunTransitSync';

import type {
  EventType,
  LifePredictionInput,
  BonusResult,
  ShinsalInfo,
} from './life-prediction-types';

import {
  STEM_ELEMENT,
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  BRANCH_CLASHES,
  BRANCH_PUNISHMENTS,
  EVENT_FAVORABLE_CONDITIONS,
} from './life-prediction/constants';

// Temporary placeholders for undefined constants
// TODO: Define these properly when shinsal logic is needed
const CHEONEL_MAP: Record<string, string[]> = {};
const YEOKMA_MAP: Record<string, string> = {};
const MUNCHANG_MAP: Record<string, string> = {};
const GEOPSAL_MAP: Record<string, string> = {};
const CLASHES = BRANCH_CLASHES;
const PUNISHMENTS = BRANCH_PUNISHMENTS;

// ============================================================
// 천간/지지 관계 분석
// ============================================================

/**
 * 천간 관계 분석
 */
export function analyzeStemRelation(stem1: string, stem2: string): { type: string; description: string } {
  const combo = stem1 + stem2;
  if (STEM_COMBINATIONS[combo]) {
    return { type: '합', description: STEM_COMBINATIONS[combo] };
  }
  if (STEM_CLASHES.includes(combo)) {
    return { type: '충', description: '천간 충돌' };
  }
  return { type: '무관', description: '' };
}

/**
 * 지지 관계 분석 (간단 버전)
 */
export function analyzeBranchRelation(branch1: string, branch2: string): string {
  const combo = branch1 + branch2;
  const reverseCombo = branch2 + branch1;

  if (SIX_COMBOS[combo] || SIX_COMBOS[reverseCombo]) return '육합';
  if (PARTIAL_TRINES[combo] || PARTIAL_TRINES[reverseCombo]) return '삼합';
  if (CLASHES[combo] || CLASHES[reverseCombo]) return '충';
  if (PUNISHMENTS[combo] || PUNISHMENTS[reverseCombo]) return '형';

  return '무관';
}

// ============================================================
// 신살 감지
// ============================================================

/**
 * 신살 감지 (간단한 버전)
 */
export function detectShinsals(
  input: LifePredictionInput,
  dailyPillar: { stem: string; branch: string }
): ShinsalInfo[] {
  const shinsals: ShinsalInfo[] = [];

  // 천을귀인
  if (CHEONEL_MAP[input.dayStem]?.includes(dailyPillar.branch)) {
    shinsals.push({ name: '천을귀인', type: 'lucky' });
  }

  // 역마
  if (YEOKMA_MAP[input.dayBranch] === dailyPillar.branch) {
    shinsals.push({ name: '역마', type: 'lucky' });
  }

  // 문창
  if (MUNCHANG_MAP[input.dayStem] === dailyPillar.branch) {
    shinsals.push({ name: '문창', type: 'lucky' });
  }

  // 겁살
  if (GEOPSAL_MAP[input.dayBranch] === dailyPillar.branch) {
    shinsals.push({ name: '겁살', type: 'unlucky' });
  }

  return shinsals;
}

// ============================================================
// 대운-세운-월운 복합 시너지 분석
// ============================================================

/**
 * TIER 5+: 대운-세운-월운 복합 시너지 분석
 */
export function calculateCompoundLuckScore(
  input: LifePredictionInput,
  eventType: EventType,
  year: number,
  month: number
): BonusResult {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  if (!conditions) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  const age = year - input.birthYear;
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
  if (!daeun) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  const yearGanji = calculateYearlyGanji(year);
  const monthGanji = calculateMonthlyGanji(year, month);

  // 1. 대운/세운/월운 십신 분석
  const daeunSibsin = calculateSibsin(input.dayStem, daeun.stem);
  const yearSibsin = calculateSibsin(input.dayStem, yearGanji.stem);
  const monthSibsin = calculateSibsin(input.dayStem, monthGanji.stem);

  // 2. 대운/세운/월운 12운성 분석
  const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
  const yearStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);
  const monthStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);

  // 세 레이어 모두 유리한 십신이면 대박
  const favorableSibsinCount = [daeunSibsin, yearSibsin, monthSibsin]
    .filter(s => conditions.favorableSibsin.includes(s)).length;
  const avoidSibsinCount = [daeunSibsin, yearSibsin, monthSibsin]
    .filter(s => conditions.avoidSibsin.includes(s)).length;

  if (favorableSibsinCount === 3) {
    bonus += 20;
    reasons.push(`삼중 길신 (대운 ${daeunSibsin} + 세운 ${yearSibsin} + 월운 ${monthSibsin})`);
  } else if (favorableSibsinCount === 2) {
    bonus += 12;
    reasons.push(`이중 길신 조합`);
  }

  if (avoidSibsinCount >= 2) {
    bonus -= 15;
    penalties.push(`복합 흉신 (${avoidSibsinCount}개 레이어)`);
  }

  // 세 레이어 12운성 시너지
  const peakStageCount = [daeunStage, yearStage, monthStage]
    .filter(s => s.energy === 'peak').length;
  const risingStageCount = [daeunStage, yearStage, monthStage]
    .filter(s => s.energy === 'rising').length;
  const dormantStageCount = [daeunStage, yearStage, monthStage]
    .filter(s => s.energy === 'dormant').length;

  if (peakStageCount >= 2) {
    bonus += 15;
    reasons.push(`복합 전성기 (${peakStageCount}개 레이어)`);
  }
  if (risingStageCount >= 2 && peakStageCount >= 1) {
    bonus += 10;
    reasons.push(`상승+전성 시너지`);
  }
  if (dormantStageCount >= 2) {
    bonus -= 12;
    penalties.push(`복합 휴식기 - 중요 결정 보류 권장`);
  }

  // 대운-세운 천간 관계 분석
  const daeunYearRelation = analyzeStemRelation(daeun.stem, yearGanji.stem);
  if (daeunYearRelation.type === '합') {
    bonus += 10;
    reasons.push(`대운-세운 천간합 - ${daeunYearRelation.description}`);
  } else if (daeunYearRelation.type === '충') {
    bonus -= 8;
    penalties.push(`대운-세운 천간충 - 변동 예상`);
  }

  // 대운-세운 지지 관계 분석
  const daeunYearBranchRelation = analyzeBranchRelation(daeun.branch, yearGanji.branch);
  if (daeunYearBranchRelation.includes('삼합') || daeunYearBranchRelation.includes('육합')) {
    bonus += 8;
    reasons.push(`대운-세운 지지합`);
  } else if (daeunYearBranchRelation.includes('충')) {
    bonus -= 10;
    penalties.push(`대운-세운 지지충 - 큰 변화/갈등`);
  } else if (daeunYearBranchRelation.includes('형')) {
    bonus -= 6;
    penalties.push(`대운-세운 형 - 마찰 주의`);
  }

  // 세운-월운 관계 분석
  const yearMonthBranchRelation = analyzeBranchRelation(yearGanji.branch, monthGanji.branch);
  if (yearMonthBranchRelation.includes('합')) {
    bonus += 5;
  } else if (yearMonthBranchRelation.includes('충')) {
    bonus -= 5;
  }

  // 용신/기신 복합 체크
  const daeunElement = STEM_ELEMENT[daeun.stem];
  const yearElement = STEM_ELEMENT[yearGanji.stem];
  const monthElement = STEM_ELEMENT[monthGanji.stem];

  const yongsinActiveCount = [daeunElement, yearElement, monthElement]
    .filter(e => input.yongsin?.includes(e)).length;
  const kisinActiveCount = [daeunElement, yearElement, monthElement]
    .filter(e => input.kisin?.includes(e)).length;

  if (yongsinActiveCount >= 2) {
    bonus += 12;
    reasons.push(`복합 용신 활성 (${yongsinActiveCount}개)`);
  }
  if (kisinActiveCount >= 2) {
    bonus -= 10;
    penalties.push(`복합 기신 활성 - 주의 필요`);
  }

  return {
    bonus: Math.max(-30, Math.min(30, bonus)),
    reasons: reasons.slice(0, 4),
    penalties: penalties.slice(0, 3),
  };
}

// ============================================================
// 데이터 완성도 및 일치도 계산
// ============================================================

/**
 * 동서양 분석 일치도 계산
 */
export function calculateMethodAlignment(
  twelveStage: { energy: string },
  solarTerm: { energy: string },
  lunarMansion: { isAuspicious: boolean }
): number {
  let alignment = 50;

  // 12운성 에너지와 28수 길흉 일치
  if (twelveStage.energy === 'peak' && lunarMansion.isAuspicious) alignment += 15;
  if (twelveStage.energy === 'dormant' && !lunarMansion.isAuspicious) alignment += 10;
  if (twelveStage.energy === 'peak' && !lunarMansion.isAuspicious) alignment -= 10;

  // 절기 에너지 방향 일치
  if (solarTerm.energy === 'yang' && twelveStage.energy === 'rising') alignment += 10;
  if (solarTerm.energy === 'yin' && twelveStage.energy === 'declining') alignment += 10;

  return Math.min(100, Math.max(0, alignment));
}

/**
 * 데이터 완성도 계산
 */
export function calculateDataCompleteness(input: LifePredictionInput): number {
  let completeness = 50;

  if (input.birthHour !== undefined) completeness += 15;
  if (input.daeunList && input.daeunList.length > 0) completeness += 15;
  if (input.yongsin && input.yongsin.length > 0) completeness += 10;
  if (input.astroChart) completeness += 5;
  if (input.advancedAstro) completeness += 5;

  return Math.min(100, completeness);
}

// ============================================================
// 생애 주기 결정
// ============================================================

/**
 * 현재 생애 주기 결정
 */
export function determineLifeCycle(
  age: number,
  daeun?: DaeunInfo
): { name: string; theme: string; energy: 'rising' | 'peak' | 'declining' | 'dormant' } {
  // 대운 기반 생애 주기 결정
  if (daeun) {
    // DaeunInfo에 energy/theme이 없을 수 있음 - 확장된 타입 가정
    const extDaeun = daeun as DaeunInfo & { energy?: string; theme?: string };
    const daeunEnergy = extDaeun.energy || 'stable';
    let energy: 'rising' | 'peak' | 'declining' | 'dormant' = 'rising';

    if (daeunEnergy === 'peak' || daeunEnergy === 'strong') {
      energy = 'peak';
    } else if (daeunEnergy === 'declining' || daeunEnergy === 'weak') {
      energy = 'declining';
    } else if (daeunEnergy === 'dormant' || daeunEnergy === 'very_weak') {
      energy = 'dormant';
    }

    return {
      name: `${daeun.stem}${daeun.branch} 대운`,
      theme: extDaeun.theme || '운세 흐름',
      energy,
    };
  }

  // 나이 기반 기본 생애 주기
  if (age < 20) {
    return { name: '성장기', theme: '학습과 성장', energy: 'rising' };
  } else if (age < 35) {
    return { name: '청년기', theme: '도전과 확장', energy: 'rising' };
  } else if (age < 50) {
    return { name: '장년기', theme: '성취와 안정', energy: 'peak' };
  } else if (age < 65) {
    return { name: '중년기', theme: '성숙과 수확', energy: 'declining' };
  } else {
    return { name: '노년기', theme: '지혜와 여유', energy: 'dormant' };
  }
}

// ============================================================
// 트렌드 분석
// ============================================================

/**
 * 전체 트렌드 분석
 */
export function analyzeOverallTrend(
  scores: number[]
): 'ascending' | 'descending' | 'stable' | 'volatile' {
  if (scores.length < 3) return 'stable';

  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const variance = Math.sqrt(
    scores.reduce((sum, s) => sum + Math.pow(s - (scores.reduce((a, b) => a + b) / scores.length), 2), 0) / scores.length
  );

  if (variance > 15) return 'volatile';
  if (secondAvg - firstAvg > 10) return 'ascending';
  if (firstAvg - secondAvg > 10) return 'descending';
  return 'stable';
}

// ============================================================
// 주요 테마 생성
// ============================================================

/**
 * 연간 테마 생성
 */
export function generateYearlyThemes(
  sibsin: string,
  twelveStage: { stage: string; lifePhase: string },
  daeun?: DaeunInfo
): string[] {
  const themes: string[] = [];

  themes.push(`${twelveStage.stage} - ${twelveStage.lifePhase.split(' - ')[0]}`);
  themes.push(`${sibsin}운`);

  if (daeun) {
    themes.push(`${daeun.stem}${daeun.branch} 대운 시기`);
  }

  return themes;
}

/**
 * 기회 키워드 생성
 */
export function generateOpportunities(
  sibsin: string,
  twelveStage: { energy: string; stage: string },
  yongsinActive: boolean
): string[] {
  const opportunities: string[] = [];

  if (twelveStage.energy === 'peak') {
    opportunities.push('성취와 성공의 시기');
    opportunities.push('중요한 결정에 좋은 때');
  } else if (twelveStage.energy === 'rising') {
    opportunities.push('새로운 시작에 좋은 때');
    opportunities.push('학습과 성장의 기회');
  }

  if (['정관', '정재', '정인'].includes(sibsin)) {
    opportunities.push('안정적인 발전 가능');
  }
  if (['편재', '식신'].includes(sibsin)) {
    opportunities.push('재물 기회');
  }

  if (yongsinActive) {
    opportunities.push('용신 활성 - 유리한 흐름');
  }

  return opportunities.slice(0, 4);
}

/**
 * 도전 키워드 생성
 */
export function generateChallenges(
  sibsin: string,
  twelveStage: { energy: string },
  kisinActive: boolean
): string[] {
  const challenges: string[] = [];

  if (twelveStage.energy === 'dormant') {
    challenges.push('에너지 저하기 - 휴식 권장');
    challenges.push('중요 결정 보류');
  } else if (twelveStage.energy === 'declining') {
    challenges.push('현상 유지에 집중');
  }

  if (['겁재', '상관'].includes(sibsin)) {
    challenges.push('경쟁과 갈등 주의');
  }
  if (sibsin === '편관') {
    challenges.push('압박감 관리 필요');
  }

  if (kisinActive) {
    challenges.push('기신 활성 - 신중한 접근 필요');
  }

  return challenges.slice(0, 3);
}
