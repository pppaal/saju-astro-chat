/**
 * astrology/constants.ts - 점성술 상수
 */

import type { PlanetaryHourPlanet, EclipseData } from './types';

export const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

export const PLANETARY_HOUR_SEQUENCE: PlanetaryHourPlanet[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];

export const DAY_RULERS: Record<number, PlanetaryHourPlanet> = {
  0: "Sun",      // Sunday
  1: "Moon",     // Monday
  2: "Mars",     // Tuesday
  3: "Mercury",  // Wednesday
  4: "Jupiter",  // Thursday
  5: "Venus",    // Friday
  6: "Saturn",   // Saturday
};

export const PLANETARY_HOUR_USES: Record<PlanetaryHourPlanet, string[]> = {
  Sun: ["리더십", "권위", "성공", "명예", "건강"],
  Moon: ["가정", "직관", "대중", "부동산", "여행"],
  Mercury: ["커뮤니케이션", "문서", "학습", "거래", "계약"],
  Venus: ["사랑", "예술", "아름다움", "재물", "조화"],
  Mars: ["경쟁", "운동", "수술", "용기", "행동"],
  Jupiter: ["확장", "교육", "법률", "해외", "행운"],
  Saturn: ["구조화", "장기계획", "부동산", "책임", "인내"],
};

// 2024-2030년 주요 일/월식 데이터
export const ECLIPSES: EclipseData[] = [
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
