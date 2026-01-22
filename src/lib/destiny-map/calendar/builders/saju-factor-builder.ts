/**
 * Saju Factor Builder - 사주 요소 키 생성 모듈
 *
 * 사주 분석 결과를 factorKeys로 변환합니다.
 */

import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';
import { JIJANGGAN, STEM_TO_ELEMENT, SAMHAP, YUKHAP, CHUNG, XING } from '../constants';
import { getSipsin } from '../utils';

export interface SajuFactorBuilderInput {
  ganzhi: { stem: string; branch: string };
  dayMasterStem: string;
  dayBranch: string;
  dayMasterElement: string;
  relations: {
    generates: string;
    generatedBy: string;
    controls: string;
    controlledBy: string;
  };
  specialFlags: {
    hasCheoneulGwiin: boolean;
    hasSonEomneun: boolean;
    hasGeonrok: boolean;
    isSamjaeYear: boolean;
    hasYeokma: boolean;
    hasDohwa: boolean;
  };
  branchInteractions: BranchInteraction[];
  shinsalActive?: Array<{ name: string; type: string }>;
  daeunFactorKeys: string[];
  seunFactorKeys: string[];
  wolunFactorKeys: string[];
  iljinFactorKeys: string[];
  yongsinFactorKeys: string[];
  geokgukFactorKeys: string[];
}

export interface SajuFactorBuilderResult {
  factorKeys: string[];
}

/**
 * 사주 요소 키 생성
 */
export function buildSajuFactorKeys(input: SajuFactorBuilderInput): SajuFactorBuilderResult {
  const {
    ganzhi,
    dayMasterStem,
    dayBranch,
    dayMasterElement,
    relations,
    specialFlags,
    branchInteractions,
    shinsalActive,
    daeunFactorKeys,
    seunFactorKeys,
    wolunFactorKeys,
    iljinFactorKeys,
    yongsinFactorKeys,
    geokgukFactorKeys,
  } = input;

  const factorKeys: string[] = [];

  // 고급 지지 상호작용
  for (const bInter of branchInteractions) {
    factorKeys.push(`advanced_${bInter.type}`);
  }

  // 특수 날짜들
  if (specialFlags.hasCheoneulGwiin) {
    factorKeys.push('cheoneulGwiin');
  }
  if (specialFlags.hasSonEomneun) {
    factorKeys.push('sonEomneunDay');
  }
  if (specialFlags.hasGeonrok) {
    factorKeys.push('geonrokDay');
  }
  if (specialFlags.isSamjaeYear) {
    factorKeys.push('samjaeYear');
  }
  if (specialFlags.hasYeokma) {
    factorKeys.push('yeokmaDay');
  }
  if (specialFlags.hasDohwa) {
    factorKeys.push('dohwaDay');
  }

  // 신살 분석
  if (shinsalActive) {
    for (const shinsal of shinsalActive) {
      const name = shinsal.name;
      if (name === '태극귀인') factorKeys.push('shinsal_taegukGwiin');
      else if (name === '천덕귀인' || name === '천덕') factorKeys.push('shinsal_cheondeokGwiin');
      else if (name === '월덕귀인' || name === '월덕') factorKeys.push('shinsal_woldeokGwiin');
      else if (name === '화개') factorKeys.push('shinsal_hwagae');
      else if (name === '공망') factorKeys.push('shinsal_gongmang');
      else if (name === '원진') factorKeys.push('shinsal_wonjin');
      else if (name === '양인') factorKeys.push('shinsal_yangin');
      else if (name === '괴강') factorKeys.push('shinsal_goegang');
      else if (name === '백호') factorKeys.push('shinsal_backho');
      else if (name === '귀문관') factorKeys.push('shinsal_guimungwan');
      else if (name === '역마') factorKeys.push('shinsal_yeokma');
      else if (name === '재살') factorKeys.push('shinsal_jaesal');
    }
  }

  // 십신 분석
  if (dayMasterStem) {
    const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);
    if (daySipsin) {
      factorKeys.push(`sipsin_${daySipsin}`);
    }
  }

  // 지장간 분석
  const hiddenStems = JIJANGGAN[ganzhi.branch];
  if (hiddenStems) {
    const mainHiddenStem = hiddenStems.정기;
    const mainHiddenElement = STEM_TO_ELEMENT[mainHiddenStem];

    if (mainHiddenElement && relations.generatedBy === mainHiddenElement) {
      factorKeys.push('hiddenStemSupport');
    }
    if (mainHiddenElement && relations.controlledBy === mainHiddenElement) {
      factorKeys.push('hiddenStemConflict');
    }
  }

  // 천간 관계
  if (ganzhi.stem === dayMasterElement) {
    factorKeys.push('stemBijeon');
  } else if (ganzhi.stem === relations.generatedBy) {
    factorKeys.push('stemInseong');
  } else if (ganzhi.stem === relations.controls) {
    factorKeys.push('stemJaeseong');
  } else if (ganzhi.stem === relations.generates) {
    factorKeys.push('stemSiksang');
  } else if (ganzhi.stem === relations.controlledBy) {
    factorKeys.push('stemGwansal');
  }

  // 지지 관계
  if (dayBranch) {
    // 삼합
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          factorKeys.push('branchSamhap');
        } else if (element === relations.controlledBy) {
          factorKeys.push('branchSamhapNegative');
        }
      }
    }

    // 육합
    if (YUKHAP[dayBranch] === ganzhi.branch) {
      factorKeys.push('branchYukhap');
    }

    // 충
    if (CHUNG[dayBranch] === ganzhi.branch) {
      factorKeys.push('branchChung');
    }

    // 형
    if (XING[dayBranch]?.includes(ganzhi.branch)) {
      factorKeys.push('branchXing');
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
      factorKeys.push('branchHai');
    }
  }

  // 시간별 분석 결과 추가
  factorKeys.push(...daeunFactorKeys);
  factorKeys.push(...seunFactorKeys);
  factorKeys.push(...wolunFactorKeys);
  factorKeys.push(...iljinFactorKeys);
  factorKeys.push(...yongsinFactorKeys);
  factorKeys.push(...geokgukFactorKeys);

  return { factorKeys };
}
