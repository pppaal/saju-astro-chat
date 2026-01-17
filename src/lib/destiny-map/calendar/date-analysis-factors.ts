/**
 * 요소 키 생성 로직
 * date-analysis-orchestrator.ts에서 분리된 factor/recommendation/warning 키 생성 로직
 */

import type { EventCategory } from './types';
import {
  approximateLunarDay,
  isCheoneulGwiin,
  isDohwaDay,
  isGeonrokDay,
  isSamjaeYear,
  isSonEomneunDay,
  isYeokmaDay,
} from './utils';
import { getYearGanzhi } from './temporal-scoring';
import { ELEMENT_RELATIONS } from './constants';

// ============================================================
// Types
// ============================================================

export interface SpecialDayFlags {
  hasCheoneulGwiin: boolean;
  hasGeonrok: boolean;
  hasSonEomneun: boolean;
  hasYeokma: boolean;
  hasDohwa: boolean;
  isSamjaeYearFlag: boolean;
}

export interface SajuFactorKeysInput {
  dayMasterStem?: string;
  yearBranch?: string;
  ganzhi: { stem: string; branch: string; stemElement: string };
  date: Date;
  dayMasterElement: string;
  relations: { generatedBy: string; controls: string; generates: string; controlledBy: string };
  shinsalResult?: {
    active?: Array<{ name: string; type: 'lucky' | 'unlucky' | 'special'; affectedArea: string }>;
  };
}

export interface FactorKeysResult {
  sajuFactorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
  categories: EventCategory[];
  titleKey: string;
  descKey: string;
  specialDayFlags: SpecialDayFlags;
}

// ============================================================
// 특수 요소 플래그 계산
// ============================================================

/**
 * 특수 날짜 플래그 계산
 */
export function calculateSpecialDayFlags(
  dayMasterStem: string | undefined,
  yearBranch: string | undefined,
  ganzhi: { branch: string },
  date: Date,
  year: number
): SpecialDayFlags {
  const hasCheoneulGwiin = dayMasterStem ? isCheoneulGwiin(dayMasterStem, ganzhi.branch) : false;
  const hasGeonrok = dayMasterStem ? isGeonrokDay(dayMasterStem, ganzhi.branch) : false;
  const approxLunarDay = approximateLunarDay(date);
  const hasSonEomneun = isSonEomneunDay(approxLunarDay);
  const hasYeokma = yearBranch ? isYeokmaDay(yearBranch, ganzhi.branch) : false;
  const hasDohwa = yearBranch ? isDohwaDay(yearBranch, ganzhi.branch) : false;

  const yearGanzhi = getYearGanzhi(year);
  const isSamjaeYearFlag = yearBranch ? isSamjaeYear(yearBranch, yearGanzhi.branch) : false;

  return {
    hasCheoneulGwiin,
    hasGeonrok,
    hasSonEomneun,
    hasYeokma,
    hasDohwa,
    isSamjaeYearFlag,
  };
}

// ============================================================
// 사주 요소 키 생성
// ============================================================

/**
 * 사주 요소 키 생성
 */
