/**
 * 사주(四柱) 분석 헬퍼 함수들
 * date-analysis-orchestrator.ts에서 분리된 사주 관련 분석 로직
 */

import type { UserSajuProfile } from './types';
import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';
import {
  analyzeMultiLayer,
  calculatePreciseTwelveStage,
  calculateYearlyGanji,
  calculateMonthlyGanji as advancedMonthlyGanji,
} from '@/lib/prediction/advancedTimingEngine';
import {
  calculateDaeunScore,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
  analyzeYongsin,
  analyzeGeokguk,
  analyzeSolarReturn,
  analyzeProgressions,
  getGanzhiForDate,
} from './temporal-scoring';
import {
  JIJANGGAN,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
  STEM_TO_ELEMENT,
} from './constants';
import { getSipsin } from './utils';

// ============================================================
// Types
// ============================================================

export interface SajuAnalysisResult {
  daeunAnalysis: ReturnType<typeof calculateDaeunScore>;
  seunAnalysis: ReturnType<typeof calculateSeunScore>;
  wolunAnalysis: ReturnType<typeof calculateWolunScore>;
  iljinAnalysis: ReturnType<typeof calculateIljinScore>;
  yongsinAnalysis: ReturnType<typeof analyzeYongsin>;
  geokgukAnalysis: ReturnType<typeof analyzeGeokguk>;
  solarReturnAnalysis: ReturnType<typeof analyzeSolarReturn>;
  progressionAnalysis: ReturnType<typeof analyzeProgressions>;
  advancedMultiLayerScore: number;
  advancedBranchInteractions: BranchInteraction[];
}

export interface SipsinResult {
  sipsin: string | null;
  factorKey: string | null;
  category?: string;
  recommendations?: string[];
  warnings?: string[];
}

export interface JijangganResult {
  factorKeys: string[];
  mainHiddenStem?: string;
  mainHiddenElement?: string;
}

export interface BranchRelationsResult {
  factorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
  categories: string[];
  titleKey?: string;
  descKey?: string;
}

// ============================================================
// 사주 종합 분석
// ============================================================

/**
 * 사주 분석 수행 (대운/세운/월운/일진/용신/격국)
 */
export function analyzeSajuFactors(
  sajuProfile: UserSajuProfile,
  date: Date,
  ganzhi: ReturnType<typeof getGanzhiForDate>
): SajuAnalysisResult {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const dayMasterElement = sajuProfile.dayMasterElement;
  const dayBranch = sajuProfile.dayBranch;
  const dayMasterStem = sajuProfile.dayMaster;

  // 용신(用神) 분석
  const yongsinAnalysis = analyzeYongsin(sajuProfile.yongsin, ganzhi, date);

  // 격국(格局) 분석
  const geokgukAnalysis = analyzeGeokguk(sajuProfile.geokguk, ganzhi, sajuProfile.pillars);

  // Solar Return (태양회귀) 분석 - astroProfile에서 가져옴
  const solarReturnAnalysis = analyzeSolarReturn(date, undefined, undefined);

  // Progressions (이차진행) 분석
  const progressionAnalysis = analyzeProgressions(date, sajuProfile.birthYear, undefined, dayMasterElement);

  // 대운(大運) 분석
  const daeunAnalysis = calculateDaeunScore(
    dayMasterElement,
    dayBranch,
    sajuProfile.daeunCycles,
    sajuProfile.birthYear,
    year
  );

  // 세운(歲運) 분석
  const seunAnalysis = calculateSeunScore(dayMasterElement, dayBranch, year);

  // 월운(月運) 분석
  const wolunAnalysis = calculateWolunScore(dayMasterElement, dayBranch, year, month);

  // 일진(日辰) 분석
  const iljinAnalysis = calculateIljinScore(dayMasterElement, dayMasterStem, dayBranch, ganzhi);

  // 다층 레이어 분석
  const { advancedMultiLayerScore, advancedBranchInteractions } = analyzeMultiLayerFactors(
    sajuProfile,
    year,
    month,
    dayMasterStem,
    dayBranch
  );

  return {
    daeunAnalysis,
    seunAnalysis,
    wolunAnalysis,
    iljinAnalysis,
    yongsinAnalysis,
    geokgukAnalysis,
    solarReturnAnalysis,
    progressionAnalysis,
    advancedMultiLayerScore,
    advancedBranchInteractions,
  };
}

