/**
 * Destiny Map Engine Core - Main Orchestrator
 * 운명 지도 엔진 코어 - 모든 모듈을 통합하는 메인 오케스트레이터
 *
 * This module orchestrates all astrology calculations by coordinating
 * the specialized modules: natal charts, advanced points, returns,
 * progressions, specialized charts, asteroids, and fixed stars.
 */

'use server';

import { CacheManager, generateDestinyMapCacheKey } from './cache-manager';
import { calculateNatal, getNowInTimezone } from './natal-calculations';
import { calculateAdvancedPoints } from './advanced-points';
import {
  calculateSolarReturnChart,
  calculateLunarReturnChart,
  calculateAllProgressions,
} from './returns-progressions';
import { calculateAllSpecializedCharts } from './specialized-charts';
import { calculateAllAsteroidsStars } from './asteroids-stars';

import { isNightChart, type Chart } from '@/lib/astrology';
import { calculateSajuData } from '@/lib/Saju';
import { logger } from '@/lib/logger';

// Re-export types from original engine for backward compatibility
export type {
  CombinedInput,
  CombinedResult,
} from '../astrologyengine';

import type {
  CombinedInput,
  CombinedResult,
} from '../astrologyengine';

const enableDebugLogs = process.env.ENABLE_DESTINY_LOGS === 'true';

// Create cache instance for destiny map results
const destinyMapCache = new CacheManager<CombinedResult>(
  {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50,
  },
  enableDebugLogs
);

/**
 * Validate input coordinates
 */
function validateCoordinates(latitude: number, longitude: number): void {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new Error('Invalid coordinates range');
  }
}

/**
 * Parse birth date and time
 */
function parseBirthDateTime(birthDate: string, birthTime: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map((v) => Number(v) || 0);

  const birthDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (isNaN(birthDateObj.getTime())) {
    throw new Error('Invalid birth date/time format');
  }

  return { year, month, day, hour, minute };
}

/**
 * Calculate all astrology features in parallel
 *
 * This function orchestrates parallel calculation of:
 * - Natal chart
 * - Advanced points (Chiron, Lilith, Part of Fortune, Vertex)
 * - Solar and Lunar Returns
 * - Progressions (Secondary and Solar Arc)
 * - Draconic and Harmonic charts
 * - Asteroids and Fixed Stars
 * - Eclipse analysis
 *
 * All calculations run concurrently using Promise.allSettled to maximize
 * performance while ensuring graceful failure handling.
 */
