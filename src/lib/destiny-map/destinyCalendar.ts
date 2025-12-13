/**
 * Destiny Calendar Service
 * 사주 + 점성술 교차 검증 기반 중요 날짜 계산
 */

// 오행 관계 (상생/상극)
const ELEMENT_RELATIONS: Record<string, { generates: string; controls: string; generatedBy: string; controlledBy: string }> = {
  wood: { generates: "fire", controls: "earth", generatedBy: "water", controlledBy: "metal" },
  fire: { generates: "earth", controls: "metal", generatedBy: "wood", controlledBy: "water" },
  earth: { generates: "metal", controls: "water", generatedBy: "fire", controlledBy: "wood" },
  metal: { generates: "water", controls: "wood", generatedBy: "earth", controlledBy: "fire" },
  water: { generates: "wood", controls: "fire", generatedBy: "metal", controlledBy: "earth" },
};

// 천간
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const STEM_TO_ELEMENT: Record<string, string> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

const BRANCH_TO_ELEMENT: Record<string, string> = {
  "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
  "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
  "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
};

// 삼합 (三合) - 가장 강력한 조화
const SAMHAP: Record<string, string[]> = {
  water: ["申", "子", "辰"], // 수국
  wood: ["亥", "卯", "未"],  // 목국
  fire: ["寅", "午", "戌"],  // 화국
  metal: ["巳", "酉", "丑"], // 금국
};

// 육합 (六合)
const YUKHAP: Record<string, string> = {
  "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
  "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
  "巳": "申", "申": "巳", "午": "未", "未": "午",
};

// 충 (冲) - 반대 지지
const CHUNG: Record<string, string> = {
  "子": "午", "午": "子", "丑": "未", "未": "丑",
  "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
  "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
};

// 황도 12궁 - 오행
const ZODIAC_TO_ELEMENT: Record<string, string> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

// air를 metal로 매핑 (동양 오행 체계)
function normalizeElement(el: string): string {
  return el === "air" ? "metal" : el;
}

// 날짜별 천간지지 계산
function getGanzhiForDate(date: Date): { stem: string; branch: string; stemElement: string; branchElement: string } {
  // 기준일: 1900년 1월 31일은 甲子일
  const baseDate = new Date(1900, 0, 31);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "earth",
    branchElement: BRANCH_TO_ELEMENT[branch] || "earth",
  };
}

// 태양 별자리
function getSunSign(date: Date): string {
  const month = date.getMonth();
  const day = date.getDate();

  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) return "Aries";
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) return "Taurus";
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) return "Gemini";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) return "Cancer";
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) return "Leo";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Virgo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Libra";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) return "Scorpio";
  if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) return "Sagittarius";
  if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) return "Capricorn";
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) return "Aquarius";
  return "Pisces";
}

export type ImportanceGrade = 1 | 2 | 3;
export type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";

export interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];     // 복수 카테고리 지원
  titleKey: string;                // i18n key for title
  descKey: string;                 // i18n key for description
  ganzhi: string;                  // 干支
  crossVerified: boolean;          // 사주+점성술 모두 확인
  transitSunSign: string;          // 트랜짓 태양 별자리
  sajuFactorKeys: string[];        // 사주 분석 요소 키
  astroFactorKeys: string[];       // 점성술 분석 요소 키
  recommendationKeys: string[];    // 추천 활동 키
  warningKeys: string[];           // 주의사항 키
}

export interface CalendarMonth {
  year: number;
  month: number;
  dates: ImportantDate[];
}

interface UserSajuProfile {
  dayMaster: string;
  dayMasterElement: string;
  dayBranch?: string;
}

interface UserAstroProfile {
  sunSign: string;
  sunElement: string;
}

// 오행 한글/영문 매핑
const ELEMENT_NAMES: Record<string, { ko: string; en: string }> = {
  wood: { ko: "목", en: "Wood" },
  fire: { ko: "화", en: "Fire" },
  earth: { ko: "토", en: "Earth" },
  metal: { ko: "금", en: "Metal" },
  water: { ko: "수", en: "Water" },
};

// 십신 관계 이름
const RELATION_NAMES: Record<string, { ko: string; en: string }> = {
  bijeon: { ko: "비견", en: "Companion" },
  겁재: { ko: "겁재", en: "Rob Wealth" },
  inseong: { ko: "인성", en: "Support" },
  jaeseong: { ko: "재성", en: "Wealth" },
  siksang: { ko: "식상", en: "Output" },
  gwansal: { ko: "관살", en: "Authority" },
  samhap: { ko: "삼합", en: "Triple Harmony" },
  yukhap: { ko: "육합", en: "Six Harmony" },
  chung: { ko: "충", en: "Clash" },
};

/**
 * 날짜 분석 - 교차 검증
 */
