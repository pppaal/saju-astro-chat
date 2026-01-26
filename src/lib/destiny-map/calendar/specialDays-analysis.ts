/**
 * 특별한 날 분석 로직
 * (운세 분석, 12운성, 시간대 추천, 음력 분석, 점성술 분석 등)
 */

import {
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  ELEMENT_RELATIONS_LOCAL as ELEMENT_RELATIONS,
} from '../config/specialDays.data';

import {
  getGongmang,
  isChunganHap,
  isAmhap,
  isWonjinDay,
} from '../config/specialDays.utils';

// ========================================
// 12운성(十二運星) 분석
// ========================================

export interface TwelveFortuneStarInfo {
  name: string;
  koreanName: string;
  stage: number;
  energy: "rising" | "peak" | "declining" | "dormant";
  score: number;
  meaning: string;
  advice: string;
  areas: {
    career: number;
    wealth: number;
    love: number;
    health: number;
  };
}

const TWELVE_FORTUNE_STARS: Record<string, TwelveFortuneStarInfo> = {
  "장생": {
    name: "jangseong",
    koreanName: "장생(長生)",
    stage: 1,
    energy: "rising",
    score: 85,
    meaning: "탄생과 시작의 기운, 새로운 가능성이 열림",
    advice: "새로운 시작에 좋은 시기, 계획 수립과 학습에 유리",
    areas: { career: 80, wealth: 70, love: 85, health: 90 }
  },
  "목욕": {
    name: "mokyok",
    koreanName: "목욕(沐浴)",
    stage: 2,
    energy: "rising",
    score: 60,
    meaning: "성장통의 시기, 불안정하지만 정화 중",
    advice: "감정 기복 주의, 충동적 결정 자제, 자기 정화에 집중",
    areas: { career: 50, wealth: 40, love: 70, health: 60 }
  },
  "관대": {
    name: "gwandae",
    koreanName: "관대(冠帶)",
    stage: 3,
    energy: "rising",
    score: 75,
    meaning: "성인이 되어 사회로 나감, 독립과 자립",
    advice: "자신감을 갖고 도전할 시기, 네트워킹에 좋음",
    areas: { career: 80, wealth: 65, love: 75, health: 75 }
  },
  "건록": {
    name: "geonrok",
    koreanName: "건록(建祿)",
    stage: 4,
    energy: "peak",
    score: 90,
    meaning: "왕성한 활동력, 직업적 성공의 기운",
    advice: "적극적 활동 추천, 승진/사업 확장에 최적",
    areas: { career: 95, wealth: 85, love: 70, health: 85 }
  },
  "제왕": {
    name: "jewang",
    koreanName: "제왕(帝旺)",
    stage: 5,
    energy: "peak",
    score: 95,
    meaning: "최고의 전성기, 권력과 영향력의 정점",
    advice: "리더십 발휘 최적, 단 오만함 경계 필요",
    areas: { career: 100, wealth: 90, love: 65, health: 80 }
  },
  "쇠": {
    name: "soe",
    koreanName: "쇠(衰)",
    stage: 6,
    energy: "declining",
    score: 55,
    meaning: "전성기 이후 서서히 기운이 빠짐",
    advice: "무리하지 말고 현상 유지, 건강 관리 시작",
    areas: { career: 60, wealth: 55, love: 60, health: 50 }
  },
  "병": {
    name: "byeong",
    koreanName: "병(病)",
    stage: 7,
    energy: "declining",
    score: 40,
    meaning: "기력 저하, 건강과 활력 주의 필요",
    advice: "휴식과 회복에 집중, 큰 결정 미루기",
    areas: { career: 40, wealth: 35, love: 45, health: 30 }
  },
  "사": {
    name: "sa",
    koreanName: "사(死)",
    stage: 8,
    energy: "dormant",
    score: 30,
    meaning: "한 사이클의 끝, 변화 직전의 정체",
    advice: "내면 성찰, 과거 정리, 새 시작 준비",
    areas: { career: 30, wealth: 25, love: 35, health: 35 }
  },
  "묘": {
    name: "myo",
    koreanName: "묘(墓)",
    stage: 9,
    energy: "dormant",
    score: 35,
    meaning: "저장과 축적의 시기, 잠재력 비축",
    advice: "저축/투자에 유리, 숨은 자원 발견 가능",
    areas: { career: 35, wealth: 50, love: 30, health: 40 }
  },
  "절": {
    name: "jeol",
    koreanName: "절(絶)",
    stage: 10,
    energy: "dormant",
    score: 25,
    meaning: "완전한 단절, 리셋의 시기",
    advice: "과거와의 완전한 결별, 새 인연/기회 대기",
    areas: { career: 25, wealth: 20, love: 25, health: 30 }
  },
  "태": {
    name: "tae",
    koreanName: "태(胎)",
    stage: 11,
    energy: "rising",
    score: 50,
    meaning: "새 생명의 잉태, 가능성의 씨앗",
    advice: "아이디어 구상, 계획 수립에 좋음",
    areas: { career: 45, wealth: 40, love: 55, health: 55 }
  },
  "양": {
    name: "yang",
    koreanName: "양(養)",
    stage: 12,
    energy: "rising",
    score: 65,
    meaning: "성장을 위한 양육, 준비 단계",
    advice: "학습과 준비에 최적, 실력 쌓기",
    areas: { career: 60, wealth: 55, love: 65, health: 70 }
  }
};

