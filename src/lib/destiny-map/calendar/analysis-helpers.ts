/**
 * Analysis Helpers - analyzeDate() 함수에서 분리된 헬퍼 함수들
 * 코드 가독성과 유지보수성을 위해 분리
 */

import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';
import type { LegacyBranchInteraction } from './scoring-adapter';
import type { EventCategory } from './types';
import {
  ELEMENT_RELATIONS,
  JIJANGGAN,
  STEM_TO_ELEMENT,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
} from './constants';
import { getSipsin, isDohwaDay } from './utils';

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export interface FactorKeysResult {
  sajuFactorKeys: string[];
  astroFactorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
  categories: EventCategory[];
  titleKey: string;
  descKey: string;
}

export interface SpecialDayFlags {
  hasCheoneulGwiin: boolean;
  hasGeonrok: boolean;
  hasSonEomneun: boolean;
  hasYeokma: boolean;
  hasDohwa: boolean;
  isSamjaeYear: boolean;
}

export interface ShinsalInfo {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  affectedArea: string;
}

// ═══════════════════════════════════════════════════════════
// 지지 상호작용 변환
// ═══════════════════════════════════════════════════════════

export function convertBranchInteractions(
  advancedBranchInteractions: BranchInteraction[]
): LegacyBranchInteraction[] {
  return advancedBranchInteractions.map((bi: BranchInteraction) => ({
    type: bi.type,
    impact: (bi.impact === 'transformative' ? 'neutral' : bi.impact) as 'positive' | 'negative' | 'neutral',
    element: bi.result || undefined, // BranchInteraction의 result를 element로 변환
  }));
}

// ═══════════════════════════════════════════════════════════
// 고급 지지 상호작용 결과 반영
// ═══════════════════════════════════════════════════════════

export function extractBranchInteractionFactors(
  advancedBranchInteractions: BranchInteraction[]
): { sajuFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[] } {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  for (const bInter of advancedBranchInteractions) {
    if (bInter.impact === 'positive') {
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '육합') {
        recommendationKeys.push("partnership", "harmony");
      } else if (bInter.type === '삼합') {
        recommendationKeys.push("collaboration", "synergy");
      } else if (bInter.type === '방합') {
        recommendationKeys.push("expansion", "growth");
      }
    } else if (bInter.impact === 'negative') {
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '충') {
        warningKeys.push("conflict", "change");
      } else if (bInter.type === '형') {
        warningKeys.push("tension", "challenge");
      }
    }
  }

  return { sajuFactorKeys, recommendationKeys, warningKeys };
}

// ═══════════════════════════════════════════════════════════
// 특수일 팩터 추출 (천을귀인, 손없는날, 건록, 삼재, 역마, 도화)
// ═══════════════════════════════════════════════════════════

export function extractSpecialDayFactors(
  flags: SpecialDayFlags,
  yearBranch: string | undefined,
  ganzhiBranch: string
): { sajuFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[]; categories: EventCategory[]; titleKey: string; descKey: string } {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";

  // 천을귀인(天乙貴人) 체크
  if (flags.hasCheoneulGwiin) {
    sajuFactorKeys.push("cheoneulGwiin");
    recommendationKeys.push("majorDecision", "contract", "meeting");
    titleKey = "calendar.cheoneulGwiin";
    descKey = "calendar.cheoneulGwiinDesc";
  }

  // 손없는 날 (擇日)
  if (flags.hasSonEomneun) {
    sajuFactorKeys.push("sonEomneunDay");
    recommendationKeys.push("moving", "wedding", "business");
    if (!categories.includes("general")) {categories.push("general");}
  }

  // 건록(建祿) 체크
  if (flags.hasGeonrok) {
    sajuFactorKeys.push("geonrokDay");
    recommendationKeys.push("career", "authority", "promotion");
    if (!categories.includes("career")) {categories.push("career");}
  }

  // 삼재(三災) 체크
  if (flags.isSamjaeYear) {
    sajuFactorKeys.push("samjaeYear");
    warningKeys.push("samjae", "caution");
  }

  // 역마살(驛馬殺) 체크
  if (flags.hasYeokma) {
    sajuFactorKeys.push("yeokmaDay");
    recommendationKeys.push("travel", "change", "interview");
    warningKeys.push("instability");
    if (!categories.includes("travel")) {categories.push("travel");}
  }

  // 도화살(桃花殺) 체크
  if (yearBranch && isDohwaDay(yearBranch, ganzhiBranch)) {
    sajuFactorKeys.push("dohwaDay");
    recommendationKeys.push("dating", "socializing", "charm");
    if (!categories.includes("love")) {categories.push("love");}
  }

  return { sajuFactorKeys, recommendationKeys, warningKeys, categories, titleKey, descKey };
}

