/**
 * Data Extraction Utilities for Prompt Building
 * 프롬프트 생성을 위한 데이터 추출 유틸리티
 *
 * This module extracts and organizes data from CombinedResult for prompt generation.
 * It handles planetary data, saju pillars, advanced astrology points, and more.
 */

 

import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Type aliases for flexible data structures
type PlanetData = any;
type PillarData = any;

/**
 * Extracted planetary data from astrology chart
 */
export interface PlanetaryData {
  sun?: PlanetData;
  moon?: PlanetData;
  mercury?: PlanetData;
  venus?: PlanetData;
  mars?: PlanetData;
  jupiter?: PlanetData;
  saturn?: PlanetData;
  uranus?: PlanetData;
  neptune?: PlanetData;
  pluto?: PlanetData;
  northNode?: PlanetData;
  planets: PlanetData[];
  houses: any[];
  aspects: any[];
  ascendant: any;
  mc: any;
  facts: any;
  transits: any[];
}

/**
 * Extracted Saju/Four Pillars data
 */
export interface SajuData {
  pillars: {
    year?: PillarData;
    month?: PillarData;
    day?: PillarData;
    time?: PillarData;
  };
  dayMaster: any;
  unse: any;
  sinsal: any;
  advancedAnalysis: any;
  facts: any;
}

/**
 * Extracted advanced astrology points
 */
export interface AdvancedAstrologyData {
  extraPoints: {
    chiron?: any;
    lilith?: any;
    vertex?: any;
    partOfFortune?: any;
  };
  asteroids: {
    ceres?: any;
    pallas?: any;
    juno?: any;
    vesta?: any;
    aspects?: any;
  };
  solarReturn?: any;
  lunarReturn?: any;
  progressions?: any;
  draconic?: any;
  harmonics?: any;
  fixedStars?: any[];
  eclipses?: any;
  electional?: any;
  midpoints?: any;
}

/**
 * Extract planetary data from astrology section
 *
 * @param data - Combined result from destiny map calculation
 * @returns Organized planetary data with all major planets
 */
export function extractPlanetaryData(data: CombinedResult): PlanetaryData {
  const { astrology = {} } = data ?? {};
  const {
    planets = [],
    houses = [],
    aspects = [],
    ascendant,
    mc,
    facts,
    transits = [],
  } = astrology as any;

  const getPlanet = (name: string) => planets.find((p: PlanetData) => p.name === name);

  return {
    sun: getPlanet("Sun"),
    moon: getPlanet("Moon"),
    mercury: getPlanet("Mercury"),
    venus: getPlanet("Venus"),
    mars: getPlanet("Mars"),
    jupiter: getPlanet("Jupiter"),
    saturn: getPlanet("Saturn"),
    uranus: getPlanet("Uranus"),
    neptune: getPlanet("Neptune"),
    pluto: getPlanet("Pluto"),
    northNode: getPlanet("North Node"),
    planets,
    houses,
    aspects,
    ascendant,
    mc,
    facts,
    transits,
  };
}

/**
 * Extract Saju/Four Pillars data
 *
 * @param data - Combined result from destiny map calculation
 * @returns Organized saju data with pillars, day master, and luck cycles
 */
export function extractSajuData(data: CombinedResult): SajuData {
  const { saju, astrology } = data ?? {};
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = (saju ?? {}) as any;
  const { facts } = (astrology ?? {}) as any;

  return {
    pillars: pillars ?? {},
    dayMaster: dayMaster ?? {},
    unse: unse ?? { daeun: [], annual: [], monthly: [], iljin: [] },
    sinsal: sinsal ?? {},
    advancedAnalysis: advancedAnalysis ?? {},
    facts: facts ?? {},
  };
}

/**
 * Extract advanced astrology data (extra points, asteroids, returns, etc.)
 *
 * @param data - Combined result from destiny map calculation
 * @returns Organized advanced astrology data
 */
export function extractAdvancedAstrology(data: CombinedResult): AdvancedAstrologyData {
  const extraPoints = (data.extraPoints ?? {}) as any;
  const asteroids = (data.asteroids ?? {}) as any;

  return {
    extraPoints: {
      chiron: extraPoints.chiron,
      lilith: extraPoints.lilith,
      vertex: extraPoints.vertex,
      partOfFortune: extraPoints.partOfFortune,
    },
    asteroids: {
      ceres: asteroids.ceres,
      pallas: asteroids.pallas,
      juno: asteroids.juno,
      vesta: asteroids.vesta,
      aspects: asteroids.aspects,
    },
    solarReturn: data.solarReturn as any,
    lunarReturn: data.lunarReturn as any,
    progressions: data.progressions as any,
    draconic: data.draconic as any,
    harmonics: data.harmonics as any,
    fixedStars: data.fixedStars as any[],
    eclipses: data.eclipses as any,
    electional: data.electional as any,
    midpoints: data.midpoints as any,
  };
}

/**
 * Format a pillar to Ganji string
 *
 * @param p - Pillar data
 * @returns Formatted Ganji string (e.g., "甲子") or null
 */
export function formatPillar(p: PillarData | undefined): string | null {
  if (!p) return null;
  const stem = p.heavenlyStem?.name || p.ganji?.split?.('')?.[0] || '';
  const branch = p.earthlyBranch?.name || p.ganji?.split?.('')?.[1] || '';
  return stem && branch ? `${stem}${branch}` : null;
}

/**
 * Extract current time information
 *
 * @returns Current year, month, and date
 */
export function getCurrentTimeInfo(): {
  currentYear: number;
  currentMonth: number;
  currentDate: Date;
} {
  const now = new Date();
  return {
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth() + 1,
    currentDate: now,
  };
}

/**
 * Calculate birth year and current age
 *
 * @param facts - Facts data from astrology or saju
 * @param pillars - Four pillars data
 * @returns Birth year and current age
 */
export function calculateAgeInfo(facts: any, pillars: any): {
  birthYear: number;
  currentAge: number;
} {
  const { currentYear } = getCurrentTimeInfo();

  const birthYear = facts?.birthDate
    ? new Date(facts.birthDate).getFullYear()
    : pillars?.year?.year ?? currentYear - 30;

  const currentAge = currentYear - birthYear;

  return { birthYear, currentAge };
}
