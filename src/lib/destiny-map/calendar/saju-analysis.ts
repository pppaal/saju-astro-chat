/**
 * Saju Analysis Module
 * 세운(歲運), 월운(月運), 일진(日辰), 용신(用神), 격국(格局) 분석
 */

import {
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  ELEMENT_RELATIONS,
  SAMHAP,
  YUKHAP,
  CHUNG,
  SIPSIN_RELATIONS,
  CHEONEUL_GWIIN_MAP,
  GEONROK_BY_DAY_STEM,
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
} from './constants';

// Import from utils (re-exports removed to avoid duplication in barrel export)
import {
  getSipsin,
  isCheoneulGwiin,
  isGeonrokDay,
  isSamjaeYear,
  isYeokmaDay,
  isDohwaDay,
  isSonEomneunDay,
  approximateLunarDay,
} from './utils';

// ============================================================
// Types
// ============================================================
export interface YongsinInfo {
  primary: string;      // 주용신 (wood/fire/earth/metal/water)
  secondary?: string;   // 보조용신
  type: string;         // 용신 유형 (억부/조후/통관/병약)
  kibsin?: string;      // 기신 (피해야 할 오행)
}

export interface YongsinAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  matchType?: string;   // 용신 매치 유형
}

export interface GeokgukInfo {
  type: string;       // 격국 유형
  strength: string;   // 신강/신약/중화
}

export interface PillarInfo {
  year?: { stem: string; branch: string };
  month?: { stem: string; branch: string };
  day?: { stem: string; branch: string };
  time?: { stem: string; branch: string };
}

export interface GeokgukAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

export interface ScoreResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

export interface GanzhiResult {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
}

export interface IljinScoreResult extends ScoreResult {
  ganzhi: GanzhiResult;
}

// ============================================================
// 오행 한글 → 영문 매핑
// ============================================================
const ELEMENT_KO_TO_EN: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

// ============================================================
// 격국별 좋아하는 십신/상황
// ============================================================
const GEOKGUK_PREFERENCES: Record<string, { favor: string[]; avoid: string[] }> = {
  // 정격(正格)
  "정관격": { favor: ["정인", "정재", "식신"], avoid: ["상관", "겁재"] },
  "편관격": { favor: ["식신", "정인", "양인"], avoid: ["편재"] },
  "정인격": { favor: ["정관", "비견"], avoid: ["정재", "편재"] },
  "편인격": { favor: ["편관", "정관"], avoid: ["식신", "정재"] },
  "정재격": { favor: ["식신", "정관", "비견"], avoid: ["겁재", "편재"] },
  "편재격": { favor: ["식신", "상관"], avoid: ["겁재", "비견"] },
  "식신격": { favor: ["정재", "편재", "정인"], avoid: ["편인", "편관"] },
  "상관격": { favor: ["정재", "정인"], avoid: ["정관", "편관"] },
  // 특수격
  "건록격": { favor: ["정관", "정재", "식신"], avoid: ["겁재", "편인"] },
  "양인격": { favor: ["정관", "편관"], avoid: ["편재", "겁재"] },
  // 종격(從格)
  "종아격": { favor: ["식신", "상관", "정재", "편재"], avoid: ["정인", "편인"] },
  "종재격": { favor: ["정재", "편재", "식신", "상관"], avoid: ["비견", "겁재"] },
  "종관격": { favor: ["정관", "편관", "정재"], avoid: ["식신", "상관"] },
  "종살격": { favor: ["편관", "정인"], avoid: ["식신", "상관"] },
};

// Note: Basic utility functions (getSipsin, isCheoneulGwiin, isGeonrokDay, etc.)
// are defined in utils.ts and re-exported above

// ============================================================
// 세운(歲運) 계산
// ============================================================
export function getYearGanzhi(year: number): GanzhiResult {
  const offset = (year - 1984) % 60;
  const index = offset < 0 ? offset + 60 : offset;
  const stemIndex = index % 10;
  const branchIndex = index % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "earth",
  };
}

