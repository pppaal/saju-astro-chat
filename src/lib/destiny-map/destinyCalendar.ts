/**
 * Destiny Calendar Service (운명 캘린더 서비스)
 * 사주 + 점성술 교차 검증 기반 중요 날짜 계산
 *
 * 주요 기능:
 * - 세운(歲運) 분석: 연간 운세 흐름
 * - 월운(月運) 분석: 월간 운세 흐름
 * - 일진(日辰) 분석: 일별 상세 분석
 * - 천을귀인(天乙貴人): 특별히 좋은 날 감지
 * - 지장간(支藏干): 숨은 천간 분석
 * - 영역별 분석: 재물/연애/건강/직업 세부 점수
 * - 점성술 트랜짓: 태양/달 위상 분석
 * - 교차 검증: 사주+점성술 시너지/경고
 * - 고급 예측: 공망/신살/에너지/시간대 최적화 (ultraPrecisionEngine)
 * - 대운-트랜짓 동기화: 목성회귀/토성회귀 (daeunTransitSync)
 */

import {
  calculateDailyPillar,
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
} from '@/lib/prediction/ultraPrecisionEngine';
import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo,
} from '@/lib/prediction/daeunTransitSync';
import {
  analyzeMultiLayer,
  analyzeBranchInteractions,
  calculatePreciseTwelveStage,
  calculateYearlyGanji,
  calculateMonthlyGanji as advancedMonthlyGanji,
  type BranchInteraction,
  type LayerAnalysis,
} from '@/lib/prediction/advancedTimingEngine';

// ============================================================
// 천을귀인(天乙貴人) - 가장 좋은 귀인 (from saju.ts)
// ============================================================
const CHEONEUL_GWIIN_MAP: Record<string, string[]> = {
  "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
  "乙": ["子", "申"], "己": ["子", "申"],
  "丙": ["亥", "酉"], "丁": ["亥", "酉"],
  "壬": ["卯", "巳"], "癸": ["卯", "巳"],
  "辛": ["寅", "午"],
};

/**
 * 천을귀인 체크 - 일간 기준으로 지지가 귀인인지 확인
 */
function isCheoneulGwiin(dayMasterStem: string, targetBranch: string): boolean {
  return CHEONEUL_GWIIN_MAP[dayMasterStem]?.includes(targetBranch) ?? false;
}

// ============================================================
// 지장간(支藏干) - 지지 안에 숨은 천간 (from saju.ts)
// ============================================================
const JIJANGGAN: Record<string, { 여기?: string; 중기?: string; 정기: string }> = {
  "子": { 정기: "癸" },
  "丑": { 여기: "癸", 중기: "辛", 정기: "己" },
  "寅": { 여기: "戊", 중기: "丙", 정기: "甲" },
  "卯": { 정기: "乙" },
  "辰": { 여기: "乙", 중기: "癸", 정기: "戊" },
  "巳": { 여기: "戊", 중기: "庚", 정기: "丙" },
  "午": { 여기: "己", 정기: "丁" },
  "未": { 여기: "丁", 중기: "乙", 정기: "己" },
  "申": { 여기: "戊", 중기: "壬", 정기: "庚" },
  "酉": { 정기: "辛" },
  "戌": { 여기: "辛", 중기: "丁", 정기: "戊" },
  "亥": { 여기: "戊", 정기: "壬" },
};

// ============================================================
// 영역별 분석 설정 (from fortuneSimulator.ts)
// ============================================================
type FortuneArea = "career" | "wealth" | "love" | "health" | "study" | "travel";

const AREA_CONFIG: Record<FortuneArea, {
  relatedElements: string[];
  boostSibsin: string[];
  penaltySibsin: string[];
}> = {
  career: {
    relatedElements: ["metal", "earth"],
    boostSibsin: ["정관", "편관", "정인"],
    penaltySibsin: ["상관"],
  },
  wealth: {
    relatedElements: ["earth", "metal"],
    boostSibsin: ["정재", "편재", "식신"],
    penaltySibsin: ["겁재", "비견"],
  },
  love: {
    relatedElements: ["fire", "wood"],
    boostSibsin: ["정관", "정재", "식신"],
    penaltySibsin: ["편관", "상관"],
  },
  health: {
    relatedElements: ["wood", "water"],
    boostSibsin: ["정인", "비견"],
    penaltySibsin: ["편관", "상관"],
  },
  study: {
    relatedElements: ["water", "wood"],
    boostSibsin: ["정인", "편인", "식신"],
    penaltySibsin: ["편재", "겁재"],
  },
  travel: {
    relatedElements: ["fire", "water"],
    boostSibsin: ["편관", "편인", "식신"],
    penaltySibsin: ["정관", "정인"],
  },
};

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

// ============================================================
// 손없는 날 (이사/결혼/개업에 좋은 날)
// 음력 기준: 1~2일(동), 3~4일(남), 5~6일(서), 7~8일(북), 9~10일(손없음)
// ============================================================
function isSonEomneunDay(lunarDay: number): boolean {
  // 음력 일자를 10으로 나눈 나머지로 판단
  const dayInCycle = lunarDay % 10;
  return dayInCycle === 9 || dayInCycle === 0; // 9, 10, 19, 20, 29, 30일
}

// 간단한 양력→음력 근사 변환 (정확도 ±1~2일)
function approximateLunarDay(date: Date): number {
  // 2000년 1월 6일이 음력 1월 1일
  const baseDate = new Date(2000, 0, 6);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  // 음력 한 달 평균 29.53일
  const lunarMonthDays = 29.53;
  const dayInMonth = ((diffDays % lunarMonthDays) + lunarMonthDays) % lunarMonthDays;
  return Math.floor(dayInMonth) + 1;
}

// ============================================================
// 삼재 (三災) - 12년 주기로 3년간 불운
// ============================================================
const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
  // 寅午戌 띠 → 申酉戌 년에 삼재
  "寅": ["申", "酉", "戌"], "午": ["申", "酉", "戌"], "戌": ["申", "酉", "戌"],
  // 巳酉丑 띠 → 寅卯辰 년에 삼재
  "巳": ["寅", "卯", "辰"], "酉": ["寅", "卯", "辰"], "丑": ["寅", "卯", "辰"],
  // 申子辰 띠 → 巳午未 년에 삼재
  "申": ["巳", "午", "未"], "子": ["巳", "午", "未"], "辰": ["巳", "午", "未"],
  // 亥卯未 띠 → 亥子丑 년에 삼재
  "亥": ["亥", "子", "丑"], "卯": ["亥", "子", "丑"], "未": ["亥", "子", "丑"],
};

function isSamjaeYear(birthYearBranch: string, currentYearBranch: string): boolean {
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[birthYearBranch];
  return samjaeBranches?.includes(currentYearBranch) ?? false;
}

// ============================================================
// 역마살 (驛馬殺) - 이동/변화의 날
// ============================================================
const YEOKMA_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥",
  "申": "寅", "子": "寅", "辰": "寅",
  "亥": "巳", "卯": "巳", "未": "巳",
};

function isYeokmaDay(birthYearBranch: string, dayBranch: string): boolean {
  return YEOKMA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 도화살 (桃花殺) - 연애/매력의 날
// ============================================================
const DOHWA_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "卯", "午": "卯", "戌": "卯",
  "巳": "午", "酉": "午", "丑": "午",
  "申": "酉", "子": "酉", "辰": "酉",
  "亥": "子", "卯": "子", "未": "子",
};

function isDohwaDay(birthYearBranch: string, dayBranch: string): boolean {
  return DOHWA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 건록 (建祿) - 일간의 록지
// ============================================================
const GEONROK_BY_DAY_STEM: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
  "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
};

function isGeonrokDay(dayMasterStem: string, dayBranch: string): boolean {
  return GEONROK_BY_DAY_STEM[dayMasterStem] === dayBranch;
}

// ============================================================
// 십신 완전판 (十神) - 누락된 것 추가
// ============================================================
const SIPSIN_RELATIONS: Record<string, Record<string, string>> = {
  // 일간 기준 → 다른 천간의 십신
  "甲": { "甲": "비견", "乙": "겁재", "丙": "식신", "丁": "상관", "戊": "편재", "己": "정재", "庚": "편관", "辛": "정관", "壬": "편인", "癸": "정인" },
  "乙": { "乙": "비견", "甲": "겁재", "丁": "식신", "丙": "상관", "己": "편재", "戊": "정재", "辛": "편관", "庚": "정관", "癸": "편인", "壬": "정인" },
  "丙": { "丙": "비견", "丁": "겁재", "戊": "식신", "己": "상관", "庚": "편재", "辛": "정재", "壬": "편관", "癸": "정관", "甲": "편인", "乙": "정인" },
  "丁": { "丁": "비견", "丙": "겁재", "己": "식신", "戊": "상관", "辛": "편재", "庚": "정재", "癸": "편관", "壬": "정관", "乙": "편인", "甲": "정인" },
  "戊": { "戊": "비견", "己": "겁재", "庚": "식신", "辛": "상관", "壬": "편재", "癸": "정재", "甲": "편관", "乙": "정관", "丙": "편인", "丁": "정인" },
  "己": { "己": "비견", "戊": "겁재", "辛": "식신", "庚": "상관", "癸": "편재", "壬": "정재", "乙": "편관", "甲": "정관", "丁": "편인", "丙": "정인" },
  "庚": { "庚": "비견", "辛": "겁재", "壬": "식신", "癸": "상관", "甲": "편재", "乙": "정재", "丙": "편관", "丁": "정관", "戊": "편인", "己": "정인" },
  "辛": { "辛": "비견", "庚": "겁재", "癸": "식신", "壬": "상관", "乙": "편재", "甲": "정재", "丁": "편관", "丙": "정관", "己": "편인", "戊": "정인" },
  "壬": { "壬": "비견", "癸": "겁재", "甲": "식신", "乙": "상관", "丙": "편재", "丁": "정재", "戊": "편관", "己": "정관", "庚": "편인", "辛": "정인" },
  "癸": { "癸": "비견", "壬": "겁재", "乙": "식신", "甲": "상관", "丁": "편재", "丙": "정재", "己": "편관", "戊": "정관", "辛": "편인", "庚": "정인" },
};

function getSipsin(dayMasterStem: string, targetStem: string): string {
  return SIPSIN_RELATIONS[dayMasterStem]?.[targetStem] ?? "";
}

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

// 형 (刑) - 형벌, 장애 (복수 대상 가능)
const XING: Record<string, string[]> = {
  "寅": ["巳", "申"], "巳": ["寅", "申"], "申": ["寅", "巳"], // 무은지형
  "丑": ["戌", "未"], "戌": ["丑", "未"], "未": ["丑", "戌"], // 지세지형
  "子": ["卯"], "卯": ["子"], // 무례지형
  "辰": ["辰"], "午": ["午"], "酉": ["酉"], "亥": ["亥"], // 자형
};

// 해 (害) - 해침, 방해
const HAI: Record<string, string> = {
  "子": "未", "未": "子", "丑": "午", "午": "丑",
  "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
  "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
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

// ============================================================
// 용신(用神) 분석 - 사주의 핵심 보완 오행
// ============================================================
interface YongsinInfo {
  primary: string;      // 주용신 (wood/fire/earth/metal/water)
  secondary?: string;   // 보조용신
  type: string;         // 용신 유형 (억부/조후/통관/병약)
  kibsin?: string;      // 기신 (피해야 할 오행)
}

interface YongsinAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  matchType?: string;   // 용신 매치 유형
}

// 오행 한글 → 영문 매핑
const ELEMENT_KO_TO_EN: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

/**
 * 용신(用神) 분석 함수
 * 일진의 오행이 용신과 일치하면 대길, 기신과 일치하면 대흉
 */
function analyzeYongsin(
  yongsin: YongsinInfo | undefined,
  ganzhi: { stem: string; branch: string; stemElement: string; branchElement: string },
  date: Date
): YongsinAnalysis {
  const result: YongsinAnalysis = {
    score: 0,
    factorKeys: [],
    positive: false,
    negative: false,
  };

  if (!yongsin?.primary) return result;

  // 용신 오행 정규화 (한글 → 영문)
  const primaryYongsin = ELEMENT_KO_TO_EN[yongsin.primary] || yongsin.primary.toLowerCase();
  const secondaryYongsin = yongsin.secondary ? (ELEMENT_KO_TO_EN[yongsin.secondary] || yongsin.secondary.toLowerCase()) : undefined;
  const kibsin = yongsin.kibsin ? (ELEMENT_KO_TO_EN[yongsin.kibsin] || yongsin.kibsin.toLowerCase()) : undefined;

  const dayStemElement = ganzhi.stemElement;
  const dayBranchElement = ganzhi.branchElement;

  // 1. 일진 천간이 용신과 일치 → 대길 (30점)
  if (dayStemElement === primaryYongsin) {
    result.score += 30;
    result.positive = true;
    result.matchType = "primaryYongsinMatch";
    result.factorKeys.push("yongsinPrimaryMatch");
  }
  // 보조용신 일치 → 길 (18점)
  else if (secondaryYongsin && dayStemElement === secondaryYongsin) {
    result.score += 18;
    result.positive = true;
    result.matchType = "secondaryYongsinMatch";
    result.factorKeys.push("yongsinSecondaryMatch");
  }

  // 2. 일진 지지가 용신과 일치 → 추가 보너스 (15점)
  if (dayBranchElement === primaryYongsin) {
    result.score += 15;
    result.positive = true;
    result.factorKeys.push("yongsinBranchMatch");
  } else if (secondaryYongsin && dayBranchElement === secondaryYongsin) {
    result.score += 10;
    result.factorKeys.push("yongsinSecondaryBranchMatch");
  }

  // 3. 기신(忌神) 체크 - 일진이 기신과 일치하면 흉
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

  // 4. 용신을 생(生)해주는 오행이 오면 간접 길 (상생)
  const yongsinRelations = ELEMENT_RELATIONS[primaryYongsin];
  if (yongsinRelations) {
    if (dayStemElement === yongsinRelations.generatedBy) {
      result.score += 12;
      result.factorKeys.push("yongsinSupport");
    }
    // 용신을 극(剋)하는 오행이 오면 흉
    if (dayStemElement === yongsinRelations.controlledBy) {
      result.score -= 10;
      result.factorKeys.push("yongsinHarmed");
    }
  }

  return result;
}

// ============================================================
// 격국(格局) 분석 - 사주 구조 유형 판단
// ============================================================
interface GeokgukInfo {
  type: string;       // 격국 유형 (정관격, 편관격, 정인격, 식신격, 상관격, 정재격, 편재격, 건록격, 양인격, 종격 등)
  strength: string;   // 신강/신약/중화
}

interface PillarInfo {
  year?: { stem: string; branch: string };
  month?: { stem: string; branch: string };
  day?: { stem: string; branch: string };
  time?: { stem: string; branch: string };
}

interface GeokgukAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

// 격국별 좋아하는 십신/상황
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
  // 종격(從格) - 신약 극심
  "종아격": { favor: ["식신", "상관", "정재", "편재"], avoid: ["정인", "편인"] },
  "종재격": { favor: ["정재", "편재", "식신", "상관"], avoid: ["비견", "겁재"] },
  "종관격": { favor: ["정관", "편관", "정재"], avoid: ["식신", "상관"] },
  "종살격": { favor: ["편관", "정인"], avoid: ["식신", "상관"] },
};

/**
 * 격국(格局) 분석 함수
 * 격국에 맞는 일진이 오면 길, 맞지 않으면 흉
 */
