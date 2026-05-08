/**
 * 점성술(Astrology) 분석 헬퍼 함수들
 * date-analysis-orchestrator.ts에서 분리된 점성술 관련 분석 로직
 */

import type { UserAstroProfile } from './types';
import {
  analyzePlanetTransits,
  getMoonPhaseDetailed,
} from './transit-analysis';
import {
  getPlanetaryHourForDate,
  checkVoidOfCourseMoon,
  checkEclipseImpact,
  getRetrogradePlanetsForDate,
  getSunSign,
} from './planetary-hours';
import { getLunarPhase } from './temporal-scoring';
import { ZODIAC_TO_ELEMENT, ELEMENT_RELATIONS } from './constants';
import { normalizeElement } from './utils';

// ============================================================
// Types
// ============================================================

export interface AstroAnalysisResult {
  lunarPhase: ReturnType<typeof getLunarPhase>;
  moonPhaseDetailed: ReturnType<typeof getMoonPhaseDetailed>;
  planetTransits: ReturnType<typeof analyzePlanetTransits>;
  retrogradePlanets: string[];
  voidOfCourse: ReturnType<typeof checkVoidOfCourseMoon>;
  eclipseImpact: ReturnType<typeof checkEclipseImpact>;
  planetaryHour: ReturnType<typeof getPlanetaryHourForDate>;
  advancedAstroScore: number;
  transitSunSign: string;
  transitSunElement: string;
}

export interface ElementHarmonyResult {
  factorKey: string;
  type: 'same' | 'support' | 'giving' | 'conflict' | 'control' | 'neutral';
  recommendations?: string[];
  warnings?: string[];
}

// ============================================================
// 점성술 종합 분석
// ============================================================

/**
 * 점성술 분석 수행
 */
export function analyzeAstroFactors(
  date: Date,
  astroProfile: UserAstroProfile
): AstroAnalysisResult {
  const natalSunElement = astroProfile.sunElement;
  const transitSunSign = getSunSign(date);
  const transitSunElement = normalizeElement(ZODIAC_TO_ELEMENT[transitSunSign] || "fire");

  // 달 위상 분석
  const lunarPhase = getLunarPhase(date);
  const moonPhaseDetailed = getMoonPhaseDetailed(date);

  // 행성 트랜짓 분석
  const planetTransits = analyzePlanetTransits(
    date,
    astroProfile.sunSign,
    natalSunElement,
    astroProfile.sunLongitude
  );

  // 역행 행성
  const retrogradePlanets = getRetrogradePlanetsForDate(date);

  // Void of Course Moon
  const voidOfCourse = checkVoidOfCourseMoon(date);

  // 일/월식 영향
  const eclipseImpact = checkEclipseImpact(date);

  // 행성 시간
  const planetaryHour = getPlanetaryHourForDate(date);

  // 점성술 점수 계산
  const advancedAstroScore = moonPhaseDetailed.score;

  return {
    lunarPhase,
    moonPhaseDetailed,
    planetTransits,
    retrogradePlanets,
    voidOfCourse,
    eclipseImpact,
    planetaryHour,
    advancedAstroScore,
    transitSunSign,
    transitSunElement,
  };
}

// ============================================================
// 달 원소 계산
// ============================================================

/**
 * 달의 원소 계산 (근사값)
 */
export function getMoonElement(date: Date): string {
  const month = date.getMonth();
  const signs = [
    "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
    "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"
  ];
  const approxSign = signs[month];
  return normalizeElement(ZODIAC_TO_ELEMENT[approxSign] || "earth");
}

// ============================================================
// 원소 조화 분석
// ============================================================

/**
 * 원소 조화 분석 (트랜짓 태양 vs 본명 태양)
 */
