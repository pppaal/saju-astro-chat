/**
 * Astrology Analyzer - 점성술 분석 모듈
 *
 * 행성 트랜짓/달위상/Solar Return/Progressions 분석을 담당합니다.
 */

import type { UserAstroProfile } from '../types';
import {
  analyzeSolarReturn,
  analyzeProgressions,
  getLunarPhase,
} from '../temporal-scoring';
import {
  analyzePlanetTransits,
  getMoonPhaseDetailed,
} from '../transit-analysis';
import {
  getPlanetaryHourForDate,
  checkVoidOfCourseMoon,
  checkEclipseImpact,
  getRetrogradePlanetsForDate,
} from '../planetary-hours';

export interface AstrologyAnalysisResult {
  lunarPhase: ReturnType<typeof getLunarPhase>;
  moonPhaseDetailed: ReturnType<typeof getMoonPhaseDetailed>;
  planetTransits: ReturnType<typeof analyzePlanetTransits>;
  retrogradePlanets: string[];
  voidOfCourse: ReturnType<typeof checkVoidOfCourseMoon>;
  eclipseImpact: ReturnType<typeof checkEclipseImpact>;
  planetaryHour: ReturnType<typeof getPlanetaryHourForDate>;
  solarReturnAnalysis: ReturnType<typeof analyzeSolarReturn>;
  progressionAnalysis: ReturnType<typeof analyzeProgressions>;
}

export interface AstrologyAnalysisInput {
  date: Date;
  astroProfile: UserAstroProfile;
  natalSunElement: string;
  dayMasterElement: string;
  birthYear?: number;
}

/**
 * 점성술 분석 통합 함수
 */
export function analyzeAstrology(input: AstrologyAnalysisInput): AstrologyAnalysisResult {
  const { date, astroProfile, natalSunElement, dayMasterElement, birthYear } = input;

  // 달 위상 분석 (기존)
  const lunarPhase = getLunarPhase(date);

  // 고급 달 위상 분석 (8위상)
  const moonPhaseDetailed = getMoonPhaseDetailed(date);

  // 행성 트랜짓 분석
  const planetTransits = analyzePlanetTransits(
    date,
    astroProfile.sunSign,
    natalSunElement,
    astroProfile.sunLongitude
  );

  // 역행 행성 체크
  const retrogradePlanets = getRetrogradePlanetsForDate(date);

  // Void of Course Moon 체크
  const voidOfCourse = checkVoidOfCourseMoon(date);

  // 일/월식 영향 체크
  const eclipseImpact = checkEclipseImpact(date);

  // 행성 시간 (요일 기준)
  const planetaryHour = getPlanetaryHourForDate(date);

  // Solar Return (태양회귀) 분석
  const solarReturnAnalysis = analyzeSolarReturn(
    date,
    astroProfile.birthMonth,
    astroProfile.birthDay
  );

  // Progressions (이차진행) 분석
  const progressionAnalysis = analyzeProgressions(
    date,
    birthYear,
    astroProfile.sunElement,
    dayMasterElement
  );

  return {
    lunarPhase,
    moonPhaseDetailed,
    planetTransits,
    retrogradePlanets,
    voidOfCourse,
    eclipseImpact,
    planetaryHour,
    solarReturnAnalysis,
    progressionAnalysis,
  };
}
