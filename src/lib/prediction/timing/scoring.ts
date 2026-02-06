/**
 * scoring.ts - 종합 월별 타이밍 점수 계산
 */

import type { FiveElement, AdvancedTimingInput, LayeredTimingScore, BranchInteraction, TimingAdvice } from './types';
import { scoreToGrade } from '../index';
import { STEMS } from './constants/stemData';
import { calculatePreciseTwelveStage } from './twelveStage';
import { analyzeMultiLayer } from './multiLayer';
import { calculateYearlyGanji, calculateMonthlyGanji } from './ganji';

function calculateLuckyDays(month: number, baseScore: number): number[] {
  // 현재 연도 기준으로 월의 일수 계산
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, month, 0).getDate();
  const luckyCount = baseScore >= 70 ? 6 : baseScore >= 50 ? 4 : 2;

  // 1, 6, 11, 16, 21, 26 (5일 간격)
  const days: number[] = [];
  for (let d = 1; d <= daysInMonth && days.length < luckyCount; d += 5) {
    days.push(d);
  }
  return days;
}

function calculateCautionDays(month: number, branchInteractions: BranchInteraction[]): number[] {
  const hasConflict = branchInteractions.some(b => b.impact === 'negative');
  if (!hasConflict) { return []; }

  // 현재 연도 기준으로 월의 일수 계산
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, month, 0).getDate();
  // 충이 있으면 월초/월말 주의
  return [1, 2, daysInMonth - 1, daysInMonth];
}

export function calculateAdvancedMonthlyScore(input: AdvancedTimingInput): LayeredTimingScore {
  const { year, month, dayStem, dayBranch, daeun, yongsin = [], kisin = [] } = input;

  // 세운/월운 계산
  const saeun = calculateYearlyGanji(year);
  const wolun = calculateMonthlyGanji(year, month);

  // 다층 분석
  const { layers, interactions, branchInteractions } = analyzeMultiLayer({
    dayStem,
    dayBranch,
    daeun,
    saeun,
    wolun,
  });

  // 정밀 12운성
  const preciseStage = calculatePreciseTwelveStage(dayStem, wolun.branch);

  // 기본 점수 계산 (가중 평균)
  let rawScore = layers.reduce((sum, layer) => sum + layer.score * layer.weight, 0);

  // 레이어 상호작용 적용
  for (const inter of interactions) {
    rawScore += inter.scoreModifier * 0.5;
  }

  // 지지 상호작용 적용
  for (const bInter of branchInteractions) {
    rawScore += bInter.score * 0.3;
  }

  // 용신/기신 적용
  const wolunElement = STEMS[wolun.stem]?.element;
  if (wolunElement) {
    if (yongsin.includes(wolunElement)) { rawScore += 15; }
    if (kisin.includes(wolunElement)) { rawScore -= 12; }
  }

  // 점수 정규화
  rawScore = Math.max(0, Math.min(100, rawScore));
  const weightedScore = Math.round(rawScore);

  // 신뢰도 (데이터 완전성에 따라)
  let confidence = 60;
  if (daeun) { confidence += 20; }
  if (yongsin.length > 0) { confidence += 10; }
  if (branchInteractions.length > 0) { confidence += 10; }
  confidence = Math.min(100, confidence);

  // 등급 (통일된 기준 사용)
  const grade = scoreToGrade(weightedScore);

  // 오행 분포 계산
  const energyBalance: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  for (const layer of layers) {
    energyBalance[layer.element] += layer.weight * 100;
  }
  const dominantEnergy = (Object.entries(energyBalance) as [FiveElement, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  // 테마/기회/주의 생성
  const themes: string[] = [];
  const opportunities: string[] = [];
  const cautions: string[] = [];

  // 12운성 기반 테마
  if (preciseStage.energy === 'peak') {
    themes.push('최고조 활동기');
    opportunities.push('중요한 결정과 도전');
  } else if (preciseStage.energy === 'rising') {
    themes.push('상승 에너지');
    opportunities.push('새로운 시작과 계획');
  } else if (preciseStage.energy === 'declining') {
    themes.push('안정과 수확');
    cautions.push('무리한 확장 자제');
  } else {
    themes.push('내면 성찰');
    cautions.push('큰 결정 보류');
  }

  // 지지 상호작용 기반
  for (const bInter of branchInteractions) {
    if (bInter.impact === 'positive') {
      opportunities.push(bInter.description);
    } else if (bInter.impact === 'negative') {
      cautions.push(bInter.description);
    }
  }

  // 타이밍 조언
  const timing: TimingAdvice = {
    bestActions: preciseStage.energy === 'peak' ? ['중요 계약', '면접', '프로젝트 시작'] : ['계획 수립', '학습', '네트워킹'],
    avoidActions: preciseStage.energy === 'dormant' ? ['큰 결정', '무리한 투자'] : [],
    focusAreas: [preciseStage.lifePhase.split(' - ')[1] || '균형 유지'],
    luckyDays: calculateLuckyDays(month, weightedScore),
    cautionDays: calculateCautionDays(month, branchInteractions),
  };

  return {
    year,
    month,
    daeunLayer: layers.find(l => l.weight === 0.5) || layers[0],
    saeunLayer: layers.find(l => l.weight === 0.3) || layers[0],
    wolunLayer: layers.find(l => l.weight === 0.2) || layers[0],
    layerInteractions: interactions,
    branchInteractions,
    preciseStage,
    rawScore,
    weightedScore,
    confidence,
    grade,
    dominantEnergy,
    energyBalance,
    themes,
    opportunities,
    cautions,
    timing,
  };
}