function analyzeGeokguk(
  geokguk: GeokgukInfo | undefined,
  ganzhi: { stem: string; branch: string; stemElement: string; branchElement: string },
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

  // 일진 천간의 십신 계산
  const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);

  if (daySipsin) {
    // 격국이 좋아하는 십신이 오면 가산
    if (preferences.favor.includes(daySipsin)) {
      result.score += 20;
      result.positive = true;
      result.factorKeys.push(`geokgukFavor_${daySipsin}`);
    }
    // 격국이 싫어하는 십신이 오면 감산
    if (preferences.avoid.includes(daySipsin)) {
      result.score -= 18;
      result.negative = true;
      result.factorKeys.push(`geokgukAvoid_${daySipsin}`);
    }
  }

  // 신강/신약에 따른 추가 분석
  if (geokguk.strength === "신강") {
    // 신강은 설기(泄氣: 식상/재성) 또는 극제(剋制: 관성)가 좋음
    const settingElements = ["식신", "상관", "정재", "편재", "정관", "편관"];
    if (daySipsin && settingElements.includes(daySipsin)) {
      result.score += 8;
      result.factorKeys.push("geokgukStrengthBalance");
    }
    // 신강에 비겁/인성 더 오면 과다
    const excessElements = ["비견", "겁재", "정인", "편인"];
    if (daySipsin && excessElements.includes(daySipsin)) {
      result.score -= 6;
      result.factorKeys.push("geokgukStrengthExcess");
    }
  } else if (geokguk.strength === "신약") {
    // 신약은 부조(扶助: 비겁/인성)가 좋음
    const supportElements = ["비견", "겁재", "정인", "편인"];
    if (daySipsin && supportElements.includes(daySipsin)) {
      result.score += 8;
      result.factorKeys.push("geokgukWeakSupport");
    }
    // 신약에 관살/재성 더 오면 과도한 압박
    const pressureElements = ["정관", "편관", "정재", "편재"];
    if (daySipsin && pressureElements.includes(daySipsin)) {
      result.score -= 6;
      result.factorKeys.push("geokgukWeakPressure");
    }
  }

  return result;
}

// ============================================================
// Solar Return (태양회귀) 분석 - 생일 주변 특별 에너지
// ============================================================
interface SolarReturnAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  isBirthday: boolean;
  daysFromBirthday: number;
}

/**
 * Solar Return 분석
 * 생일 당일 및 주변(±3일)에 특별한 에너지가 있음
 * 점성학에서 태양이 원래 위치로 돌아오는 시점
 */
function analyzeSolarReturn(
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

  // 생일까지의 일수 계산 (같은 해 기준)
  const targetDate = new Date(date.getFullYear(), birthMonth - 1, birthDay);
  const diffTime = targetDate.getTime() - date.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  result.daysFromBirthday = Math.abs(diffDays);

  // 생일 당일
  if (currentMonth === birthMonth && currentDay === birthDay) {
    result.score += 25;
    result.positive = true;
    result.isBirthday = true;
    result.factorKeys.push("solarReturnExact");
  }
  // 생일 ±1일 (Solar Return 영향권)
  else if (result.daysFromBirthday <= 1) {
    result.score += 18;
    result.positive = true;
    result.factorKeys.push("solarReturnNear");
  }
  // 생일 ±3일 (Solar Return 잔여 에너지)
  else if (result.daysFromBirthday <= 3) {
    result.score += 10;
    result.positive = true;
    result.factorKeys.push("solarReturnWeak");
  }
  // 생일 ±7일 (Solar Return 여파)
  else if (result.daysFromBirthday <= 7) {
    result.score += 5;
    result.factorKeys.push("solarReturnEcho");
  }

  return result;
}

// ============================================================
// Secondary Progressions (이차진행) 분석 - 연간 발전 테마
// ============================================================
interface ProgressionAnalysis {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  currentPhase: string;
}

/**
 * Progressions 분석 (간략화)
 * 1일 = 1년 법칙 기반, 나이에 따른 발전 단계
 * 출생 후 경과 일수 = 진행 연도
 */
function analyzeProgressions(
  date: Date,
  birthYear?: number,
  natalSunElement?: string,
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

  // 나이대별 인생 단계 (점성학적 관점)
  // 각 단계마다 특정 행성 에너지가 강조됨
  if (age < 7) {
    result.currentPhase = "lunar"; // 달 지배 - 감정/양육
    result.factorKeys.push("progressionLunar");
  } else if (age < 14) {
    result.currentPhase = "mercury"; // 수성 지배 - 학습/소통
    result.factorKeys.push("progressionMercury");
  } else if (age < 21) {
    result.currentPhase = "venus"; // 금성 지배 - 사랑/가치
    result.factorKeys.push("progressionVenus");
  } else if (age < 29) {
    result.currentPhase = "solar"; // 태양 지배 - 정체성/성취
    result.factorKeys.push("progressionSolar");
  } else if (age < 42) {
    result.currentPhase = "mars"; // 화성 지배 - 행동/야망
    result.factorKeys.push("progressionMars");
  } else if (age < 56) {
    result.currentPhase = "jupiter"; // 목성 지배 - 확장/지혜
    result.factorKeys.push("progressionJupiter");
    result.score += 5; // 목성 시기는 일반적으로 긍정적
  } else if (age < 70) {
    result.currentPhase = "saturn"; // 토성 지배 - 성숙/유산
    result.factorKeys.push("progressionSaturn");
  } else {
    result.currentPhase = "outer"; // 외행성 지배 - 영적 성장
    result.factorKeys.push("progressionOuter");
  }

  // 사주 오행과 현재 단계의 조화 체크
  const phaseToElement: Record<string, string> = {
    lunar: "water",
    mercury: "metal", // 수성=금
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
      // 현재 단계가 일간을 생해주면 길
      if (phaseElement === relations.generatedBy) {
        result.score += 8;
        result.positive = true;
        result.factorKeys.push("progressionSupport");
      }
      // 현재 단계가 일간을 극하면 도전
      else if (phaseElement === relations.controlledBy) {
        result.score -= 5;
        result.negative = true;
        result.factorKeys.push("progressionChallenge");
      }
    }
  }

  // 7년 주기 전환점 (중요한 변화의 해)
  const cycleYears = [7, 14, 21, 28, 29, 30, 35, 42, 49, 56, 63, 70, 77, 84];
  if (cycleYears.includes(age)) {
    result.score += 3;
    result.factorKeys.push("progressionCycleYear");
  }

  // Saturn Return (29-30세, 58-60세) - 중요한 성숙기
  if (age >= 29 && age <= 30) {
    result.factorKeys.push("saturnReturnFirst");
    // 도전과 성장의 시기
  } else if (age >= 58 && age <= 60) {
    result.factorKeys.push("saturnReturnSecond");
  }

  return result;
}

// ============================================================
// 세운(歲運) - 연간 운세 계산
// ============================================================

/**
 * 해당 연도의 천간지지 (세운) 계산
 * 1984년이 甲子년 기준
 */
export function getYearGanzhi(year: number): { stem: string; branch: string; stemElement: string; branchElement: string } {
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

/**
 * 세운 점수 계산 - 일간과 세운 천간/지지 관계
 */
function calculateSeunScore(dayMasterElement: string, dayBranch: string | undefined, year: number): {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
} {
  const yearGanzhi = getYearGanzhi(year);
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  if (!relations) return { score: 0, factorKeys: [], positive: false, negative: false };

  // 세운 천간과 일간 관계
  if (yearGanzhi.stemElement === dayMasterElement) {
    score += 8; // 비화 - 힘 보충
    factorKeys.push("seunBijeon");
    positive = true;
  } else if (yearGanzhi.stemElement === relations.generatedBy) {
    score += 12; // 인성 - 도움받는 해
    factorKeys.push("seunInseong");
    positive = true;
  } else if (yearGanzhi.stemElement === relations.controls) {
    score += 10; // 재성 - 재물 기회
    factorKeys.push("seunJaeseong");
    positive = true;
  } else if (yearGanzhi.stemElement === relations.generates) {
    score += 5; // 식상 - 창작/표현
    factorKeys.push("seunSiksang");
  } else if (yearGanzhi.stemElement === relations.controlledBy) {
    score -= 12; // 관살 - 압박의 해
    factorKeys.push("seunGwansal");
    negative = true;
  }

  // 세운 지지와 일지 관계
  if (dayBranch) {
    // 삼합
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

    // 육합
    if (YUKHAP[dayBranch] === yearGanzhi.branch) {
      score += 12;
      factorKeys.push("seunYukhap");
      positive = true;
    }

    // 충
    if (CHUNG[dayBranch] === yearGanzhi.branch) {
      score -= 18;
      factorKeys.push("seunChung");
      negative = true;
    }
  }

  return { score, factorKeys, positive, negative };
}

// ============================================================
// 월운(月運) - 월간 운세 계산
// ============================================================

/**
 * 해당 월의 천간지지 (월운) 계산
 * 인월(寅月, 2월)부터 시작
 */
export function getMonthGanzhi(year: number, month: number): { stem: string; branch: string; stemElement: string; branchElement: string } {
  // 월지: 인월(2월)이 寅, 3월이 卯...
  const branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // 寅부터 시작
  const branchIndex = branchOrder[(month - 1) % 12];
  const branch = BRANCHES[branchIndex];

  // 월간 계산: 연간에 따라 결정
  const yearGanzhi = getYearGanzhi(year);

  // 월간 시작 규칙 (갑기토, 을경금, 병신수, 정임목, 무계화)
  const monthStemStart: Record<string, number> = {
    "甲": 2, "己": 2,  // 丙부터
    "乙": 4, "庚": 4,  // 戊부터
    "丙": 6, "辛": 6,  // 庚부터
    "丁": 8, "壬": 8,  // 壬부터
    "戊": 0, "癸": 0,  // 甲부터
  };

  const startStemIndex = monthStemStart[yearGanzhi.stem] || 0;
  const monthOffset = (month - 1) % 12; // 1월 = 0
  const stemIndex = (startStemIndex + monthOffset) % 10;
  const stem = STEMS[stemIndex];

  return {
    stem,
    branch,
    stemElement: STEM_TO_ELEMENT[stem] || "wood",
    branchElement: BRANCH_TO_ELEMENT[branch] || "earth",
  };
}

/**
 * 월운 점수 계산
 */
function calculateWolunScore(dayMasterElement: string, dayBranch: string | undefined, year: number, month: number): {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
} {
  const monthGanzhi = getMonthGanzhi(year, month);
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  if (!relations) return { score: 0, factorKeys: [], positive: false, negative: false };

  // 월운 천간과 일간 관계
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

  // 월운 지지와 일지 관계
  if (dayBranch) {
    // 삼합
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(monthGanzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 10;
          factorKeys.push("wolunSamhap");
          positive = true;
        }
      }
    }

    // 육합
    if (YUKHAP[dayBranch] === monthGanzhi.branch) {
      score += 8;
      factorKeys.push("wolunYukhap");
      positive = true;
    }

    // 충
    if (CHUNG[dayBranch] === monthGanzhi.branch) {
      score -= 12;
      factorKeys.push("wolunChung");
      negative = true;
    }
  }

  return { score, factorKeys, positive, negative };
}

// ============================================================
// 일진(日辰) - 일별 운세 계산
// ============================================================

/**
 * 일진 점수 계산 - 당일 천간지지와 일간/일지 관계
 */
function calculateIljinScore(
  dayMasterElement: string,
  dayMasterStem: string,
  dayBranch: string | undefined,
  targetDate: Date
): {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  ganzhi: { stem: string; branch: string; stemElement: string; branchElement: string };
} {
  const ganzhi = getGanzhiForDate(targetDate);
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  if (!relations) {
    return { score: 0, factorKeys: [], positive: false, negative: false, ganzhi };
  }

  // === 1. 일진 천간(天干)과 일간 관계 ===
  const iljinStemElement = ganzhi.stemElement;

  if (iljinStemElement === dayMasterElement) {
    // 비견 - 자기 힘 강화, 경쟁도 있음
    score += 8;
    factorKeys.push("iljinBijeon");
    positive = true;
  } else if (iljinStemElement === relations.generatedBy) {
    // 인성 - 도움받는 날
    score += 12;
    factorKeys.push("iljinInseong");
    positive = true;
  } else if (iljinStemElement === relations.controls) {
    // 재성 - 재물운 좋은 날
    score += 10;
    factorKeys.push("iljinJaeseong");
    positive = true;
  } else if (iljinStemElement === relations.generates) {
    // 식상 - 창작/표현의 날
    score += 5;
    factorKeys.push("iljinSiksang");
  } else if (iljinStemElement === relations.controlledBy) {
    // 관살 - 압박의 날
    score -= 10;
    factorKeys.push("iljinGwansal");
    negative = true;
  }

  // === 2. 일진 지지(地支)와 일지 관계 ===
  if (dayBranch) {
    const iljinBranch = ganzhi.branch;

    // 삼합 (三合) - 가장 강력한 조화
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(iljinBranch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 15;
          factorKeys.push("iljinSamhap");
          positive = true;
        } else if (element === relations.controlledBy) {
          score -= 8;
          factorKeys.push("iljinSamhapNegative");
          negative = true;
        }
        break;
      }
    }

    // 육합 (六合) - 인연, 화합
    if (YUKHAP[dayBranch] === iljinBranch) {
      score += 12;
      factorKeys.push("iljinYukhap");
      positive = true;
    }

    // 충 (冲) - 충돌, 변화
    if (CHUNG[dayBranch] === iljinBranch) {
      score -= 15;
      factorKeys.push("iljinChung");
      negative = true;
    }

    // 형 (刑) - 형벌, 장애
    const xingTargets = XING[dayBranch];
    if (xingTargets && xingTargets.includes(iljinBranch)) {
      score -= 8;
      factorKeys.push("iljinXing");
      negative = true;
    }

    // 해 (害) - 해침, 방해
    if (HAI[dayBranch] === iljinBranch) {
      score -= 6;
      factorKeys.push("iljinHai");
      negative = true;
    }
  }

  // === 3. 십신(十神) 세부 분석 ===
  const sipsin = getSipsin(dayMasterStem, ganzhi.stem);
  if (sipsin) {
    factorKeys.push(`iljinSipsin_${sipsin}`);

    // 십신별 추가 점수
    switch (sipsin) {
      case "정재":
        score += 5;
        positive = true;
        break;
      case "편재":
        score += 3;
        break;
      case "정인":
        score += 6;
        positive = true;
        break;
      case "편인":
        score += 2;
        break;
      case "정관":
        score += 5;
        positive = true;
        break;
      case "편관":
        score -= 4;
        negative = true;
        break;
      case "상관":
        score -= 3;
        break;
      case "식신":
        score += 4;
        positive = true;
        break;
      case "비견":
        score += 2;
        break;
      case "겁재":
        score -= 2;
        break;
    }
  }

  return { score, factorKeys, positive, negative, ganzhi };
}

// ============================================================
// 대운(大運) - 10년 주기 운세 계산
// ============================================================

/**
 * 현재 나이에 해당하는 대운 찾기
 */
function getCurrentDaeun(daeunCycles: DaeunCycle[] | undefined, birthYear: number | undefined, targetYear: number): DaeunCycle | null {
  if (!daeunCycles || daeunCycles.length === 0 || !birthYear) return null;

  const age = targetYear - birthYear + 1; // 한국식 나이

  // 현재 나이에 해당하는 대운 찾기
  for (let i = daeunCycles.length - 1; i >= 0; i--) {
    if (age >= daeunCycles[i].age) {
      return daeunCycles[i];
    }
  }

  // 첫 대운 이전인 경우
  return daeunCycles[0] || null;
}

/**
 * 대운 점수 계산 - 현재 10년 대운과 일간 관계
 */