// ═══════════════════════════════════════════════════════════
// 신살 분석 결과 추출
// ═══════════════════════════════════════════════════════════

export function extractShinsalFactors(
  shinsalActive: ShinsalInfo[] | undefined
): { sajuFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[] } {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  if (!shinsalActive) {return { sajuFactorKeys, recommendationKeys, warningKeys };}

  for (const shinsal of shinsalActive) {
    const name = shinsal.name;
    // 길신
    if (name === '태극귀인') {
      sajuFactorKeys.push("shinsal_taegukGwiin");
      recommendationKeys.push("majorLuck", "blessing");
    } else if (name === '천덕귀인' || name === '천덕') {
      sajuFactorKeys.push("shinsal_cheondeokGwiin");
      recommendationKeys.push("heavenlyHelp", "protection");
    } else if (name === '월덕귀인' || name === '월덕') {
      sajuFactorKeys.push("shinsal_woldeokGwiin");
      recommendationKeys.push("lunarBlessing", "assistance");
    } else if (name === '화개') {
      sajuFactorKeys.push("shinsal_hwagae");
      recommendationKeys.push("creativity", "spiritual");
    }
    // 흉신
    else if (name === '공망') {
      sajuFactorKeys.push("shinsal_gongmang");
      warningKeys.push("emptiness", "voidDay");
    } else if (name === '원진') {
      sajuFactorKeys.push("shinsal_wonjin");
      warningKeys.push("resentment", "conflict");
    } else if (name === '양인') {
      sajuFactorKeys.push("shinsal_yangin");
      warningKeys.push("danger", "impulsiveness");
    } else if (name === '괴강') {
      sajuFactorKeys.push("shinsal_goegang");
      warningKeys.push("extremes", "intensity");
    } else if (name === '백호') {
      sajuFactorKeys.push("shinsal_backho");
      warningKeys.push("accident", "surgery");
    } else if (name === '귀문관') {
      sajuFactorKeys.push("shinsal_guimungwan");
      warningKeys.push("mentalConfusion", "anxiety");
    }
    // 특수 신살
    else if (name === '역마') {
      sajuFactorKeys.push("shinsal_yeokma");
      recommendationKeys.push("travel", "movement");
    } else if (name === '재살') {
      sajuFactorKeys.push("shinsal_jaesal");
      warningKeys.push("dispute", "legalIssue");
    }
  }

  return { sajuFactorKeys, recommendationKeys, warningKeys };
}

// ═══════════════════════════════════════════════════════════
// 십신(十神) 분석
// ═══════════════════════════════════════════════════════════

export function extractSipsinFactors(
  dayMasterStem: string | undefined,
  ganzhiStem: string
): { sajuFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[]; categories: EventCategory[] } {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  const categories: EventCategory[] = [];

  if (!dayMasterStem) {return { sajuFactorKeys, recommendationKeys, warningKeys, categories };}

  const daySipsin = getSipsin(dayMasterStem, ganzhiStem);
  if (!daySipsin) {return { sajuFactorKeys, recommendationKeys, warningKeys, categories };}

  sajuFactorKeys.push(`sipsin_${daySipsin}`);

  switch (daySipsin) {
    case "정재":
      categories.push("wealth");
      recommendationKeys.push("stableWealth", "savings");
      break;
    case "편재":
      categories.push("wealth");
      recommendationKeys.push("speculation", "windfall");
      warningKeys.push("riskManagement");
      break;
    case "정인":
      categories.push("study");
      recommendationKeys.push("learning", "certification", "mother");
      break;
    case "편인":
      categories.push("study");
      recommendationKeys.push("spirituality", "unique");
      break;
    case "겁재":
      warningKeys.push("rivalry", "loss");
      break;
  }

  return { sajuFactorKeys, recommendationKeys, warningKeys, categories };
}