export function calculateSeunScore(
  dayMasterElement: string,
  dayBranch: string | undefined,
  year: number
): ScoreResult {
  const yearGanzhi = getYearGanzhi(year);
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  if (!relations) return { score: 0, factorKeys: [], positive: false, negative: false };

  // 세운 천간과 일간 관계
  if (yearGanzhi.stemElement === dayMasterElement) {
    score += 8;
    factorKeys.push("seunBijeon");
    positive = true;
  } else if (yearGanzhi.stemElement === relations.generatedBy) {
    score += 12;
    factorKeys.push("seunInseong");
    positive = true;
  } else if (yearGanzhi.stemElement === relations.controls) {
    score += 10;
    factorKeys.push("seunJaeseong");
    positive = true;
  } else if (yearGanzhi.stemElement === relations.generates) {
    score += 5;
    factorKeys.push("seunSiksang");
  } else if (yearGanzhi.stemElement === relations.controlledBy) {
    score -= 12;
    factorKeys.push("seunGwansal");
    negative = true;
  }

  // 세운 지지와 일지 관계
  if (dayBranch) {
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(yearGanzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 15;
          factorKeys.push("seunSamhap");
          positive = true;
        } else if (element === relations.controlledBy) {
          score -= 10;
          factorKeys.push("seunSamhapNegative");
          negative = true;
        }
      }
    }

    if (YUKHAP[dayBranch] === yearGanzhi.branch) {
      score += 12;
      factorKeys.push("seunYukhap");
      positive = true;
    }

    if (CHUNG[dayBranch] === yearGanzhi.branch) {
      score -= 18;
      factorKeys.push("seunChung");
      negative = true;
    }
  }

  return { score, factorKeys, positive, negative };
}

// ============================================================
// 월운(月運) 계산
// ============================================================
export function getMonthGanzhi(year: number, month: number): GanzhiResult {
  const branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  const branchIndex = branchOrder[(month - 1) % 12];
  const branch = BRANCHES[branchIndex];

  const yearGanzhi = getYearGanzhi(year);

  const monthStemStart: Record<string, number> = {
    "甲": 2, "己": 2,
    "乙": 4, "庚": 4,
    "丙": 6, "辛": 6,
    "丁": 8, "壬": 8,
    "戊": 0, "癸": 0,
  };

  const startStemIndex = monthStemStart[yearGanzhi.stem] || 0;
  const monthOffset = (month - 1) % 12;
  const stemIndex = (startStemIndex + monthOffset) % 10;
  const stem = STEMS[stemIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "earth",
  };
}

export function calculateWolunScore(
  dayMasterElement: string,
  dayBranch: string | undefined,
  year: number,
  month: number
): ScoreResult {
  const monthGanzhi = getMonthGanzhi(year, month);
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  if (!relations) return { score: 0, factorKeys: [], positive: false, negative: false };

  if (monthGanzhi.stemElement === dayMasterElement) {
    score += 5;
    factorKeys.push("wolunBijeon");
    positive = true;
  } else if (monthGanzhi.stemElement === relations.generatedBy) {
    score += 8;
    factorKeys.push("wolunInseong");
    positive = true;
  } else if (monthGanzhi.stemElement === relations.controls) {
    score += 7;
    factorKeys.push("wolunJaeseong");
    positive = true;
  } else if (monthGanzhi.stemElement === relations.generates) {
    score += 3;
    factorKeys.push("wolunSiksang");
  } else if (monthGanzhi.stemElement === relations.controlledBy) {
    score -= 8;
    factorKeys.push("wolunGwansal");
    negative = true;
  }

  if (dayBranch) {
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(monthGanzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 10;
          factorKeys.push("wolunSamhap");
          positive = true;
        }
      }
    }

    if (YUKHAP[dayBranch] === monthGanzhi.branch) {
      score += 8;
      factorKeys.push("wolunYukhap");
      positive = true;
    }

    if (CHUNG[dayBranch] === monthGanzhi.branch) {
      score -= 12;
      factorKeys.push("wolunChung");
      negative = true;
    }
  }

  return { score, factorKeys, positive, negative };
}

