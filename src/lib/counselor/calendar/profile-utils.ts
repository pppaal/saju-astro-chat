/**
 * Profile Utilities Module
 * 사주/점성술 프로필 추출 및 계산 유틸리티
 */

import { STEMS, BRANCHES, STEM_TO_ELEMENT, ZODIAC_TO_ELEMENT } from './constants';
import { getPlanetPosition } from './astrology-analysis';

// ============================================================
// Types
// ============================================================
export interface UserSajuProfile {
  dayMaster: string;           // 일간 (천간)
  dayMasterElement: string;    // 일간 오행
  dayBranch: string;          // 일지 (지지)
  yearBranch?: string;        // 연지 (삼재/역마/도화 계산용)
  birthYear?: number;         // 출생년
  monthBranch?: string;       // 월지
  timeBranch?: string;        // 시지
  fourPillars?: {
    year?: { stem: string; branch: string };
    month?: { stem: string; branch: string };
    day?: { stem: string; branch: string };
    time?: { stem: string; branch: string };
  };
  // 대운 정보 (선택사항)
  daeun?: {
    current?: {
      heavenlyStem: string;
      earthlyBranch: string;
      startAge: number;
      element: string;
      sibsin?: { cheon: string; ji: string };
    };
    list?: Array<{
      heavenlyStem: string;
      earthlyBranch: string;
      startAge: number;
      element: string;
    }>;
  };
  // 용신 정보 (선택사항)
  yongsin?: {
    primary: string;
    secondary?: string;
    type: string;
    kibsin?: string;
  };
  // 격국 정보 (선택사항)
  geokguk?: {
    type: string;
    strength: string;
  };
}

export interface UserAstroProfile {
  sunSign: string;          // 태양 별자리
  sunElement: string;       // 태양 오행
  sunLongitude?: number;    // 태양 황경 (어스펙트 분석용)
  birthMonth?: number;      // 출생월 (1-12)
  birthDay?: number;        // 출생일 (1-31)
  moonSign?: string;        // 달 별자리
  ascendant?: string;       // 상승점
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 오행 이름 정규화 (air → fire)
 */
function normalizeElement(element: string): string {
  if (element === "air") {return "fire";}
  return element;
}

// ============================================================
// Saju Profile Functions
// ============================================================

/**
 * 사주 데이터에서 프로필 추출
 */
export function extractSajuProfile(saju: unknown): UserSajuProfile {
  const sajuData = saju as Record<string, unknown>;
  const fourPillars = sajuData?.fourPillars as Record<string, { stem?: string; branch?: string }> | undefined;
  const dayStem = fourPillars?.day?.stem || (sajuData?.dayMaster as string) || "甲";
  const dayBranch = fourPillars?.day?.branch || (sajuData?.dayBranch as string) || "子";
  const yearBranch = fourPillars?.year?.branch || (sajuData?.yearBranch as string);

  // 대운 정보 추출
  const daeunData = sajuData?.daeun as {
    current?: {
      heavenlyStem?: string;
      earthlyBranch?: string;
      startAge?: number;
      element?: string;
      sibsin?: { cheon: string; ji: string };
    };
    list?: Array<{
      heavenlyStem: string;
      earthlyBranch: string;
      startAge: number;
      element: string;
    }>;
  } | undefined;

  // 용신 정보 추출
  const yongsinData = sajuData?.yongsin as {
    primary?: string;
    secondary?: string;
    type?: string;
    kibsin?: string;
  } | undefined;

  // 격국 정보 추출
  const geokgukData = sajuData?.geokguk as {
    type?: string;
    strength?: string;
  } | undefined;

  return {
    dayMaster: dayStem,
    dayMasterElement: STEM_TO_ELEMENT[dayStem] || "wood",
    dayBranch,
    yearBranch,
    birthYear: sajuData?.birthYear as number | undefined,
    monthBranch: fourPillars?.month?.branch,
    timeBranch: fourPillars?.time?.branch,
    fourPillars: fourPillars as UserSajuProfile['fourPillars'],
    daeun: daeunData ? {
      current: daeunData.current ? {
        heavenlyStem: daeunData.current.heavenlyStem || "",
        earthlyBranch: daeunData.current.earthlyBranch || "",
        startAge: daeunData.current.startAge || 0,
        element: daeunData.current.element || "wood",
        sibsin: daeunData.current.sibsin,
      } : undefined,
      list: daeunData.list,
    } : undefined,
    yongsin: yongsinData ? {
      primary: yongsinData.primary || "wood",
      secondary: yongsinData.secondary,
      type: yongsinData.type || "억부",
      kibsin: yongsinData.kibsin,
    } : undefined,
    geokguk: geokgukData ? {
      type: geokgukData.type || "정관격",
      strength: geokgukData.strength || "중화",
    } : undefined,
  };
}

/**
 * 점성술 데이터에서 프로필 추출
 */
export function extractAstroProfile(astrology: unknown): UserAstroProfile {
  const astroData = astrology as Record<string, unknown>;
  const planets = (astroData?.planets as Array<{ name: string; sign: string }>) || [];
  const sun = planets.find((p) => p.name === "Sun");
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
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(1900, 0, 31);
  const dateUtc = Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));

  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  // 연지 계산
  const yearBranchIndex = ((birthDate.getFullYear() - 4) % 12 + 12) % 12;
  const yearBranch = BRANCHES[yearBranchIndex];

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || "wood",
    dayBranch: branch,
    yearBranch,
    birthYear: birthDate.getFullYear(),
  };
}

/**
 * 생년월일로 점성술 프로필 직접 계산
 */
export function calculateAstroProfileFromBirthDate(birthDate: Date): UserAstroProfile {
  const month = birthDate.getMonth();
  const day = birthDate.getDate();

  let sunSign: string;
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) {sunSign = "Aries";}
  else if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) {sunSign = "Taurus";}
  else if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) {sunSign = "Gemini";}
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) {sunSign = "Cancer";}
  else if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) {sunSign = "Leo";}
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {sunSign = "Virgo";}
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {sunSign = "Libra";}
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) {sunSign = "Scorpio";}
  else if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) {sunSign = "Sagittarius";}
  else if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) {sunSign = "Capricorn";}
  else if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) {sunSign = "Aquarius";}
  else {sunSign = "Pisces";}

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