function calculateDaeunScore(
  dayMasterElement: string,
  dayBranch: string | undefined,
  daeunCycles: DaeunCycle[] | undefined,
  birthYear: number | undefined,
  targetYear: number
): {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  currentDaeun: DaeunCycle | null;
} {
  const currentDaeun = getCurrentDaeun(daeunCycles, birthYear, targetYear);

  if (!currentDaeun) {
    return { score: 0, factorKeys: [], positive: false, negative: false, currentDaeun: null };
  }

  const relations = ELEMENT_RELATIONS[dayMasterElement];
  if (!relations) {
    return { score: 0, factorKeys: [], positive: false, negative: false, currentDaeun };
  }

  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  const daeunStemElement = STEM_TO_ELEMENT[currentDaeun.heavenlyStem] || "wood";

  // 대운 천간과 일간 관계 (대운은 영향력이 큼)
  if (daeunStemElement === dayMasterElement) {
    score += 15; // 비화 - 힘 보충
    factorKeys.push("daeunBijeon");
    positive = true;
  } else if (daeunStemElement === relations.generatedBy) {
    score += 20; // 인성 - 도움받는 대운 (매우 좋음)
    factorKeys.push("daeunInseong");
    positive = true;
  } else if (daeunStemElement === relations.controls) {
    score += 18; // 재성 - 재물운 대운
    factorKeys.push("daeunJaeseong");
    positive = true;
  } else if (daeunStemElement === relations.generates) {
    score += 10; // 식상 - 창작/표현 대운
    factorKeys.push("daeunSiksang");
  } else if (daeunStemElement === relations.controlledBy) {
    score -= 15; // 관살 - 압박의 대운
    factorKeys.push("daeunGwansal");
    negative = true;
  }

  // 대운 지지와 일지 관계
  if (dayBranch) {
    // 삼합
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(currentDaeun.earthlyBranch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 18;
          factorKeys.push("daeunSamhap");
          positive = true;
        } else if (element === relations.controlledBy) {
          score -= 12;
          factorKeys.push("daeunSamhapNegative");
          negative = true;
        }
        break;
      }
    }

    // 육합
    if (YUKHAP[dayBranch] === currentDaeun.earthlyBranch) {
      score += 15;
      factorKeys.push("daeunYukhap");
      positive = true;
    }

    // 충
    if (CHUNG[dayBranch] === currentDaeun.earthlyBranch) {
      score -= 20;
      factorKeys.push("daeunChung");
      negative = true;
    }
  }

  // 대운 십신 분석 (sibsin 데이터 활용)
  if (currentDaeun.sibsin) {
    const { cheon, ji } = currentDaeun.sibsin;

    // 천간 십신
    if (cheon === "정인" || cheon === "편인") {
      score += 8;
      factorKeys.push("daeunSibsinInseong");
      positive = true;
    } else if (cheon === "정재" || cheon === "편재") {
      score += 10;
      factorKeys.push("daeunSibsinJaeseong");
      positive = true;
    } else if (cheon === "정관") {
      score += 8;
      factorKeys.push("daeunSibsinJeonggwan");
      positive = true;
    } else if (cheon === "편관") {
      score -= 5;
      factorKeys.push("daeunSibsinPyeongwan");
    } else if (cheon === "상관") {
      score -= 3;
      factorKeys.push("daeunSibsinSanggwan");
    }

    // 지지 십신
    if (ji === "정인" || ji === "편인") {
      score += 5;
    } else if (ji === "정재" || ji === "편재") {
      score += 7;
    } else if (ji === "정관") {
      score += 5;
    } else if (ji === "편관") {
      score -= 3;
    }
  }

  return { score, factorKeys, positive, negative, currentDaeun };
}

// ============================================================
// 음력 달 위상 계산 (실제 계산)
// ============================================================

/**
 * 달의 위상 계산 (0-29.5일 주기)
 * 0 = 신월, 7.4 = 상현, 14.8 = 보름, 22.1 = 하현
 */
function getLunarPhase(date: Date): { phase: number; phaseName: string; phaseScore: number } {
  // 2000년 1월 6일 18:14 UTC 신월 기준
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
  const lunarCycle = 29.53058867; // 평균 삭망월 (일)

  const diffMs = date.getTime() - knownNewMoon.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const phase = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;

  let phaseName: string;
  let phaseScore: number;

  if (phase < 1.85) {
    phaseName = "newMoon"; // 신월 (新月)
    phaseScore = 10; // 새로운 시작에 좋음
  } else if (phase < 7.38) {
    phaseName = "waxingCrescent"; // 초승달
    phaseScore = 5;
  } else if (phase < 9.23) {
    phaseName = "firstQuarter"; // 상현달
    phaseScore = -3; // 긴장/도전
  } else if (phase < 14.77) {
    phaseName = "waxingGibbous"; // 상현망
    phaseScore = 7;
  } else if (phase < 16.61) {
    phaseName = "fullMoon"; // 보름달
    phaseScore = 12; // 완성/성취
  } else if (phase < 22.15) {
    phaseName = "waningGibbous"; // 하현망
    phaseScore = 3;
  } else if (phase < 24.00) {
    phaseName = "lastQuarter"; // 하현달
    phaseScore = -5; // 정리/반성
  } else {
    phaseName = "waningCrescent"; // 그믐달
    phaseScore = -2;
  }

  return { phase, phaseName, phaseScore };
}

// ============================================================
// 행성 트랜짓 계산 (전체 행성)
// ============================================================

type PlanetName = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";

/**
 * 행성 별자리 및 황경 근사 계산 (평균 공전 주기 기반)
 * 정밀 계산은 ephemeris 필요하지만, 근사값으로 트랜짓 효과 제공
 */
function getPlanetPosition(date: Date, planet: PlanetName): { sign: string; longitude: number; degree: number } {
  // 기준일: 2000년 1월 1일 각 행성 위치
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const daysSinceJ2000 = (date.getTime() - J2000.getTime()) / (1000 * 60 * 60 * 24);

  let longitude: number;

  switch (planet) {
    case "sun":
      // 태양: 1년 공전
      longitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
      break;
    case "moon":
      // 달: 27.3일 공전 (빠른 이동)
      longitude = (218.32 + 13.176396 * daysSinceJ2000) % 360;
      break;
    case "mercury":
      // 수성: 태양 주변 88일 공전
      longitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
      longitude = (longitude + Math.sin(daysSinceJ2000 * 0.0712) * 23) % 360;
      break;
    case "venus":
      // 금성: 225일 공전
      longitude = (181.98 + 1.6021 * daysSinceJ2000) % 360;
      break;
    case "mars":
      // 화성: 687일 공전 (~2년)
      longitude = (355.43 + 0.5240 * daysSinceJ2000) % 360;
      break;
    case "jupiter":
      // 목성: 4332일 공전 (~12년) - 년운에 중요!
      longitude = (34.35 + 0.0831 * daysSinceJ2000) % 360;
      break;
    case "saturn":
      // 토성: 10759일 공전 (~29년) - 시련/성장
      longitude = (49.94 + 0.0335 * daysSinceJ2000) % 360;
      break;
  }

  if (longitude < 0) longitude += 360;

  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                 "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = longitude % 30;

  return { sign: signs[signIndex], longitude, degree };
}

// 기존 호환성을 위한 래퍼
function getPlanetSign(date: Date, planet: "mercury" | "venus" | "mars"): string {
  return getPlanetPosition(date, planet).sign;
}

// ============================================================
// 고급 점성학: 역행(Retrograde) 계산
// ============================================================

type RetrogradePlanet = "mercury" | "venus" | "mars" | "jupiter" | "saturn";

/**
 * 행성 역행 여부 확인 (근사 계산)
 * - 수성: 약 3주간, 연 3-4회
 * - 금성: 약 40일간, 18개월마다
 * - 화성: 약 2개월간, 2년마다
 * - 목성: 약 4개월간, 매년
 * - 토성: 약 4.5개월간, 매년
 */
function isRetrograde(date: Date, planet: RetrogradePlanet): boolean {
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const daysSinceJ2000 = (date.getTime() - J2000.getTime()) / (1000 * 60 * 60 * 24);

  switch (planet) {
    case "mercury":
      // 수성 역행: ~116일 주기 중 약 21일 역행
      const mercuryCycle = daysSinceJ2000 % 116;
      return mercuryCycle >= 0 && mercuryCycle < 21;

    case "venus":
      // 금성 역행: ~584일 주기 중 약 40일 역행
      const venusCycle = daysSinceJ2000 % 584;
      return venusCycle >= 0 && venusCycle < 40;

    case "mars":
      // 화성 역행: ~780일 주기 중 약 72일 역행
      const marsCycle = daysSinceJ2000 % 780;
      return marsCycle >= 0 && marsCycle < 72;

    case "jupiter":
      // 목성 역행: ~399일 주기 중 약 121일 역행
      const jupiterCycle = daysSinceJ2000 % 399;
      return jupiterCycle >= 0 && jupiterCycle < 121;

    case "saturn":
      // 토성 역행: ~378일 주기 중 약 138일 역행
      const saturnCycle = daysSinceJ2000 % 378;
      return saturnCycle >= 0 && saturnCycle < 138;
  }
}

/**
 * 모든 역행 행성 목록 반환
 */
function getRetrogradePlanetsForDate(date: Date): RetrogradePlanet[] {
  const planets: RetrogradePlanet[] = ["mercury", "venus", "mars", "jupiter", "saturn"];
  return planets.filter(p => isRetrograde(date, p));
}

// ============================================================
// 고급 점성학: Void of Course Moon (공허한 달)
// ============================================================

/**
 * Void of Course Moon 체크 (간단 버전)
 * 달이 현재 별자리에서 다른 행성과 주요 어스펙트를 형성하지 않는 상태
 * 새로운 시작에 불리한 시간
 */
function checkVoidOfCourseMoon(date: Date): { isVoid: boolean; moonSign: string; hoursRemaining: number } {
  const moonPos = getPlanetPosition(date, "moon");
  const moonDegree = moonPos.degree;

  // 주요 행성들 위치
  const sunPos = getPlanetPosition(date, "sun");
  const mercuryPos = getPlanetPosition(date, "mercury");
  const venusPos = getPlanetPosition(date, "venus");
  const marsPos = getPlanetPosition(date, "mars");
  const jupiterPos = getPlanetPosition(date, "jupiter");
  const saturnPos = getPlanetPosition(date, "saturn");

  const planets = [sunPos, mercuryPos, venusPos, marsPos, jupiterPos, saturnPos];

  // 달이 현재 별자리를 벗어날 때까지 남은 도수
  const degreesToSignEnd = 30 - moonDegree;

  // 달이 현재 별자리 내에서 다른 행성과 어스펙트를 형성하는지 확인
  let hasUpcomingAspect = false;

  for (const planet of planets) {
    // 같은 별자리에 있으면 합 가능
    if (planet.sign === moonPos.sign && planet.degree > moonDegree) {
      hasUpcomingAspect = true;
      break;
    }

    // 다른 어스펙트 각도 확인 (60, 90, 120, 180)
    const aspectAngles = [60, 90, 120, 180];
    for (const angle of aspectAngles) {
      const targetLon = (moonPos.longitude + angle) % 360;
      const targetSign = Math.floor(targetLon / 30);
      const moonCurrentSign = Math.floor(moonPos.longitude / 30);

      // 달이 현재 별자리 안에서 이 어스펙트에 도달할 수 있는지
      if (targetSign === moonCurrentSign) {
        const targetDegree = targetLon % 30;
        if (targetDegree > moonDegree) {
          // 행성이 이 위치 근처에 있는지 (±3도)
          const diff = Math.abs(planet.longitude - targetLon);
          if (diff <= 3 || diff >= 357) {
            hasUpcomingAspect = true;
            break;
          }
        }
      }
    }
    if (hasUpcomingAspect) break;
  }

  // 달 이동 속도: 약 13도/일 = 약 0.54도/시간
  const hoursRemaining = degreesToSignEnd / 0.54;

  return {
    isVoid: !hasUpcomingAspect,
    moonSign: moonPos.sign,
    hoursRemaining: Math.round(hoursRemaining),
  };
}

// ============================================================
// 고급 점성학: Eclipse (일/월식) 영향
// ============================================================

interface EclipseData {
  date: Date;
  type: "solar" | "lunar";
  sign: string;
  degree: number;
}

// 2024-2030년 주요 일/월식 데이터
const ECLIPSES: EclipseData[] = [
  // 2024
  { date: new Date(2024, 2, 25), type: "lunar", sign: "Libra", degree: 5 },
  { date: new Date(2024, 3, 8), type: "solar", sign: "Aries", degree: 19 },
  { date: new Date(2024, 8, 18), type: "lunar", sign: "Pisces", degree: 25 },
  { date: new Date(2024, 9, 2), type: "solar", sign: "Libra", degree: 10 },
  // 2025
  { date: new Date(2025, 2, 14), type: "lunar", sign: "Virgo", degree: 24 },
  { date: new Date(2025, 2, 29), type: "solar", sign: "Aries", degree: 9 },
  { date: new Date(2025, 8, 7), type: "lunar", sign: "Pisces", degree: 15 },
  { date: new Date(2025, 8, 21), type: "solar", sign: "Virgo", degree: 29 },
  // 2026
  { date: new Date(2026, 2, 3), type: "lunar", sign: "Virgo", degree: 14 },
  { date: new Date(2026, 2, 17), type: "solar", sign: "Pisces", degree: 27 },
  { date: new Date(2026, 7, 28), type: "lunar", sign: "Pisces", degree: 5 },
  { date: new Date(2026, 8, 12), type: "solar", sign: "Virgo", degree: 19 },
  // 2027
  { date: new Date(2027, 1, 6), type: "lunar", sign: "Leo", degree: 18 },
  { date: new Date(2027, 1, 20), type: "solar", sign: "Pisces", degree: 1 },
  { date: new Date(2027, 7, 2), type: "lunar", sign: "Aquarius", degree: 10 },
  { date: new Date(2027, 7, 17), type: "solar", sign: "Leo", degree: 24 },
  // 2028
  { date: new Date(2028, 0, 12), type: "lunar", sign: "Cancer", degree: 22 },
  { date: new Date(2028, 0, 26), type: "solar", sign: "Aquarius", degree: 6 },
  { date: new Date(2028, 6, 6), type: "lunar", sign: "Capricorn", degree: 15 },
  { date: new Date(2028, 6, 22), type: "solar", sign: "Cancer", degree: 29 },
  { date: new Date(2028, 11, 5), type: "lunar", sign: "Gemini", degree: 14 },
  { date: new Date(2028, 11, 31), type: "solar", sign: "Capricorn", degree: 10 },
  // 2029
  { date: new Date(2029, 5, 12), type: "lunar", sign: "Sagittarius", degree: 21 },
  { date: new Date(2029, 5, 26), type: "solar", sign: "Cancer", degree: 5 },
  { date: new Date(2029, 11, 5), type: "lunar", sign: "Gemini", degree: 14 },
  { date: new Date(2029, 11, 20), type: "solar", sign: "Sagittarius", degree: 29 },
  // 2030
  { date: new Date(2030, 5, 1), type: "lunar", sign: "Sagittarius", degree: 11 },
  { date: new Date(2030, 5, 15), type: "solar", sign: "Gemini", degree: 25 },
  { date: new Date(2030, 10, 25), type: "lunar", sign: "Taurus", degree: 3 },
  { date: new Date(2030, 11, 9), type: "solar", sign: "Sagittarius", degree: 18 },
];

/**
 * 주어진 날짜에 일/월식 영향이 있는지 확인
 * - 일/월식 당일: 강한 영향
 * - 전후 3일: 중간 영향
 * - 전후 7일: 약한 영향
 */