// 12운성 학파 유형
export type TwelveStarSchool = "standard" | "reverse-yin" | "unified";

// 기본 테이블 (순행파 - 현대 한국 주류)
const TWELVE_STAR_TABLE_STANDARD: Record<string, Record<string, string>> = {
  "甲": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "乙": { "午": "장생", "巳": "목욕", "辰": "관대", "卯": "건록", "寅": "제왕", "丑": "쇠", "子": "병", "亥": "사", "戌": "묘", "酉": "절", "申": "태", "未": "양" },
  "丙": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "丁": { "酉": "장생", "申": "목욕", "未": "관대", "午": "건록", "巳": "제왕", "辰": "쇠", "卯": "병", "寅": "사", "丑": "묘", "子": "절", "亥": "태", "戌": "양" },
  "戊": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "己": { "酉": "장생", "申": "목욕", "未": "관대", "午": "건록", "巳": "제왕", "辰": "쇠", "卯": "병", "寅": "사", "丑": "묘", "子": "절", "亥": "태", "戌": "양" },
  "庚": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "辛": { "子": "장생", "亥": "목욕", "戌": "관대", "酉": "건록", "申": "제왕", "未": "쇠", "午": "병", "巳": "사", "辰": "묘", "卯": "절", "寅": "태", "丑": "양" },
  "壬": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" },
  "癸": { "卯": "장생", "寅": "목욕", "丑": "관대", "子": "건록", "亥": "제왕", "戌": "쇠", "酉": "병", "申": "사", "未": "묘", "午": "절", "巳": "태", "辰": "양" }
};

// 역행파 테이블 (음간 역순 - 전통 중국 명리)
const TWELVE_STAR_TABLE_REVERSE_YIN: Record<string, Record<string, string>> = {
  "甲": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "乙": { "亥": "장생", "戌": "목욕", "酉": "관대", "申": "건록", "未": "제왕", "午": "쇠", "巳": "병", "辰": "사", "卯": "묘", "寅": "절", "丑": "태", "子": "양" },
  "丙": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "丁": { "寅": "장생", "丑": "목욕", "子": "관대", "亥": "건록", "戌": "제왕", "酉": "쇠", "申": "병", "未": "사", "午": "묘", "巳": "절", "辰": "태", "卯": "양" },
  "戊": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "己": { "寅": "장생", "丑": "목욕", "子": "관대", "亥": "건록", "戌": "제왕", "酉": "쇠", "申": "병", "未": "사", "午": "묘", "巳": "절", "辰": "태", "卯": "양" },
  "庚": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "辛": { "巳": "장생", "辰": "목욕", "卯": "관대", "寅": "건록", "丑": "제왕", "子": "쇠", "亥": "병", "戌": "사", "酉": "묘", "申": "절", "未": "태", "午": "양" },
  "壬": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" },
  "癸": { "申": "장생", "未": "목욕", "午": "관대", "巳": "건록", "辰": "제왕", "卯": "쇠", "寅": "병", "丑": "사", "子": "묘", "亥": "절", "戌": "태", "酉": "양" }
};

