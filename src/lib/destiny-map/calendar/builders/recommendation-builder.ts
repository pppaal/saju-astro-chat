/**
 * Recommendation Builder - 추천/경고 키 생성 모듈
 *
 * 분석 결과를 바탕으로 추천 및 경고 키를 생성합니다.
 */

import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';
import { YUKHAP, CHUNG, XING } from '../constants';
import { getSipsin } from '../utils';

export interface RecommendationBuilderInput {
  ganzhi: { stem: string; branch: string };
  dayMasterStem: string;
  dayBranch: string;
  retrogradePlanets: string[];
  branchInteractions: BranchInteraction[];
  specialFlags: {
    hasCheoneulGwiin: boolean;
    hasSonEomneun: boolean;
    hasGeonrok: boolean;
    isSamjaeYear: boolean;
    hasYeokma: boolean;
    hasDohwa: boolean;
  };
  planetaryHourDayRuler: string;
  relations: {
    generates: string;
    generatedBy: string;
    controls: string;
    controlledBy: string;
  };
}

export interface RecommendationBuilderResult {
  recommendationKeys: string[];
  warningKeys: string[];
}

/**
 * 추천 및 경고 키 생성
 */
export function buildRecommendationKeys(
  input: RecommendationBuilderInput
): RecommendationBuilderResult {
  const {
    ganzhi,
    dayMasterStem,
    dayBranch,
    retrogradePlanets,
    branchInteractions,
    specialFlags,
    planetaryHourDayRuler,
    relations,
  } = input;

  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  // 고급 지지 상호작용
  for (const bInter of branchInteractions) {
    if (bInter.impact === 'positive') {
      if (bInter.type === '육합') {
        recommendationKeys.push('partnership', 'harmony');
      } else if (bInter.type === '삼합') {
        recommendationKeys.push('collaboration', 'synergy');
      } else if (bInter.type === '방합') {
        recommendationKeys.push('expansion', 'growth');
      }
    } else if (bInter.impact === 'negative') {
      if (bInter.type === '충') {
        warningKeys.push('conflict', 'change');
      } else if (bInter.type === '형') {
        warningKeys.push('tension', 'challenge');
      }
    }
  }

  // 천을귀인
  if (specialFlags.hasCheoneulGwiin) {
    recommendationKeys.push('majorDecision', 'contract', 'meeting');
  }

  // 손없는 날
  if (specialFlags.hasSonEomneun) {
    recommendationKeys.push('moving', 'wedding', 'business');
  }

  // 건록
  if (specialFlags.hasGeonrok) {
    recommendationKeys.push('career', 'authority', 'promotion');
  }

  // 삼재
  if (specialFlags.isSamjaeYear) {
    warningKeys.push('samjae', 'caution');
  }

  // 역마살
  if (specialFlags.hasYeokma) {
    recommendationKeys.push('travel', 'change', 'interview');
    warningKeys.push('instability');
  }

  // 도화살
  if (specialFlags.hasDohwa) {
    recommendationKeys.push('dating', 'socializing', 'charm');
  }

  // 십신별 추천
  if (dayMasterStem) {
    const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);
    if (daySipsin) {
      switch (daySipsin) {
        case '정재':
          recommendationKeys.push('stableWealth', 'savings');
          break;
        case '편재':
          recommendationKeys.push('speculation', 'windfall');
          warningKeys.push('riskManagement');
          break;
        case '정인':
          recommendationKeys.push('learning', 'certification', 'mother');
          break;
        case '편인':
          recommendationKeys.push('spirituality', 'unique');
          break;
        case '겁재':
          warningKeys.push('rivalry', 'loss');
          break;
      }
    }
  }

  // 지지 관계 - 육합/충/형
  if (dayBranch) {
    // 육합
    if (YUKHAP[dayBranch] === ganzhi.branch) {
      recommendationKeys.push('love', 'meeting', 'reconciliation');
    }

    // 충
    if (CHUNG[dayBranch] === ganzhi.branch) {
      warningKeys.push('avoidTravel', 'conflict', 'accident', 'avoidChange');
      recommendationKeys.push('careful', 'postpone');
    }

    // 형
    if (XING[dayBranch]?.includes(ganzhi.branch)) {
      warningKeys.push('legal', 'injury');
    }

    // 해
    const HAI_MAP: Record<string, string> = {
      子: '未',
      未: '子',
      丑: '午',
      午: '丑',
      寅: '巳',
      巳: '寅',
      卯: '辰',
      辰: '卯',
      申: '亥',
      亥: '申',
      酉: '戌',
      戌: '酉',
    };
    if (HAI_MAP[dayBranch] === ganzhi.branch) {
      warningKeys.push('betrayal', 'misunderstanding');
    }
  }

  // 역행 행성 경고
  if (retrogradePlanets.includes('mercury')) {
    warningKeys.push('mercuryRetrograde');
  }
  if (retrogradePlanets.includes('venus')) {
    warningKeys.push('venusRetrograde');
  }
  if (retrogradePlanets.includes('mars')) {
    warningKeys.push('marsRetrograde');
  }

  // 행성 시간 추천
  if (planetaryHourDayRuler === 'Jupiter') {
    recommendationKeys.push('expansion', 'luck');
  } else if (planetaryHourDayRuler === 'Venus') {
    recommendationKeys.push('love', 'beauty');
  }

  return { recommendationKeys, warningKeys };
}