/**
 * 다층 레이어 분석 (대운+세운+월운 상호작용)
 */
function analyzeMultiLayerFactors(
  sajuProfile: UserSajuProfile,
  year: number,
  month: number,
  dayMasterStem?: string,
  dayBranch?: string
): { advancedMultiLayerScore: number; advancedBranchInteractions: BranchInteraction[] } {
  let advancedMultiLayerScore = 0;
  let advancedBranchInteractions: BranchInteraction[] = [];

  if (!dayMasterStem || !dayBranch) {
    return { advancedMultiLayerScore, advancedBranchInteractions };
  }

  try {
    // 세운/월운 간지 계산
    const advSaeun = calculateYearlyGanji(year);
    const advWolun = advancedMonthlyGanji(year, month);

    // 대운 정보
    let daeunInfo: { stem: string; branch: string } | undefined;
    if (sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0 && sajuProfile.birthYear) {
      const currentAge = year - sajuProfile.birthYear;
      const sortedDaeuns = [...sajuProfile.daeunCycles].sort((a, b) => a.age - b.age);
      const currentDaeun = sortedDaeuns.find((d, idx) => {
        const nextDaeun = sortedDaeuns[idx + 1];
        if (nextDaeun) {
          return currentAge >= d.age && currentAge < nextDaeun.age;
        }
        return currentAge >= d.age;
      });
      if (currentDaeun && currentDaeun.heavenlyStem && currentDaeun.earthlyBranch) {
        daeunInfo = { stem: currentDaeun.heavenlyStem, branch: currentDaeun.earthlyBranch };
      }
    }

    // 다층 레이어 분석
    const multiLayerResult = analyzeMultiLayer({
      dayStem: dayMasterStem,
      dayBranch: dayBranch,
      daeun: daeunInfo,
      saeun: advSaeun,
      wolun: advWolun,
    });

    // 레이어 상호작용 점수 합산
    for (const interaction of multiLayerResult.interactions) {
      advancedMultiLayerScore += interaction.scoreModifier * 0.3;
    }

    // 지지 상호작용 분석
    advancedBranchInteractions = multiLayerResult.branchInteractions;
    for (const bInter of advancedBranchInteractions) {
      advancedMultiLayerScore += bInter.score * 0.25;
    }

    // 정밀 12운성 분석
    const preciseStage = calculatePreciseTwelveStage(dayMasterStem, advWolun.branch);

    // 12운성 에너지 단계에 따른 보너스/페널티
    if (preciseStage.energy === 'peak') {
      advancedMultiLayerScore += 8;
    } else if (preciseStage.energy === 'rising') {
      advancedMultiLayerScore += 4;
    } else if (preciseStage.energy === 'declining') {
      advancedMultiLayerScore -= 2;
    } else if (preciseStage.energy === 'dormant') {
      advancedMultiLayerScore -= 5;
    }
  } catch {
    advancedMultiLayerScore = 0;
  }

  return { advancedMultiLayerScore, advancedBranchInteractions };
}

// ============================================================
// 십신 분석
// ============================================================

/**
 * 십신(十神) 분석
 */
export function analyzeSipsin(
  dayMasterStem: string | undefined,
  ganzhi: { stem: string; branch: string }
): SipsinResult {
  if (!dayMasterStem) {
    return { sipsin: null, factorKey: null };
  }

  const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);
  if (!daySipsin) {
    return { sipsin: null, factorKey: null };
  }

  const result: SipsinResult = {
    sipsin: daySipsin,
    factorKey: `sipsin_${daySipsin}`,
  };

  switch (daySipsin) {
    case "정재":
      result.category = "wealth";
      result.recommendations = ["stableWealth", "savings"];
      break;
    case "편재":
      result.category = "wealth";
      result.recommendations = ["speculation", "windfall"];
      result.warnings = ["riskManagement"];
      break;
    case "정인":
      result.category = "study";
      result.recommendations = ["learning", "certification", "mother"];
      break;
    case "편인":
      result.category = "study";
      result.recommendations = ["spirituality", "unique"];
      break;
    case "겁재":
      result.warnings = ["rivalry", "loss"];
      break;
  }

  return result;
}