// 통일파 테이블
const TWELVE_STAR_TABLE_UNIFIED: Record<string, Record<string, string>> = {
  "甲": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "乙": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "丙": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "丁": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "戊": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "己": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "庚": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "辛": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "壬": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" },
  "癸": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" }
};

let currentTwelveStarSchool: TwelveStarSchool = "standard";

export function setTwelveStarSchool(school: TwelveStarSchool): void {
  currentTwelveStarSchool = school;
}

export function getTwelveStarSchool(): TwelveStarSchool {
  return currentTwelveStarSchool;
}

function getTwelveStarTable(school?: TwelveStarSchool): Record<string, Record<string, string>> {
  const targetSchool = school || currentTwelveStarSchool;
  switch (targetSchool) {
    case "reverse-yin":
      return TWELVE_STAR_TABLE_REVERSE_YIN;
    case "unified":
      return TWELVE_STAR_TABLE_UNIFIED;
    case "standard":
    default:
      return TWELVE_STAR_TABLE_STANDARD;
  }
}

export interface TwelveStarAnalysis {
  dayMaster: string;
  targetBranch: string;
  starName: string;
  starInfo: TwelveFortuneStarInfo;
  interpretation: string;
}

export function analyzeTwelveFortuneStar(
  dayMaster: string,
  targetBranch: string,
  school?: TwelveStarSchool
): TwelveStarAnalysis | null {
  const table = getTwelveStarTable(school);
  const stemTable = table[dayMaster];
  if (!stemTable) {return null;}

  const starName = stemTable[targetBranch];
  if (!starName) {return null;}

  const starInfo = TWELVE_FORTUNE_STARS[starName];
  if (!starInfo) {return null;}

  const schoolName = school || currentTwelveStarSchool;
  const schoolLabel = schoolName === "standard" ? "순행파" :
                      schoolName === "reverse-yin" ? "역행파" : "통일파";

  const interpretation = `${dayMaster}일간이 ${targetBranch}를 만나면 ${starInfo.koreanName} - ${starInfo.meaning} (${schoolLabel})`;

  return {
    dayMaster,
    targetBranch,
    starName,
    starInfo,
    interpretation
  };
}

export function analyzeDayTwelveStars(
  dayMaster: string,
  yearBranch: string,
  monthBranch: string,
  dayBranch: string,
  hourBranch?: string
): {
  year: TwelveStarAnalysis | null;
  month: TwelveStarAnalysis | null;
  day: TwelveStarAnalysis | null;
  hour: TwelveStarAnalysis | null;
  overallEnergy: "rising" | "peak" | "declining" | "dormant";
  averageScore: number;
  summary: string;
} {
  const year = analyzeTwelveFortuneStar(dayMaster, yearBranch);
  const month = analyzeTwelveFortuneStar(dayMaster, monthBranch);
  const day = analyzeTwelveFortuneStar(dayMaster, dayBranch);
  const hour = hourBranch ? analyzeTwelveFortuneStar(dayMaster, hourBranch) : null;

  const scores = [year, month, day, hour].filter(Boolean).map(s => s!.starInfo.score);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;

  const primaryStar = day || month;
  const overallEnergy = primaryStar?.starInfo.energy || "dormant";

  let summary = "";
  if (averageScore >= 80) {
    summary = "전성기의 기운! 적극적 활동에 최적";
  } else if (averageScore >= 60) {
    summary = "상승세의 기운, 새로운 도전 권장";
  } else if (averageScore >= 40) {
    summary = "안정적 흐름, 현상 유지 추천";
  } else {
    summary = "재충전 시기, 휴식과 내면 성찰";
  }

  return { year, month, day, hour, overallEnergy, averageScore, summary };
}