export function generateSajuFactorKeys(input: SajuFactorKeysInput): FactorKeysResult {
  const sajuFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";

  const { dayMasterStem, yearBranch, ganzhi, date, dayMasterElement, relations, shinsalResult } = input;
  const year = date.getFullYear();

  // 특수 날짜 플래그 계산
  const specialDayFlags = calculateSpecialDayFlags(dayMasterStem, yearBranch, ganzhi, date, year);

  // 천을귀인(天乙貴人) 체크
  if (specialDayFlags.hasCheoneulGwiin) {
    sajuFactorKeys.push("cheoneulGwiin");
    recommendationKeys.push("majorDecision", "contract", "meeting");
    if (!titleKey) {
      titleKey = "calendar.cheoneulGwiin";
      descKey = "calendar.cheoneulGwiinDesc";
    }
  }

  // 손없는 날
  if (specialDayFlags.hasSonEomneun) {
    sajuFactorKeys.push("sonEomneunDay");
    recommendationKeys.push("moving", "wedding", "business");
    if (!categories.includes("general")) categories.push("general");
  }

  // 건록(建祿) 체크
  if (specialDayFlags.hasGeonrok) {
    sajuFactorKeys.push("geonrokDay");
    recommendationKeys.push("career", "authority", "promotion");
    if (!categories.includes("career")) categories.push("career");
  }

  // 삼재(三災) 체크
  if (specialDayFlags.isSamjaeYearFlag) {
    sajuFactorKeys.push("samjaeYear");
    warningKeys.push("samjae", "caution");
  }

  // 역마살(驛馬殺) 체크
  if (specialDayFlags.hasYeokma) {
    sajuFactorKeys.push("yeokmaDay");
    recommendationKeys.push("travel", "change", "interview");
    warningKeys.push("instability");
    if (!categories.includes("travel")) categories.push("travel");
  }

  // 도화살(桃花殺) 체크
  if (specialDayFlags.hasDohwa) {
    sajuFactorKeys.push("dohwaDay");
    recommendationKeys.push("dating", "socializing", "charm");
    if (!categories.includes("love")) categories.push("love");
  }

  // 신살 결과 반영
  if (shinsalResult?.active) {
    const shinsalKeys = generateShinsalFactorKeys(shinsalResult.active);
    sajuFactorKeys.push(...shinsalKeys.factorKeys);
    recommendationKeys.push(...shinsalKeys.recommendationKeys);
    warningKeys.push(...shinsalKeys.warningKeys);
  }

  // 천간 관계에 따른 카테고리 설정
  const stemRelationResult = analyzeStemRelation(ganzhi.stemElement, dayMasterElement, relations);
  sajuFactorKeys.push(stemRelationResult.factorKey);
  categories.push(...stemRelationResult.categories);
  recommendationKeys.push(...stemRelationResult.recommendationKeys);
  warningKeys.push(...stemRelationResult.warningKeys);

  if (!titleKey && stemRelationResult.titleKey) {
    titleKey = stemRelationResult.titleKey;
    descKey = stemRelationResult.descKey || "";
  }

  return {
    sajuFactorKeys,
    recommendationKeys,
    warningKeys,
    categories,
    titleKey,
    descKey,
    specialDayFlags,
  };
}

// ============================================================
// 신살 요소 키 생성
// ============================================================

interface ShinsalFactorKeys {
  factorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
}

/**
 * 신살 결과에 따른 요소 키 생성
 */
function generateShinsalFactorKeys(
  shinsalActive: Array<{ name: string; type: string; affectedArea: string }>
): ShinsalFactorKeys {
  const factorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  for (const shinsal of shinsalActive) {
    const name = shinsal.name;

    // 길신
    if (name === '태극귀인') {
      factorKeys.push("shinsal_taegukGwiin");
      recommendationKeys.push("majorLuck", "blessing");
    } else if (name === '천덕귀인' || name === '천덕') {
      factorKeys.push("shinsal_cheondeokGwiin");
      recommendationKeys.push("heavenlyHelp", "protection");
    } else if (name === '월덕귀인' || name === '월덕') {
      factorKeys.push("shinsal_woldeokGwiin");
      recommendationKeys.push("lunarBlessing", "assistance");
    } else if (name === '화개') {
      factorKeys.push("shinsal_hwagae");
      recommendationKeys.push("creativity", "spiritual");
    }
    // 흉신
    else if (name === '공망') {
      factorKeys.push("shinsal_gongmang");
      warningKeys.push("emptiness", "voidDay");
    } else if (name === '원진') {
      factorKeys.push("shinsal_wonjin");
      warningKeys.push("resentment", "conflict");
    } else if (name === '양인') {
      factorKeys.push("shinsal_yangin");
      warningKeys.push("danger", "impulsiveness");
    } else if (name === '괴강') {
      factorKeys.push("shinsal_goegang");
      warningKeys.push("extremes", "intensity");
    } else if (name === '백호') {
      factorKeys.push("shinsal_backho");
      warningKeys.push("accident", "surgery");
    } else if (name === '귀문관') {
      factorKeys.push("shinsal_guimungwan");
      warningKeys.push("mentalConfusion", "anxiety");
    }
    // 특수 신살
    else if (name === '역마') {
      factorKeys.push("shinsal_yeokma");
      recommendationKeys.push("travel", "movement");
    } else if (name === '재살') {
      factorKeys.push("shinsal_jaesal");
      warningKeys.push("dispute", "legalIssue");
    }
  }

  return { factorKeys, recommendationKeys, warningKeys };
}

// ============================================================
// 천간 관계 분석
// ============================================================

interface StemRelationResult {
  factorKey: string;
  categories: EventCategory[];
  recommendationKeys: string[];
  warningKeys: string[];
  titleKey?: string;
  descKey?: string;
}

