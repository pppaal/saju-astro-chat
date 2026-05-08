/**
 * Destiny Map Engine Core - Main Orchestrator
 * 운명 지도 엔진 코어 - 모든 모듈을 통합하는 메인 오케스트레이터
 *
 * This module orchestrates all astrology and saju calculations by coordinating
 * the specialized modules: natal charts, advanced points, returns,
 * progressions, specialized charts, asteroids, fixed stars, saju, and more.
 */

// Note: 'use server' removed - exports include non-async values (cache, utility functions)

import { CacheManager, generateDestinyMapCacheKey } from './cache-manager';
import { calculateNatal } from './natal-calculations';
import { calculateAdvancedPoints } from './advanced-points';
import {
  calculateSolarReturnChart,
  calculateLunarReturnChart,
  calculateAllProgressions,
} from './returns-progressions';
import { calculateAllSpecializedCharts } from './specialized-charts';
import { calculateAllAsteroidsStars } from './asteroids-stars';
import { calculateElectionalAnalysis, calculateMidpointsAnalysis } from './electional-midpoints';
import { calculateSajuOrchestrated } from './saju-orchestrator';
import { buildSummary, buildErrorSummary } from './summary-builder';
import {
  resolveTimezone,
  validateCoordinates,
  parseBirthDateTime,
  getNowInTimezone,
} from './helpers';

import { isNightChart, type Chart } from '@/lib/astrology';
import { logger } from '@/lib/logger';

import type { CombinedInput, CombinedResult, DateComponents } from './types';

// Re-export types for backward compatibility
export type { CombinedInput, CombinedResult } from './types';

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
 * Calculate all astrology features in parallel
 *
 * This function orchestrates parallel calculation of:
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
  userNow: DateComponents
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
  electional?: CombinedResult['electional'];
  midpoints?: CombinedResult['midpoints'];
}> {
  const { birthDate, birthTime, latitude, longitude, tz } = input;
  const { year, month, day, hour, minute } = parseBirthDateTime(birthDate, birthTime);

  // Resolve timezone
  const resolvedTz = resolveTimezone(tz, latitude, longitude);

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
    electionalResult,
    midpointsResult,
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

    // Electional Analysis
    calculateElectionalAnalysis(
      { natalChart, sunPlanet, moonPlanet },
      enableDebugLogs
    ),

    // Midpoints Analysis
    calculateMidpointsAnalysis(natalChart, enableDebugLogs),
  ]);

  // Extract results with error handling
  const result: Awaited<ReturnType<typeof calculateAstrologyData>> = {};

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

  if (electionalResult.status === 'fulfilled' && electionalResult.value) {
    result.electional = electionalResult.value;
  } else if (enableDebugLogs) {
    logger.debug('[Electional] Skipped', electionalResult.status === 'rejected' ? electionalResult.reason : 'No result');
  }

  if (midpointsResult.status === 'fulfilled' && midpointsResult.value) {
    result.midpoints = midpointsResult.value;
  } else if (enableDebugLogs) {
    logger.debug('[Midpoints] Skipped', midpointsResult.status === 'rejected' ? midpointsResult.reason : 'No result');
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
      hasElectional: !!result.electional,
      hasMidpoints: !!result.midpoints,
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
 * - Complete Saju orchestration with advanced analysis
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

    // Resolve timezone
    const resolvedTz = resolveTimezone(tz, latitude, longitude);

    // Calculate natal chart
    const natalResult = await calculateNatal(
      { year, month, date: day, hour, minute, latitude, longitude, timeZone: resolvedTz },
      enableDebugLogs
    );

    const { chart: natalChart, facts: astrologyFacts, planets: astrologyPlanets, ascendant, mc, houses, aspects } = natalResult;

    // Get current date in user timezone for transits/progressions
    const userNow = getNowInTimezone(userTimezone);

    // Parallel calculation: Astrology data + Saju data
    const [astrologyDataResult, sajuResult] = await Promise.allSettled([
      calculateAstrologyData(input, natalChart, userNow),
      calculateSajuOrchestrated(
        {
          birthDate,
          birthTime,
          gender: (rawGender ?? 'male').toLowerCase() as 'male' | 'female',
          timezone: resolvedTz,
        },
        enableDebugLogs
      ),
    ]);

    // Extract astrology advanced data
    const advancedData = astrologyDataResult.status === 'fulfilled' ? astrologyDataResult.value : {};

    // Extract saju data
    const sajuData = sajuResult.status === 'fulfilled'
      ? sajuResult.value
      : {
          facts: {},
          pillars: {},
          dayMaster: {},
          unse: { daeun: [], annual: [], monthly: [], iljin: [] },
          sinsal: null,
        };

    // Build summary
    const ascendantData = ascendant as { sign?: string } | undefined;
    const mcData = mc as { sign?: string } | undefined;
    const dayMasterData = sajuData.dayMaster as { name?: string; element?: string } | undefined;

    const summary = buildSummary({
      name: input.name,
      planets: astrologyPlanets,
      ascendant: { sign: ascendantData?.sign },
      mc: { sign: mcData?.sign },
      astrologyFacts,
      dayMaster: {
        name: dayMasterData?.name,
        element: dayMasterData?.element,
      },
    });

    // Assemble complete result
    const result: CombinedResult = {
      meta: {
        generator: 'DestinyMap Core Engine (Refactored)',
        generatedAt: new Date().toISOString(),
        name: input.name,
        gender: rawGender,
      },
      astrology: {
        facts: astrologyFacts,
        planets: astrologyPlanets,
        houses,
        ascendant,
        mc,
        aspects,
        meta: natalChart.meta,
        options: {},
        transits: [],
      },
      saju: sajuData,
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
      summary: buildErrorSummary(),
    };
  }
}

/**
 * Export cache manager for manual cache control if needed
 */
export { destinyMapCache };

// Re-export helper for backward compatibility
export { getNowInTimezone };