// ========================================
// 세운/월운 흐름 분석
// ========================================

export interface FortuneFlowAnalysis {
  period: "yearly" | "monthly";
  stemElement: string;
  branchElement: string;
  compatibility: "excellent" | "good" | "neutral" | "challenging" | "difficult";
  score: number;
  focus: string[];
  warnings: string[];
}

export function analyzeFortuneFlow(
  periodStem: string,
  periodBranch: string,
  dayMaster: string,
  dayMasterElement: string,
  yongsinElement?: string
): FortuneFlowAnalysis {
  const stemEl = STEM_ELEMENTS[periodStem] || "earth";
  const branchEl = BRANCH_ELEMENTS[periodBranch] || "earth";

  let score = 50;
  const focus: string[] = [];
  const warnings: string[] = [];
  let compatibility: FortuneFlowAnalysis["compatibility"] = "neutral";

  const rel = ELEMENT_RELATIONS[dayMasterElement];
  if (!rel) {
    return { period: "yearly", stemElement: stemEl, branchElement: branchEl, compatibility, score, focus, warnings };
  }

  if (yongsinElement && (stemEl === yongsinElement || branchEl === yongsinElement)) {
    score += 30;
    compatibility = "excellent";
    focus.push("용신이 왔으므로 적극적 활동 추천");
  }

  if (stemEl === rel.generatedBy || branchEl === rel.generatedBy) {
    score += 20;
    if (compatibility !== "excellent") {compatibility = "good";}
    focus.push("에너지를 받는 시기");
  }

  if (stemEl === dayMasterElement || branchEl === dayMasterElement) {
    score += 15;
    if (compatibility !== "excellent" && compatibility !== "good") {compatibility = "good";}
    focus.push("자신감 상승, 주도적 활동");
  }

  if (stemEl === rel.controlledBy || branchEl === rel.controlledBy) {
    score -= 20;
    compatibility = "challenging";
    warnings.push("외부 압박, 건강 주의");
  }

  if (stemEl === rel.controls || branchEl === rel.controls) {
    score += 10;
    focus.push("재물운 상승, 투자 검토");
  }

  if (stemEl === rel.generates || branchEl === rel.generates) {
    score += 5;
    focus.push("창작/표현 좋음, 자녀 관련 일");
  }

  return {
    period: "yearly",
    stemElement: stemEl,
    branchElement: branchEl,
    compatibility,
    score,
    focus,
    warnings,
  };
}

// ========================================
// 시간대별 최적 활동 추천
// ========================================

export interface HourlyRecommendation {
  hour: number;
  sijiName: string;
  planetaryHour: string;
  bestActivities: string[];
  avoidActivities: string[];
  score: number;
}