export function analyzeElementHarmony(
  natalSunElement: string,
  transitSunElement: string
): ElementHarmonyResult {
  const relations = ELEMENT_RELATIONS[natalSunElement];

  if (!relations) {
    return { factorKey: 'neutralElement', type: 'neutral' };
  }

  if (transitSunElement === natalSunElement) {
    return {
      factorKey: 'sameElement',
      type: 'same',
      recommendations: ['confidence', 'selfExpression'],
    };
  }

  if (relations.generatedBy === transitSunElement) {
    return {
      factorKey: 'supportElement',
      type: 'support',
      recommendations: ['learning', 'receiving'],
    };
  }

  if (relations.generates === transitSunElement) {
    return {
      factorKey: 'givingElement',
      type: 'giving',
      recommendations: ['giving', 'teaching'],
    };
  }

  if (relations.controlledBy === transitSunElement) {
    return {
      factorKey: 'conflictElement',
      type: 'conflict',
      warnings: ['stress', 'opposition'],
    };
  }

  if (relations.controls === transitSunElement) {
    return {
      factorKey: 'controlElement',
      type: 'control',
      recommendations: ['achievement', 'discipline'],
    };
  }

  return { factorKey: 'neutralElement', type: 'neutral' };
}

// ============================================================
// 달 위상 분석
// ============================================================

export interface LunarPhaseFactors {
  factorKey: string;
  recommendations?: string[];
  warnings?: string[];
}

/**
 * 달 위상에 따른 요소 분석
 */
export function analyzeLunarPhaseFactors(
  phaseName: string
): LunarPhaseFactors {
  switch (phaseName) {
    case "newMoon":
      return {
        factorKey: "lunarNewMoon",
        recommendations: ["newBeginning", "planning"],
      };
    case "fullMoon":
      return {
        factorKey: "lunarFullMoon",
        recommendations: ["completion", "celebration"],
      };
    case "firstQuarter":
      return {
        factorKey: "lunarFirstQuarter",
        warnings: ["tension", "challenge"],
      };
    case "lastQuarter":
      return {
        factorKey: "lunarLastQuarter",
        recommendations: ["reflection", "release"],
      };
    default:
      return { factorKey: `lunar${phaseName}` };
  }
}

// ============================================================
// 역행 행성 분석
// ============================================================

export interface RetrogradeFactors {
  factorKeys: string[];
  warningKeys: string[];
  removeRecommendations: string[];
}

/**
 * 역행 행성에 따른 요소 분석
 */
export function analyzeRetrogradeFactors(
  retrogradePlanets: string[]
): RetrogradeFactors {
  const factorKeys: string[] = [];
  const warningKeys: string[] = [];
  const removeRecommendations: string[] = [];

  for (const planet of retrogradePlanets) {
    factorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
  }

  // 수성 역행
  if (retrogradePlanets.includes("mercury")) {
    warningKeys.push("mercuryRetrograde");
    removeRecommendations.push("contract", "documents", "interview");
  }

  // 금성 역행
  if (retrogradePlanets.includes("venus")) {
    warningKeys.push("venusRetrograde");
    removeRecommendations.push("dating", "love", "finance", "investment", "shopping");
  }

  // 화성 역행
  if (retrogradePlanets.includes("mars")) {
    warningKeys.push("marsRetrograde");
  }

  return {
    factorKeys,
    warningKeys,
    removeRecommendations,
  };
}

// ============================================================
// 행성 시간 분석
// ============================================================

export interface PlanetaryHourFactors {
  factorKey: string;
  recommendations?: string[];
}

/**
 * 행성 시간에 따른 요소 분석
 */
export function analyzePlanetaryHourFactors(
  dayRuler: string
): PlanetaryHourFactors {
  const factorKey = `dayRuler${dayRuler}`;

  switch (dayRuler) {
    case "Jupiter":
      return { factorKey, recommendations: ["expansion", "luck"] };
    case "Venus":
      return { factorKey, recommendations: ["love", "beauty"] };
    case "Mars":
      return { factorKey, recommendations: ["action", "courage"] };
    case "Mercury":
      return { factorKey, recommendations: ["communication", "learning"] };
    case "Saturn":
      return { factorKey, recommendations: ["discipline", "structure"] };
    case "Sun":
      return { factorKey, recommendations: ["leadership", "vitality"] };
    case "Moon":
      return { factorKey, recommendations: ["intuition", "emotion"] };
    default:
      return { factorKey };
  }
}
