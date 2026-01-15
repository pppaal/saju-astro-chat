/**
 * Transit Analysis Module (행성 트랜짓 분석)
 * Module 7 of Destiny Calendar System
 *
 * 천체 행성의 현재 위치와 출생 차트의 관계를 분석하여
 * 일일 운세에 미치는 영향을 계산합니다.
 *
 * 주요 기능:
 * - 7개 행성 트랜짓 분석 (태양, 달, 수성, 금성, 화성, 목성, 토성)
 * - 5개 주요 어스펙트 계산 (합, 육분, 사각, 삼분, 충)
 * - 행성 간 상호작용 분석
 * - 달 위상 분석 (8단계)
 *
 * @module transit-analysis
 */

import { ZODIAC_TO_ELEMENT, ELEMENT_RELATIONS } from './constants';
import { normalizeElement } from './utils';

/**
 * 행성 위치 정보
 */
interface PlanetPosition {
  sign: string;       // 별자리 (Aries, Taurus, ...)
  longitude: number;  // 황경 (0-360도)
  degree: number;     // 별자리 내 도수 (0-30도)
}

/**
 * 어스펙트 정보
 */
interface AspectInfo {
  aspect: string | null;  // conjunction, trine, sextile, square, opposition
  orb: number;            // 정확도 (도수)
}

/**
 * 트랜짓 분석 결과
 */
export interface TransitAnalysisResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

/**
 * 달 위상 타입 (8단계)
 */
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
 * 달 위상 분석 결과
 */
export interface MoonPhaseResult {
  phase: MoonPhaseType;
  phaseName: string;
  illumination: number;
  isWaxing: boolean;
  factorKey: string;
  score: number;
}

type PlanetName = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";

/**
 * 행성 별자리 및 황경 근사 계산 (평균 공전 주기 기반)
 * 정밀 계산은 ephemeris 필요하지만, 근사값으로 트랜짓 효과 제공
 *
 * @param date - 계산할 날짜
 * @param planet - 행성 이름
 * @returns 행성 위치 정보 (별자리, 황경, 도수)
 */
export function getPlanetPosition(date: Date, planet: PlanetName): PlanetPosition {
  // 기준일: 2000년 1월 1일 각 행성 위치
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

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

/**
 * 어스펙트(각도 관계) 계산
 *
 * 주요 어스펙트:
 * - Conjunction (합): 0° ±8° - 에너지 융합
 * - Sextile (육분): 60° ±6° - 기회
 * - Square (사각): 90° ±8° - 긴장/도전
 * - Trine (삼분): 120° ±8° - 조화/행운
 * - Opposition (충): 180° ±8° - 대립/균형
 *
 * @param longitude1 - 첫 번째 천체의 황경
 * @param longitude2 - 두 번째 천체의 황경
 * @returns 어스펙트 정보 (타입, 오브)
 */
export function getAspect(longitude1: number, longitude2: number): AspectInfo {
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
 * 행성 트랜짓 종합 분석
 *
 * 7개 주요 행성의 현재 위치와 출생 차트의 태양 위치를 비교하여
 * 일일 운세에 미치는 영향을 계산합니다.
 *
 * 점수 범위:
 * - Mercury (수성): -5 ~ +10 (의사소통, 학습, 계약)
 * - Venus (금성): -5 ~ +10 (사랑, 재물, 예술)
 * - Mars (화성): -10 ~ +8 (행동, 에너지, 갈등)
 * - Jupiter (목성): -5 ~ +15 (확장, 행운, 12년 주기)
 * - Saturn (토성): -15 ~ +8 (시련, 교훈, 29년 주기)
 * - Sun (태양): -5 ~ +12 (자아, 활력, Solar Return)
 * - Moon (달): -3 ~ +8 (감정, 직관, 일상)
 *
 * @param date - 분석할 날짜
 * @param natalSunSign - 출생 차트의 태양 별자리
 * @param natalSunElement - 출생 차트의 태양 원소
 * @param natalSunLongitude - 출생 차트의 태양 경도 (선택, 어스펙트 분석용)
 * @returns 트랜짓 분석 결과
 */
export function analyzePlanetTransits(
  date: Date,
  natalSunSign: string,
  natalSunElement: string,
  natalSunLongitude?: number // 출생 차트의 태양 경도 (어스펙트 분석용)
): TransitAnalysisResult {
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

/**
 * 정밀 Moon Phase 계산 (8위상)
 *
 * 달의 8가지 위상을 정확하게 계산하여 일일 운세에 반영합니다.
 * 각 위상마다 고유한 에너지와 의미가 있습니다.
 *
 * @param date - 계산할 날짜
 * @returns 달 위상 분석 결과
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