const SIJI_INFO: Record<string, {
  hours: number[];
  branch: string;
  element: string;
  bestFor: string[];
  avoidFor: string[];
}> = {
  "자시": { hours: [23, 0], branch: "子", element: "water", bestFor: ["명상", "계획", "휴식"], avoidFor: ["중요 결정", "계약"] },
  "축시": { hours: [1, 2], branch: "丑", element: "earth", bestFor: ["준비", "정리"], avoidFor: ["새 시작"] },
  "인시": { hours: [3, 4], branch: "寅", element: "wood", bestFor: ["기상", "운동", "계획"], avoidFor: ["중요 미팅"] },
  "묘시": { hours: [5, 6], branch: "卯", element: "wood", bestFor: ["창작", "아이디어"], avoidFor: ["충돌"] },
  "진시": { hours: [7, 8], branch: "辰", element: "earth", bestFor: ["업무 시작", "미팅"], avoidFor: ["휴식"] },
  "사시": { hours: [9, 10], branch: "巳", element: "fire", bestFor: ["발표", "영업", "소통"], avoidFor: ["조용한 작업"] },
  "오시": { hours: [11, 12], branch: "午", element: "fire", bestFor: ["중요 결정", "계약"], avoidFor: ["휴식", "갈등"] },
  "미시": { hours: [13, 14], branch: "未", element: "earth", bestFor: ["협력", "팀워크"], avoidFor: ["새 시작"] },
  "신시": { hours: [15, 16], branch: "申", element: "metal", bestFor: ["분석", "정리", "마무리"], avoidFor: ["충동적 결정"] },
  "유시": { hours: [17, 18], branch: "酉", element: "metal", bestFor: ["평가", "반성"], avoidFor: ["새 프로젝트"] },
  "술시": { hours: [19, 20], branch: "戌", element: "earth", bestFor: ["사교", "저녁 식사"], avoidFor: ["중요 결정"] },
  "해시": { hours: [21, 22], branch: "亥", element: "water", bestFor: ["휴식", "명상", "계획"], avoidFor: ["활동적 일"] }
};

const PLANETARY_HOUR_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];

function getLocalElementRelationship(element: string): { generates: string; generatedBy: string; controls: string; controlledBy: string } {
  return ELEMENT_RELATIONS[element] || { generates: "", generatedBy: "", controls: "", controlledBy: "" };
}

export function getHourlyRecommendation(
  hour: number,
  dayOfWeek: number,
  dayMasterElement: string,
  yongsinElement?: string
): HourlyRecommendation {
  let sijiName = "";
  let sijiData: typeof SIJI_INFO[keyof typeof SIJI_INFO] | null = null;

  for (const [name, data] of Object.entries(SIJI_INFO)) {
    if (data.hours.includes(hour) || (name === "자시" && (hour === 23 || hour === 0))) {
      sijiName = name;
      sijiData = data;
      break;
    }
  }

  if (!sijiData) {
    sijiData = SIJI_INFO["자시"];
    sijiName = "자시";
  }

  const planetIdx = (dayOfWeek * 24 + hour) % 7;
  const planetaryHour = PLANETARY_HOUR_ORDER[planetIdx];

  const bestActivities = [...sijiData.bestFor];
  const avoidActivities = [...sijiData.avoidFor];

  const rel = getLocalElementRelationship(dayMasterElement);
  if (sijiData.element === dayMasterElement || sijiData.element === rel.generatedBy) {
    bestActivities.push("중요 업무");
  }
  if (sijiData.element === rel.controlledBy) {
    avoidActivities.push("무리한 활동");
  }

  let score = 50;
  if (yongsinElement && sijiData.element === yongsinElement) {
    score += 20;
    bestActivities.push("용신 시간 - 최적");
  }

  if (planetaryHour === "Jupiter") {
    score += 10;
    bestActivities.push("확장", "학습");
  } else if (planetaryHour === "Saturn") {
    score -= 5;
    bestActivities.push("구조화", "마무리");
  } else if (planetaryHour === "Venus") {
    bestActivities.push("연애", "예술");
  } else if (planetaryHour === "Mars") {
    bestActivities.push("경쟁", "운동");
    avoidActivities.push("갈등 상황");
  }

  return {
    hour,
    sijiName,
    planetaryHour,
    bestActivities: [...new Set(bestActivities)],
    avoidActivities: [...new Set(avoidActivities)],
    score
  };
}

// ========================================
// 음력 기반 분석
// ========================================

export interface LunarAnalysis {
  lunarMonth: number;
  lunarDay: number;
  lunarPhase: string;
  isLeapMonth: boolean;
  specialDay: string | null;
  recommendations: string[];
  score: number;
}