function analyzeDate(
  date: Date,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile
): ImportantDate | null {
  const dateStr = date.toISOString().split("T")[0];
  const ganzhi = getGanzhiForDate(date);
  const transitSun = getSunSign(date);
  const transitSunElement = normalizeElement(ZODIAC_TO_ELEMENT[transitSun] || "fire");

  const dayMasterElement = sajuProfile.dayMasterElement;
  const natalSunElement = astroProfile.sunElement;
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  if (!relations) return null;

  let score = 50;
  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";
  let sajuPositive = false;
  let astroPositive = false;
  const sajuFactorKeys: string[] = [];
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];
  let primaryRelation = "";

  // === 사주 분석 ===

  // 1. 일진 천간과 일간의 관계
  if (ganzhi.stemElement === dayMasterElement) {
    // 비견 - 자기 힘 강화
    score += 15;
    sajuPositive = true;
    categories.push("career");
    titleKey = "calendar.bijeon";
    descKey = "calendar.bijeonDesc";
    primaryRelation = "bijeon";
    sajuFactorKeys.push("stemBijeon");
    recommendationKeys.push("business");
  } else if (ganzhi.stemElement === relations.generatedBy) {
    // 인성 - 도움/학습
    score += 20;
    sajuPositive = true;
    categories.push("study");
    titleKey = "calendar.inseong";
    descKey = "calendar.inseongDesc";
    primaryRelation = "inseong";
    sajuFactorKeys.push("stemInseong");
    recommendationKeys.push("study");
  } else if (ganzhi.stemElement === relations.controls) {
    // 재성 - 재물
    score += 25;
    sajuPositive = true;
    categories.push("wealth");
    titleKey = "calendar.jaeseong";
    descKey = "calendar.jaeseongDesc";
    primaryRelation = "jaeseong";
    sajuFactorKeys.push("stemJaeseong");
    recommendationKeys.push("finance");
  } else if (ganzhi.stemElement === relations.generates) {
    // 식상 - 표현/연애
    score += 15;
    sajuPositive = true;
    categories.push("love");
    titleKey = "calendar.siksang";
    descKey = "calendar.siksangDesc";
    primaryRelation = "siksang";
    sajuFactorKeys.push("stemSiksang");
    recommendationKeys.push("love");
  } else if (ganzhi.stemElement === relations.controlledBy) {
    // 관살 - 압박
    score -= 20;
    categories.push("health");
    titleKey = "calendar.gwansal";
    descKey = "calendar.gwansalDesc";
    primaryRelation = "gwansal";
    sajuFactorKeys.push("stemGwansal");
    warningKeys.push("conflict");
    warningKeys.push("health");
  }

  // 2. 지지 관계 (삼합, 육합, 충)
  const dayBranch = sajuProfile.dayBranch;
  if (dayBranch) {
    // 삼합 체크
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 20;
          sajuPositive = true;
          titleKey = "calendar.samhap";
          descKey = "calendar.samhapDesc";
          sajuFactorKeys.push("branchSamhap");
          if (!categories.includes("general")) categories.push("general");
        }
      }
    }

    // 육합 체크
    if (YUKHAP[dayBranch] === ganzhi.branch) {
      score += 15;
      sajuPositive = true;
      sajuFactorKeys.push("branchYukhap");
      if (categories.length === 0) {
        titleKey = "calendar.yukhap";
        descKey = "calendar.yukhapDesc";
        categories.push("love");
      }
      recommendationKeys.push("love");
    }

    // 충 체크
    if (CHUNG[dayBranch] === ganzhi.branch) {
      score -= 25;
      categories.push("travel");
      titleKey = "calendar.chung";
      descKey = "calendar.chungDesc";
      sajuFactorKeys.push("branchChung");
      warningKeys.push("travel");
      warningKeys.push("conflict");
    }
  }

  // === 점성술 분석 ===

  // 트랜짓 태양과 본명 태양의 관계
  if (transitSunElement === natalSunElement) {
    // 같은 원소 - 에너지 강화
    score += 15;
    astroPositive = true;
    astroFactorKeys.push("sameElement");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === transitSunElement) {
    // 생해주는 관계
    score += 10;
    astroPositive = true;
    astroFactorKeys.push("supportElement");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === transitSunElement) {
    // 극하는 관계
    score -= 10;
    astroFactorKeys.push("conflictElement");
    if (warningKeys.length === 0) {
      warningKeys.push("conflict");
    }
  }

  // === 교차 검증 ===

  // 사주와 점성술 모두 긍정적이면 추가 점수
  const crossVerified = sajuPositive && astroPositive;
  if (crossVerified) {
    score += 15;
    astroFactorKeys.push("crossVerified");
  }

  // 사주 일진과 점성술 트랜짓이 같은 원소
  if (ganzhi.stemElement === transitSunElement) {
    score += 10;
    astroFactorKeys.push("alignedElement");
  }

  // 점수 범위 제한
  score = Math.max(0, Math.min(100, score));

  // 중요하지 않은 날은 제외 (더 관대하게 - 30점 미만 또는 특별한 요소가 없는 날만 제외)
  const hasSignificantFactors = sajuFactorKeys.length > 0 || astroFactorKeys.length > 0;
  if (score >= 45 && score <= 55 && !crossVerified && !hasSignificantFactors) {
    return null;
  }

  // 카테고리가 비어있으면 general 추가
  if (categories.length === 0) {
    categories.push("general");
  }

  // 등급 결정 (더 관대하게)
  let grade: ImportanceGrade;
  if (score >= 70) {
    grade = 1;
    if (!titleKey) {
      titleKey = "calendar.bestDay";
      descKey = "calendar.bestDayDesc";
    }
    if (recommendationKeys.length === 0) {
      recommendationKeys.push("business");
    }
  } else if (score >= 50 || sajuPositive || astroPositive) {
    grade = 2;
    if (!titleKey) {
      titleKey = "calendar.goodDay";
      descKey = "calendar.goodDayDesc";
    }
  } else {
    grade = 3;
    if (!titleKey) {
      titleKey = "calendar.cautionDay";
      descKey = "calendar.cautionDayDesc";
    }
    if (warningKeys.length === 0) {
      warningKeys.push("health");
    }
    recommendationKeys.push("rest");
  }

  return {
    date: dateStr,
    grade,
    score,
    categories,
    titleKey,
    descKey,
    ganzhi: `${ganzhi.stem}${ganzhi.branch}`,
    crossVerified,
    transitSunSign: transitSun,
    sajuFactorKeys,
    astroFactorKeys,
    recommendationKeys,
    warningKeys,
  };
}