// ============================================================
// 일진(日辰) 간지 계산
// ============================================================
export function getGanzhiForDate(date: Date): GanzhiResult {
  const baseUtc = Date.UTC(1900, 0, 31);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));

  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "earth",
  };
}

export function calculateIljinScore(
  dayMasterElement: string,
  dayMasterStem: string,
  dayBranch: string | undefined,
  targetDate: Date
): IljinScoreResult {
  const ganzhi = getGanzhiForDate(targetDate);
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  if (!relations) {
    return { score: 0, factorKeys: [], positive: false, negative: false, ganzhi };
  }

  const iljinStemElement = ganzhi.stemElement;

  if (iljinStemElement === dayMasterElement) {
    score += 8;
    factorKeys.push("iljinBijeon");
    positive = true;
  } else if (iljinStemElement === relations.generatedBy) {
    score += 15;
    factorKeys.push("iljinInseong");
    positive = true;
  } else if (iljinStemElement === relations.controls) {
    score += 12;
    factorKeys.push("iljinJaeseong");
    positive = true;
  } else if (iljinStemElement === relations.generates) {
    score += 6;
    factorKeys.push("iljinSiksang");
    positive = true;
  } else if (iljinStemElement === relations.controlledBy) {
    score -= 15;
    factorKeys.push("iljinGwansal");
    negative = true;
  }

  // 일진 지지 분석
  const iljinBranchElement = ganzhi.branchElement;

  if (iljinBranchElement === dayMasterElement) {
    score += 5;
    factorKeys.push("iljinBranchBijeon");
  } else if (iljinBranchElement === relations.generatedBy) {
    score += 8;
    factorKeys.push("iljinBranchInseong");
    positive = true;
  } else if (iljinBranchElement === relations.controlledBy) {
    score -= 8;
    factorKeys.push("iljinBranchGwansal");
    negative = true;
  }

  // 일지와 일진 지지 관계
  if (dayBranch) {
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 18;
          factorKeys.push("iljinSamhap");
          positive = true;
        } else if (element === relations.controlledBy) {
          score -= 10;
          factorKeys.push("iljinSamhapNegative");
          negative = true;
        }
      }
    }

    if (YUKHAP[dayBranch] === ganzhi.branch) {
      score += 15;
      factorKeys.push("iljinYukhap");
      positive = true;
    }

    if (CHUNG[dayBranch] === ganzhi.branch) {
      score -= 25;
      factorKeys.push("iljinChung");
      negative = true;
    }
  }

  return { score, factorKeys, positive, negative, ganzhi };
}

