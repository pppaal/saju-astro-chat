/**
 * @file Ultra Precision Daily Analysis
 * 일진/공망/신살/통근투출 분석 함수들
 */

import {
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
} from './advancedTimingEngine';
import { normalizeScore } from './utils/scoring-utils';

import type {
  FiveElement,
  DailyPillarAnalysis,
  GongmangAnalysis,
  ShinsalAnalysis,
  ShinsalHit,
  EnergyFlowAnalysis,
  TonggeunResult,
  TuechulResult,
  HourlyAdvice,
} from './ultra-precision-types';

import {
  STEMS,
  BRANCHES,
  HIDDEN_STEMS,
  BRANCH_MEANINGS,
  SIBSIN_SCORES,
  SHINSAL_RULES,
} from './ultra-precision-constants';

import { getStemElement } from './ultra-precision-helpers';

// ============================================================
// 일진(日辰) 계산
// ============================================================

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
  score += SIBSIN_SCORES[sibsin] || 0;

  score = normalizeScore(score);

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
    affectedAreas.push(...(BRANCH_MEANINGS[targetBranch] || []));
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

  // dayStem 사용 (미래 확장용)
  void dayStem;

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