const LUNAR_SPECIAL_DAYS: Record<string, { name: string; meaning: string; score: number }> = {
  "1-1": { name: "설날", meaning: "새해 시작, 가족 화합", score: 20 },
  "1-15": { name: "정월대보름", meaning: "소원 성취, 액막이", score: 15 },
  "3-3": { name: "삼짇날", meaning: "봄의 시작, 진달래", score: 8 },
  "4-8": { name: "석가탄신일", meaning: "자비와 깨달음", score: 10 },
  "5-5": { name: "단오", meaning: "액막이, 건강", score: 12 },
  "7-7": { name: "칠석", meaning: "연인의 날, 소원", score: 10 },
  "7-15": { name: "백중", meaning: "조상 공양", score: 8 },
  "8-15": { name: "추석", meaning: "풍요와 감사, 가족", score: 20 },
  "9-9": { name: "중양절", meaning: "장수, 국화", score: 8 },
  "10-15": { name: "하원", meaning: "마무리", score: 5 },
  "12-30": { name: "섣달그믐", meaning: "한 해 마무리", score: 10 }
};

export function analyzeLunarDate(gregorianDate: Date): LunarAnalysis {
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1;
  const day = gregorianDate.getDate();

  let lunarMonth = month - 1;
  if (lunarMonth <= 0) {lunarMonth = 12;}

  const lunarDay = day;

  const moonCycle = 29.53;
  const yearStartUtc = Date.UTC(year, 0, 0);
  const dateUtc = Date.UTC(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate());
  const dayOfYear = Math.floor((dateUtc - yearStartUtc) / (1000 * 60 * 60 * 24));
  const moonPhaseDay = dayOfYear % moonCycle;

  let lunarPhase: string;
  if (moonPhaseDay < 1.85) {
    lunarPhase = "삭(朔) - 새달";
  } else if (moonPhaseDay < 7.38) {
    lunarPhase = "상현(上弦)";
  } else if (moonPhaseDay < 14.77) {
    lunarPhase = "망(望) - 보름달";
  } else if (moonPhaseDay < 22.15) {
    lunarPhase = "하현(下弦)";
  } else {
    lunarPhase = "그믐";
  }

  const dateKey = `${lunarMonth}-${lunarDay}`;
  const specialDayInfo = LUNAR_SPECIAL_DAYS[dateKey];
  const specialDay = specialDayInfo?.name || null;

  const recommendations: string[] = [];
  let score = 0;

  if (specialDayInfo) {
    recommendations.push(specialDayInfo.meaning);
    score += specialDayInfo.score;
  }

  if (lunarPhase.includes("보름")) {
    recommendations.push("완성", "수확", "감사");
    score += 8;
  } else if (lunarPhase.includes("새달")) {
    recommendations.push("새 시작", "계획", "씨앗 뿌리기");
    score += 5;
  }

  return {
    lunarMonth,
    lunarDay,
    lunarPhase,
    isLeapMonth: false,
    specialDay,
    recommendations,
    score
  };
}

// ========================================
// 사주-점성술 오행 매핑
// ========================================

export interface ElementMappingDetail {
  sajuElement: string;
  astroElements: string[];
  signs: string[];
  planets: string[];
  compatibility: number;
}

