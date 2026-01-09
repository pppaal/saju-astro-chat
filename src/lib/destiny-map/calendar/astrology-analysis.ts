/**
 * Astrology Analysis Module
 * 행성 위치, 달 위상, 일/월식, 역행, Void of Course, Planetary Hour 분석
 */

import { ZODIAC_TO_ELEMENT, ELEMENT_RELATIONS } from './constants';

// ============================================================
// Types
// ============================================================
export type PlanetName = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export type RetrogradePlanet = "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export type PlanetaryHourPlanet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
export type MoonPhaseType =
  | "new_moon"        // 삭 (새달)
  | "waxing_crescent" // 초승달
  | "first_quarter"   // 상현달
  | "waxing_gibbous"  // 차오르는 달
  | "full_moon"       // 보름달
  | "waning_gibbous"  // 기우는 달
  | "last_quarter"    // 하현달
  | "waning_crescent";// 그믐달

export interface PlanetPosition {
  sign: string;
  longitude: number;
  degree: number;
}

export interface EclipseData {
  date: Date;
  type: "solar" | "lunar";
  sign: string;
  degree: number;
}

export interface EclipseImpact {
  hasImpact: boolean;
  type: "solar" | "lunar" | null;
  intensity: "strong" | "medium" | "weak" | null;
  sign: string | null;
  daysFromEclipse: number | null;
}

export interface VoidOfCourseResult {
  isVoid: boolean;
  moonSign: string;
  hoursRemaining: number;
}

export interface MoonPhaseResult {
  phase: MoonPhaseType;
  phaseName: string;
  illumination: number;
  isWaxing: boolean;
  factorKey: string;
  score: number;
}

export interface LunarPhaseResult {
  phase: number;
  phaseName: string;
  phaseScore: number;
}

export interface PlanetaryHourResult {
  planet: PlanetaryHourPlanet;
  dayRuler: PlanetaryHourPlanet;
  isDay: boolean;
  goodFor: string[];
}

export interface AspectResult {
  aspect: string | null;
  orb: number;
}

export interface PlanetTransitResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

// ============================================================
// Constants
// ============================================================
const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

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