// ═══════════════════════════════════════════════════════════
// 지장간(支藏干) 분석
// ═══════════════════════════════════════════════════════════

export function extractHiddenStemFactors(
  ganzhiBranch: string,
  relations: { generatedBy: string; controlledBy: string } | undefined
): string[] {
  const sajuFactorKeys: string[] = [];

  if (!relations) {return sajuFactorKeys;}

  const hiddenStems = JIJANGGAN[ganzhiBranch];
  if (!hiddenStems) {return sajuFactorKeys;}

  const mainHiddenStem = hiddenStems.정기;
  const mainHiddenElement = STEM_TO_ELEMENT[mainHiddenStem];

  if (mainHiddenElement && relations.generatedBy === mainHiddenElement) {
    sajuFactorKeys.push("hiddenStemSupport");
  }
  if (mainHiddenElement && relations.controlledBy === mainHiddenElement) {
    sajuFactorKeys.push("hiddenStemConflict");
  }

  return sajuFactorKeys;
}

// ═══════════════════════════════════════════════════════════
// 천간 관계에 따른 카테고리 설정
// ═══════════════════════════════════════════════════════════

export function extractStemRelationFactors(
  ganzhiStemElement: string,
  dayMasterElement: string,
  relations: { generatedBy: string; controls: string; generates: string; controlledBy: string }
): { sajuFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[]; categories: EventCategory[]; titleKey: string; descKey: string } {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";

  if (ganzhiStemElement === dayMasterElement) {
    // 비견
    categories.push("career");
    titleKey = "calendar.bijeon";
    descKey = "calendar.bijeonDesc";
    sajuFactorKeys.push("stemBijeon");
    recommendationKeys.push("business", "networking");
    warningKeys.push("competition");
  } else if (ganzhiStemElement === relations.generatedBy) {
    // 인성
    categories.push("study", "career");
    titleKey = "calendar.inseong";
    descKey = "calendar.inseongDesc";
    sajuFactorKeys.push("stemInseong");
    recommendationKeys.push("study", "mentor", "documents");
  } else if (ganzhiStemElement === relations.controls) {
    // 재성
    categories.push("wealth", "love");
    titleKey = "calendar.jaeseong";
    descKey = "calendar.jaeseongDesc";
    sajuFactorKeys.push("stemJaeseong");
    recommendationKeys.push("finance", "investment", "shopping");
  } else if (ganzhiStemElement === relations.generates) {
    // 식상
    categories.push("love", "career");
    titleKey = "calendar.siksang";
    descKey = "calendar.siksangDesc";
    sajuFactorKeys.push("stemSiksang");
    recommendationKeys.push("love", "creative", "expression");
  } else if (ganzhiStemElement === relations.controlledBy) {
    // 관살
    categories.push("health", "career");
    titleKey = "calendar.gwansal";
    descKey = "calendar.gwansalDesc";
    sajuFactorKeys.push("stemGwansal");
    warningKeys.push("conflict", "health", "avoidAuthority");
    recommendationKeys.push("careful", "lowProfile");
  }

  return { sajuFactorKeys, recommendationKeys, warningKeys, categories, titleKey, descKey };
}

// ═══════════════════════════════════════════════════════════
// 지지 관계 (삼합, 육합, 충, 형, 해)
// ═══════════════════════════════════════════════════════════