export const ELEMENT_ASTRO_MAPPING: Record<string, ElementMappingDetail> = {
  "wood": {
    sajuElement: "목(木)",
    astroElements: ["air"],
    signs: ["Gemini", "Libra", "Aquarius", "Sagittarius"],
    planets: ["Jupiter", "Mercury"],
    compatibility: 75
  },
  "fire": {
    sajuElement: "화(火)",
    astroElements: ["fire"],
    signs: ["Aries", "Leo", "Sagittarius"],
    planets: ["Sun", "Mars"],
    compatibility: 95
  },
  "earth": {
    sajuElement: "토(土)",
    astroElements: ["earth"],
    signs: ["Taurus", "Virgo", "Capricorn"],
    planets: ["Saturn", "Venus"],
    compatibility: 90
  },
  "metal": {
    sajuElement: "금(金)",
    astroElements: ["air", "earth"],
    signs: ["Libra", "Aquarius", "Capricorn", "Virgo"],
    planets: ["Venus", "Saturn", "Uranus"],
    compatibility: 70
  },
  "water": {
    sajuElement: "수(水)",
    astroElements: ["water"],
    signs: ["Cancer", "Scorpio", "Pisces"],
    planets: ["Moon", "Neptune", "Pluto"],
    compatibility: 95
  }
};

export function analyzeElementCompatibility(
  sajuElement: string,
  sunSign: string,
  moonSign?: string
): { compatibility: number; harmony: string; advice: string } {
  const mapping = ELEMENT_ASTRO_MAPPING[sajuElement];
  if (!mapping) {
    return { compatibility: 50, harmony: "neutral", advice: "기본 분석" };
  }

  let score = 0;

  if (mapping.signs.includes(sunSign)) {
    score += 40;
  }

  if (moonSign && mapping.signs.includes(moonSign)) {
    score += 30;
  }

  score += mapping.compatibility * 0.3;

  let harmony: string;
  let advice: string;

  if (score >= 70) {
    harmony = "excellent";
    advice = "사주와 점성술이 조화롭습니다. 양 체계의 장점을 활용하세요.";
  } else if (score >= 50) {
    harmony = "good";
    advice = "대체로 조화롭습니다. 부조화 영역은 성장의 기회입니다.";
  } else if (score >= 30) {
    harmony = "moderate";
    advice = "일부 긴장이 있습니다. 균형을 찾는 노력이 필요합니다.";
  } else {
    harmony = "challenging";
    advice = "도전적 조합입니다. 내면 통합 작업이 도움됩니다.";
  }

  return {
    compatibility: Math.min(100, score),
    harmony,
    advice
  };
}

// ========================================
// 용신 기반 상세 추천
// ========================================

export interface YongsinRecommendation {
  direction: string;
  color: string;
  number: number;
  food: string;
  activity: string;
  avoidElement: string;
}

export const ELEMENT_RECOMMENDATIONS: Record<string, YongsinRecommendation> = {
  wood: {
    direction: "동쪽",
    color: "청색/녹색",
    number: 3,
    food: "신맛 음식, 채소, 나물",
    activity: "새벽 활동, 창작, 계획 수립",
    avoidElement: "금(金) - 금속, 흰색, 서쪽",
  },
  fire: {
    direction: "남쪽",
    color: "적색/주황색",
    number: 7,
    food: "쓴맛 음식, 구운 요리",
    activity: "낮 활동, 발표, 홍보, 면접",
    avoidElement: "수(水) - 물, 검정색, 북쪽",
  },
  earth: {
    direction: "중앙/남서",
    color: "황색/갈색",
    number: 5,
    food: "단맛 음식, 곡물, 과일",
    activity: "오후 활동, 중재, 계약, 부동산",
    avoidElement: "목(木) - 나무, 청색, 동쪽",
  },
  metal: {
    direction: "서쪽",
    color: "백색/금색",
    number: 9,
    food: "매운 음식, 생강, 마늘",
    activity: "저녁 활동, 결단, 정리, 수금",
    avoidElement: "화(火) - 불, 적색, 남쪽",
  },
  water: {
    direction: "북쪽",
    color: "흑색/남색",
    number: 1,
    food: "짠맛 음식, 해산물",
    activity: "밤 활동, 연구, 명상, 여행",
    avoidElement: "토(土) - 흙, 황색, 중앙",
  },
};

export function getYongsinRecommendations(yongsinElement: string): YongsinRecommendation | null {
  const element = yongsinElement.toLowerCase();
  return ELEMENT_RECOMMENDATIONS[element] || null;
}
