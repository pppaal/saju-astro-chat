/**
 * Destiny Calendar Types
 * 운명 캘린더 관련 타입 정의
 */

import type { FortuneArea } from '../config/area.config';

// Re-export for convenience
export type { FortuneArea };

// ============================================================
// Core Types
// ============================================================

export type ImportanceGrade = 0 | 1 | 2 | 3 | 4 | 5;
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

// ============================================================
// User Profile Types
// ============================================================

export interface DaeunCycle {
  age: number;
  heavenlyStem: string;
  earthlyBranch: string;
  sibsin?: { cheon: string; ji: string };
}

export interface UserSajuProfile {
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

export interface UserAstroProfile {
  sunSign: string;
  sunElement: string;
  sunLongitude?: number; // 태양 경도 (어스펙트 분석용)
  birthMonth?: number;   // 생일 월 (Solar Return 분석용)
  birthDay?: number;     // 생일 일 (Solar Return 분석용)
  birthDate?: Date | string; // 생년월일 (프로그레스드 문 분석용)
  moonSign?: string;     // 달 별자리 (프로그레스드 문 분석용)
  mcLongitude?: number;  // MC 경도 (Solar Arc 분석용)
  ascLongitude?: number; // ASC 경도 (Solar Arc 분석용)
  // 네이탈 행성 위치 (정확한 어스펙트 분석용)
  natalPlanets?: {
    moon?: number;       // 달 경도
    mercury?: number;    // 수성 경도
    venus?: number;      // 금성 경도
    mars?: number;       // 화성 경도
    jupiter?: number;    // 목성 경도
    saturn?: number;     // 토성 경도
    uranus?: number;
    neptune?: number;
    pluto?: number;
    chiron?: number;
    northNode?: number;
    southNode?: number;
  };
}

// ============================================================
// Fortune Result Types
// ============================================================

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

export interface MonthlyThemeResult {
  year: number;
  month: number;
  mainTheme: string;
  subThemes: string[];
  luckyDays: number[];
  challenges: string[];
  advice: string;
  score: number;
  monthGanzhi: { stem: string; branch: string };
  yongsinMatch: boolean;
}

export interface WeeklyThemeResult {
  startDate: string;
  endDate: string;
  mainTheme: string;
  subThemes: string[];
  luckyDays: number[];
  challenges: string[];
  advice: string;
  score: number;
  bestDayOfWeek: number;
}

export interface PrecomputeResult {
  currentMonth: CalendarMonth;
  nextMonth: CalendarMonth;
  weeklyThemes: WeeklyThemeResult[];
}

// ============================================================
// Retrograde Types
// ============================================================

export interface DynamicRetrogradeInfo {
  planet: string;
  isRetrograde: boolean;
  speed: number;       // 일일 이동 속도 (도/일)
  phase: "direct" | "retrograde" | "stationary-retrograde" | "stationary-direct";
  meaning: string;
  score: number;
}

// ============================================================
// Analysis Types
// ============================================================

export interface YongsinInfo {
  primary: string;      // 주용신 (wood/fire/earth/metal/water)
  secondary?: string;   // 보조용신
  type: string;         // 용신 유형 (억부/조후/통관/병약)
  kibsin?: string;      // 기신 (피해야 할 오행)
}

export interface GeokgukInfo {
  type: string;         // 격국 유형
  strength: string;     // 신강/신약
}

export interface GanzhiResult {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
}