export function extractBranchRelationFactors(
  dayBranch: string | undefined,
  ganzhiBranch: string,
  dayMasterElement: string,
  relations: { generatedBy: string; controlledBy: string }
): { sajuFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[]; categories: EventCategory[]; titleKey: string; descKey: string } {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";

  if (!dayBranch) {return { sajuFactorKeys, recommendationKeys, warningKeys, categories, titleKey, descKey };}

  // 삼합 체크
  for (const [element, branches] of Object.entries(SAMHAP)) {
    if (branches.includes(dayBranch) && branches.includes(ganzhiBranch)) {
      if (element === dayMasterElement || element === relations.generatedBy) {
        sajuFactorKeys.push("branchSamhap");
        if (!titleKey) {
          titleKey = "calendar.samhap";
          descKey = "calendar.samhapDesc";
        }
        recommendationKeys.push("bigDecision", "contract", "partnership");
        if (!categories.includes("general")) {categories.push("general");}
      } else if (element === relations.controlledBy) {
        sajuFactorKeys.push("branchSamhapNegative");
        warningKeys.push("opposition");
      }
    }
  }

  // 육합 체크
  if (YUKHAP[dayBranch] === ganzhiBranch) {
    sajuFactorKeys.push("branchYukhap");
    if (!titleKey) {
      titleKey = "calendar.yukhap";
      descKey = "calendar.yukhapDesc";
    }
    categories.push("love");
    recommendationKeys.push("love", "meeting", "reconciliation");
  }

  // 충 체크
  if (CHUNG[dayBranch] === ganzhiBranch) {
    categories.push("travel", "health");
    titleKey = "calendar.chung";
    descKey = "calendar.chungDesc";
    sajuFactorKeys.push("branchChung");
    warningKeys.push("avoidTravel", "conflict", "accident", "avoidChange");
    recommendationKeys.push("careful", "postpone");
  }

  // 형 (刑) 체크
  if (XING[dayBranch]?.includes(ganzhiBranch)) {
    sajuFactorKeys.push("branchXing");
    warningKeys.push("legal", "injury");
  }

  // 해 (害) 체크
  const HAI_MAP: Record<string, string> = {
    "子": "未", "未": "子", "丑": "午", "午": "丑",
    "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
    "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
  };
  if (HAI_MAP[dayBranch] === ganzhiBranch) {
    sajuFactorKeys.push("branchHai");
    warningKeys.push("betrayal", "misunderstanding");
  }

  return { sajuFactorKeys, recommendationKeys, warningKeys, categories, titleKey, descKey };
}

// ═══════════════════════════════════════════════════════════
// 점성술 요소 분석
// ═══════════════════════════════════════════════════════════

export function extractAstroElementFactors(
  transitSunElement: string,
  natalSunElement: string
): { astroFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[] } {
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  if (transitSunElement === natalSunElement) {
    astroFactorKeys.push("sameElement");
    recommendationKeys.push("confidence", "selfExpression");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === transitSunElement) {
    astroFactorKeys.push("supportElement");
    recommendationKeys.push("learning", "receiving");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generates === transitSunElement) {
    astroFactorKeys.push("givingElement");
    recommendationKeys.push("giving", "teaching");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === transitSunElement) {
    astroFactorKeys.push("conflictElement");
    warningKeys.push("stress", "opposition");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === transitSunElement) {
    astroFactorKeys.push("controlElement");
    recommendationKeys.push("achievement", "discipline");
  }

  return { astroFactorKeys, recommendationKeys, warningKeys };
}

// ═══════════════════════════════════════════════════════════
// 달 위상 분석
// ═══════════════════════════════════════════════════════════

export function extractLunarPhaseFactors(
  phaseName: string
): { astroFactorKeys: string[]; recommendationKeys: string[]; warningKeys: string[] } {
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  if (phaseName === "newMoon") {
    astroFactorKeys.push("lunarNewMoon");
    recommendationKeys.push("newBeginning", "planning");
  } else if (phaseName === "fullMoon") {
    astroFactorKeys.push("lunarFullMoon");
    recommendationKeys.push("completion", "celebration");
  } else if (phaseName === "firstQuarter") {
    astroFactorKeys.push("lunarFirstQuarter");
    warningKeys.push("tension", "challenge");
  } else if (phaseName === "lastQuarter") {
    astroFactorKeys.push("lunarLastQuarter");
    recommendationKeys.push("reflection", "release");
  }

  return { astroFactorKeys, recommendationKeys, warningKeys };
}

// ═══════════════════════════════════════════════════════════
// 역행 행성 분석
// ═══════════════════════════════════════════════════════════