/**
 * 천간 관계 분석
 */
function analyzeStemRelation(
  stemElement: string,
  dayMasterElement: string,
  relations: { generatedBy: string; controls: string; generates: string; controlledBy: string }
): StemRelationResult {
  const categories: EventCategory[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  let titleKey: string | undefined;
  let descKey: string | undefined;
  let factorKey = "";

  if (stemElement === dayMasterElement) {
    // 비견
    categories.push("career");
    titleKey = "calendar.bijeon";
    descKey = "calendar.bijeonDesc";
    factorKey = "stemBijeon";
    recommendationKeys.push("business", "networking");
    warningKeys.push("competition");
  } else if (stemElement === relations.generatedBy) {
    // 인성
    categories.push("study", "career");
    titleKey = "calendar.inseong";
    descKey = "calendar.inseongDesc";
    factorKey = "stemInseong";
    recommendationKeys.push("study", "mentor", "documents");
  } else if (stemElement === relations.controls) {
    // 재성
    categories.push("wealth", "love");
    titleKey = "calendar.jaeseong";
    descKey = "calendar.jaeseongDesc";
    factorKey = "stemJaeseong";
    recommendationKeys.push("finance", "investment", "shopping");
  } else if (stemElement === relations.generates) {
    // 식상
    categories.push("love", "career");
    titleKey = "calendar.siksang";
    descKey = "calendar.siksangDesc";
    factorKey = "stemSiksang";
    recommendationKeys.push("love", "creative", "expression");
  } else if (stemElement === relations.controlledBy) {
    // 관살
    categories.push("health", "career");
    titleKey = "calendar.gwansal";
    descKey = "calendar.gwansalDesc";
    factorKey = "stemGwansal";
    warningKeys.push("conflict", "health", "avoidAuthority");
    recommendationKeys.push("careful", "lowProfile");
  } else {
    factorKey = "stemNeutral";
  }

  return {
    factorKey,
    categories,
    recommendationKeys,
    warningKeys,
    titleKey,
    descKey,
  };
}

// ============================================================
// 충돌하는 추천 제거
// ============================================================

/**
 * 경고에 따라 충돌하는 추천 제거
 */
export function filterConflictingRecommendations(
  recommendationKeys: string[],
  warningKeys: string[]
): string[] {
  const filtered = [...recommendationKeys];
  const removals: string[] = [];

  // 충(沖)이 있으면 여행/변화 추천 제거
  if (warningKeys.some(w => w.includes('Travel') || w === 'conflict')) {
    removals.push("travel", "change");
  }

  // 형(刑)이 있으면 계약 관련 추천 제거
  if (warningKeys.includes('legal') || warningKeys.includes('injury')) {
    removals.push("contract", "bigDecision", "partnership");
  }

  // 해(害)가 있으면 소셜 추천 제거
  if (warningKeys.includes('betrayal') || warningKeys.includes('misunderstanding')) {
    removals.push("networking", "socializing");
  }

  // 관살이 있으면 권위/승진 추천 제거
  if (warningKeys.includes('avoidAuthority')) {
    removals.push("authority", "promotion", "interview");
  }

  // 수성 역행
  if (warningKeys.includes('mercuryRetrograde')) {
    removals.push("contract", "documents", "interview");
  }

  // 금성 역행
  if (warningKeys.includes('venusRetrograde')) {
    removals.push("dating", "love", "finance", "investment", "shopping");
  }

  return filtered.filter(r => !removals.includes(r));
}

// ============================================================
// 점성술 요소 키 생성
// ============================================================

export interface AstroFactorKeysInput {
  transitSunElement: string;
  natalSunElement: string;
  lunarPhaseName: string;
  moonPhaseDetailed: { phaseName: string; score: number; factorKey: string };
  retrogradePlanets: string[];
  voidOfCourse: { isVoid: boolean };
  eclipseImpact: { hasImpact: boolean; type?: 'solar' | 'lunar'; intensity?: string };
  planetaryHour: { dayRuler: string };
  solarReturnAnalysis: { isBirthday: boolean; daysFromBirthday: number };
  crossVerified: boolean;
  sajuNegative: boolean;
  astroNegative: boolean;
  sajuPositive: boolean;
  astroPositive: boolean;
  ganzhiStemElement: string;
}

export interface AstroFactorKeysResult {
  astroFactorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
  astroPositive: boolean;
  astroNegative: boolean;
}

/**
 * 점성술 요소 키 생성
 */
export function generateAstroFactorKeys(input: AstroFactorKeysInput): AstroFactorKeysResult {
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  let { astroPositive, astroNegative } = input;

  const relations = ELEMENT_RELATIONS[input.natalSunElement];

  // 원소 조화
  if (input.transitSunElement === input.natalSunElement) {
    astroFactorKeys.push("sameElement");
    recommendationKeys.push("confidence", "selfExpression");
  } else if (relations?.generatedBy === input.transitSunElement) {
    astroFactorKeys.push("supportElement");
    recommendationKeys.push("learning", "receiving");
  } else if (relations?.generates === input.transitSunElement) {
    astroFactorKeys.push("givingElement");
    recommendationKeys.push("giving", "teaching");
  } else if (relations?.controlledBy === input.transitSunElement) {
    astroFactorKeys.push("conflictElement");
    warningKeys.push("stress", "opposition");
  } else if (relations?.controls === input.transitSunElement) {
    astroFactorKeys.push("controlElement");
    recommendationKeys.push("achievement", "discipline");
  }

  // 달 위상
  if (input.lunarPhaseName === "newMoon") {
    astroFactorKeys.push("lunarNewMoon");
    recommendationKeys.push("newBeginning", "planning");
  } else if (input.lunarPhaseName === "fullMoon") {
    astroFactorKeys.push("lunarFullMoon");
    recommendationKeys.push("completion", "celebration");
  } else if (input.lunarPhaseName === "firstQuarter") {
    astroFactorKeys.push("lunarFirstQuarter");
    warningKeys.push("tension", "challenge");
  } else if (input.lunarPhaseName === "lastQuarter") {
    astroFactorKeys.push("lunarLastQuarter");
    recommendationKeys.push("reflection", "release");
  }

  // 8단계 달 위상
  astroFactorKeys.push(input.moonPhaseDetailed.factorKey);
  if (input.moonPhaseDetailed.score > 10) astroPositive = true;
  if (input.moonPhaseDetailed.score < -2) astroNegative = true;

  // 역행 행성
  for (const planet of input.retrogradePlanets) {
    astroFactorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
  }
  if (input.retrogradePlanets.includes("mercury")) {
    warningKeys.push("mercuryRetrograde");
  }
  if (input.retrogradePlanets.includes("venus")) {
    warningKeys.push("venusRetrograde");
  }
  if (input.retrogradePlanets.includes("mars")) {
    warningKeys.push("marsRetrograde");
  }

  // Void of Course
  if (input.voidOfCourse.isVoid) {
    astroFactorKeys.push("voidOfCourse");
    warningKeys.push("voidOfCourse");
  }

  // 일/월식
  if (input.eclipseImpact.hasImpact) {
    const type = input.eclipseImpact.type === "solar" ? "solarEclipse" : "lunarEclipse";
    astroFactorKeys.push(`${type}${input.eclipseImpact.intensity}`);
    if (input.eclipseImpact.intensity === "strong") {
      warningKeys.push("eclipseDay");
    } else if (input.eclipseImpact.intensity === "medium") {
      warningKeys.push("eclipseNear");
    }
  }

  // 행성 시간
  astroFactorKeys.push(`dayRuler${input.planetaryHour.dayRuler}`);
  if (input.planetaryHour.dayRuler === "Jupiter") {
    recommendationKeys.push("expansion", "luck");
  } else if (input.planetaryHour.dayRuler === "Venus") {
    recommendationKeys.push("love", "beauty");
  }

  // 교차 검증
  if (input.crossVerified) {
    astroFactorKeys.push("crossVerified");
    recommendationKeys.push("majorDecision");
  }

  if (input.sajuNegative && input.astroNegative) {
    astroFactorKeys.push("crossNegative");
    warningKeys.push("extremeCaution");
  }

  if (input.ganzhiStemElement === input.transitSunElement) {
    astroFactorKeys.push("alignedElement");
  }

  if ((input.sajuPositive && input.astroNegative) || (input.sajuNegative && input.astroPositive)) {
    astroFactorKeys.push("mixedSignals");
    warningKeys.push("confusion");
  }

  return {
    astroFactorKeys,
    recommendationKeys,
    warningKeys,
    astroPositive,
    astroNegative,
  };
}
