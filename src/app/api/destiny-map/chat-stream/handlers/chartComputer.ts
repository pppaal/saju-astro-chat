/**
 * Chart Computer
 *
 * 사주/점성술 차트 계산
 */

import { calculateSajuData } from '@/lib/Saju/saju';
import { calculateNatalChart, calculateTransitChart, findMajorTransits, toChart } from '@/lib/astrology';
import { toSajuDataStructure } from '@/lib/destiny-map/type-guards';
import { logger } from '@/lib/logger';
import type { SajuDataStructure, AstroDataStructure } from '../lib';

export interface ChartComputeResult {
  saju: SajuDataStructure | undefined;
  astro: AstroDataStructure | undefined;
  currentTransits: unknown[];
}

export interface ChartComputeInput {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  latitude: number;
  longitude: number;
  existingSaju?: SajuDataStructure;
  existingAstro?: AstroDataStructure;
}

/**
 * 사주 및 점성술 차트 계산
 */
export async function computeCharts(input: ChartComputeInput): Promise<ChartComputeResult> {
  const { birthDate, birthTime, gender, latitude, longitude, existingSaju, existingAstro } = input;

  let saju = existingSaju;
  let astro = existingAstro;
  let natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null = null;
  let currentTransits: unknown[] = [];

  // Compute saju if not provided
  if (!saju || !saju.dayMaster) {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
      const computedSaju = calculateSajuData(birthDate, birthTime, gender, 'solar', userTz);
      const validatedSaju = toSajuDataStructure(computedSaju);
      if (validatedSaju) {
        saju = validatedSaju as SajuDataStructure;
      }
      logger.debug('[ChartComputer] Computed saju:', saju?.dayMaster?.heavenlyStem);
    } catch (e) {
      logger.warn('[ChartComputer] Failed to compute saju:', e);
    }
  }

  // Compute astro if not provided
  if (!astro || !astro.sun) {
    try {
      const [year, month, day] = birthDate.split('-').map(Number);
      const [hour, minute] = birthTime.split(':').map(Number);
      natalChartData = await calculateNatalChart({
        year,
        month,
        date: day,
        hour,
        minute,
        latitude,
        longitude,
        timeZone: 'Asia/Seoul',
      });

      const getPlanet = (name: string) => natalChartData!.planets.find(p => p.name === name);
      astro = {
        sun: getPlanet('Sun'),
        moon: getPlanet('Moon'),
        mercury: getPlanet('Mercury'),
        venus: getPlanet('Venus'),
        mars: getPlanet('Mars'),
        jupiter: getPlanet('Jupiter'),
        saturn: getPlanet('Saturn'),
        ascendant: natalChartData.ascendant,
      };
      logger.warn('[ChartComputer] Computed astro:', (astro?.sun as { sign?: string })?.sign);
    } catch (e) {
      logger.warn('[ChartComputer] Failed to compute astro:', e);
    }
  }

  // Compute current transits
  if (natalChartData) {
    try {
      const now = new Date();
      const isoNow = now.toISOString().slice(0, 19);
      const transitChart = await calculateTransitChart({
        iso: isoNow,
        latitude,
        longitude,
        timeZone: 'Asia/Seoul',
      });

      const natalChart = toChart(natalChartData);
      const majorTransits = findMajorTransits(transitChart, natalChart);
      currentTransits = majorTransits.map(t => ({
        transitPlanet: t.transitPlanet,
        natalPoint: t.natalPoint,
        aspectType: t.type,
        orb: t.orb?.toFixed(1),
        isApplying: t.isApplying,
      }));
      logger.warn('[ChartComputer] Current transits found:', currentTransits.length);
    } catch (e) {
      logger.warn('[ChartComputer] Failed to compute transits:', e);
    }
  }

  return { saju, astro, currentTransits };
}