const PLANETARY_HOUR_USES: Record<PlanetaryHourPlanet, string[]> = {
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

// ============================================================
// Helper Functions
// ============================================================

/**
 * 오행 이름 정규화 (air → fire)
 */
function normalizeElement(element: string): string {
  if (element === "air") return "fire";
  return element;
}

/**
 * J2000 epoch 기준 일수 계산
 */
function getDaysSinceJ2000(date: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return (dateUtc - J2000) / (1000 * 60 * 60 * 24);
}

// ============================================================
// Planet Position Functions
// ============================================================

/**
 * 행성 별자리 및 황경 근사 계산 (평균 공전 주기 기반)
 * 정밀 계산은 ephemeris 필요하지만, 근사값으로 트랜짓 효과 제공
 */
export function getPlanetPosition(date: Date, planet: PlanetName): PlanetPosition {
  const daysSinceJ2000 = getDaysSinceJ2000(date);

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

  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = longitude % 30;

  return { sign: ZODIAC_SIGNS[signIndex], longitude, degree };
}

/**
 * 기존 호환성을 위한 래퍼
 */
export function getPlanetSign(date: Date, planet: "mercury" | "venus" | "mars"): string {
  return getPlanetPosition(date, planet).sign;
}

// ============================================================
// Retrograde Functions
// ============================================================

/**
 * 행성 역행 여부 확인 (근사 계산)
 * - 수성: 약 3주간, 연 3-4회
 * - 금성: 약 40일간, 18개월마다
 * - 화성: 약 2개월간, 2년마다
 * - 목성: 약 4개월간, 매년
 * - 토성: 약 4.5개월간, 매년
 */
export function isRetrograde(date: Date, planet: RetrogradePlanet): boolean {
  const daysSinceJ2000 = getDaysSinceJ2000(date);

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
export function getRetrogradePlanetsForDate(date: Date): RetrogradePlanet[] {
  const planets: RetrogradePlanet[] = ["mercury", "venus", "mars", "jupiter", "saturn"];
  return planets.filter(p => isRetrograde(date, p));
}

// ============================================================
// Moon Phase Functions
// ============================================================

/**
 * 달의 위상 계산 (0-29.5일 주기)
 * 0 = 신월, 7.4 = 상현, 14.8 = 보름, 22.1 = 하현
 */
export function getLunarPhase(date: Date): LunarPhaseResult {
  // 2000년 1월 6일 18:14 UTC 신월 기준
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const lunarCycle = 29.53058867; // 평균 삭망월 (일)

  // UTC 기준으로 밀리초 차이 계산 (서버 타임존 영향 제거)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const diffMs = dateUtc - knownNewMoon;
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

/**
 * 정밀 Moon Phase 계산 (8위상)
 */
export function getMoonPhaseDetailed(date: Date): MoonPhaseResult {
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

// ============================================================
// Void of Course Moon
// ============================================================

/**
 * Void of Course Moon 체크 (간단 버전)
 * 달이 현재 별자리에서 다른 행성과 주요 어스펙트를 형성하지 않는 상태
 * 새로운 시작에 불리한 시간
 */
export function checkVoidOfCourseMoon(date: Date): VoidOfCourseResult {
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
// Eclipse Functions
// ============================================================

/**
 * 주어진 날짜에 일/월식 영향이 있는지 확인
 * - 일/월식 당일: 강한 영향
 * - 전후 3일: 중간 영향
 * - 전후 7일: 약한 영향
 */
export function checkEclipseImpact(date: Date): EclipseImpact {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  for (const eclipse of ECLIPSES) {
    const eclipseUtc = Date.UTC(eclipse.date.getFullYear(), eclipse.date.getMonth(), eclipse.date.getDate());
    const diffMs = Math.abs(dateUtc - eclipseUtc);
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
// Planetary Hour Functions
// ============================================================

/**
 * 현재 행성 시간 계산 (간단 버전 - 고정 일출/일몰 사용)
 */
export function getPlanetaryHourForDate(date: Date): PlanetaryHourResult {
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

  return {
    planet,
    dayRuler,
    isDay,
    goodFor: PLANETARY_HOUR_USES[planet],
  };
}

// ============================================================
// Aspect Functions
// ============================================================

/**
 * 어스펙트(각도 관계) 계산
 * - Conjunction (합): 0° ±8° - 에너지 융합
 * - Sextile (육분): 60° ±6° - 기회
 * - Square (사각): 90° ±8° - 긴장/도전
 * - Trine (삼분): 120° ±8° - 조화/행운
 * - Opposition (충): 180° ±8° - 대립/균형
 */
export function getAspect(longitude1: number, longitude2: number): AspectResult {
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

// ============================================================
// Planet Transit Analysis
// ============================================================

/**
 * 행성 트랜짓 분석
 */
export function analyzePlanetTransits(
  date: Date,
  natalSunSign: string,
  natalSunElement: string,
  natalSunLongitude?: number // 출생 차트의 태양 경도 (어스펙트 분석용)
): PlanetTransitResult {
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

  // 수성 트랜짓 분석 (의사소통, 지성, 계약)
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

  // 금성 트랜짓 분석 (사랑, 재물, 예술)
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

  // 화성 트랜짓 분석 (행동, 에너지, 갈등)
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

  // 목성 트랜짓 분석 (확장, 행운, 년운 - 세운과 유사)
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

  // 토성 트랜짓 분석 (시련, 교훈, 책임)
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

  // 태양 트랜짓 분석 (자아, 활력, 목표)
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

  // 달 트랜짓 분석 (감정, 직관, 일상)
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

  // 어스펙트 분석 (행성 간 각도 관계)
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
          score += 2;
          factorKeys.push("venusOpposition");
          break;
      }
    }
  }

  return { score, factorKeys, positive, negative };
}
