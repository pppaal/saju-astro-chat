/**
 * Data Loader
 *
 * 사주/점성 데이터 로딩 및 계산
 */

import { calculateSajuData } from '@/lib/Saju/saju';
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  toChart,
} from '@/lib/astrology';
import { toSajuDataStructure } from '@/lib/destiny-map/type-guards';
import {
  parseDateComponents,
  parseTimeComponents,
} from '@/lib/prediction/utils';
import { logger } from '@/lib/logger';
import type { SajuDataStructure, AstroDataStructure } from '../lib/types';
import { loadUserProfile } from '../lib/profileLoader';

export interface LoadedData {
  saju: SajuDataStructure;
  astro: AstroDataStructure;
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  latitude: number;
  longitude: number;
  currentTransits: unknown[];
  natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null;
}

/**
 * 사주 데이터 계산 또는 로드
 */
async function computeOrLoadSaju(
  saju: SajuDataStructure | undefined,
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female'
): Promise<SajuDataStructure | undefined> {
  if (saju && saju.dayMaster) {
    return saju;
  }

  try {
    const userTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
    const computedSaju = calculateSajuData(
      birthDate,
      birthTime,
      gender,
      'solar',
      userTz
    );
    const validatedSaju = toSajuDataStructure(computedSaju);

    if (validatedSaju) {
      logger.debug('[dataLoader] Computed saju:', validatedSaju.dayMaster?.heavenlyStem);
      return validatedSaju as SajuDataStructure;
    }
  } catch (e) {
    logger.warn('[dataLoader] Failed to compute saju:', e);
  }

  return saju;
}

/**
 * 점성 차트 데이터 계산 또는 로드
 */
async function computeOrLoadAstro(
  astro: AstroDataStructure | undefined,
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): Promise<{
  astro: AstroDataStructure | undefined;
  natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null;
}> {
  if (astro && astro.sun) {
    return { astro, natalChartData: null };
  }

  try {
    const { year, month, day } = parseDateComponents(birthDate);
    const { hour, minute } = parseTimeComponents(birthTime);

    const natalChartData = await calculateNatalChart({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: 'Asia/Seoul',
    });

    const getPlanet = (name: string) =>
      natalChartData!.planets.find((p) => p.name === name);

    const computedAstro: AstroDataStructure = {
      sun: getPlanet('Sun'),
      moon: getPlanet('Moon'),
      mercury: getPlanet('Mercury'),
      venus: getPlanet('Venus'),
      mars: getPlanet('Mars'),
      jupiter: getPlanet('Jupiter'),
      saturn: getPlanet('Saturn'),
      ascendant: natalChartData.ascendant,
    };

    logger.warn('[dataLoader] Computed astro:', (computedAstro?.sun as { sign?: string })?.sign);

    return { astro: computedAstro, natalChartData };
  } catch (e) {
    logger.warn('[dataLoader] Failed to compute astro:', e);
    return { astro, natalChartData: null };
  }
}

/**
 * 현재 트랜짓 계산
 */
async function computeCurrentTransits(
  natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null,
  latitude: number,
  longitude: number
): Promise<unknown[]> {
  if (!natalChartData) {
    return [];
  }

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

    const currentTransits = majorTransits.map((t) => ({
      transitPlanet: t.transitPlanet,
      natalPoint: t.natalPoint,
      aspectType: t.type,
      orb: t.orb?.toFixed(1),
      isApplying: t.isApplying,
    }));

    logger.warn('[dataLoader] Current transits found:', currentTransits.length);
    return currentTransits;
  } catch (e) {
    logger.warn('[dataLoader] Failed to compute transits:', e);
    return [];
  }
}

/**
 * 모든 데이터 로드 및 계산
 *
 * 1. 사용자 프로필에서 데이터 자동로드 (옵션)
 * 2. 사주 데이터 계산
 * 3. 점성 차트 계산
 * 4. 현재 트랜짓 계산
 */
export async function loadOrComputeAllData(
  userId: string | undefined,
  data: {
    birthDate: string;
    birthTime: string;
    gender: 'male' | 'female';
    latitude: number;
    longitude: number;
    saju?: SajuDataStructure;
    astro?: AstroDataStructure;
  }
): Promise<LoadedData> {
  const {
    birthDate,
    birthTime,
    gender,
    saju,
    astro,
  } = data;
  const latitude = data.latitude;
  const longitude = data.longitude;

  // Auto-load from user profile if data is missing
  if (userId) {
    try {
      const profileResult = await loadUserProfile(
        userId,
        birthDate,
        birthTime,
        latitude,
        longitude,
        saju,
        astro
      );

      if (profileResult.saju) {saju = profileResult.saju;}
      if (profileResult.astro) {astro = profileResult.astro as AstroDataStructure;}
      if (profileResult.birthDate) {birthDate = profileResult.birthDate;}
      if (profileResult.birthTime) {birthTime = profileResult.birthTime;}
      if (profileResult.gender) {gender = profileResult.gender as 'male' | 'female';}

      logger.debug('[dataLoader] Loaded profile data for user:', userId);
    } catch (e) {
      logger.warn('[dataLoader] Failed to load user profile:', e);
    }
  }

  // Compute Saju
  const computedSaju = await computeOrLoadSaju(saju, birthDate, birthTime, gender);

  // Log daeun data for debugging
  if (computedSaju?.unse?.daeun) {
    logger.warn('[dataLoader] saju.unse.daeun count:', (computedSaju.unse.daeun as unknown[]).length);
    if ((computedSaju.unse.daeun as unknown[])[0]) {
      logger.warn('[dataLoader] First daeun:', JSON.stringify((computedSaju.unse.daeun as unknown[])[0]));
    }
  }

  // Compute Astro
  const { astro: computedAstro, natalChartData } = await computeOrLoadAstro(
    astro,
    birthDate,
    birthTime,
    latitude,
    longitude
  );

  // Compute current transits
  const currentTransits = await computeCurrentTransits(
    natalChartData,
    latitude,
    longitude
  );

  return {
    saju: computedSaju || ({} as SajuDataStructure),
    astro: computedAstro || ({} as AstroDataStructure),
    birthDate,
    birthTime,
    gender,
    latitude,
    longitude,
    currentTransits,
    natalChartData,
  };
}