/**
 * 연간 중요 날짜 계산
 */
export function calculateYearlyImportantDates(
  year: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  options?: { category?: EventCategory; limit?: number; minGrade?: ImportanceGrade }
): ImportantDate[] {
  const dates: ImportantDate[] = [];

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const analysis = analyzeDate(new Date(d), sajuProfile, astroProfile);
    if (analysis) {
      // 카테고리 필터 (복수 카테고리에서 하나라도 매치하면 OK)
      if (options?.category && !analysis.categories.includes(options.category)) continue;
      // 등급 필터
      if (options?.minGrade && analysis.grade > options.minGrade) continue;
      dates.push(analysis);
    }
  }

  // 점수순 정렬
  dates.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return b.score - a.score;
  });

  if (options?.limit) {
    return dates.slice(0, options.limit);
  }

  return dates;
}

/**
 * 특정 카테고리 베스트 날짜 조회
 */
export function findBestDatesForCategory(
  year: number,
  category: EventCategory,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  limit: number = 10
): ImportantDate[] {
  return calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
    category,
    limit,
    minGrade: 2,
  });
}

/**
 * 월별 중요 날짜
 */
export function calculateMonthlyImportantDates(
  year: number,
  month: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile
): CalendarMonth {
  const dates: ImportantDate[] = [];

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const analysis = analyzeDate(new Date(d), sajuProfile, astroProfile);
    if (analysis) {
      dates.push(analysis);
    }
  }

  return { year, month, dates };
}

/**
 * 사주 프로필 추출
 */
export function extractSajuProfile(saju: any): UserSajuProfile {
  const dayMasterRaw = saju?.dayMaster;
  const dayMaster = typeof dayMasterRaw === "string"
    ? dayMasterRaw
    : (dayMasterRaw?.name || dayMasterRaw?.heavenlyStem || "甲");

  const stem = typeof dayMaster === "string" && dayMaster.length > 0
    ? dayMaster.charAt(0)
    : "甲";

  const pillars = saju?.pillars || {};
  const dayPillar = pillars.day || {};
  const dayBranch = dayPillar.earthlyBranch || dayPillar.branch || "";

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || "wood",
    dayBranch,
  };
}

/**
 * 점성술 프로필 추출
 */
export function extractAstroProfile(astrology: any): UserAstroProfile {
  const planets = astrology?.planets || [];
  const sun = planets.find((p: any) => p.name === "Sun");
  const sunSign = sun?.sign || "Aries";

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || "fire"),
  };
}

/**
 * 생년월일로 사주 프로필 직접 계산
 */
export function calculateSajuProfileFromBirthDate(birthDate: Date): UserSajuProfile {
  // 기준일: 1900년 1월 31일은 甲子일
  const baseDate = new Date(1900, 0, 31);
  const diffDays = Math.floor((birthDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || "wood",
    dayBranch: branch,
  };
}

/**
 * 생년월일로 점성술 프로필 직접 계산
 */
export function calculateAstroProfileFromBirthDate(birthDate: Date): UserAstroProfile {
  const month = birthDate.getMonth();
  const day = birthDate.getDate();

  let sunSign: string;
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) sunSign = "Aries";
  else if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) sunSign = "Taurus";
  else if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) sunSign = "Gemini";
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) sunSign = "Cancer";
  else if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) sunSign = "Leo";
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = "Virgo";
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = "Libra";
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) sunSign = "Scorpio";
  else if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) sunSign = "Sagittarius";
  else if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) sunSign = "Capricorn";
  else if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) sunSign = "Aquarius";
  else sunSign = "Pisces";

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || "fire"),
  };
}