// ============================================================
// 지장간 분석
// ============================================================

/**
 * 지장간(支藏干) 분석 - 숨은 기운
 */
export function analyzeJijanggan(
  ganzhi: { stem: string; branch: string },
  relations: { generatedBy: string; controlledBy: string } | undefined
): JijangganResult {
  const factorKeys: string[] = [];

  const hiddenStems = JIJANGGAN[ganzhi.branch];
  if (!hiddenStems || !relations) {
    return { factorKeys };
  }

  const mainHiddenStem = hiddenStems.정기;
  const mainHiddenElement = STEM_TO_ELEMENT[mainHiddenStem];

  // 지장간 정기가 일간을 생해주면 좋음
  if (mainHiddenElement && relations.generatedBy === mainHiddenElement) {
    factorKeys.push("hiddenStemSupport");
  }
  // 지장간 정기가 일간을 극하면 주의
  if (mainHiddenElement && relations.controlledBy === mainHiddenElement) {
    factorKeys.push("hiddenStemConflict");
  }

  return {
    factorKeys,
    mainHiddenStem,
    mainHiddenElement,
  };
}

// ============================================================
// 지지 관계 분석 (삼합, 육합, 충, 형, 해)
// ============================================================

/**
 * 지지 관계 분석 (삼합, 육합, 충, 형, 해)
 */
export function analyzeBranchRelations(
  dayBranch: string | undefined,
  ganzhi: { stem: string; branch: string },
  dayMasterElement: string,
  relations: { generatedBy: string; controlledBy: string } | undefined
): BranchRelationsResult {
  const factorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  const categories: string[] = [];
  let titleKey: string | undefined;
  let descKey: string | undefined;

  if (!dayBranch || !relations) {
    return { factorKeys, recommendationKeys, warningKeys, categories };
  }

  // 삼합 체크
  for (const [element, branches] of Object.entries(SAMHAP)) {
    if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
      if (element === dayMasterElement || element === relations.generatedBy) {
        factorKeys.push("branchSamhap");
        if (!titleKey) {
          titleKey = "calendar.samhap";
          descKey = "calendar.samhapDesc";
        }
        recommendationKeys.push("bigDecision", "contract", "partnership");
        if (!categories.includes("general")) {categories.push("general");}
      } else if (element === relations.controlledBy) {
        factorKeys.push("branchSamhapNegative");
        warningKeys.push("opposition");
      }
    }
  }

  // 육합 체크
  if (YUKHAP[dayBranch] === ganzhi.branch) {
    factorKeys.push("branchYukhap");
    if (!titleKey) {
      titleKey = "calendar.yukhap";
      descKey = "calendar.yukhapDesc";
    }
    categories.push("love");
    recommendationKeys.push("love", "meeting", "reconciliation");
  }

  // 충 체크
  if (CHUNG[dayBranch] === ganzhi.branch) {
    categories.push("travel", "health");
    titleKey = "calendar.chung";
    descKey = "calendar.chungDesc";
    factorKeys.push("branchChung");
    warningKeys.push("avoidTravel", "conflict", "accident", "avoidChange");
    recommendationKeys.push("careful", "postpone");
  }

  // 형 체크
  if (XING[dayBranch]?.includes(ganzhi.branch)) {
    factorKeys.push("branchXing");
    warningKeys.push("legal", "injury");
  }

  // 해 체크
  const HAI_MAP: Record<string, string> = {
    "子": "未", "未": "子", "丑": "午", "午": "丑",
    "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
    "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
  };
  if (HAI_MAP[dayBranch] === ganzhi.branch) {
    factorKeys.push("branchHai");
    warningKeys.push("betrayal", "misunderstanding");
  }

  return {
    factorKeys,
    recommendationKeys,
    warningKeys,
    categories,
    titleKey,
    descKey,
  };
}
