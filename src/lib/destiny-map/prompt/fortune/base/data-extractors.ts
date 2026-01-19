/**
 * Data Extraction Utilities for Prompt Building
 * 프롬프트 생성을 위한 데이터 추출 유틸리티
 *
 * This module extracts and organizes data from CombinedResult for prompt generation.
 * It handles planetary data, saju pillars, advanced astrology points, and more.
 */

import type { CombinedResult, AstrologyData, SajuPillar } from "@/lib/destiny-map/astrology/types";
import type { PlanetData, AspectHit, ExtraPoint, Asteroid } from "@/lib/astrology";

/**
 * House cusp data structure
 */
interface HouseCusp {
  cusp: number;
  formatted: string;
}

/**
 * Transit aspect data structure
 */
interface TransitAspect {
  type: string;
  from: { name: string; longitude: number };
  to: { name: string; longitude: number };
  orb: string;
}

/**
 * Astrology facts from chart (flexible structure for prompt building)
 */
interface AstrologyFactsForPrompt {
  birthDate?: string;
  birthTime?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  [key: string]: unknown;
}

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
  houses: HouseCusp[];
  aspects: AspectHit[];
  ascendant?: PlanetData;
  mc?: PlanetData;
  facts?: AstrologyFactsForPrompt;
  transits: TransitAspect[];
}

/**
 * Day Master data structure
 */
interface DayMasterData {
  name?: string;
  element?: string;
  yinYang?: string;
  strength?: string;
}

/**
 * Unse (luck cycles) data structure
 */
interface UnseData {
  daeun: unknown[];
  annual: unknown[];
  monthly: unknown[];
  iljin: unknown[];
}

/**
 * Extracted Saju/Four Pillars data
 */
export interface ExtractedSajuData {
  pillars: {
    year?: SajuPillar;
    month?: SajuPillar;
    day?: SajuPillar;
    time?: SajuPillar;
  };
  dayMaster: DayMasterData;
  unse: UnseData;
  sinsal: Record<string, unknown>;
  advancedAnalysis: Record<string, unknown>;
  facts: AstrologyFactsForPrompt;
}

/** @deprecated Use ExtractedSajuData instead */
export type SajuData = ExtractedSajuData;

/**
 * Extracted advanced astrology points
 */
export interface AdvancedAstrologyData {
  extraPoints: {
    chiron?: ExtraPoint;
    lilith?: ExtraPoint;
    vertex?: ExtraPoint;
    partOfFortune?: ExtraPoint;
  };
  asteroids: {
    ceres?: Asteroid;
    pallas?: Asteroid;
    juno?: Asteroid;
    vesta?: Asteroid;
    aspects?: CombinedResult['asteroids'] extends { aspects?: infer T } ? T : unknown;
  };
  solarReturn?: CombinedResult['solarReturn'];
  lunarReturn?: CombinedResult['lunarReturn'];
  progressions?: CombinedResult['progressions'];
  draconic?: CombinedResult['draconic'];
  harmonics?: CombinedResult['harmonics'];
  fixedStars?: CombinedResult['fixedStars'];
  eclipses?: CombinedResult['eclipses'];
  electional?: CombinedResult['electional'];
  midpoints?: CombinedResult['midpoints'];
}

/**
 * Extract planetary data from astrology section
 *
 * @param data - Combined result from destiny map calculation
 * @returns Organized planetary data with all major planets
 */
export function extractPlanetaryData(data: CombinedResult): PlanetaryData {
  const { astrology = {} } = data ?? {};
  const astroData = astrology as AstrologyData;
  const {
    planets = [],
    houses = [],
    aspects = [],
    ascendant,
    mc,
    facts,
    transits = [],
  } = astroData;

  const getPlanet = (name: string) => planets.find((p) => p.name === name);

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
    facts: facts as unknown as AstrologyFactsForPrompt | undefined,
    transits,
  };
}

/**
 * Extract Saju/Four Pillars data
 *
 * @param data - Combined result from destiny map calculation
 * @returns Organized saju data with pillars, day master, and luck cycles
 */
export function extractSajuData(data: CombinedResult): ExtractedSajuData {
  const { saju, astrology } = data ?? {};
  const sajuData = saju ?? { pillars: {}, dayMaster: {}, unse: { daeun: [], annual: [], monthly: [], iljin: [] }, sinsal: {} };
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = sajuData;
  const astroData = astrology as AstrologyData | undefined;
  const facts = astroData?.facts;

  return {
    pillars: pillars ?? {},
    dayMaster: (dayMaster ?? {}) as DayMasterData,
    unse: unse ?? { daeun: [], annual: [], monthly: [], iljin: [] },
    sinsal: (sinsal ?? {}) as Record<string, unknown>,
    advancedAnalysis: (advancedAnalysis ?? {}) as Record<string, unknown>,
    facts: (facts ?? {}) as AstrologyFactsForPrompt,
  };
}

/**
 * Extract advanced astrology data (extra points, asteroids, returns, etc.)
 *
 * @param data - Combined result from destiny map calculation
 * @returns Organized advanced astrology data
 */
export function extractAdvancedAstrology(data: CombinedResult): AdvancedAstrologyData {
  const extraPoints = data.extraPoints ?? {};
  const asteroids = data.asteroids ?? {};

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
    solarReturn: data.solarReturn,
    lunarReturn: data.lunarReturn,
    progressions: data.progressions,
    draconic: data.draconic,
    harmonics: data.harmonics,
    fixedStars: data.fixedStars,
    eclipses: data.eclipses,
    electional: data.electional,
    midpoints: data.midpoints,
  };
}

/**
 * Pillar data for formatting (flexible structure)
 */
interface PillarForFormat {
  heavenlyStem?: { name?: string };
  earthlyBranch?: { name?: string };
  ganji?: string;
}

/**
 * Format a pillar to Ganji string
 *
 * @param p - Pillar data
 * @returns Formatted Ganji string (e.g., "甲子") or null
 */
export function formatPillar(p: PillarForFormat | undefined): string | null {
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
 * Pillars data for age calculation
 */
interface PillarsForAge {
  year?: { year?: number };
}

/**
 * Calculate birth year and current age
 *
 * @param facts - Facts data from astrology or saju
 * @param pillars - Four pillars data
 * @returns Birth year and current age
 */
export function calculateAgeInfo(
  facts: AstrologyFactsForPrompt | undefined,
  pillars: PillarsForAge | undefined
): {
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