function checkEclipseImpact(date: Date): {
  hasImpact: boolean;
  type: "solar" | "lunar" | null;
  intensity: "strong" | "medium" | "weak" | null;
  sign: string | null;
  daysFromEclipse: number | null;
} {
  for (const eclipse of ECLIPSES) {
    const diffMs = Math.abs(date.getTime() - eclipse.date.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) {
      return { hasImpact: true, type: eclipse.type, intensity: "strong", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    } else if (diffDays <= 3) {
      return { hasImpact: true, type: eclipse.type, intensity: "medium", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    } else if (diffDays <= 7) {
      return { hasImpact: true, type: eclipse.type, intensity: "weak", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    }
  }

  return { hasImpact: false, type: null, intensity: null, sign: null, daysFromEclipse: null };
}

// ============================================================
// 고급 점성학: Planetary Hour (행성 시간)
// ============================================================

type PlanetaryHourPlanet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";

const PLANETARY_HOUR_SEQUENCE: PlanetaryHourPlanet[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
const DAY_RULERS: Record<number, PlanetaryHourPlanet> = {
  0: "Sun",      // Sunday
  1: "Moon",     // Monday
  2: "Mars",     // Tuesday
  3: "Mercury",  // Wednesday
  4: "Jupiter",  // Thursday
  5: "Venus",    // Friday
  6: "Saturn",   // Saturday
};

/**
 * 현재 행성 시간 계산 (간단 버전 - 고정 일출/일몰 사용)
 */
function getPlanetaryHourForDate(date: Date): {
  planet: PlanetaryHourPlanet;
  dayRuler: PlanetaryHourPlanet;
  isDay: boolean;
  goodFor: string[];
} {
  const dayOfWeek = date.getDay();
  const dayRuler = DAY_RULERS[dayOfWeek];
  const hour = date.getHours();

  // 간단히 6시-18시를 낮으로 가정
  const isDay = hour >= 6 && hour < 18;

  // 낮/밤 시간에 따른 시간 인덱스
  let hourIndex: number;
  if (isDay) {
    hourIndex = Math.floor((hour - 6) / 1); // 낮 시간
  } else {
    hourIndex = hour >= 18 ? (hour - 18) + 12 : (hour + 6) + 12;
  }
  hourIndex = hourIndex % 24;

  // 행성 시간 계산
  const dayRulerIndex = PLANETARY_HOUR_SEQUENCE.indexOf(dayRuler);
  const planetIndex = (dayRulerIndex + hourIndex) % 7;
  const planet = PLANETARY_HOUR_SEQUENCE[planetIndex];

  // 행성별 좋은 활동
  const PLANETARY_HOUR_USES: Record<PlanetaryHourPlanet, string[]> = {
    Sun: ["리더십", "권위", "성공", "명예", "건강"],
    Moon: ["가정", "직관", "대중", "부동산", "여행"],
    Mercury: ["커뮤니케이션", "문서", "학습", "거래", "계약"],
    Venus: ["사랑", "예술", "아름다움", "재물", "조화"],
    Mars: ["경쟁", "운동", "수술", "용기", "행동"],
    Jupiter: ["확장", "교육", "법률", "해외", "행운"],
    Saturn: ["구조화", "장기계획", "부동산", "책임", "인내"],
  };

  return {
    planet,
    dayRuler,
    isDay,
    goodFor: PLANETARY_HOUR_USES[planet],
  };
}

// ============================================================
// 고급 점성학: 8가지 Moon Phase (8위상)
// ============================================================

type MoonPhaseType =
  | "new_moon"        // 삭 (새달)
  | "waxing_crescent" // 초승달
  | "first_quarter"   // 상현달
  | "waxing_gibbous"  // 차오르는 달
  | "full_moon"       // 보름달
  | "waning_gibbous"  // 기우는 달
  | "last_quarter"    // 하현달
  | "waning_crescent";// 그믐달

/**
 * 정밀 Moon Phase 계산 (8위상)
 */
function getMoonPhaseDetailed(date: Date): {
  phase: MoonPhaseType;
  phaseName: string;
  illumination: number;
  isWaxing: boolean;
  factorKey: string;
  score: number;
} {
  const sunPos = getPlanetPosition(date, "sun");
  const moonPos = getPlanetPosition(date, "moon");

  // 태양-달 각도
  const angle = (moonPos.longitude - sunPos.longitude + 360) % 360;

  // 조도 계산 (0-100%)
  const illumination = Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100);
  const isWaxing = angle < 180;

  let phase: MoonPhaseType;
  let phaseName: string;
  let factorKey: string;
  let score: number;

  if (angle < 22.5 || angle >= 337.5) {
    phase = "new_moon";
    phaseName = "삭 (새달)";
    factorKey = "moonPhaseNew";
    score = 8; // 새로운 시작에 좋음
  } else if (angle < 67.5) {
    phase = "waxing_crescent";
    phaseName = "초승달";
    factorKey = "moonPhaseWaxingCrescent";
    score = 10; // 성장/시작에 최고
  } else if (angle < 112.5) {
    phase = "first_quarter";
    phaseName = "상현달";
    factorKey = "moonPhaseFirstQuarter";
    score = 5; // 도전/결정 필요
  } else if (angle < 157.5) {
    phase = "waxing_gibbous";
    phaseName = "차오르는 달";
    factorKey = "moonPhaseWaxingGibbous";
    score = 7; // 정제/완성 단계
  } else if (angle < 202.5) {
    phase = "full_moon";
    phaseName = "보름달";
    factorKey = "moonPhaseFull";
    score = 12; // 완성/결실 최고
  } else if (angle < 247.5) {
    phase = "waning_gibbous";
    phaseName = "기우는 달";
    factorKey = "moonPhaseWaningGibbous";
    score = 4; // 감사/공유
  } else if (angle < 292.5) {
    phase = "last_quarter";
    phaseName = "하현달";
    factorKey = "moonPhaseLastQuarter";
    score = 0; // 정리/반성
  } else {
    phase = "waning_crescent";
    phaseName = "그믐달";
    factorKey = "moonPhaseWaningCrescent";
    score = -3; // 휴식/준비
  }

  return { phase, phaseName, illumination, isWaxing, factorKey, score };
}

/**
 * 어스펙트(각도 관계) 계산
 * - Conjunction (합): 0° ±8° - 에너지 융합
 * - Sextile (육분): 60° ±6° - 기회
 * - Square (사각): 90° ±8° - 긴장/도전
 * - Trine (삼분): 120° ±8° - 조화/행운
 * - Opposition (충): 180° ±8° - 대립/균형
 */
function getAspect(longitude1: number, longitude2: number): { aspect: string | null; orb: number } {
  let diff = Math.abs(longitude1 - longitude2);
  if (diff > 180) diff = 360 - diff;

  // Conjunction (합)
  if (diff <= 8) return { aspect: "conjunction", orb: diff };
  // Sextile (육분)
  if (Math.abs(diff - 60) <= 6) return { aspect: "sextile", orb: Math.abs(diff - 60) };
  // Square (사각)
  if (Math.abs(diff - 90) <= 8) return { aspect: "square", orb: Math.abs(diff - 90) };
  // Trine (삼분)
  if (Math.abs(diff - 120) <= 8) return { aspect: "trine", orb: Math.abs(diff - 120) };
  // Opposition (충)
  if (Math.abs(diff - 180) <= 8) return { aspect: "opposition", orb: Math.abs(diff - 180) };

  return { aspect: null, orb: diff };
}

/**
 * 행성 트랜짓 분석
 */
function analyzePlanetTransits(
  date: Date,
  natalSunSign: string,
  natalSunElement: string,
  natalSunLongitude?: number // 출생 차트의 태양 경도 (어스펙트 분석용)
): {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
} {
  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  // 모든 행성 위치 계산
  const sunPos = getPlanetPosition(date, "sun");
  const moonPos = getPlanetPosition(date, "moon");
  const mercuryPos = getPlanetPosition(date, "mercury");
  const venusPos = getPlanetPosition(date, "venus");
  const marsPos = getPlanetPosition(date, "mars");
  const jupiterPos = getPlanetPosition(date, "jupiter");
  const saturnPos = getPlanetPosition(date, "saturn");

  const mercuryElement = normalizeElement(ZODIAC_TO_ELEMENT[mercuryPos.sign] || "fire");
  const venusElement = normalizeElement(ZODIAC_TO_ELEMENT[venusPos.sign] || "earth");
  const marsElement = normalizeElement(ZODIAC_TO_ELEMENT[marsPos.sign] || "fire");
  const jupiterElement = normalizeElement(ZODIAC_TO_ELEMENT[jupiterPos.sign] || "fire");
  const saturnElement = normalizeElement(ZODIAC_TO_ELEMENT[saturnPos.sign] || "earth");
  const sunElement = normalizeElement(ZODIAC_TO_ELEMENT[sunPos.sign] || "fire");
  const moonElement = normalizeElement(ZODIAC_TO_ELEMENT[moonPos.sign] || "water");

  // ============================================================
  // 수성 트랜짓 분석 (의사소통, 지성, 계약)
  // ============================================================
  if (mercuryPos.sign === natalSunSign) {
    score += 8;
    factorKeys.push("mercuryConjunct");
    positive = true;
  } else if (mercuryElement === natalSunElement) {
    score += 4;
    factorKeys.push("mercuryHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === mercuryElement) {
    score -= 3;
    factorKeys.push("mercuryTension");
  }

  // ============================================================
  // 금성 트랜짓 분석 (사랑, 재물, 예술)
  // ============================================================
  if (venusPos.sign === natalSunSign) {
    score += 10;
    factorKeys.push("venusConjunct");
    positive = true;
  } else if (venusElement === natalSunElement) {
    score += 5;
    factorKeys.push("venusHarmony");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === venusElement) {
    score += 7;
    factorKeys.push("venusSupport");
    positive = true;
  }

  // ============================================================
  // 화성 트랜짓 분석 (행동, 에너지, 갈등)
  // ============================================================
  if (marsPos.sign === natalSunSign) {
    score += 5;
    factorKeys.push("marsConjunct");
    // 화성 합은 에너지 증가지만 갈등 위험도 있음
  } else if (marsElement === natalSunElement) {
    score += 3;
    factorKeys.push("marsHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === marsElement) {
    score -= 8;
    factorKeys.push("marsConflict");
    negative = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === marsElement) {
    score += 6;
    factorKeys.push("marsVictory");
    positive = true;
  }

  // ============================================================
  // 목성 트랜짓 분석 (확장, 행운, 년운 - 세운과 유사)
  // 목성은 12년 주기로 가장 중요한 행운의 행성
  // ============================================================
  if (jupiterPos.sign === natalSunSign) {
    // 목성 합 - 12년에 한 번 오는 최대 행운기!
    score += 15;
    factorKeys.push("jupiterConjunct");
    positive = true;
  } else if (jupiterElement === natalSunElement) {
    // 같은 원소 - 조화로운 확장
    score += 8;
    factorKeys.push("jupiterHarmony");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === jupiterElement) {
    // 생하는 관계 - 자연스러운 성장
    score += 10;
    factorKeys.push("jupiterGrowth");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === jupiterElement) {
    // 극하는 관계 - 과욕/과잉 주의
    score -= 4;
    factorKeys.push("jupiterExcess");
  }

  // ============================================================
  // 토성 트랜짓 분석 (시련, 교훈, 책임 - 대운의 관살과 유사)
  // 토성은 29년 주기로 인생의 중요한 시련과 성장
  // ============================================================
  if (saturnPos.sign === natalSunSign) {
    // 토성 합 - Saturn Return 등 인생 전환점
    score -= 10;
    factorKeys.push("saturnConjunct");
    negative = true;
  } else if (saturnElement === natalSunElement) {
    // 같은 원소 - 책임감 있는 성장
    score -= 3;
    factorKeys.push("saturnDiscipline");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === saturnElement) {
    // 내가 극 - 극복 가능한 시련
    score += 5;
    factorKeys.push("saturnOvercome");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === saturnElement) {
    // 극 당함 - 피할 수 없는 교훈
    score -= 12;
    factorKeys.push("saturnLesson");
    negative = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === saturnElement) {
    // 생 받음 - 구조화된 성장
    score += 3;
    factorKeys.push("saturnStructure");
  }

  // ============================================================
  // 태양 트랜짓 분석 (자아, 활력, 목표)
  // ============================================================
  if (sunPos.sign === natalSunSign) {
    // 생일 시즌 - Solar Return!
    score += 12;
    factorKeys.push("solarReturn");
    positive = true;
  } else if (sunElement === natalSunElement) {
    score += 4;
    factorKeys.push("sunHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === sunElement) {
    score += 6;
    factorKeys.push("sunEnergize");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === sunElement) {
    score -= 4;
    factorKeys.push("sunChallenge");
  }

  // ============================================================
  // 달 트랜짓 분석 (감정, 직관, 일상)
  // 달은 빠르게 이동하므로 일일 변화에 큰 영향
  // ============================================================
  if (moonPos.sign === natalSunSign) {
    score += 8;
    factorKeys.push("moonConjunct");
    positive = true;
  } else if (moonElement === natalSunElement) {
    score += 4;
    factorKeys.push("moonHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === moonElement) {
    score += 5;
    factorKeys.push("moonNurture");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === moonElement) {
    score -= 3;
    factorKeys.push("moonEmotional");
  }

  // ============================================================
  // 어스펙트 분석 (행성 간 각도 관계)
  // 사주의 합/충/형과 유사한 개념
  // ============================================================
  if (natalSunLongitude !== undefined) {
    // 목성-네이탈 태양 어스펙트 (가장 중요!)
    const jupiterAspect = getAspect(jupiterPos.longitude, natalSunLongitude);
    if (jupiterAspect.aspect) {
      switch (jupiterAspect.aspect) {
        case "conjunction":
          // 이미 위에서 처리됨
          break;
        case "trine":
          score += 12;
          factorKeys.push("jupiterTrine");
          positive = true;
          break;
        case "sextile":
          score += 8;
          factorKeys.push("jupiterSextile");
          positive = true;
          break;
        case "square":
          score -= 5;
          factorKeys.push("jupiterSquare");
          break;
        case "opposition":
          score -= 3;
          factorKeys.push("jupiterOpposition");
          break;
      }
    }

    // 토성-네이탈 태양 어스펙트 (시련/성장)
    const saturnAspect = getAspect(saturnPos.longitude, natalSunLongitude);
    if (saturnAspect.aspect) {
      switch (saturnAspect.aspect) {
        case "conjunction":
          // 이미 위에서 처리됨
          break;
        case "trine":
          score += 6;
          factorKeys.push("saturnTrine");
          positive = true;
          break;
        case "sextile":
          score += 4;
          factorKeys.push("saturnSextile");
          break;
        case "square":
          score -= 10;
          factorKeys.push("saturnSquare");
          negative = true;
          break;
        case "opposition":
          score -= 8;
          factorKeys.push("saturnOpposition");
          negative = true;
          break;
      }
    }

    // 화성-네이탈 태양 어스펙트 (에너지/갈등)
    const marsAspect = getAspect(marsPos.longitude, natalSunLongitude);
    if (marsAspect.aspect && marsAspect.aspect !== "conjunction") {
      switch (marsAspect.aspect) {
        case "trine":
          score += 5;
          factorKeys.push("marsTrine");
          positive = true;
          break;
        case "sextile":
          score += 3;
          factorKeys.push("marsSextile");
          break;
        case "square":
          score -= 6;
          factorKeys.push("marsSquare");
          negative = true;
          break;
        case "opposition":
          score -= 4;
          factorKeys.push("marsOpposition");
          break;
      }
    }

    // 금성-네이탈 태양 어스펙트 (사랑/재물)
    const venusAspect = getAspect(venusPos.longitude, natalSunLongitude);
    if (venusAspect.aspect && venusAspect.aspect !== "conjunction") {
      switch (venusAspect.aspect) {
        case "trine":
          score += 8;
          factorKeys.push("venusTrine");
          positive = true;
          break;
        case "sextile":
          score += 5;
          factorKeys.push("venusSextile");
          positive = true;
          break;
        case "square":
          score -= 2;
          factorKeys.push("venusSquare");
          break;
        case "opposition":
          score += 3; // 금성 충은 로맨스에 좋을 수 있음
          factorKeys.push("venusOpposition");
          break;
      }
    }
  }

  // ============================================================
  // 행성 간 트랜짓 어스펙트 (당일 천체 배열)
  // ============================================================
  // 목성-금성 합/트라인 - 대길상 (재물+행운)
  const jupiterVenus = getAspect(jupiterPos.longitude, venusPos.longitude);
  if (jupiterVenus.aspect === "conjunction") {
    score += 15;
    factorKeys.push("jupiterVenusConjunct");
    positive = true;
  } else if (jupiterVenus.aspect === "trine") {
    score += 10;
    factorKeys.push("jupiterVenusTrine");
    positive = true;
  }

  // 토성-화성 합/스퀘어 - 대흉상 (갈등+시련)
  const saturnMars = getAspect(saturnPos.longitude, marsPos.longitude);
  if (saturnMars.aspect === "conjunction") {
    score -= 12;
    factorKeys.push("saturnMarsConjunct");
    negative = true;
  } else if (saturnMars.aspect === "square") {
    score -= 8;
    factorKeys.push("saturnMarsSquare");
    negative = true;
  }

  // 태양-달 위상 분석
  const sunMoon = getAspect(sunPos.longitude, moonPos.longitude);
  if (sunMoon.aspect === "conjunction") {
    // 신월(삭) - 새로운 시작
    score += 5;
    factorKeys.push("newMoon");
  } else if (sunMoon.aspect === "opposition") {
    // 만월(보름) - 결실/완성
    score += 8;
    factorKeys.push("fullMoon");
    positive = true;
  } else if (sunMoon.aspect === "square") {
    // 상현/하현 - 도전과 결정
    score -= 2;
    factorKeys.push("quarterMoon");
  }

  return { score, factorKeys, positive, negative };
}

// 날짜별 천간지지 계산
export function getGanzhiForDate(date: Date): { stem: string; branch: string; stemElement: string; branchElement: string } {
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

// Grade 0: 천운의 날 (월 1~2일) - 사주+점성술 완벽 일치
// Grade 1: 아주 좋은 날 (월 3~5일) - 대부분 긍정적
// Grade 2: 좋은 날 (월 6~8일) - 긍정적 요소 있음
// Grade 3: 보통 날 (대부분) - 평범
// Grade 4: 나쁜 날 (월 3~5일) - 부정적 요소 강함
export type ImportanceGrade = 0 | 1 | 2 | 3 | 4;
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

  // === 고급 예측 필드 (ultraPrecisionEngine + daeunTransitSync) ===
  confidence?: number;             // 분석 신뢰도 (0-100%)
  confidenceNote?: string;         // 신뢰도 설명
  gongmangStatus?: {               // 공망 상태
    isEmpty: boolean;
    emptyBranches: string[];
    affectedAreas: string[];
  };
  shinsalActive?: {                // 활성 신살
    name: string;
    type: 'lucky' | 'unlucky' | 'special';
    affectedArea: string;
  }[];
  energyFlow?: {                   // 에너지 흐름
    strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
    dominantElement: string;
    tonggeunCount: number;
    tuechulCount: number;
  };
  bestHours?: {                    // 최적 시간대
    hour: number;
    siGan: string;
    quality: 'excellent' | 'good' | 'neutral' | 'caution';
  }[];
  transitSync?: {                  // 대운-트랜짓 동기화
    isMajorTransitYear: boolean;
    transitType?: string;          // 'jupiter_return' | 'saturn_return' | 'saturn_opposition'
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral';
    synergyScore?: number;
  };
  activityScores?: {               // 활동별 점수
    marriage?: number;
    career?: number;
    investment?: number;
    moving?: number;
    surgery?: number;
    study?: number;
  };
  // === 시간 구분 (과거/현재/미래) ===
  timeContext?: {
    isPast: boolean;
    isFuture: boolean;
    isToday: boolean;
    daysFromToday: number;
    retrospectiveNote?: string;    // 과거 날짜에 대한 회고적 분석
  };
}

export interface CalendarMonth {
  year: number;
  month: number;
  dates: ImportantDate[];
}

// 대운 데이터 타입
interface DaeunCycle {
  age: number;
  heavenlyStem: string;
  earthlyBranch: string;
  sibsin?: { cheon: string; ji: string };
}

interface UserSajuProfile {
  dayMaster: string;
  dayMasterElement: string;
  dayBranch?: string;
  yearBranch?: string;       // 연지 - 삼재/역마/도화 계산용
  birthYear?: number;        // 대운 계산용
  daeunCycles?: DaeunCycle[]; // 대운 10주기
  daeunsu?: number;          // 대운 시작 나이
  // 고급 분석 - 용신/격국
  yongsin?: {
    primary: string;         // 주용신 (목/화/토/금/수)
    secondary?: string;      // 보조용신
    type: string;            // 용신 유형 (억부/조후/통관/병약)
    kibsin?: string;         // 기신 (피해야 할 오행)
  };
  geokguk?: {
    type: string;            // 격국 유형 (정격/편격/종격 등)
    strength: string;        // 신강/신약
  };
  // 사주 원국 정보 (고급 분석용)
  pillars?: {
    year?: { stem: string; branch: string };
    month?: { stem: string; branch: string };
    day?: { stem: string; branch: string };
    time?: { stem: string; branch: string };
  };
}

interface UserAstroProfile {
  sunSign: string;
  sunElement: string;
  sunLongitude?: number; // 태양 경도 (어스펙트 분석용)
  birthMonth?: number;   // 생일 월 (Solar Return 분석용)
  birthDay?: number;     // 생일 일 (Solar Return 분석용)
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
 * 활동별 점수 계산 (고급 분석용)
 * 기본 점수에 공망/신살/에너지 흐름을 반영
 */
function calculateActivityScore(
  activityType: 'love' | 'career' | 'wealth' | 'travel' | 'health' | 'study',
  baseScore: number,
  gongmang: { isEmpty: boolean; affectedAreas: string[] },
  shinsals: { name: string; type: 'lucky' | 'unlucky' | 'special'; affectedArea: string }[],
  energy: { strength: string; dominantElement: string }
): number {
  let score = baseScore;

  // 공망 영향: 해당 영역이 공망 영역에 포함되면 -10
  if (gongmang.isEmpty || gongmang.affectedAreas.includes(activityType)) {
    score -= 10;
  }

  // 신살 영향: 해당 영역에 적용되는 신살 반영
  for (const shinsal of shinsals) {
    if (shinsal.affectedArea.includes(activityType) || shinsal.affectedArea === 'all') {
      if (shinsal.type === 'lucky') {
        score += 8;
      } else if (shinsal.type === 'unlucky') {
        score -= 8;
      }
    }
  }

  // 에너지 강도 반영
  const energyBonus: Record<string, number> = {
    very_strong: 5,
    strong: 3,
    moderate: 0,
    weak: -3,
    very_weak: -5,
  };
  score += energyBonus[energy.strength] || 0;

  // 활동별 오행 조합 반영
  const activityElements: Record<string, string[]> = {
    love: ['fire', 'wood'],
    career: ['metal', 'earth'],
    wealth: ['earth', 'metal'],
    travel: ['water', 'fire'],
    health: ['wood', 'water'],
    study: ['water', 'wood'],
  };

  const preferredElements = activityElements[activityType] || [];
  if (preferredElements.includes(energy.dominantElement)) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 날짜 분석 - 교차 검증 (세운 + 월운 + 일진 + 점성술)
 */
function analyzeDate(
  date: Date,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile
): ImportantDate | null {
  // 로컬 타임존 기준 YYYY-MM-DD 문자열 생성 (toISOString은 UTC 기준이라 문제 발생)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const ganzhi = getGanzhiForDate(date);
  const transitSun = getSunSign(date);
  const transitSunElement = normalizeElement(ZODIAC_TO_ELEMENT[transitSun] || "fire");

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const dayMasterElement = sajuProfile.dayMasterElement;
  const dayBranch = sajuProfile.dayBranch;
  const natalSunElement = astroProfile.sunElement;
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  if (!relations) return null;

  // 날짜별 변동성을 위한 해시 기반 미세 조정
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const microVariance = ((dayOfYear * 17 + date.getDate() * 7) % 21) - 10; // -10 ~ +10

  // === 용신(用神) 분석 - 사주의 핵심 보완 오행 ===
  const yongsinAnalysis = analyzeYongsin(sajuProfile.yongsin, ganzhi, date);

  // === 격국(格局) 분석 - 사주 구조 유형 ===
  const geokgukAnalysis = analyzeGeokguk(sajuProfile.geokguk, ganzhi, sajuProfile.pillars);

  // === Solar Return (태양회귀) 분석 ===
  const solarReturnAnalysis = analyzeSolarReturn(date, astroProfile.birthMonth, astroProfile.birthDay);

  // === Progressions (이차진행) 분석 ===
  const progressionAnalysis = analyzeProgressions(date, sajuProfile.birthYear, astroProfile.sunElement, dayMasterElement);

  // === 대운(大運) 분석 - 10년 주기 ===
  const daeunAnalysis = calculateDaeunScore(
    dayMasterElement,
    dayBranch,
    sajuProfile.daeunCycles,
    sajuProfile.birthYear,
    year
  );

  // === 세운(歲運) 분석 ===
  const seunAnalysis = calculateSeunScore(dayMasterElement, dayBranch, year);

  // === 월운(月運) 분석 ===
  const wolunAnalysis = calculateWolunScore(dayMasterElement, dayBranch, year, month);

  // === 일진(日辰) 분석 - 일별 운세 ===
  const dayMasterStem = sajuProfile.dayMaster;
  const iljinAnalysis = calculateIljinScore(dayMasterElement, dayMasterStem, dayBranch, date);

  // === 고급 다층 분석 (대운+세운+월운 레이어 상호작용) ===
  let advancedMultiLayerScore = 0;
  let advancedBranchInteractions: BranchInteraction[] = [];

  if (dayMasterStem && dayBranch) {
    try {
      // 세운/월운 간지 계산 (advancedTimingEngine 사용)
      const advSaeun = calculateYearlyGanji(year);
      const advWolun = advancedMonthlyGanji(year, month);

      // 대운 정보 (있으면 사용)
      let daeunInfo: { stem: string; branch: string } | undefined;
      if (sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0 && sajuProfile.birthYear) {
        const currentAge = year - sajuProfile.birthYear;
        // daeunCycles는 각 대운의 시작 나이(age)와 천간/지지를 가짐
        // 현재 나이에 해당하는 대운 찾기 (각 대운은 10년 주기)
        const sortedDaeuns = [...sajuProfile.daeunCycles].sort((a, b) => a.age - b.age);
        const currentDaeun = sortedDaeuns.find((d, idx) => {
          const nextDaeun = sortedDaeuns[idx + 1];
          if (nextDaeun) {
            return currentAge >= d.age && currentAge < nextDaeun.age;
          }
          return currentAge >= d.age; // 마지막 대운
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

      // 지지 상호작용 분석 (육합/삼합/충/형 등)
      advancedBranchInteractions = multiLayerResult.branchInteractions;
      for (const bInter of advancedBranchInteractions) {
        advancedMultiLayerScore += bInter.score * 0.25;
      }

      // 정밀 12운성 분석 (월지 기준)
      const preciseStage = calculatePreciseTwelveStage(dayMasterStem, advWolun.branch);

      // 12운성 에너지 단계에 따른 보너스/페널티
      if (preciseStage.energy === 'peak') {
        advancedMultiLayerScore += 8;  // 건록/제왕
      } else if (preciseStage.energy === 'rising') {
        advancedMultiLayerScore += 4;  // 장생/목욕/관대/태/양
      } else if (preciseStage.energy === 'declining') {
        advancedMultiLayerScore -= 2;  // 쇠/병/사
      } else if (preciseStage.energy === 'dormant') {
        advancedMultiLayerScore -= 5;  // 묘/절
      }
    } catch {
      // 오류 발생 시 무시 (기본 분석 유지)
      advancedMultiLayerScore = 0;
    }
  }

  // === 달 위상 분석 (기존) ===
  const lunarPhase = getLunarPhase(date);

  // === 고급 달 위상 분석 (8위상) ===
  const moonPhaseDetailed = getMoonPhaseDetailed(date);

  // === 행성 트랜짓 분석 (수성, 금성, 화성, 목성, 토성, 태양, 달 + 어스펙트) ===
  const planetTransits = analyzePlanetTransits(date, astroProfile.sunSign, natalSunElement, astroProfile.sunLongitude);

  // === 고급 점성학: 역행 행성 체크 ===
  const retrogradePlanets = getRetrogradePlanetsForDate(date);

  // === 고급 점성학: Void of Course Moon 체크 ===
  const voidOfCourse = checkVoidOfCourseMoon(date);

  // === 고급 점성학: 일/월식 영향 체크 ===
  const eclipseImpact = checkEclipseImpact(date);

  // === 고급 점성학: 행성 시간 (요일 기준) ===
  const planetaryHour = getPlanetaryHourForDate(date);

  // 기본 점수: 대운 + 세운 + 월운 + 일진 + 행성 트랜짓 + 고급 점성학 영향 포함
  // 대운(0.25): 10년 주기 - 기본 바탕
  // 세운(0.15): 1년 주기
  // 월운(0.20): 1개월 주기
  // 일진(0.50): 당일 운세 - 가장 중요!
  // 행성 트랜짓(0.15): 전체 행성 영향
  // 고급 점성학(0.10): 역행/VoC/일월식/달위상
  let advancedAstroScore = 0;
  advancedAstroScore += moonPhaseDetailed.score; // 달 위상 점수 (-3 ~ +12)

  // 용신/격국 분석 점수 (고급 사주)
  const advancedSajuScore = yongsinAnalysis.score + geokgukAnalysis.score;

  // 고급 점성학 점수 (Solar Return + Progressions)
  const advancedAstroExtra = solarReturnAnalysis.score + progressionAnalysis.score;

  let score = 50 + microVariance
    + Math.round(daeunAnalysis.score * 0.25)
    + Math.round(seunAnalysis.score * 0.15)
    + Math.round(wolunAnalysis.score * 0.20)
    + Math.round(iljinAnalysis.score * 0.50)
    + Math.round(planetTransits.score * 0.15)
    + Math.round(advancedAstroScore * 0.10)
    + Math.round(advancedSajuScore * 0.20)  // 용신/격국 가중치 20%
    + Math.round(advancedAstroExtra * 0.15) // Solar Return/Progressions 15%
    + Math.round(advancedMultiLayerScore);  // 다층 레이어 + 지지 상호작용 + 12운성
  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";
  let sajuPositive = false;
  let sajuNegative = false;
  let astroPositive = false;
  let astroNegative = false;
  const sajuFactorKeys: string[] = [];
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  // === 고급 지지 상호작용 결과 반영 ===
  for (const bInter of advancedBranchInteractions) {
    if (bInter.impact === 'positive') {
      sajuPositive = true;
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '육합') {
        recommendationKeys.push("partnership", "harmony");
      } else if (bInter.type === '삼합') {
        recommendationKeys.push("collaboration", "synergy");
      } else if (bInter.type === '방합') {
        recommendationKeys.push("expansion", "growth");
      }
    } else if (bInter.impact === 'negative') {
      sajuNegative = true;
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '충') {
        warningKeys.push("conflict", "change");
      } else if (bInter.type === '형') {
        warningKeys.push("tension", "challenge");
      }
    }
  }

  // === 천을귀인(天乙貴人) 체크 - 가장 좋은 귀인 ===
  // dayMasterStem은 일진 분석에서 이미 선언됨 (line ~1115)
  if (dayMasterStem && isCheoneulGwiin(dayMasterStem, ganzhi.branch)) {
    score += 25;
    sajuPositive = true;
    sajuFactorKeys.push("cheoneulGwiin");
    recommendationKeys.push("majorDecision", "contract", "meeting");
    if (!titleKey) {
      titleKey = "calendar.cheoneulGwiin";
      descKey = "calendar.cheoneulGwiinDesc";
    }
  }

  // === 손없는 날 (擇日) - 이사/결혼/개업 최적일 ===
  const approxLunarDay = approximateLunarDay(date);
  if (isSonEomneunDay(approxLunarDay)) {
    score += 15;
    sajuPositive = true;
    sajuFactorKeys.push("sonEomneunDay");
    recommendationKeys.push("moving", "wedding", "business");
    if (!categories.includes("general")) categories.push("general");
  }

  // === 건록(建祿) 체크 - 일간의 록지에 해당 ===
  if (dayMasterStem && isGeonrokDay(dayMasterStem, ganzhi.branch)) {
    score += 18;
    sajuPositive = true;
    sajuFactorKeys.push("geonrokDay");
    recommendationKeys.push("career", "authority", "promotion");
    if (!categories.includes("career")) categories.push("career");
  }

  // === 삼재(三災) 체크 - 12년 주기 불운의 해 ===
  const birthYearBranch = sajuProfile.yearBranch; // 연지(年支) 사용 - 정확한 삼재 계산
  const yearGanzhi = getYearGanzhi(year);
  if (birthYearBranch && isSamjaeYear(birthYearBranch, yearGanzhi.branch)) {
    score -= 8; // 삼재 해는 기본 페널티
    sajuNegative = true;
    sajuFactorKeys.push("samjaeYear");
    warningKeys.push("samjae", "caution");
  }

  // === 역마살(驛馬殺) 체크 - 이동/변화의 날 ===
  if (birthYearBranch && isYeokmaDay(birthYearBranch, ganzhi.branch)) {
    score += 5; // 역마는 양면성 - 여행에 좋지만 불안정
    sajuFactorKeys.push("yeokmaDay");
    recommendationKeys.push("travel", "change", "interview");
    warningKeys.push("instability");
    if (!categories.includes("travel")) categories.push("travel");
  }

  // === 도화살(桃花殺) 체크 - 연애/매력의 날 ===
  if (birthYearBranch && isDohwaDay(birthYearBranch, ganzhi.branch)) {
    score += 10;
    sajuPositive = true;
    sajuFactorKeys.push("dohwaDay");
    recommendationKeys.push("dating", "socializing", "charm");
    if (!categories.includes("love")) categories.push("love");
  }

  // === 십신(十神) 완전 분석 ===
  if (dayMasterStem) {
    const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);
    if (daySipsin) {
      sajuFactorKeys.push(`sipsin_${daySipsin}`);

      // 십신별 점수 및 카테고리 조정
      switch (daySipsin) {
        case "정재":
          score += 12;
          sajuPositive = true;
          if (!categories.includes("wealth")) categories.push("wealth");
          recommendationKeys.push("stableWealth", "savings");
          break;
        case "편재":
          score += 10;
          sajuPositive = true;
          if (!categories.includes("wealth")) categories.push("wealth");
          recommendationKeys.push("speculation", "windfall");
          warningKeys.push("riskManagement");
          break;
        case "정인":
          score += 15;
          sajuPositive = true;
          if (!categories.includes("study")) categories.push("study");
          recommendationKeys.push("learning", "certification", "mother");
          break;
        case "편인":
          score += 8;
          if (!categories.includes("study")) categories.push("study");
          recommendationKeys.push("spirituality", "unique");
          break;
        case "겁재":
          score -= 5;
          warningKeys.push("rivalry", "loss");
          break;
      }
    }
  }

  // === 지장간(支藏干) 분석 - 숨은 기운 ===
  const hiddenStems = JIJANGGAN[ganzhi.branch];
  if (hiddenStems) {
    const mainHiddenStem = hiddenStems.정기;
    const mainHiddenElement = STEM_TO_ELEMENT[mainHiddenStem];

    // 지장간 정기가 일간을 생해주면 좋음
    if (mainHiddenElement && relations.generatedBy === mainHiddenElement) {
      score += 8;
      sajuFactorKeys.push("hiddenStemSupport");
    }
    // 지장간 정기가 일간을 극하면 주의
    if (mainHiddenElement && relations.controlledBy === mainHiddenElement) {
      score -= 5;
      sajuFactorKeys.push("hiddenStemConflict");
    }
  }

  // === 영역별 세부 점수 계산 ===
  const areaScores: Partial<Record<FortuneArea, number>> = {};
  for (const [area, config] of Object.entries(AREA_CONFIG) as [FortuneArea, typeof AREA_CONFIG[FortuneArea]][]) {
    let areaScore = 50;

    // 일진 원소와 영역 관련 원소 매칭
    if (config.relatedElements.includes(ganzhi.stemElement)) {
      areaScore += 15;
    }
    if (config.relatedElements.includes(ganzhi.branchElement)) {
      areaScore += 10;
    }

    // 세운/월운 영향
    areaScore += Math.round(seunAnalysis.score * 0.2);
    areaScore += Math.round(wolunAnalysis.score * 0.3);

    areaScores[area] = Math.max(0, Math.min(100, areaScore));
  }

  // 가장 좋은 영역을 카테고리에 추가
  const bestArea = Object.entries(areaScores).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
  if (bestArea && (bestArea[1] || 0) >= 65) {
    const areaToCategory: Record<FortuneArea, EventCategory> = {
      career: "career", wealth: "wealth", love: "love",
      health: "health", study: "study", travel: "travel",
    };
    const cat = areaToCategory[bestArea[0] as FortuneArea];
    if (cat && !categories.includes(cat)) {
      categories.push(cat);
    }
  }

  // === 사주 분석 (강화) ===

  // 1. 일진 천간과 일간의 관계
  if (ganzhi.stemElement === dayMasterElement) {
    // 비견 - 자기 힘 강화, 경쟁도 있음
    score += 18;
    sajuPositive = true;
    categories.push("career");
    titleKey = "calendar.bijeon";
    descKey = "calendar.bijeonDesc";
    sajuFactorKeys.push("stemBijeon");
    recommendationKeys.push("business", "networking");
    warningKeys.push("competition"); // 비견은 경쟁자 의미도 있음
  } else if (ganzhi.stemElement === relations.generatedBy) {
    // 인성 - 도움/학습/보호
    score += 25;
    sajuPositive = true;
    categories.push("study", "career");
    titleKey = "calendar.inseong";
    descKey = "calendar.inseongDesc";
    sajuFactorKeys.push("stemInseong");
    recommendationKeys.push("study", "mentor", "documents");
  } else if (ganzhi.stemElement === relations.controls) {
    // 재성 - 재물, 아버지/아내
    score += 30;
    sajuPositive = true;
    categories.push("wealth", "love");
    titleKey = "calendar.jaeseong";
    descKey = "calendar.jaeseongDesc";
    sajuFactorKeys.push("stemJaeseong");
    recommendationKeys.push("finance", "investment", "shopping");
  } else if (ganzhi.stemElement === relations.generates) {
    // 식상 - 표현/창작/연애/자녀
    score += 20;
    sajuPositive = true;
    categories.push("love", "career");
    titleKey = "calendar.siksang";
    descKey = "calendar.siksangDesc";
    sajuFactorKeys.push("stemSiksang");
    recommendationKeys.push("love", "creative", "expression");
  } else if (ganzhi.stemElement === relations.controlledBy) {
    // 관살 - 외부 압박, 직장/권위
    score -= 25;
    sajuNegative = true;
    categories.push("health", "career");
    titleKey = "calendar.gwansal";
    descKey = "calendar.gwansalDesc";
    sajuFactorKeys.push("stemGwansal");
    warningKeys.push("conflict", "health", "avoidAuthority");
    recommendationKeys.push("careful", "lowProfile");
    // 관살이 있으면 권위/승진 추천 제거 (상사와 충돌 위험)
    const removeRecs = ["authority", "promotion", "interview"];
    for (let i = recommendationKeys.length - 1; i >= 0; i--) {
      if (removeRecs.includes(recommendationKeys[i])) {
        recommendationKeys.splice(i, 1);
      }
    }
  }

  // 2. 지지 관계 (삼합, 육합, 충, 형, 해)
  if (dayBranch) {
    // 삼합 체크 - 가장 강력
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          score += 28;
          sajuPositive = true;
          sajuFactorKeys.push("branchSamhap");
          if (!titleKey) {
            titleKey = "calendar.samhap";
            descKey = "calendar.samhapDesc";
          }
          recommendationKeys.push("bigDecision", "contract", "partnership");
          if (!categories.includes("general")) categories.push("general");
        } else if (element === relations.controlledBy) {
          score -= 15;
          sajuNegative = true;
          sajuFactorKeys.push("branchSamhapNegative");
          warningKeys.push("opposition");
        }
      }
    }

    // 육합 체크 - 인연/화합
    if (YUKHAP[dayBranch] === ganzhi.branch) {
      score += 22;
      sajuPositive = true;
      sajuFactorKeys.push("branchYukhap");
      if (!titleKey) {
        titleKey = "calendar.yukhap";
        descKey = "calendar.yukhapDesc";
      }
      categories.push("love");
      recommendationKeys.push("love", "meeting", "reconciliation");
    }

    // 충 체크 - 충돌/변화
    if (CHUNG[dayBranch] === ganzhi.branch) {
      score -= 30;
      sajuNegative = true;
      categories.push("travel", "health");
      titleKey = "calendar.chung";
      descKey = "calendar.chungDesc";
      sajuFactorKeys.push("branchChung");
      warningKeys.push("avoidTravel", "conflict", "accident", "avoidChange");
      recommendationKeys.push("careful", "postpone");
      // 충이 있으면 여행/변화 추천 제거 (역마살과 충돌 방지)
      const removeRecs = ["travel", "change"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }

    // 형 (刑) 체크 - 자형, 상형
    const XING: Record<string, string[]> = {
      "寅": ["巳", "申"], "巳": ["寅", "申"], "申": ["寅", "巳"], // 무은지형
      "丑": ["戌", "未"], "戌": ["丑", "未"], "未": ["丑", "戌"], // 무례지형
      "子": ["卯"], "卯": ["子"], // 무례지형
      "辰": ["辰"], "午": ["午"], "酉": ["酉"], "亥": ["亥"], // 자형
    };
    if (XING[dayBranch]?.includes(ganzhi.branch)) {
      score -= 18;
      sajuNegative = true;
      sajuFactorKeys.push("branchXing");
      warningKeys.push("legal", "injury");
      // 형이 있으면 계약 관련 추천 제거
      const removeRecs = ["contract", "bigDecision", "partnership"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }

    // 해 (害) 체크 - 육해
    const HAI: Record<string, string> = {
      "子": "未", "未": "子", "丑": "午", "午": "丑",
      "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
      "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
    };
    if (HAI[dayBranch] === ganzhi.branch) {
      score -= 12;
      sajuNegative = true;
      sajuFactorKeys.push("branchHai");
      warningKeys.push("betrayal", "misunderstanding");
      // 해가 있으면 소셜/네트워킹 추천 제거 (오해/배신 위험)
      const removeRecs = ["networking", "socializing"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }
  }

  // === 점성술 분석 (강화) ===

  // 트랜짓 태양과 본명 태양의 관계
  if (transitSunElement === natalSunElement) {
    // 같은 원소 - 강력한 에너지 공명
    score += 22;
    astroPositive = true;
    astroFactorKeys.push("sameElement");
    recommendationKeys.push("confidence", "selfExpression");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === transitSunElement) {
    // 생해주는 관계 - 지원 에너지
    score += 15;
    astroPositive = true;
    astroFactorKeys.push("supportElement");
    recommendationKeys.push("learning", "receiving");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generates === transitSunElement) {
    // 내가 생하는 관계 - 에너지 소모 but 창조적
    score += 5;
    astroFactorKeys.push("givingElement");
    recommendationKeys.push("giving", "teaching");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === transitSunElement) {
    // 극하는 관계 - 도전/긴장
    score -= 18;
    astroNegative = true;
    astroFactorKeys.push("conflictElement");
    warningKeys.push("stress", "opposition");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === transitSunElement) {
    // 내가 극하는 관계 - 통제/성취
    score += 8;
    astroFactorKeys.push("controlElement");
    recommendationKeys.push("achievement", "discipline");
  }

  // === 달의 위상 분석 (실제 계산) ===
  score += lunarPhase.phaseScore;
  if (lunarPhase.phaseName === "newMoon") {
    astroFactorKeys.push("lunarNewMoon");
    recommendationKeys.push("newBeginning", "planning");
  } else if (lunarPhase.phaseName === "fullMoon") {
    astroFactorKeys.push("lunarFullMoon");
    recommendationKeys.push("completion", "celebration");
    astroPositive = true;
  } else if (lunarPhase.phaseName === "firstQuarter") {
    astroFactorKeys.push("lunarFirstQuarter");
    warningKeys.push("tension", "challenge");
  } else if (lunarPhase.phaseName === "lastQuarter") {
    astroFactorKeys.push("lunarLastQuarter");
    recommendationKeys.push("reflection", "release");
  }

  // === 대운/세운/월운/일진 요소 반영 ===
  sajuFactorKeys.push(...daeunAnalysis.factorKeys);
  sajuFactorKeys.push(...seunAnalysis.factorKeys);
  sajuFactorKeys.push(...wolunAnalysis.factorKeys);
  sajuFactorKeys.push(...iljinAnalysis.factorKeys);

  // === 용신/격국 요소 반영 (고급 사주) ===
  sajuFactorKeys.push(...yongsinAnalysis.factorKeys);
  sajuFactorKeys.push(...geokgukAnalysis.factorKeys);

  // === 행성 트랜짓 요소 반영 ===
  astroFactorKeys.push(...planetTransits.factorKeys);

  // === Solar Return / Progressions 요소 반영 ===
  astroFactorKeys.push(...solarReturnAnalysis.factorKeys);
  astroFactorKeys.push(...progressionAnalysis.factorKeys);

  // === 고급 점성학 요소 반영 ===

  // 1. 달 위상 (8단계)
  astroFactorKeys.push(moonPhaseDetailed.factorKey);
  if (moonPhaseDetailed.score > 10) astroPositive = true;
  if (moonPhaseDetailed.score < -2) astroNegative = true;

  // 2. 역행 행성
  if (retrogradePlanets.length > 0) {
    for (const planet of retrogradePlanets) {
      astroFactorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
    }
    // 수성 역행은 커뮤니케이션/계약에 특히 주의
    if (retrogradePlanets.includes("mercury")) {
      score -= 8;
      warningKeys.push("mercuryRetrograde");
      astroNegative = true;
      // 수성 역행 시 계약/통신 관련 추천 제거
      const removeRecs = ["contract", "documents", "interview"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }
    // 금성 역행은 연애/재물에 주의
    if (retrogradePlanets.includes("venus")) {
      score -= 5;
      warningKeys.push("venusRetrograde");
      // 금성 역행 시 연애/재정 추천 제거
      const removeRecs = ["dating", "love", "finance", "investment", "shopping"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }
    // 화성 역행은 행동/에너지에 주의
    if (retrogradePlanets.includes("mars")) {
      score -= 4;
      warningKeys.push("marsRetrograde");
    }
  }

  // 3. Void of Course Moon (공허한 달)
  if (voidOfCourse.isVoid) {
    score -= 10;
    astroFactorKeys.push("voidOfCourse");
    warningKeys.push("voidOfCourse");
    astroNegative = true;
  }

  // 4. 일/월식 영향
  if (eclipseImpact.hasImpact) {
    if (eclipseImpact.type === "solar") {
      astroFactorKeys.push(`solarEclipse${eclipseImpact.intensity}`);
    } else {
      astroFactorKeys.push(`lunarEclipse${eclipseImpact.intensity}`);
    }

    if (eclipseImpact.intensity === "strong") {
      score -= 15; // 일/월식 당일은 큰 변화의 날
      warningKeys.push("eclipseDay");
      astroNegative = true;
    } else if (eclipseImpact.intensity === "medium") {
      score -= 8;
      warningKeys.push("eclipseNear");
    } else {
      score -= 3;
    }
  }

  // 5. 행성 시간 (요일 지배 행성)
  astroFactorKeys.push(`dayRuler${planetaryHour.dayRuler}`);
  // 목요일(Jupiter) = 확장/행운, 금요일(Venus) = 사랑/재물
  if (planetaryHour.dayRuler === "Jupiter") {
    score += 3;
    recommendationKeys.push("expansion", "luck");
  } else if (planetaryHour.dayRuler === "Venus") {
    score += 2;
    recommendationKeys.push("love", "beauty");
  } else if (planetaryHour.dayRuler === "Saturn") {
    score -= 2; // 토요일은 제한/책임
  }

  // === 긍정/부정 플래그 업데이트 ===
  if (iljinAnalysis.positive) sajuPositive = true;
  if (iljinAnalysis.negative) sajuNegative = true;
  if (daeunAnalysis.positive) sajuPositive = true;
  if (daeunAnalysis.negative) sajuNegative = true;
  if (seunAnalysis.positive) sajuPositive = true;
  if (seunAnalysis.negative) sajuNegative = true;
  if (wolunAnalysis.positive) sajuPositive = true;
  if (wolunAnalysis.negative) sajuNegative = true;
  // 용신/격국 플래그 반영
  if (yongsinAnalysis.positive) sajuPositive = true;
  if (yongsinAnalysis.negative) sajuNegative = true;
  if (geokgukAnalysis.positive) sajuPositive = true;
  if (geokgukAnalysis.negative) sajuNegative = true;
  if (planetTransits.positive) astroPositive = true;
  if (planetTransits.negative) astroNegative = true;
  // Solar Return / Progressions 플래그 반영
  if (solarReturnAnalysis.positive) astroPositive = true;
  if (progressionAnalysis.positive) astroPositive = true;
  if (progressionAnalysis.negative) astroNegative = true;

  // === 교차 검증 (핵심) ===

  // 사주와 점성술 모두 긍정적 - 시너지
  const crossVerified = sajuPositive && astroPositive;
  if (crossVerified) {
    score += 20;
    astroFactorKeys.push("crossVerified");
    recommendationKeys.push("majorDecision");
  }

  // 사주와 점성술 모두 부정적 - 주의 필요
  if (sajuNegative && astroNegative) {
    score -= 15;
    astroFactorKeys.push("crossNegative");
    warningKeys.push("extremeCaution");
  }

  // 사주 일진과 점성술 트랜짓이 같은 원소 - 일관성
  if (ganzhi.stemElement === transitSunElement) {
    score += 12;
    astroFactorKeys.push("alignedElement");
  }

  // 사주와 점성술이 반대인 경우 - 혼란/갈등
  if ((sajuPositive && astroNegative) || (sajuNegative && astroPositive)) {
    astroFactorKeys.push("mixedSignals");
    warningKeys.push("confusion");
  }

  // 점수 범위 제한 및 조정
  score = Math.max(5, Math.min(98, score));

  // 중요하지 않은 날은 제외
  const hasSignificantFactors = sajuFactorKeys.length > 0 || astroFactorKeys.length > 0;
  if (score >= 42 && score <= 58 && !crossVerified && !hasSignificantFactors) {
    return null;
  }

  // 카테고리가 비어있으면 general 추가
  if (categories.length === 0) {
    categories.push("general");
  }

  // ========================================
  // 등급 결정 (4단계 시스템)
  // ========================================
  // Grade 0: 천운의 날 - 연 3~5일 (황금색, 빛남)
  // Grade 1: 좋은 날 - 연 30~40일 (녹색)
  // Grade 2: 보통 날 - 연 280~300일 (색칠 없음)
  // Grade 3: 주의 날 - 연 20~30일 (빨간색)

  let grade: ImportanceGrade;

  // ========================================
  // 사주(Saju) 요소 체크
  // ========================================
  const hasCheoneulGwiin = sajuFactorKeys.includes("cheoneulGwiin");
  const hasSamhap = sajuFactorKeys.includes("samhap");
  const hasYukhap = sajuFactorKeys.includes("yukhap");
  const hasChung = sajuFactorKeys.includes("chung");
  const hasXing = sajuFactorKeys.includes("xing");

  // ========================================
  // 점성술(Astrology) 요소 체크
  // ========================================
  // Trine(삼분) 요소 - 가장 긍정적인 각도
  const hasJupiterTrine = astroFactorKeys.includes("jupiterTrine");
  const hasVenusTrine = astroFactorKeys.includes("venusTrine");
  const hasSaturnTrine = astroFactorKeys.includes("saturnTrine");
  const hasAnyTrine = hasJupiterTrine || hasVenusTrine || hasSaturnTrine;
  const hasJupiterVenusTrine = astroFactorKeys.includes("jupiterVenusTrine");

  // 달 위상 체크 - 보름달, 상현달이 좋음
  const hasFullMoon = astroFactorKeys.includes("moonPhaseFull") || astroFactorKeys.includes("lunarFullMoon");
  const hasFirstQuarter = astroFactorKeys.includes("moonPhaseFirstQuarter") || astroFactorKeys.includes("lunarFirstQuarter");
  const hasNewMoon = astroFactorKeys.includes("moonPhaseNew") || astroFactorKeys.includes("lunarNewMoon");
  const hasGoodMoonPhase = hasFullMoon || hasFirstQuarter;

  // 역행(Retrograde) 체크 - 역행이 없어야 좋음
  const hasMercuryRetrograde = astroFactorKeys.includes("retrogradeMercury");
  const hasVenusRetrograde = astroFactorKeys.includes("retrogradeVenus");
  const hasMarsRetrograde = astroFactorKeys.includes("retrogradeMars");
  const hasNoMajorRetrograde = !hasMercuryRetrograde && !hasVenusRetrograde && !hasMarsRetrograde;

  // 보이드 오브 코스 체크 (이클립스는 데이터 한계로 나쁜날 조건에서 제외)
  const hasVoidOfCourse = astroFactorKeys.includes("voidOfCourse");

  // 오행 조화 체크
  const hasSameElement = astroFactorKeys.includes("sameElement");
  const hasSupportElement = astroFactorKeys.includes("supportElement");
  const hasAlignedElement = astroFactorKeys.includes("alignedElement");
  const hasGoodElementHarmony = hasSameElement || hasSupportElement || hasAlignedElement;

  // 용신 매치 체크 (고급 사주)
  const hasYongsinMatch = sajuFactorKeys.includes("yongsinPrimaryMatch");
  const hasYongsinBranchMatch = sajuFactorKeys.includes("yongsinBranchMatch");
  const hasKibsinMatch = sajuFactorKeys.includes("kibsinMatch"); // 기신 = 흉
  const hasGeokgukFavor = sajuFactorKeys.some(k => k.startsWith("geokgukFavor_"));

  // 사주 강점 포인트 카운트 (용신/격국 포함)
  const sajuStrengthCount = [
    hasCheoneulGwiin,
    hasSamhap,
    hasYukhap,
    hasYongsinMatch,        // 용신 천간 일치
    hasYongsinBranchMatch,  // 용신 지지 일치
    hasGeokgukFavor,        // 격국에 맞는 십신
  ].filter(Boolean).length;

  // 점성술 강점 포인트 카운트
  // Solar Return 체크 (고급 점성학)
  const hasSolarReturn = solarReturnAnalysis.isBirthday || solarReturnAnalysis.daysFromBirthday <= 3;

  const astroStrengthCount = [
    hasJupiterTrine,
    hasVenusTrine,
    hasJupiterVenusTrine,
    hasGoodMoonPhase,
    hasNoMajorRetrograde,
    hasGoodElementHarmony,
    hasSolarReturn,         // 생일 주변
  ].filter(Boolean).length;

  // ========================================
  // Grade 0: 천운의 날 (연 8~12일, 월 1일) - 최상위
  // 점수 상위 3% + 사주/점성 양쪽 강점
  // ========================================
  // 생일 당일 특별 조건 (Solar Return 정확)
  const isBirthdaySpecial = (
    solarReturnAnalysis.isBirthday &&
    crossVerified &&
    sajuPositive && astroPositive &&
    hasNoMajorRetrograde
  );

  // ========================================
  // 5등급 시스템 (균형 조정)
  // Grade 0: 천운의 날 (연 7~11일, 약 2%)
  // Grade 1: 아주 좋은 날 (연 36~55일, 약 10-15%)
  // Grade 2: 좋은 날 (연 55~110일, 약 15-30%)
  // Grade 3: 보통 날 (연 150~220일, 약 40-60%)
  // Grade 4: 나쁜 날 (연 36~55일, 약 10-15%)
  // ========================================

  // 역행 개수 카운트 (수성/금성/화성만 - 개인 영향 큼)
  const retrogradeCount = [hasMercuryRetrograde, hasVenusRetrograde, hasMarsRetrograde].filter(Boolean).length;

  // 나쁜 요소 개수 카운트 - 사주 + 점성학 모두 포함
  const sajuBadCount = [hasChung, hasXing, hasKibsinMatch].filter(Boolean).length;
  const astroBadCount = [
    retrogradeCount >= 2,  // 역행 2개 이상
    hasVoidOfCourse,       // 보이드 오브 코스
    astroNegative,         // 점성학 부정
  ].filter(Boolean).length;
  const totalBadCount = sajuBadCount + astroBadCount;

  // 총 강점 개수 계산 (사주 + 점성학)
  const totalStrengthCount = sajuStrengthCount + astroStrengthCount;

  const isCheununDay = (
    // 조건 1: 높은 점수 + 교차검증 + 양쪽 긍정 + 강점 풍부 + 역행 없음 (연 7~11일, 약 2%)
    (
      score >= 85 &&  // 점수 조건 추가
      crossVerified &&
      sajuPositive && astroPositive &&
      astroStrengthCount >= 3 &&  // 점성학 강점 3개 이상 (7개 중)
      sajuStrengthCount >= 1 &&  // 사주 강점 1개 이상
      hasNoMajorRetrograde &&
      sajuBadCount === 0  // 사주 나쁜 요소 없음
    ) ||
    // 조건 2: 생일 특별 조건
    (isBirthdaySpecial && score >= 80 && sajuBadCount === 0 && astroStrengthCount >= 2)
  );

  const isVeryGoodDay = (
    // 높은 점수 + 교차검증 + 양쪽 긍정 + 역행 없음 + 강점 (연 36~55일, 약 10-15%)
    score >= 75 &&  // 점수 조건 추가
    crossVerified &&
    sajuPositive && astroPositive &&
    hasNoMajorRetrograde &&
    astroStrengthCount >= 3 &&  // 점성학 강점 3개 이상
    sajuBadCount === 0  // 사주 나쁜 요소 없음
  );

  const isGoodDay = (
    // 좋은 점수 + 교차검증 + 양쪽 긍정 + 역행 없음 + 강점 (연 55~110일, 약 15-30%)
    (
      score >= 65 &&  // 점수 조건 추가
      crossVerified &&
      sajuPositive && astroPositive &&
      hasNoMajorRetrograde &&
      astroStrengthCount >= 2 &&  // 점성학 강점 2개 이상
      sajuBadCount === 0  // 사주 나쁜 요소 없음
    ) ||
    // 한쪽 긍정만이라도 강점이 충분하면 OK
    (
      score >= 70 &&  // 점수 조건 추가
      crossVerified &&
      (sajuPositive || astroPositive) &&
      hasNoMajorRetrograde &&
      totalStrengthCount >= 4 &&
      sajuBadCount === 0
    )
  );

  const isBadDay = (
    // 나쁜 날 조건 (연 36~55일, 약 10-15%)
    score <= 38 ||  // 매우 낮은 점수 (하위 ~10%)
    (score <= 45 && sajuNegative && !sajuPositive) ||  // 낮은 점수 + 사주만 부정
    (score <= 45 && astroNegative && !astroPositive) ||  // 낮은 점수 + 점성학만 부정
    (hasChung && hasXing) ||  // 충+형 동시 (사주)
    (hasChung && astroNegative && score <= 50) ||  // 충 + 점성학 부정 + 낮은 점수
    (hasXing && astroNegative && score <= 50) ||  // 형 + 점성학 부정 + 낮은 점수
    (sajuBadCount >= 2 && astroBadCount >= 1 && score <= 55) ||  // 사주 2개 + 점성학 1개 + 점수 조건
    (totalBadCount >= 3 && score <= 48)  // 총 3개 + 낮은 점수
  );

  if (isCheununDay) {
    // Grade 0: 천운의 날 - 최상의 날이므로 경고 메시지 제거
    grade = 0;
    titleKey = "calendar.cheununDay";
    descKey = "calendar.cheununDayDesc";
    recommendationKeys.unshift("majorDecision", "wedding", "contract", "bigDecision");
    // 천운의 날은 경고 없음 - 모든 부정적 요소가 상쇄됨
    warningKeys.length = 0;
  } else if (isVeryGoodDay) {
    // Grade 1: 아주 좋은 날 - 매우 좋은 날이므로 경고 메시지 제거
    grade = 1;
    if (!titleKey) {
      titleKey = "calendar.veryGoodDay";
      descKey = "calendar.veryGoodDayDesc";
    }
    recommendationKeys.unshift("majorDecision", "contract");
    // 아주 좋은 날도 경고 없음 - 긍정적 요소가 압도
    warningKeys.length = 0;
  } else if (isBadDay) {
    // Grade 4: 나쁜 날
    grade = 4;
    if (!titleKey) {
      titleKey = "calendar.badDay";
      descKey = "calendar.badDayDesc";
    }
    if (warningKeys.length === 0) {
      warningKeys.push("health");
    }
    recommendationKeys.push("rest", "meditation");
  } else if (isGoodDay) {
    // Grade 2: 좋은 날 - 긍정적인 날이므로 심각한 경고 제거
    grade = 2;
    if (!titleKey) {
      titleKey = "calendar.goodDay";
      descKey = "calendar.goodDayDesc";
    }
    recommendationKeys.push("majorDecision");
    // 좋은 날에는 심각한 경고(extremeCaution, confusion) 제거
    // 가벼운 참고 정보(역행, voidOfCourse)만 유지
    const severeWarnings = ["extremeCaution", "confusion", "conflict", "accident", "injury", "betrayal"];
    for (let i = warningKeys.length - 1; i >= 0; i--) {
      if (severeWarnings.includes(warningKeys[i])) {
        warningKeys.splice(i, 1);
      }
    }
  } else {
    // Grade 3: 보통 날 - 나머지 전부
    grade = 3;
    if (!titleKey) {
      titleKey = "calendar.normalDay";
      descKey = "calendar.normalDayDesc";
    }
  }

  // ============================================================
  // 고급 예측 분석 (ultraPrecisionEngine + daeunTransitSync)
  // ============================================================

  // 1. 일진 간지 계산
  const dailyPillar = calculateDailyPillar(date);
  const dayStem = sajuProfile.dayMaster || dailyPillar.stem;

  // 2. 공망(空亡) 분석
  const gongmangBranches = analyzeGongmang(dayStem, dayBranch || dailyPillar.branch, dailyPillar.branch);
  const gongmangStatus = {
    isEmpty: gongmangBranches.isToday空,
    emptyBranches: gongmangBranches.emptyBranches,
    affectedAreas: gongmangBranches.affectedAreas,
  };

  // 3. 신살(神煞) 분석
  const shinsalResult = analyzeShinsal(dayBranch || dailyPillar.branch, dailyPillar.branch);
  const shinsalActive = shinsalResult.active.map(s => ({
    name: s.name,
    type: s.type,
    affectedArea: s.affectedArea,
  }));

  // 4. 에너지 흐름 분석 (통근/투출)
  const allStems = sajuProfile.pillars
    ? [sajuProfile.pillars.year?.stem, sajuProfile.pillars.month?.stem, sajuProfile.pillars.day?.stem, sajuProfile.pillars.time?.stem].filter(Boolean) as string[]
    : [dayStem];
  const allBranches = sajuProfile.pillars
    ? [sajuProfile.pillars.year?.branch, sajuProfile.pillars.month?.branch, sajuProfile.pillars.day?.branch, sajuProfile.pillars.time?.branch].filter(Boolean) as string[]
    : [dayBranch || dailyPillar.branch];
  const energyResult = analyzeEnergyFlow(dayStem, allStems, allBranches);
  const energyFlow = {
    strength: energyResult.energyStrength as 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak',
    dominantElement: energyResult.dominantElement,
    tonggeunCount: energyResult.tonggeun.length,
    tuechulCount: energyResult.tuechul.length,
  };

  // 5. 최적 시간대 분석
  const hourlyAdvice = generateHourlyAdvice(dayStem, dayBranch || dailyPillar.branch);
  const bestHours = hourlyAdvice
    .filter(h => h.quality === 'excellent' || h.quality === 'good')
    .slice(0, 4)
    .map(h => ({
      hour: h.hour,
      siGan: h.siGan,
      quality: h.quality,
    }));

  // 6. 대운-트랜짓 동기화 분석 (목성회귀, 토성회귀)
  let transitSync: {
    isMajorTransitYear: boolean;
    transitType?: string;
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral';
    synergyScore?: number;
  } = { isMajorTransitYear: false };

  if (sajuProfile.birthYear && sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0) {
    const daeunInfo = convertSajuDaeunToInfo(sajuProfile.daeunCycles);
    const currentAge = year - sajuProfile.birthYear;
    const syncAnalysis = analyzeDaeunTransitSync(daeunInfo, sajuProfile.birthYear, currentAge);

    // 해당 연도에 major transition이 있는지 확인
    const majorTransitionForYear = syncAnalysis.majorTransitions.find((t: { year: number }) => t.year === year);
    if (majorTransitionForYear) {
      // 트랜짓 타입 결정 (첫 번째 트랜짓 사용)
      const primaryTransit = majorTransitionForYear.transits[0];
      transitSync = {
        isMajorTransitYear: true,
        transitType: primaryTransit?.type || 'daeun_transition',
        synergyType: majorTransitionForYear.synergyType,
        synergyScore: majorTransitionForYear.synergyScore,
      };
    }
  }

  // 7. 신뢰도 계산
  let confidenceBase = 60;
  const confidenceNotes: string[] = [];

  if (sajuProfile.pillars?.time) {
    confidenceBase += 15;
  } else {
    confidenceNotes.push('시주 없음');
  }
  if (sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0) {
    confidenceBase += 10;
  } else {
    confidenceNotes.push('대운 정보 없음');
  }
  if (sajuProfile.yongsin) {
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

  // 8. 활동별 점수 계산
  const activityScores = {
    marriage: calculateActivityScore('love', score, gongmangStatus, shinsalActive, energyFlow),
    career: calculateActivityScore('career', score, gongmangStatus, shinsalActive, energyFlow),
    investment: calculateActivityScore('wealth', score, gongmangStatus, shinsalActive, energyFlow),
    moving: calculateActivityScore('travel', score, gongmangStatus, shinsalActive, energyFlow),
    surgery: calculateActivityScore('health', score, gongmangStatus, shinsalActive, energyFlow),
    study: calculateActivityScore('study', score, gongmangStatus, shinsalActive, energyFlow),
  };

  // 9. 시간 맥락 (과거/현재/미래) 분석
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const daysFromToday = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isPast = daysFromToday < 0;
  const isFuture = daysFromToday > 0;
  const isToday = daysFromToday === 0;

  // 과거 날짜에 대한 회고적 분석 노트 생성
  let retrospectiveNote: string | undefined;
  if (isPast) {
    if (grade <= 1) {
      retrospectiveNote = '이 날은 매우 좋은 기운이 있었습니다. 주요 성과나 좋은 일이 있었을 가능성이 높습니다.';
    } else if (grade >= 4) {
      retrospectiveNote = '이 날은 도전적인 기운이 있었습니다. 어려움이나 장애물이 있었을 수 있습니다.';
    } else if (gongmangStatus.isEmpty) {
      retrospectiveNote = '공망이 활성화된 날이었습니다. 계획했던 일이 예상대로 진행되지 않았을 수 있습니다.';
    } else if (shinsalActive.some(s => s.type === 'lucky')) {
      retrospectiveNote = '길신이 활성화된 날이었습니다. 예상치 못한 도움이나 행운이 있었을 수 있습니다.';
    } else if (transitSync.isMajorTransitYear) {
      retrospectiveNote = `${transitSync.transitType} 주기의 해였습니다. 인생의 중요한 전환점이었을 수 있습니다.`;
    }
  }

  const timeContext = {
    isPast,
    isFuture,
    isToday,
    daysFromToday,
    retrospectiveNote,
  };

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
    // 고급 예측 필드
    confidence,
    confidenceNote,
    gongmangStatus,
    shinsalActive,
    energyFlow,
    bestHours,
    transitSync,
    activityScores,
    timeContext,
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
 * 사주 프로필 추출 (대운 포함)
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
  const dayBranch = dayPillar.earthlyBranch?.name || dayPillar.earthlyBranch || dayPillar.branch || "";

  // 연지(年支) 추출 - 삼재/역마/도화 계산에 필요
  const yearPillar = pillars.year || {};
  const yearBranch = yearPillar.earthlyBranch?.name || yearPillar.earthlyBranch || yearPillar.branch || "";

  // 대운 데이터 추출
  const unse = saju?.unse || {};
  const daeunRaw = unse.daeun || [];
  const daeunCycles: DaeunCycle[] = daeunRaw.map((d: any) => ({
    age: d.age || 0,
    heavenlyStem: d.heavenlyStem || "",
    earthlyBranch: d.earthlyBranch || "",
    sibsin: d.sibsin || undefined,
  })).filter((d: DaeunCycle) => d.heavenlyStem && d.earthlyBranch);

  // 생년 추출
  const birthDateStr = saju?.facts?.birthDate || saju?.birthDate || "";
  let birthYear: number | undefined;
  if (birthDateStr) {
    const parsed = new Date(birthDateStr);
    if (!isNaN(parsed.getTime())) {
      birthYear = parsed.getFullYear();
    }
  }

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || "wood",
    dayBranch,
    yearBranch: yearBranch || undefined,
    birthYear,
    daeunCycles: daeunCycles.length > 0 ? daeunCycles : undefined,
    daeunsu: unse.daeunsu || undefined,
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

  // 출생 태양 경도 계산 (어스펙트 분석용)
  const sunPosition = getPlanetPosition(birthDate, "sun");

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || "fire"),
    sunLongitude: sunPosition.longitude,
    birthMonth: birthDate.getMonth() + 1,
    birthDay: birthDate.getDate(),
  };
}

/**
 * Daily Fortune 점수 계산 (오늘의 운세)
 * Destiny Calendar와 동일한 사주+점성술 교차 검증 로직 사용
 *
 * @param birthDate 생년월일 (Date 또는 'YYYY-MM-DD' 문자열)
 * @param birthTime 생시 (선택사항, 'HH:MM' 형식)
 * @param targetDate 분석 대상 날짜 (기본값: 오늘)
 * @returns 오늘의 운세 점수 및 상세 정보
 */
export interface DailyFortuneResult {
  overall: number;
  love: number;
  career: number;
  wealth: number;
  health: number;
  luckyColor: string;
  luckyNumber: number;
  grade: ImportanceGrade;
  ganzhi: string;
  alerts: { type: "warning" | "positive" | "info"; msg: string; icon?: string }[];
  recommendations: string[];
  warnings: string[];
  crossVerified: boolean;
  sajuFactors: string[];
  astroFactors: string[];
}

export function getDailyFortuneScore(
  birthDate: Date | string,
  birthTime?: string,
  targetDate?: Date
): DailyFortuneResult {
  // 날짜 파싱
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = targetDate || new Date();

  // 사주 프로필 계산
  const sajuProfile = calculateSajuProfileFromBirthDate(birth);

  // 연지(年支) 추가 - 삼재/역마/도화 계산용
  const birthYearGanzhi = getYearGanzhi(birth.getFullYear());
  sajuProfile.yearBranch = birthYearGanzhi.branch;
  sajuProfile.birthYear = birth.getFullYear();

  // 점성술 프로필 계산
  const astroProfile = calculateAstroProfileFromBirthDate(birth);
  astroProfile.birthMonth = birth.getMonth() + 1;
  astroProfile.birthDay = birth.getDate();

  // 핵심: analyzeDate 함수로 종합 분석
  const analysis = analyzeDate(today, sajuProfile, astroProfile);

  // 분석 결과가 없으면 기본값 반환
  if (!analysis) {
    const defaultScore = 50;
    return createDefaultFortuneResult(defaultScore, today, birth);
  }

  // 전체 점수 (0-100)
  const overallScore = analysis.score;

  // 영역별 점수 계산 (전체 점수 기반으로 변동)
  const areaScores = calculateAreaScores(overallScore, analysis, sajuProfile, today);

  // 행운의 색상/숫자 계산
  const ganzhi = getGanzhiForDate(today);
  const luckyColor = getLuckyColorFromElement(ganzhi.stemElement);
  const luckyNumber = getLuckyNumber(today, birth);

  // 알림 생성
  const alerts = generateAlerts(analysis, overallScore);

  return {
    overall: overallScore,
    love: areaScores.love,
    career: areaScores.career,
    wealth: areaScores.wealth,
    health: areaScores.health,
    luckyColor,
    luckyNumber,
    grade: analysis.grade,
    ganzhi: analysis.ganzhi,
    alerts,
    recommendations: analysis.recommendationKeys,
    warnings: analysis.warningKeys,
    crossVerified: analysis.crossVerified,
    sajuFactors: analysis.sajuFactorKeys,
    astroFactors: analysis.astroFactorKeys,
  };
}

/**
 * 영역별 점수 계산
 * 전체 점수를 기반으로 하되, 각 영역에 특화된 요소 반영
 */
function calculateAreaScores(
  overallScore: number,
  analysis: ImportantDate,
  sajuProfile: UserSajuProfile,
  targetDate: Date
): { love: number; career: number; wealth: number; health: number } {
  const baseScore = overallScore;
  const variance = 12; // 영역별 변동 폭

  // 영역별 조정 요소
  let loveAdj = 0;
  let careerAdj = 0;
  let wealthAdj = 0;
  let healthAdj = 0;

  // 사주 요소 기반 조정
  const factors = analysis.sajuFactorKeys;

  // 도화살 - 연애운 상승
  if (factors.includes("dohwaDay")) {
    loveAdj += 15;
  }

  // 건록 - 직업운 상승
  if (factors.includes("geonrokDay")) {
    careerAdj += 12;
  }

  // 정재/편재 십신 - 재물운 상승
  if (factors.some(f => f.includes("sipsin_정재") || f.includes("sipsin_편재"))) {
    wealthAdj += 12;
  }

  // 정인 십신 - 건강운 상승 (안정)
  if (factors.some(f => f.includes("sipsin_정인"))) {
    healthAdj += 8;
  }

  // 충(冲) - 건강/여행 주의
  if (factors.includes("branchChung") || factors.includes("iljinChung")) {
    healthAdj -= 15;
  }

  // 형(刑) - 건강 주의
  if (factors.includes("branchXing") || factors.includes("iljinXing")) {
    healthAdj -= 10;
  }

  // 육합 - 연애운 상승
  if (factors.includes("branchYukhap") || factors.includes("iljinYukhap")) {
    loveAdj += 10;
  }

  // 점성술 요소 기반 조정
  const astroFactors = analysis.astroFactorKeys;

  // 금성 트라인 - 연애/재물 상승
  if (astroFactors.includes("venusTrine")) {
    loveAdj += 10;
    wealthAdj += 8;
  }

  // 목성 트라인 - 전반적 행운
  if (astroFactors.includes("jupiterTrine")) {
    careerAdj += 10;
    wealthAdj += 12;
  }

  // 토성 스퀘어/컨정션 - 제한/압박
  if (astroFactors.includes("saturnSquare") || astroFactors.includes("saturnConjunct")) {
    careerAdj -= 8;
  }

  // 보름달 - 감정적 완성
  if (astroFactors.includes("lunarFullMoon") || astroFactors.includes("moonPhaseFull")) {
    loveAdj += 5;
  }

  // 날짜 기반 미세 변동 (일관성 유지)
  const dayHash = targetDate.getDate() * 7 + targetDate.getMonth() * 3;
  const microVar = (dayHash % variance) - (variance / 2);

  // 최종 점수 계산 (범위 제한)
  const love = Math.max(15, Math.min(95, baseScore + loveAdj + (microVar * 0.8)));
  const career = Math.max(15, Math.min(95, baseScore + careerAdj + (microVar * 0.6)));
  const wealth = Math.max(15, Math.min(95, baseScore + wealthAdj + (microVar * 0.7)));
  const health = Math.max(15, Math.min(95, baseScore + healthAdj + (microVar * 0.5)));

  return {
    love: Math.round(love),
    career: Math.round(career),
    wealth: Math.round(wealth),
    health: Math.round(health),
  };
}

/**
 * 행운의 색상 (일간 오행 기반)
 */
function getLuckyColorFromElement(element: string): string {
  const colorMap: Record<string, string[]> = {
    wood: ["Green", "Teal", "Emerald"],
    fire: ["Red", "Orange", "Pink"],
    earth: ["Yellow", "Brown", "Beige"],
    metal: ["White", "Silver", "Gold"],
    water: ["Blue", "Black", "Navy"],
  };

  const colors = colorMap[element] || colorMap.wood;
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 행운의 숫자 계산
 */
function getLuckyNumber(targetDate: Date, birthDate: Date): number {
  const dayOfYear = Math.floor((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const birthDay = birthDate.getDate();
  return ((dayOfYear + birthDay) % 9) + 1;
}

/**
 * 알림 생성
 */
function generateAlerts(
  analysis: ImportantDate,
  overallScore: number
): { type: "warning" | "positive" | "info"; msg: string; icon?: string }[] {
  const alerts: { type: "warning" | "positive" | "info"; msg: string; icon?: string }[] = [];

  // 등급별 알림
  if (analysis.grade === 0) {
    alerts.push({ type: "positive", msg: "천운의 날! 중요한 결정에 최적입니다.", icon: "🌟" });
  } else if (analysis.grade === 1) {
    alerts.push({ type: "positive", msg: "아주 좋은 날입니다. 적극적으로 행동하세요.", icon: "✨" });
  } else if (analysis.grade === 4) {
    alerts.push({ type: "warning", msg: "오늘은 조심하세요. 중요한 결정은 미루세요.", icon: "⚠️" });
  }

  // 특별 요소 알림
  if (analysis.sajuFactorKeys.includes("cheoneulGwiin")) {
    alerts.push({ type: "positive", msg: "천을귀인이 함께합니다. 귀인의 도움이 있습니다.", icon: "👼" });
  }

  if (analysis.sajuFactorKeys.includes("dohwaDay")) {
    alerts.push({ type: "info", msg: "도화살의 기운. 매력이 빛나는 날입니다.", icon: "💕" });
  }

  if (analysis.astroFactorKeys.includes("retrogradeMercury")) {
    alerts.push({ type: "warning", msg: "수성 역행 중. 계약/통신에 주의하세요.", icon: "📝" });
  }

  if (analysis.crossVerified) {
    alerts.push({ type: "positive", msg: "사주와 점성술이 일치합니다. 신뢰도 높음!", icon: "🎯" });
  }

  return alerts;
}

/**
 * 기본 운세 결과 생성 (분석 실패 시)
 */
function createDefaultFortuneResult(
  score: number,
  targetDate: Date,
  birthDate: Date
): DailyFortuneResult {
  const ganzhi = getGanzhiForDate(targetDate);

  return {
    overall: score,
    love: score + Math.floor(Math.random() * 10) - 5,
    career: score + Math.floor(Math.random() * 10) - 5,
    wealth: score + Math.floor(Math.random() * 10) - 5,
    health: score + Math.floor(Math.random() * 10) - 5,
    luckyColor: getLuckyColorFromElement(ganzhi.stemElement),
    luckyNumber: getLuckyNumber(targetDate, birthDate),
    grade: 3,
    ganzhi: `${ganzhi.stem}${ganzhi.branch}`,
    alerts: [],
    recommendations: [],
    warnings: [],
    crossVerified: false,
    sajuFactors: [],
    astroFactors: [],
  };
}
