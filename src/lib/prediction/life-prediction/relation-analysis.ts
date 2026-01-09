/**
 * Relation Analysis
 * 천간/지지 관계 분석 및 복합 레이어 분석
 */

import type { FiveElement, PreciseTwelveStage } from '../advancedTimingEngine';
import type { DaeunInfo } from '../daeunTransitSync';
import type { EventType, LifePredictionInput, BonusResult, EventFavorableConditions } from './types';
import {
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  BRANCH_CLASHES,
  BRANCH_PUNISHMENTS,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
} from './constants';
import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
} from '../advancedTimingEngine';

// ============================================================
// 천간 관계 분석
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

// ============================================================
// 지지 관계 분석
// ============================================================

/**
 * 지지 관계 분석 (간단 버전)
 */
export function analyzeBranchRelation(branch1: string, branch2: string): string {
  const combo = branch1 + branch2;
  const reverseCombo = branch2 + branch1;

  if (SIX_COMBOS[combo] || SIX_COMBOS[reverseCombo]) return '육합';
  if (PARTIAL_TRINES[combo] || PARTIAL_TRINES[reverseCombo]) return '삼합';
  if (BRANCH_CLASHES[combo] || BRANCH_CLASHES[reverseCombo]) return '충';
  if (BRANCH_PUNISHMENTS[combo] || BRANCH_PUNISHMENTS[reverseCombo]) return '형';

  return '무관';
}

// ============================================================
// 복합 레이어 분석 (대운 + 세운 + 월운)
// ============================================================

/**
 * 복합 레이어 분석 (대운 + 세운 + 월운)
 * 세 레이어의 복합적인 영향을 분석
 */
export function analyzeMultiLayerInteraction(
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

  // 대운 찾기
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
  if (!daeun) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  // 세운/월운 간지
  const yearGanji = calculateYearlyGanji(year);
  const monthGanji = calculateMonthlyGanji(year, month);

  // 각 레이어 12운성
  const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
  const yearStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);
  const monthStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);

  // 각 레이어 십신
  const daeunSibsin = calculateSibsin(input.dayStem, daeun.stem);
  const yearSibsin = calculateSibsin(input.dayStem, yearGanji.stem);
  const monthSibsin = calculateSibsin(input.dayStem, monthGanji.stem);

  // ========================================
  // 1. 삼중 레이어 시너지 분석
  // ========================================

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

  // ========================================
  // 2. 대운-세운 천간 관계 분석
  // ========================================
  const daeunYearRelation = analyzeStemRelation(daeun.stem, yearGanji.stem);
  if (daeunYearRelation.type === '합') {
    bonus += 10;
    reasons.push(`대운-세운 천간합 - ${daeunYearRelation.description}`);
  } else if (daeunYearRelation.type === '충') {
    bonus -= 8;
    penalties.push(`대운-세운 천간충 - 변동 예상`);
  }

  // ========================================
  // 3. 대운-세운 지지 관계 분석
  // ========================================
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

  // ========================================
  // 4. 세운-월운 관계 분석
  // ========================================
  const yearMonthBranchRelation = analyzeBranchRelation(yearGanji.branch, monthGanji.branch);
  if (yearMonthBranchRelation.includes('합')) {
    bonus += 5;
  } else if (yearMonthBranchRelation.includes('충')) {
    bonus -= 5;
  }

  // ========================================
  // 5. 용신/기신 복합 체크
  // ========================================
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
// 대운 전환 분석
// ============================================================

/**
 * 대운 전환 영향 분석
 */
export function analyzeDaeunTransition(
  input: LifePredictionInput,
  fromDaeun: DaeunInfo,
  toDaeun: DaeunInfo
): { impact: 'major_positive' | 'positive' | 'neutral' | 'challenging' | 'major_challenging'; description: string } {
  // 오행 변화 분석
  const fromElement = fromDaeun.element;
  const toElement = toDaeun.element;

  // 용신/기신 전환 체크
  const fromYongsin = input.yongsin?.includes(fromElement as FiveElement);
  const toYongsin = input.yongsin?.includes(toElement as FiveElement);
  const fromKisin = input.kisin?.includes(fromElement as FiveElement);
  const toKisin = input.kisin?.includes(toElement as FiveElement);

  // 12운성 변화
  const fromStage = calculatePreciseTwelveStage(input.dayStem, fromDaeun.branch);
  const toStage = calculatePreciseTwelveStage(input.dayStem, toDaeun.branch);

  let impact: 'major_positive' | 'positive' | 'neutral' | 'challenging' | 'major_challenging';
  let description = '';

  // 대박 전환
  if (!fromYongsin && toYongsin && toStage.energy === 'peak') {
    impact = 'major_positive';
    description = `용신 대운 진입 + ${toStage.stage} - 인생의 전환점`;
  }
  // 좋은 전환
  else if (toYongsin || toStage.energy === 'peak' || toStage.energy === 'rising') {
    impact = 'positive';
    description = `${toElement} 대운 + ${toStage.stage} - 긍정적 변화`;
  }
  // 힘든 전환
  else if (toKisin && (toStage.energy === 'dormant' || toStage.energy === 'declining')) {
    impact = 'major_challenging';
    description = `기신 대운 + ${toStage.stage} - 인내와 준비 필요`;
  }
  // 도전적 전환
  else if (toKisin || toStage.energy === 'dormant') {
    impact = 'challenging';
    description = `${toElement} 대운 진입 - 신중함 필요`;
  }
  // 중립
  else {
    impact = 'neutral';
    description = `${toElement} 대운 진입 - 안정적 전환`;
  }

  return { impact, description };
}

// ============================================================
// 에너지별 권장 사항
// ============================================================

/**
 * 에너지 레벨에 따른 권장 사항 생성
 */
export function generateEnergyRecommendations(
  energy: 'rising' | 'peak' | 'declining' | 'dormant',
  element: FiveElement
): string[] {
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
