/**
 * @file DestinyCalendar types and interfaces
 * Extracted from DestinyCalendar.tsx for modularity
 */

export type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
export type ImportanceGrade = 0 | 1 | 2 | 3 | 4;
export type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };

export interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary?: string;
  bestTimes?: string[];
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
  // 신규 분석 데이터 (확장)
  ganzhi?: string;           // 일주 간지
  transitSunSign?: string;   // 트랜짓 태양 별자리
  crossVerified?: boolean;   // 사주+점성술 교차 검증
}

export interface CalendarData {
  success: boolean;
  year: number;
  summary?: {
    total: number;
    grade0: number; // 최고의 날 (~5%)
    grade1: number; // 좋은 날 (~15%)
    grade2: number; // 보통 날 (~50%)
    grade3: number; // 안좋은 날 (~25%)
    grade4: number; // 최악의 날 (~5%)
  };
  topDates?: ImportantDate[];
  goodDates?: ImportantDate[];
  cautionDates?: ImportantDate[];
  allDates?: ImportantDate[];
  error?: string;
}

export interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface CachedCalendarData {
  version: string;
  timestamp: number;
  birthInfo: BirthInfo;
  year: number;
  category: string;
  data: CalendarData;
}