export function extractRetrogradeFactors(
  retrogradePlanets: string[]
): { astroFactorKeys: string[]; warningKeys: string[]; removeRecs: string[] } {
  const astroFactorKeys: string[] = [];
  const warningKeys: string[] = [];
  let removeRecs: string[] = [];

  if (retrogradePlanets.length === 0) {return { astroFactorKeys, warningKeys, removeRecs };}

  for (const planet of retrogradePlanets) {
    astroFactorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
  }

  if (retrogradePlanets.includes("mercury")) {
    warningKeys.push("mercuryRetrograde");
    removeRecs = [...removeRecs, "contract", "documents", "interview"];
  }
  if (retrogradePlanets.includes("venus")) {
    warningKeys.push("venusRetrograde");
    removeRecs = [...removeRecs, "dating", "love", "finance", "investment", "shopping"];
  }
  if (retrogradePlanets.includes("mars")) {
    warningKeys.push("marsRetrograde");
  }

  return { astroFactorKeys, warningKeys, removeRecs };
}

// ═══════════════════════════════════════════════════════════
// 배열에서 특정 항목 제거 유틸리티
// ═══════════════════════════════════════════════════════════

export function removeFromArray(arr: string[], toRemove: string[]): void {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (toRemove.includes(arr[i])) {
      arr.splice(i, 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 신뢰도 계산
// ═══════════════════════════════════════════════════════════

export function calculateConfidence(
  hasPillarsTime: boolean,
  hasDaeunCycles: boolean,
  hasYongsin: boolean,
  crossVerified: boolean
): { confidence: number; confidenceNote: string } {
  let confidenceBase = 60;
  const confidenceNotes: string[] = [];

  if (hasPillarsTime) {
    confidenceBase += 15;
  } else {
    confidenceNotes.push('시주 없음');
  }
  if (hasDaeunCycles) {
    confidenceBase += 10;
  } else {
    confidenceNotes.push('대운 정보 없음');
  }
  if (hasYongsin) {
    confidenceBase += 10;
  } else {
    confidenceNotes.push('용신 정보 없음');
  }
  if (crossVerified) {
    confidenceBase += 5;
  }

  const confidence = Math.min(confidenceBase, 100);
  const confidenceNote = confidenceNotes.length > 0
    ? `제한: ${confidenceNotes.join(', ')}`
    : '완전한 분석';

  return { confidence, confidenceNote };
}

// ═══════════════════════════════════════════════════════════
// 시간 맥락 분석
// ═══════════════════════════════════════════════════════════

export interface TimeContext {
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
  daysFromToday: number;
  retrospectiveNote?: string;
}

export function calculateTimeContext(
  date: Date,
  grade: number,
  gongmangIsEmpty: boolean,
  shinsalHasLucky: boolean,
  transitSyncInfo: { isMajorTransitYear: boolean; transitType?: string }
): TimeContext {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromToday = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  const isPast = daysFromToday < 0;
  const isFuture = daysFromToday > 0;
  const isToday = daysFromToday === 0;

  let retrospectiveNote: string | undefined;
  if (isPast) {
    if (grade <= 1) {
      retrospectiveNote = '이 날은 매우 좋은 기운이 있었습니다. 주요 성과나 좋은 일이 있었을 가능성이 높습니다.';
    } else if (grade >= 4) {
      retrospectiveNote = '이 날은 도전적인 기운이 있었습니다. 어려움이나 장애물이 있었을 수 있습니다.';
    } else if (gongmangIsEmpty) {
      retrospectiveNote = '공망이 활성화된 날이었습니다. 계획했던 일이 예상대로 진행되지 않았을 수 있습니다.';
    } else if (shinsalHasLucky) {
      retrospectiveNote = '길신이 활성화된 날이었습니다. 예상치 못한 도움이나 행운이 있었을 수 있습니다.';
    } else if (transitSyncInfo.isMajorTransitYear) {
      retrospectiveNote = `${transitSyncInfo.transitType} 주기의 해였습니다. 인생의 중요한 전환점이었을 수 있습니다.`;
    }
  }

  return { isPast, isFuture, isToday, daysFromToday, retrospectiveNote };
}