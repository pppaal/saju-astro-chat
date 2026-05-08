/**
 * Electional & Midpoints Analysis
 * 택일 및 미드포인트 분석 모듈
 *
 * Handles:
 * - Electional astrology (moon phase, void of course, retrograde planets)
 * - Midpoint calculations and activations
 */

// Note: 'use server' removed - exports include interface/type definitions

import {
  getMoonPhase,
  checkVoidOfCourse,
  getRetrogradePlanets,
  calculateMidpoints,
  findMidpointActivations,
  type Chart,
  type MoonPhase,
  type VoidOfCourseInfo,
  type PlanetaryHour,
  type ElectionalAnalysis,
  type Midpoint,
  type MidpointActivation,
  type PlanetData,
} from '@/lib/astrology';

import { logger } from '@/lib/logger';
import type { ElectionalResult, MidpointsResult } from './types';

// ======================================================
// Electional Analysis
// ======================================================

export interface ElectionalInput {
  natalChart: Chart;
  sunPlanet?: PlanetData;
  moonPlanet?: PlanetData;
}

/**
 * Calculate electional astrology analysis
 * 택일 점성술 분석 계산
 *
 * Includes:
 * - Moon phase (달의 위상)
 * - Void of course status (공망 상태)
 * - Retrograde planets (역행 행성)
 * - Planetary hour (행성 시간)
 *
 * @param input - Electional analysis input
 * @param enableDebugLogs - Enable debug logging
 * @returns Electional analysis result
 */
export async function calculateElectionalAnalysis(
  input: ElectionalInput,
  enableDebugLogs = false
): Promise<ElectionalResult | undefined> {
  try {
    const { natalChart, sunPlanet, moonPlanet } = input;

    // Get sun and moon from chart if not provided
    const sun = sunPlanet || natalChart.planets.find(p => p.name === 'Sun');
    const moon = moonPlanet || natalChart.planets.find(p => p.name === 'Moon');

    if (!sun || !moon) {
      if (enableDebugLogs) {
        logger.debug('[Electional] Missing Sun or Moon planet');
      }
      return undefined;
    }

    const moonPhaseResult = getMoonPhase(sun.longitude, moon.longitude);
    const voidOfCourse = checkVoidOfCourse(natalChart);
    const retrograde = getRetrogradePlanets(natalChart);
    const nowDate = new Date();

    // Simple planetary hour placeholder
    // Full planetary hour calculation requires sunrise/sunset times
    const planetaryHour: PlanetaryHour = {
      planet: 'Sun',
      dayRuler: 'Sun',
      startTime: nowDate,
      endTime: new Date(nowDate.getTime() + 3600000),
      isDay: true,
      goodFor: ['general'],
    };

    const result: ElectionalResult = {
      moonPhase: moonPhaseResult,
      voidOfCourse,
      planetaryHour,
      retrograde,
      analysis: undefined, // Skip complex election analysis
    };

    if (enableDebugLogs) {
      logger.debug('[Electional] Analysis complete', {
        moonPhase: moonPhaseResult,
        isVoidOfCourse: !!voidOfCourse,
        retrogradeCount: retrograde.length,
      });
    }

    return result;
  } catch (err) {
    if (enableDebugLogs) {
      logger.debug('[Electional calculation skipped]', err);
    }
    return undefined;
  }
}

// ======================================================
// Midpoints Analysis
// ======================================================

/**
 * Calculate midpoints analysis
 * 미드포인트 분석 계산
 *
 * Includes:
 * - Sun/Moon midpoint (태양-달 미드포인트)
 * - Asc/MC midpoint (ASC-MC 미드포인트)
 * - All calculated midpoints
 * - Midpoint activations
 *
 * @param natalChart - Natal chart for midpoint calculation
 * @param enableDebugLogs - Enable debug logging
 * @returns Midpoints analysis result
 */
export async function calculateMidpointsAnalysis(
  natalChart: Chart,
  enableDebugLogs = false
): Promise<MidpointsResult | undefined> {
  try {
    const allMidpoints = calculateMidpoints(natalChart);

    // Find Sun/Moon midpoint
    const sunMoonMidpoint = allMidpoints.find(m =>
      (m.planet1 === 'Sun' && m.planet2 === 'Moon') ||
      (m.planet1 === 'Moon' && m.planet2 === 'Sun')
    );

    // Find Asc/MC midpoint
    const ascMcMidpoint = allMidpoints.find(m =>
      (m.planet1 === 'Ascendant' && m.planet2 === 'MC') ||
      (m.planet1 === 'MC' && m.planet2 === 'Ascendant')
    );

    // Find midpoint activations
    const midpointActivations = findMidpointActivations(natalChart);

    const result: MidpointsResult = {
      sunMoon: sunMoonMidpoint,
      ascMc: ascMcMidpoint,
      all: allMidpoints,
      activations: midpointActivations,
    };

    if (enableDebugLogs) {
      logger.debug('[Midpoints] Analysis complete', {
        totalMidpoints: allMidpoints.length,
        hasSunMoon: !!sunMoonMidpoint,
        hasAscMc: !!ascMcMidpoint,
        activationsCount: midpointActivations.length,
      });
    }

    return result;
  } catch (err) {
    if (enableDebugLogs) {
      logger.debug('[Midpoints calculation skipped]', err);
    }
    return undefined;
  }
}

// Re-export types for convenience
export type {
  ElectionalResult,
  MidpointsResult,
  MoonPhase,
  VoidOfCourseInfo,
  PlanetaryHour,
  ElectionalAnalysis,
  Midpoint,
  MidpointActivation,
};