// ============================================================
// 용신(用神) 분석
// ============================================================
export function analyzeYongsin(
  yongsin: YongsinInfo | undefined,
  ganzhi: GanzhiResult,
  _date: Date
): YongsinAnalysis {
  const result: YongsinAnalysis = {
    score: 0,
    factorKeys: [],
    positive: false,
    negative: false,
  };

  if (!yongsin?.primary) return result;

  const primaryYongsin = ELEMENT_KO_TO_EN[yongsin.primary] || yongsin.primary.toLowerCase();
  const secondaryYongsin = yongsin.secondary ? (ELEMENT_KO_TO_EN[yongsin.secondary] || yongsin.secondary.toLowerCase()) : undefined;
  const kibsin = yongsin.kibsin ? (ELEMENT_KO_TO_EN[yongsin.kibsin] || yongsin.kibsin.toLowerCase()) : undefined;

  const dayStemElement = ganzhi.stemElement;
  const dayBranchElement = ganzhi.branchElement;

  if (dayStemElement === primaryYongsin) {
    result.score += 30;
    result.positive = true;
    result.matchType = "primaryYongsinMatch";
    result.factorKeys.push("yongsinPrimaryMatch");
  } else if (secondaryYongsin && dayStemElement === secondaryYongsin) {
    result.score += 18;
    result.positive = true;
    result.matchType = "secondaryYongsinMatch";
    result.factorKeys.push("yongsinSecondaryMatch");
  }

  if (dayBranchElement === primaryYongsin) {
    result.score += 15;
    result.positive = true;
    result.factorKeys.push("yongsinBranchMatch");
  } else if (secondaryYongsin && dayBranchElement === secondaryYongsin) {
    result.score += 10;
    result.factorKeys.push("yongsinSecondaryBranchMatch");
  }

  if (kibsin) {
    if (dayStemElement === kibsin) {
      result.score -= 28;
      result.negative = true;
      result.factorKeys.push("kibsinMatch");
    }
    if (dayBranchElement === kibsin) {
      result.score -= 15;
      result.negative = true;
      result.factorKeys.push("kibsinBranchMatch");
    }
  }

  const yongsinRelations = ELEMENT_RELATIONS[primaryYongsin];
  if (yongsinRelations) {
    if (dayStemElement === yongsinRelations.generatedBy) {
      result.score += 12;
      result.factorKeys.push("yongsinSupport");
    }
    if (dayStemElement === yongsinRelations.controlledBy) {
      result.score -= 10;
      result.factorKeys.push("yongsinHarmed");
    }
  }

  return result;
}

// ============================================================
// 격국(格局) 분석
// ============================================================
export function analyzeGeokguk(
  geokguk: GeokgukInfo | undefined,
  ganzhi: GanzhiResult,
  pillars?: PillarInfo
): GeokgukAnalysis {
  const result: GeokgukAnalysis = {
    score: 0,
    factorKeys: [],
    positive: false,
    negative: false,
  };

  if (!geokguk?.type || !pillars?.day?.stem) return result;

  const dayMasterStem = pillars.day.stem;
  const preferences = GEOKGUK_PREFERENCES[geokguk.type];

  if (!preferences) return result;

  const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);

  if (daySipsin) {
    if (preferences.favor.includes(daySipsin)) {
      result.score += 20;
      result.positive = true;
      result.factorKeys.push(`geokgukFavor_${daySipsin}`);
    }
    if (preferences.avoid.includes(daySipsin)) {
      result.score -= 18;
      result.negative = true;
      result.factorKeys.push(`geokgukAvoid_${daySipsin}`);
    }
  }

  if (geokguk.strength === "신강") {
    const settingElements = ["식신", "상관", "정재", "편재", "정관", "편관"];
    if (daySipsin && settingElements.includes(daySipsin)) {
      result.score += 8;
      result.factorKeys.push("geokgukStrengthBalance");
    }
    const excessElements = ["비견", "겁재", "정인", "편인"];
    if (daySipsin && excessElements.includes(daySipsin)) {
      result.score -= 6;
      result.factorKeys.push("geokgukStrengthExcess");
    }
  } else if (geokguk.strength === "신약") {
    const supportElements = ["비견", "겁재", "정인", "편인"];
    if (daySipsin && supportElements.includes(daySipsin)) {
      result.score += 8;
      result.factorKeys.push("geokgukWeakSupport");
    }
    const pressureElements = ["정관", "편관", "정재", "편재"];
    if (daySipsin && pressureElements.includes(daySipsin)) {
      result.score -= 6;
      result.factorKeys.push("geokgukWeakPressure");
    }
  }

  return result;
}

// ============================================================
// Solar Return 분석
// ============================================================
export interface SolarReturnAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  isBirthday: boolean;
  daysFromBirthday: number;
}

