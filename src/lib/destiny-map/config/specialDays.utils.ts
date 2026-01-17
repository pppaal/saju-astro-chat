/**
 * 특별한 날 관련 유틸리티 함수들
 * (삼재, 역마, 도화, 건록, 귀인, 신살 체크 함수 등)
 */

import {
  STEMS_LOCAL as STEMS,
  BRANCHES_LOCAL as BRANCHES,
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM,
  SIPSIN_RELATIONS,
  WONJIN,
  GWIMUN,
  BRANCH_MAIN_STEM,
  STEM_COMBO_PAIRS,
  PA,
  HAE,
  CHUNGAN_HAP,
  HWAGAE_BY_YEAR_BRANCH,
  GEOBSAL_BY_YEAR_BRANCH,
  BAEKHO_BY_YEAR_BRANCH,
  CHEONDEOK_BY_MONTH_BRANCH,
  WOLDEOK_BY_MONTH_BRANCH,
  CHEONHEE_BY_YEAR_BRANCH,
  HONGYEOM_BY_YEAR_BRANCH,
  CHEONUI_BY_MONTH_BRANCH,
  JANGSEONG_BY_YEAR_BRANCH,
  BANAN_BY_YEAR_BRANCH,
  MUNCHANG_BY_DAY_STEM,
  HAKDANG_BY_DAY_STEM,
  NAPEUM_ELEMENT_TABLE,
  TWELVE_SPIRITS,
  TWELVE_SPIRITS_MEANINGS,
  TWENTY_EIGHT_MANSIONS,
  SOLAR_TERMS,
  SAMHAP_GROUPS,
  SPECIAL_SAL_COMBINATIONS,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  ELEMENT_RELATIONS_LOCAL as ELEMENT_RELATIONS,
  type SolarTermInfo,
  type SalCombination,
} from './specialDays.data';

// ============================================================
// 기본 신살 체크 함수들
// ============================================================

export function isSamjaeYear(birthYearBranch: string, currentYearBranch: string): boolean {
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[birthYearBranch];
  return samjaeBranches?.includes(currentYearBranch) ?? false;
}