export async function calculateAstrologyData(
  input: CombinedInput,
  natalChart: Chart,
  userNow: { year: number; month: number; day: number; hour: number; minute: number }
): Promise<{
  extraPoints?: CombinedResult['extraPoints'];
  solarReturn?: CombinedResult['solarReturn'];
  lunarReturn?: CombinedResult['lunarReturn'];
  progressions?: CombinedResult['progressions'];
  draconic?: CombinedResult['draconic'];
  harmonics?: CombinedResult['harmonics'];
  asteroids?: CombinedResult['asteroids'];
  fixedStars?: CombinedResult['fixedStars'];
  eclipses?: CombinedResult['eclipses'];
}> {
  const { birthDate, birthTime, latitude, longitude, tz } = input;
  const { year, month, day, hour, minute } = parseBirthDateTime(birthDate, birthTime);

  // Resolve timezone
  let resolvedTz = tz;
  if (!resolvedTz) {
    try {
      const tzLookup = (await import('tz-lookup')).default;
      resolvedTz = tzLookup(latitude, longitude);
    } catch {
      resolvedTz = 'Asia/Seoul';
    }
  }

  // Get essential natal data
  const { planets, houses, ascendant, mc, meta } = natalChart;
  const jdUT = meta?.jdUT || 0;
  const houseCusps = houses.map((h) => h.cusp);

  const sunPlanet = planets.find((p) => p.name === 'Sun');
  const moonPlanet = planets.find((p) => p.name === 'Moon');
  const sunLon = sunPlanet?.longitude ?? 0;
  const moonLon = moonPlanet?.longitude ?? 0;
  const ascLon = ascendant?.longitude ?? 0;
  const sunHouse = sunPlanet?.house ?? 1;
  const nightChart = isNightChart(sunHouse);

  const natalInput = {
    year,
    month,
    date: day,
    hour,
    minute,
    latitude,
    longitude,
    timeZone: resolvedTz,
  };

  const currentDate = {
    year: userNow.year,
    month: userNow.month,
    day: userNow.day,
  };

  const currentAge = userNow.year - year;

  // Parallel calculation of all advanced features
  const [
    advancedPointsResult,
    solarReturnResult,
    lunarReturnResult,
    progressionsResult,
    specializedChartsResult,
    asteroidsStarsResult,
  ] = await Promise.allSettled([
    // Advanced Points (Chiron, Lilith, Part of Fortune, Vertex)
    calculateAdvancedPoints(
      {
        jdUT,
        houseCusps,
        ascendantLongitude: ascLon,
        sunLongitude: sunLon,
        moonLongitude: moonLon,
        isNightChart: nightChart,
        latitude,
        longitude,
      },
      enableDebugLogs
    ),

    // Solar Return
    calculateSolarReturnChart(
      { natal: natalInput, currentDate },
      enableDebugLogs
    ),

    // Lunar Return
    calculateLunarReturnChart(
      { natal: natalInput, currentDate },
      enableDebugLogs
    ),

    // Progressions (Secondary + Solar Arc)
    calculateAllProgressions(
      { natal: natalInput, currentDate, includeSolarArc: true },
      enableDebugLogs
    ),

    // Specialized Charts (Draconic + Harmonics)
    calculateAllSpecializedCharts(
      { natalChart, currentAge },
      enableDebugLogs
    ),

    // Asteroids, Fixed Stars, Eclipses
    calculateAllAsteroidsStars(
      {
        natalChart,
        jdUT,
        houseCusps,
        natalPlanets: planets,
        upcomingEclipsesCount: 5,
      },
      enableDebugLogs
    ),
  ]);

  // Extract results with error handling
  const result: ReturnType<typeof calculateAstrologyData> extends Promise<infer R> ? R : never = {};

  if (advancedPointsResult.status === 'fulfilled') {
    result.extraPoints = advancedPointsResult.value;
  } else if (enableDebugLogs) {
    logger.debug('[Advanced Points] Skipped', advancedPointsResult.reason);
  }

  if (solarReturnResult.status === 'fulfilled') {
    result.solarReturn = solarReturnResult.value;
  } else if (enableDebugLogs) {
    logger.debug('[Solar Return] Skipped', solarReturnResult.reason);
  }

  if (lunarReturnResult.status === 'fulfilled') {
    result.lunarReturn = lunarReturnResult.value;
  } else if (enableDebugLogs) {
    logger.debug('[Lunar Return] Skipped', lunarReturnResult.reason);
  }

  if (progressionsResult.status === 'fulfilled') {
    result.progressions = {
      secondary: progressionsResult.value.secondary,
      solarArc: progressionsResult.value.solarArc,
    };
  } else if (enableDebugLogs) {
    logger.debug('[Progressions] Skipped', progressionsResult.reason);
  }

  if (specializedChartsResult.status === 'fulfilled') {
    result.draconic = specializedChartsResult.value.draconic;
    result.harmonics = specializedChartsResult.value.harmonics;
  } else if (enableDebugLogs) {
    logger.debug('[Specialized Charts] Skipped', specializedChartsResult.reason);
  }

  if (asteroidsStarsResult.status === 'fulfilled') {
    result.asteroids = asteroidsStarsResult.value.asteroids;
    result.fixedStars = asteroidsStarsResult.value.fixedStars;
    result.eclipses = asteroidsStarsResult.value.eclipses;
  } else if (enableDebugLogs) {
    logger.debug('[Asteroids & Stars] Skipped', asteroidsStarsResult.reason);
  }

  if (enableDebugLogs) {
    logger.debug('[Astrology Data] All calculations complete', {
      hasExtraPoints: !!result.extraPoints,
      hasSolarReturn: !!result.solarReturn,
      hasLunarReturn: !!result.lunarReturn,
      hasProgressions: !!result.progressions,
      hasDraconic: !!result.draconic,
      hasHarmonics: !!result.harmonics,
      hasAsteroids: !!result.asteroids,
      fixedStarsCount: result.fixedStars?.length || 0,
      hasEclipses: !!result.eclipses,
    });
  }

  return result;
}

/**
 * Main Destiny Map computation function (refactored)
 *
 * This is the new implementation using the modular architecture.
 * It maintains backward compatibility with the original API while
 * leveraging the improved modularity, testability, and performance
 * of the refactored codebase.
 *
 * Key improvements:
 * - Parallel calculation of all advanced features
 * - Better error handling (graceful degradation)
 * - Improved caching with cache-manager module
 * - Clear separation of concerns
 * - Enhanced debugging capabilities
 *
 * @param input - Combined input for destiny map calculation
 * @returns Complete destiny map result with astrology and saju data
 */