export function analyzeSolarReturn(
  date: Date,
  birthMonth?: number,
  birthDay?: number
): SolarReturnAnalysis {
  const result: SolarReturnAnalysis = {
    score: 0,
    factorKeys: [],
    positive: false,
    isBirthday: false,
    daysFromBirthday: 999,
  };

  if (!birthMonth || !birthDay) return result;

  const currentMonth = date.getMonth() + 1;
  const currentDay = date.getDate();

  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const targetUtc = Date.UTC(date.getFullYear(), birthMonth - 1, birthDay);
  const diffDays = Math.round((targetUtc - dateUtc) / (1000 * 60 * 60 * 24));
  result.daysFromBirthday = Math.abs(diffDays);

  if (currentMonth === birthMonth && currentDay === birthDay) {
    result.score += 25;
    result.positive = true;
    result.isBirthday = true;
    result.factorKeys.push("solarReturnExact");
  } else if (result.daysFromBirthday <= 1) {
    result.score += 18;
    result.positive = true;
    result.factorKeys.push("solarReturnNear");
  } else if (result.daysFromBirthday <= 3) {
    result.score += 10;
    result.positive = true;
    result.factorKeys.push("solarReturnWeak");
  } else if (result.daysFromBirthday <= 7) {
    result.score += 5;
    result.factorKeys.push("solarReturnEcho");
  }

  return result;
}

// ============================================================
// Progressions 분석
// ============================================================
export interface ProgressionAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  currentPhase: string;
}

export function analyzeProgressions(
  date: Date,
  birthYear?: number,
  _natalSunElement?: string,
  dayMasterElement?: string
): ProgressionAnalysis {
  const result: ProgressionAnalysis = {
    score: 0,
    factorKeys: [],
    positive: false,
    negative: false,
    currentPhase: "",
  };

  if (!birthYear) return result;

  const currentYear = date.getFullYear();
  const age = currentYear - birthYear;

  if (age < 7) {
    result.currentPhase = "lunar";
    result.factorKeys.push("progressionLunar");
  } else if (age < 14) {
    result.currentPhase = "mercury";
    result.factorKeys.push("progressionMercury");
  } else if (age < 21) {
    result.currentPhase = "venus";
    result.factorKeys.push("progressionVenus");
  } else if (age < 29) {
    result.currentPhase = "solar";
    result.factorKeys.push("progressionSolar");
  } else if (age < 42) {
    result.currentPhase = "mars";
    result.factorKeys.push("progressionMars");
  } else if (age < 56) {
    result.currentPhase = "jupiter";
    result.factorKeys.push("progressionJupiter");
    result.score += 5;
  } else if (age < 70) {
    result.currentPhase = "saturn";
    result.factorKeys.push("progressionSaturn");
  } else {
    result.currentPhase = "outer";
    result.factorKeys.push("progressionOuter");
  }

  const phaseToElement: Record<string, string> = {
    lunar: "water",
    mercury: "metal",
    venus: "earth",
    solar: "fire",
    mars: "fire",
    jupiter: "wood",
    saturn: "earth",
    outer: "water",
  };

  const phaseElement = phaseToElement[result.currentPhase];
  if (phaseElement && dayMasterElement) {
    const relations = ELEMENT_RELATIONS[dayMasterElement];
    if (relations) {
      if (phaseElement === relations.generatedBy) {
        result.score += 8;
        result.positive = true;
        result.factorKeys.push("progressionSupport");
      } else if (phaseElement === relations.controlledBy) {
        result.score -= 5;
        result.negative = true;
        result.factorKeys.push("progressionChallenge");
      }
    }
  }

  const cycleYears = [7, 14, 21, 28, 29, 30, 35, 42, 49, 56, 63, 70, 77, 84];
  if (cycleYears.includes(age)) {
    result.score += 3;
    result.factorKeys.push("progressionCycleYear");
  }

  if (age >= 29 && age <= 30) {
    result.factorKeys.push("saturnReturnFirst");
  } else if (age >= 58 && age <= 60) {
    result.factorKeys.push("saturnReturnSecond");
  }

  return result;
}