export function isYeokmaDay(birthYearBranch: string, dayBranch: string): boolean {
  return YEOKMA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isDohwaDay(birthYearBranch: string, dayBranch: string): boolean {
  return DOHWA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isGeonrokDay(dayMasterStem: string, dayBranch: string): boolean {
  return GEONROK_BY_DAY_STEM[dayMasterStem] === dayBranch;
}

export function getSipsin(dayMasterStem: string, targetStem: string): string {
  return SIPSIN_RELATIONS[dayMasterStem]?.[targetStem] ?? "";
}

// 손없는 날 (이사/결혼/개업에 좋은 날)
export function isSonEomneunDay(lunarDay: number): boolean {
  if (!Number.isFinite(lunarDay) || lunarDay < 1 || lunarDay > 30) return false;
  const dayInCycle = lunarDay % 10;
  return dayInCycle === 9 || dayInCycle === 0; // 9, 10, 19, 20, 29, 30일
}

// 간단한 양력→음력 근사 변환 (정확도 ±1~2일)
export function approximateLunarDay(date: Date): number {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(2000, 0, 6);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const lunarMonthDays = 29.53;
  const dayInMonth = ((diffDays % lunarMonthDays) + lunarMonthDays) % lunarMonthDays;
  return Math.floor(dayInMonth) + 1;
}

// ============================================================
// 공망 (空亡) 관련 함수
// ============================================================

// 일주(日柱) 기준 공망 지지 계산
export function getGongmang(dayStem: string, dayBranch: string): string[] {
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);
  if (stemIdx === -1 || branchIdx === -1) return [];

  // 순(旬)의 시작 지지 인덱스: 천간 인덱스만큼 지지가 뒤로 밀림
  const xunStartBranch = (branchIdx - stemIdx + 12) % 12;
  // 공망은 순에서 빠진 2개 지지 (인덱스 10, 11)
  const gongmang1 = BRANCHES[(xunStartBranch + 10) % 12];
  const gongmang2 = BRANCHES[(xunStartBranch + 11) % 12];

  return [gongmang1, gongmang2];
}

// 특정 날의 지지가 공망인지 체크
export function isGongmangDay(dayStem: string, dayBranch: string, targetBranch: string): boolean {
  const gongmangBranches = getGongmang(dayStem, dayBranch);
  return gongmangBranches.includes(targetBranch);
}

// ============================================================
// 지지 관계 체크 함수들
// ============================================================

export function isWonjinDay(dayBranch: string, targetBranch: string): boolean {
  return WONJIN[dayBranch] === targetBranch;
}

export function isGwimunDay(dayBranch: string, targetBranch: string): boolean {
  return GWIMUN[dayBranch] === targetBranch;
}

// 암합 (暗合) - 지지 속에 숨은 천간끼리의 합
export function isAmhap(branch1: string, branch2: string): boolean {
  const stem1 = BRANCH_MAIN_STEM[branch1];
  const stem2 = BRANCH_MAIN_STEM[branch2];
  if (!stem1 || !stem2) return false;

  return STEM_COMBO_PAIRS.some(([a, b]) =>
    (stem1 === a && stem2 === b) || (stem1 === b && stem2 === a)
  );
}

export function isPaDay(dayBranch: string, targetBranch: string): boolean {
  return PA[dayBranch] === targetBranch;
}

export function isHaeDay(dayBranch: string, targetBranch: string): boolean {
  return HAE[dayBranch] === targetBranch;
}

// ============================================================
// 천간합 (天干合)
// ============================================================

export function isChunganHap(stem1: string, stem2: string): { isHap: boolean; resultElement?: string } {
  const hapInfo = CHUNGAN_HAP[stem1];
  if (hapInfo && hapInfo.partner === stem2) {
    return { isHap: true, resultElement: hapInfo.result };
  }
  return { isHap: false };
}

// ============================================================
// 귀인/신살 체크 함수들
// ============================================================

export function isHwagaeDay(birthYearBranch: string, dayBranch: string): boolean {
  return HWAGAE_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isGeobsalDay(birthYearBranch: string, dayBranch: string): boolean {
  return GEOBSAL_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isBaekhoDay(birthYearBranch: string, dayBranch: string): boolean {
  return BAEKHO_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isCheondeokDay(monthBranch: string, dayStem: string): boolean {
  return CHEONDEOK_BY_MONTH_BRANCH[monthBranch] === dayStem;
}

export function isWoldeokDay(monthBranch: string, dayStem: string): boolean {
  return WOLDEOK_BY_MONTH_BRANCH[monthBranch] === dayStem;
}

export function isCheonheeDay(birthYearBranch: string, dayBranch: string): boolean {
  return CHEONHEE_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isHongyeomDay(birthYearBranch: string, dayBranch: string): boolean {
  return HONGYEOM_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isCheonuiDay(monthBranch: string, dayBranch: string): boolean {
  return CHEONUI_BY_MONTH_BRANCH[monthBranch] === dayBranch;
}

export function isJangseongDay(birthYearBranch: string, dayBranch: string): boolean {
  return JANGSEONG_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isBananDay(birthYearBranch: string, dayBranch: string): boolean {
  return BANAN_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isMunchangDay(dayStem: string, dayBranch: string): boolean {
  return MUNCHANG_BY_DAY_STEM[dayStem] === dayBranch;
}

export function isHakdangDay(dayStem: string, dayBranch: string): boolean {
  return HAKDANG_BY_DAY_STEM[dayStem] === dayBranch;
}

// ============================================================
// 납음(納音) 오행
// ============================================================

export function getNapeumElement(stem: string, branch: string): string | undefined {
  return NAPEUM_ELEMENT_TABLE[stem + branch];
}

// ============================================================
// 12신살 (十二神殺)
// ============================================================

export function getTwelveSpiritForDay(date: Date): { name: string; meaning: string; score: number } {
  // 기준일: 2000년 1월 1일 = "건"
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(2000, 0, 1);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 12) + 12) % 12;
  const name = TWELVE_SPIRITS[index];

  return { name, ...TWELVE_SPIRITS_MEANINGS[name] };
}

// ============================================================
// 28수 (二十八宿)
// ============================================================

export function get28MansionForDay(date: Date): { name: string; meaning: string; score: number } {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(2000, 0, 1);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 28) + 28) % 28;
  return TWENTY_EIGHT_MANSIONS[index];
}

// ============================================================
// 24절기 (二十四節氣)
// ============================================================

// 태양 황경 근사 계산
function getSunLongitude(date: Date): number {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);
  // 평균 태양 황경 (근사)
  const L = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  return L < 0 ? L + 360 : L;
}

// 해당 날짜가 절기인지 확인 (±1도 범위)
export function getSolarTermForDate(date: Date): SolarTermInfo | null {
  const sunLong = getSunLongitude(date);

  for (const term of SOLAR_TERMS) {
    const diff = Math.abs(sunLong - term.longitude);
    const normalizedDiff = Math.min(diff, 360 - diff);
    if (normalizedDiff < 1) {  // ±1도 이내
      return term;
    }
  }
  return null;
}

// 다음 절기까지 남은 일수
export function getDaysToNextSolarTerm(date: Date): { term: SolarTermInfo; days: number } {
  const sunLong = getSunLongitude(date);

  // 현재 황경보다 큰 가장 가까운 절기 찾기
  const sortedTerms = [...SOLAR_TERMS].sort((a, b) => a.longitude - b.longitude);

  for (const term of sortedTerms) {
    if (term.longitude > sunLong) {
      const degDiff = term.longitude - sunLong;
      const days = Math.round(degDiff / 0.9856474);  // 태양은 하루에 약 1도 이동
      return { term, days };
    }
  }

  // 연말 → 입춘
  const firstTerm = sortedTerms[0];
  const degDiff = (360 - sunLong) + firstTerm.longitude;
  const days = Math.round(degDiff / 0.9856474);
  return { term: firstTerm, days };
}

// ============================================================
// 일식/월식 분석 (근사 계산)
// ============================================================

export interface EclipseInfo {
  type: "solar" | "lunar";
  subType: "total" | "partial" | "annular" | "penumbral";
  date: Date;
  score: number;
  meaning: string;
}

// 달의 노드(교점) 근처에서 삭/망이면 일식/월식 가능성
export function checkEclipsePotential(date: Date): { potential: boolean; type: "solar" | "lunar" | null; strength: number } {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 태양 황경
  const sunLong = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  // 달 황경
  const moonLong = (218.32 + 13.176396 * daysSinceJ2000) % 360;
  // 노드 황경 (역행)
  const nodeLong = (125.0 - 0.0529 * daysSinceJ2000) % 360;

  // 삭(New Moon) 체크 - 태양과 달 합
  const sunMoonDiff = Math.abs(sunLong - moonLong);
  const isNewMoon = sunMoonDiff < 12 || sunMoonDiff > 348;

  // 망(Full Moon) 체크 - 태양과 달 충
  const isFullMoon = Math.abs(sunMoonDiff - 180) < 12;

  // 노드 근처 체크 (±18도)
  const moonNodeDiff = Math.abs(moonLong - nodeLong);
  const normalizedNodeDiff = Math.min(moonNodeDiff, 360 - moonNodeDiff);
  const nearNode = normalizedNodeDiff < 18;

  // 반대 노드도 체크
  const oppositeNodeLong = (nodeLong + 180) % 360;
  const moonOppositeNodeDiff = Math.abs(moonLong - oppositeNodeLong);
  const normalizedOppositeNodeDiff = Math.min(moonOppositeNodeDiff, 360 - moonOppositeNodeDiff);
  const nearOppositeNode = normalizedOppositeNodeDiff < 18;

  if (isNewMoon && (nearNode || nearOppositeNode)) {
    return { potential: true, type: "solar", strength: 18 - normalizedNodeDiff };
  }
  if (isFullMoon && (nearNode || nearOppositeNode)) {
    return { potential: true, type: "lunar", strength: 18 - normalizedNodeDiff };
  }

  return { potential: false, type: null, strength: 0 };
}

// ============================================================
// 행성 역행 분석
// ============================================================

export interface RetrogradePhase {
  phase: "pre-shadow" | "retrograde" | "post-shadow" | "direct";
  planet: string;
  meaning: string;
  score: number;
}

// 수성 역행 상세 (그림자 기간 포함)
export function getMercuryRetrogradePhase(date: Date): RetrogradePhase {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 수성 시노딕 주기: 약 116일
  const cycle = daysSinceJ2000 % 116;

  // 0-14: 프리 쉐도우 (역행 준비)
  // 14-35: 역행
  // 35-49: 포스트 쉐도우 (회복)
  // 49-116: 순행

  if (cycle >= 0 && cycle < 14) {
    return { phase: "pre-shadow", planet: "mercury", meaning: "수성 역행 준비기 - 중요 결정 보류", score: -3 };
  } else if (cycle >= 14 && cycle < 35) {
    return { phase: "retrograde", planet: "mercury", meaning: "수성 역행 - 의사소통/계약 주의", score: -8 };
  } else if (cycle >= 35 && cycle < 49) {
    return { phase: "post-shadow", planet: "mercury", meaning: "수성 역행 회복기 - 재검토 완료", score: -2 };
  } else {
    return { phase: "direct", planet: "mercury", meaning: "수성 순행 - 정상 진행", score: 0 };
  }
}

// 금성 역행 상세
export function getVenusRetrogradePhase(date: Date): RetrogradePhase {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 금성 시노딕 주기: 약 584일
  const cycle = daysSinceJ2000 % 584;

  // 0-20: 프리 쉐도우
  // 20-60: 역행 (약 40일)
  // 60-80: 포스트 쉐도우
  // 80-584: 순행

  if (cycle >= 0 && cycle < 20) {
    return { phase: "pre-shadow", planet: "venus", meaning: "금성 역행 준비기 - 관계 재점검", score: -2 };
  } else if (cycle >= 20 && cycle < 60) {
    return { phase: "retrograde", planet: "venus", meaning: "금성 역행 - 사랑/재물 재고", score: -5 };
  } else if (cycle >= 60 && cycle < 80) {
    return { phase: "post-shadow", planet: "venus", meaning: "금성 역행 회복기", score: -1 };
  } else {
    return { phase: "direct", planet: "venus", meaning: "금성 순행", score: 0 };
  }
}

// 화성 역행 상세
export function getMarsRetrogradePhase(date: Date): RetrogradePhase {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 화성 시노딕 주기: 약 780일
  const cycle = daysSinceJ2000 % 780;

  // 0-30: 프리 쉐도우
  // 30-102: 역행 (약 72일)
  // 102-132: 포스트 쉐도우
  // 132-780: 순행

  if (cycle >= 0 && cycle < 30) {
    return { phase: "pre-shadow", planet: "mars", meaning: "화성 역행 준비기 - 행동력 저하", score: -2 };
  } else if (cycle >= 30 && cycle < 102) {
    return { phase: "retrograde", planet: "mars", meaning: "화성 역행 - 갈등/분쟁 주의", score: -6 };
  } else if (cycle >= 102 && cycle < 132) {
    return { phase: "post-shadow", planet: "mars", meaning: "화성 역행 회복기", score: -1 };
  } else {
    return { phase: "direct", planet: "mars", meaning: "화성 순행", score: 0 };
  }
}

// ============================================================
// 행성 입궁 (Ingress) - 별자리 변경
// ============================================================

export function getPlanetSignChange(date: Date, daysBefore: number = 3, daysAfter: number = 3): { planet: string; fromSign: string; toSign: string; isTransition: boolean }[] {
  const results: { planet: string; fromSign: string; toSign: string; isTransition: boolean }[] = [];
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                 "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const daysSinceJ2000 = (date.getTime() - J2000.getTime()) / (1000 * 60 * 60 * 24);

  // 각 행성별 황경 계산 및 사인 경계 체크
  const planets = [
    { name: "sun", rate: 0.9856474, base: 280.46 },
    { name: "moon", rate: 13.176396, base: 218.32 },
    { name: "mercury", rate: 4.0923, base: 280.46 },  // 평균 속도
    { name: "venus", rate: 1.6021, base: 181.98 },
    { name: "mars", rate: 0.5240, base: 355.43 },
    { name: "jupiter", rate: 0.0831, base: 34.35 },
    { name: "saturn", rate: 0.0335, base: 49.94 },
  ];

  for (const planet of planets) {
    const currentLong = (planet.base + planet.rate * daysSinceJ2000) % 360;
    const currentSign = signs[Math.floor(currentLong / 30)];
    const degreeInSign = currentLong % 30;

    // 사인 초입 (0-3도) 또는 사인 끝 (27-30도)이면 전환 중
    if (degreeInSign < daysBefore || degreeInSign > (30 - daysAfter)) {
      const prevSign = signs[(Math.floor(currentLong / 30) - 1 + 12) % 12];
      const nextSign = signs[(Math.floor(currentLong / 30) + 1) % 12];

      results.push({
        planet: planet.name,
        fromSign: degreeInSign < daysBefore ? prevSign : currentSign,
        toSign: degreeInSign < daysBefore ? currentSign : nextSign,
        isTransition: true,
      });
    }
  }

  return results;
}

// ============================================================
// 시주(時柱)와 일진의 관계 분석
// ============================================================

export function analyzeHourPillarWithDay(
  hourBranch: string,
  dayBranch: string,
  dayStem: string
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // 1. 시지와 일지의 합/충/형/해 관계
  const YUKHAP: Record<string, string> = {
    "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
    "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
    "巳": "申", "申": "巳", "午": "未", "未": "午",
  };

  const CHUNG: Record<string, string> = {
    "子": "午", "午": "子", "丑": "未", "未": "丑",
    "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
    "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
  };

  if (YUKHAP[hourBranch] === dayBranch) {
    score += 10;
    factors.push("hourDayHap");  // 시일합 - 매우 좋음
  }

  if (CHUNG[hourBranch] === dayBranch) {
    score -= 8;
    factors.push("hourDayChung");  // 시일충 - 주의
  }

  // 2. 시지가 천을귀인인지 체크
  const CHEONEUL: Record<string, string[]> = {
    "甲": ["丑", "未"], "乙": ["子", "申"], "丙": ["亥", "酉"], "丁": ["亥", "酉"],
    "戊": ["丑", "未"], "己": ["子", "申"], "庚": ["丑", "未"], "辛": ["寅", "午"],
    "壬": ["卯", "巳"], "癸": ["卯", "巳"],
  };

  if (CHEONEUL[dayStem]?.includes(hourBranch)) {
    score += 12;
    factors.push("hourCheoneul");  // 시주 천을귀인
  }

  // 3. 공망 체크
  const gongmang = getGongmang(dayStem, dayBranch);
  if (gongmang.includes(hourBranch)) {
    score -= 6;
    factors.push("hourGongmang");  // 시주 공망
  }

  return { score, factors };
}

// ============================================================
// 대운 전환기 분석
// ============================================================

export function analyzeDaeunTransition(
  birthYear: number,
  currentYear: number,
  daeunsu: number  // 대운 시작 나이
): { inTransition: boolean; yearsToTransition: number; transitionScore: number } {
  const age = currentYear - birthYear + 1;  // 한국식 나이

  // 대운은 10년 주기
  const yearsIntoDaeun = (age - daeunsu) % 10;
  const yearsToTransition = 10 - yearsIntoDaeun;

  // 전환기: 마지막 1년 또는 첫 1년
  const inTransition = yearsIntoDaeun >= 9 || yearsIntoDaeun <= 1;

  let transitionScore = 0;
  if (yearsIntoDaeun === 9 || yearsIntoDaeun === 0) {
    transitionScore = -5;  // 대운 전환 직전/직후 - 불안정
  } else if (yearsIntoDaeun === 1 || yearsIntoDaeun === 8) {
    transitionScore = -2;  // 전환 근접
  }

  return { inTransition, yearsToTransition, transitionScore };
}

// ============================================================
// 사주 원국과 일진의 상세 관계
// ============================================================

export function analyzeNatalDayRelation(
  natalPillars: {
    year?: { stem: string; branch: string };
    month?: { stem: string; branch: string };
    day?: { stem: string; branch: string };
    time?: { stem: string; branch: string };
  },
  dayGanzhi: { stem: string; branch: string }
): { score: number; factors: string[]; highlights: string[] } {
  let score = 0;
  const factors: string[] = [];
  const highlights: string[] = [];

  const pillars = [
    { name: "year", pillar: natalPillars.year },
    { name: "month", pillar: natalPillars.month },
    { name: "day", pillar: natalPillars.day },
    { name: "time", pillar: natalPillars.time },
  ];

  for (const { name, pillar } of pillars) {
    if (!pillar) continue;

    // 천간합 체크
    const hapResult = isChunganHap(pillar.stem, dayGanzhi.stem);
    if (hapResult.isHap) {
      score += 15;
      factors.push(`${name}StemHap`);
      highlights.push(`${name}주 천간과 합`);
    }

    // 지지 육합 체크
    const YUKHAP: Record<string, string> = {
      "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
      "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
      "巳": "申", "申": "巳", "午": "未", "未": "午",
    };

    if (YUKHAP[pillar.branch] === dayGanzhi.branch) {
      score += 12;
      factors.push(`${name}BranchHap`);
      highlights.push(`${name}주 지지와 합`);
    }

    // 지지 충 체크
    const CHUNG: Record<string, string> = {
      "子": "午", "午": "子", "丑": "未", "未": "丑",
      "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
      "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
    };

    if (CHUNG[pillar.branch] === dayGanzhi.branch) {
      score -= 10;
      factors.push(`${name}BranchChung`);
      highlights.push(`${name}주 지지와 충`);
    }

    // 암합 체크
    if (isAmhap(pillar.branch, dayGanzhi.branch)) {
      score += 8;
      factors.push(`${name}Amhap`);
    }

    // 원진 체크
    if (isWonjinDay(pillar.branch, dayGanzhi.branch)) {
      score -= 6;
      factors.push(`${name}Wonjin`);
    }
  }

  return { score, factors, highlights };
}

// ============================================================
// 삼합회국 분석
// ============================================================

export interface SamhapAnalysis {
  hasSamhap: boolean;
  element?: string;
  meaning?: string;
  strength: "full" | "partial" | "none";  // 3개 모두/2개/없음
  score: number;
}

export function analyzeSamhapWithDay(
  natalBranches: string[],  // 사주 원국의 지지들
  dayBranch: string
): SamhapAnalysis {
  const allBranches = [...natalBranches, dayBranch];

  for (const [key, group] of Object.entries(SAMHAP_GROUPS)) {
    const matchCount = group.branches.filter(b => allBranches.includes(b)).length;

    if (matchCount === 3) {
      return {
        hasSamhap: true,
        element: group.element,
        meaning: group.meaning,
        strength: "full",
        score: 25,  // 완전한 삼합
      };
    } else if (matchCount === 2 && group.branches.includes(dayBranch)) {
      return {
        hasSamhap: true,
        element: group.element,
        meaning: group.meaning,
        strength: "partial",
        score: 12,  // 반합 (일진이 참여)
      };
    }
  }

  return { hasSamhap: false, strength: "none", score: 0 };
}

// ============================================================
// 특수 신살 조합 분석
// ============================================================

export function analyzeSalCombinations(activeSals: string[]): SalCombination[] {
  const results: SalCombination[] = [];

  for (const combo of SPECIAL_SAL_COMBINATIONS) {
    if (combo.combination.every(sal => activeSals.includes(sal))) {
      results.push(combo);
    }
  }

  return results;
}

// ============================================================
// 오행 관계 헬퍼
// ============================================================

export function getElementRelationship(element: string): { generates: string; generatedBy: string; controls: string; controlledBy: string } {
  return ELEMENT_RELATIONS[element] || { generates: "", generatedBy: "", controls: "", controlledBy: "" };
}