export async function computeDestinyMapRefactored(
  input: CombinedInput
): Promise<CombinedResult> {
  try {
    const { birthDate, birthTime, latitude, longitude, gender: rawGender, tz, userTimezone } = input;

    // Validate coordinates
    validateCoordinates(latitude, longitude);

    // Generate cache key (exclude user name for privacy)
    const cacheKey = generateDestinyMapCacheKey({
      birthDate,
      birthTime,
      latitude,
      longitude,
      gender: rawGender,
      tz,
    });

    // Check cache
    const cached = destinyMapCache.get(cacheKey);
    if (cached) {
      if (enableDebugLogs) {
        logger.debug('[Engine Core] Cache hit');
      }
      return cached;
    }

    if (enableDebugLogs) {
      logger.debug('[Engine Core] Starting calculation');
    }

    // Parse birth date/time
    const { year, month, day, hour, minute } = parseBirthDateTime(birthDate, birthTime);

    // Calculate natal chart
    const natalResult = await calculateNatal(
      { year, month, date: day, hour, minute, latitude, longitude, timeZone: tz || 'Asia/Seoul' },
      enableDebugLogs
    );

    const { chart: natalChart, facts: astrologyFacts, planets: astrologyPlanets, ascendant, mc } = natalResult;
    const astrologyData = { planets: astrologyPlanets, facts: astrologyFacts, ascendant, mc };

    // Get current date in user timezone for transits/progressions
    const userNow = getNowInTimezone(userTimezone);

    // Calculate all advanced astrology features in parallel
    const advancedData = await calculateAstrologyData(input, natalChart, userNow);

    // Calculate Saju data

    // Resolve timezone for Saju
    let resolvedTz = tz;
    if (!resolvedTz) {
      try {
        const tzLookup = (await import('tz-lookup')).default;
        resolvedTz = tzLookup(latitude, longitude);
      } catch {
        resolvedTz = 'Asia/Seoul';
      }
    }

    const gender = (rawGender ?? 'male').toLowerCase() as 'male' | 'female';
    const [hh, mmRaw] = birthTime.split(':');
    const safeBirthTime = `${hh.padStart(2, '0')}:${(mmRaw ?? '00').padStart(2, '0')}`;

    // Note: Saju calculation is still using the original implementation
    // This will be refactored in a future phase
    let sajuFacts: any = {};
    try {
      sajuFacts = await calculateSajuData(birthDate.trim(), safeBirthTime, gender, 'solar', resolvedTz);
    } catch (err) {
      logger.error('[Saju Data] Calculation failed', err);
    }

    // Build summary
    const sun = astrologyData.planets.find((p: { name: string; sign?: string }) => p.name === 'Sun')?.sign ?? '-';
    const moon = astrologyData.planets.find((p: { name: string; sign?: string }) => p.name === 'Moon')?.sign ?? '-';
    const element =
      astrologyData.facts.elementRatios &&
      Object.entries(astrologyData.facts.elementRatios)
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

    const dayMasterText = sajuFacts?.dayMaster?.name
      ? `${sajuFacts.dayMaster.name} (${sajuFacts.dayMaster.element ?? ''})`
      : sajuFacts?.dayMaster?.element
      ? `(${sajuFacts.dayMaster.element})`
      : 'Unknown';

    const summary = [
      input.name ? `Name: ${input.name}` : '',
      `Sun: ${sun}`,
      `Moon: ${moon}`,
      `Asc: ${(astrologyData.ascendant as { sign?: string })?.sign ?? '-'}`,
      `MC: ${(astrologyData.mc as { sign?: string })?.sign ?? '-'}`,
      element ? `Dominant Element: ${element}` : '',
      `Day Master: ${dayMasterText}`,
    ]
      .filter(Boolean)
      .join(' | ');

    // Assemble complete result
    const result: CombinedResult = {
      meta: {
        generator: 'DestinyMap Core Engine (Refactored)',
        generatedAt: new Date().toISOString(),
        name: input.name,
        gender: rawGender,
      },
      astrology: astrologyData,
      saju: {
        facts: { ...sajuFacts, birthDate },
        pillars: {
          year: sajuFacts?.yearPillar,
          month: sajuFacts?.monthPillar,
          day: sajuFacts?.dayPillar,
          time: sajuFacts?.timePillar,
        },
        dayMaster: sajuFacts?.dayMaster ?? {},
        unse: {
          daeun: [],
          annual: [],
          monthly: [],
          iljin: [],
        },
        sinsal: null,
      },
      summary,
      // Advanced astrology data
      ...advancedData,
    };

    // Cache the result
    destinyMapCache.set(cacheKey, result);

    if (enableDebugLogs) {
      logger.debug('[Engine Core] Calculation complete', {
        cacheSize: destinyMapCache.getSize(),
      });
    }

    return result;
  } catch (err) {
    logger.error('[Engine Core] Calculation failed', err);

    // Return minimal valid result on error
    return {
      meta: {
        generator: 'DestinyMap Core Engine (Error)',
        generatedAt: new Date().toISOString(),
      },
      astrology: {},
      saju: {
        facts: {},
        pillars: {},
        dayMaster: {},
        unse: { daeun: [], annual: [], monthly: [], iljin: [] },
        sinsal: null,
      },
      summary: 'Calculation error occurred. Returning data-only result.',
    };
  }
}

/**
 * Export cache manager for manual cache control if needed
 */
export { destinyMapCache };
