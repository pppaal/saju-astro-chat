// chart-calculator.ts
// Handles computation of Saju and Astrology charts with caching

import { calculateSajuData } from '@/lib/Saju/saju'
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  toChart,
} from '@/lib/astrology'
import { toSajuDataStructure } from '@/lib/destiny-map/type-guards'
import { parseDateComponents, parseTimeComponents } from '@/lib/prediction/utils'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'
import type { SajuDataStructure, AstroDataStructure } from './index'

export interface ChartCalculationInput {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone?: string
}

export interface ChartCalculationResult {
  saju?: SajuDataStructure
  astro?: AstroDataStructure
  natalChartData?: Awaited<ReturnType<typeof calculateNatalChart>>
  currentTransits: unknown[]
}

/**
 * Compute Saju data with caching
 */
export async function computeSajuData(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  timeZone = 'Asia/Seoul'
): Promise<SajuDataStructure | undefined> {
  try {
    const sajuCacheKey = CacheKeys.saju(birthDate, birthTime, gender, 'solar')
    const computedSaju = await cacheOrCalculate(
      sajuCacheKey,
      () => Promise.resolve(calculateSajuData(birthDate, birthTime, gender, 'solar', timeZone)),
      CACHE_TTL.SAJU // 7 days - birth data doesn't change
    )
    const validatedSaju = toSajuDataStructure(computedSaju)
    if (validatedSaju) {
      logger.debug('[chart-calculator] Computed saju:', validatedSaju.dayMaster?.heavenlyStem)
      return validatedSaju as SajuDataStructure
    }
  } catch (e) {
    logger.warn('[chart-calculator] Failed to compute saju:', e)
  }
  return undefined
}

/**
 * Compute Astrology natal chart with caching
 */
export async function computeAstroData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  timeZone = 'Asia/Seoul'
): Promise<{
  astro?: AstroDataStructure
  natalChartData?: Awaited<ReturnType<typeof calculateNatalChart>>
}> {
  try {
    const { year, month, day } = parseDateComponents(birthDate)
    const { hour, minute } = parseTimeComponents(birthTime)

    const natalCacheKey = CacheKeys.natalChart(birthDate, birthTime, latitude, longitude)
    const natalChartData = await cacheOrCalculate(
      natalCacheKey,
      () =>
        calculateNatalChart({
          year,
          month,
          date: day,
          hour,
          minute,
          latitude,
          longitude,
          timeZone,
        }),
      CACHE_TTL.NATAL_CHART // 30 days - birth chart doesn't change
    )

    // Transform planets array to expected format
    const getPlanet = (name: string) => natalChartData.planets.find((p) => p.name === name)
    const astro: AstroDataStructure = {
      sun: getPlanet('Sun'),
      moon: getPlanet('Moon'),
      mercury: getPlanet('Mercury'),
      venus: getPlanet('Venus'),
      mars: getPlanet('Mars'),
      jupiter: getPlanet('Jupiter'),
      saturn: getPlanet('Saturn'),
      ascendant: natalChartData.ascendant,
    }

    logger.warn('[chart-calculator] Computed astro:', (astro.sun as { sign?: string })?.sign)
    return { astro, natalChartData }
  } catch (e) {
    logger.warn('[chart-calculator] Failed to compute astro:', e)
    return {}
  }
}

/**
 * Compute current transits for predictions (cached per hour + location)
 */
export async function computeCurrentTransits(
  natalChartData: Awaited<ReturnType<typeof calculateNatalChart>>,
  latitude: number,
  longitude: number,
  timeZone = 'Asia/Seoul'
): Promise<unknown[]> {
  try {
    const now = new Date()
    const isoNow = now.toISOString().slice(0, 19) // "YYYY-MM-DDTHH:mm:ss"

    const transitCacheKey = CacheKeys.transitChart(latitude, longitude)
    const transitChart = await cacheOrCalculate(
      transitCacheKey,
      () =>
        calculateTransitChart({
          iso: isoNow,
          latitude,
          longitude,
          timeZone,
        }),
      CACHE_TTL.TRANSIT_CHART
    )

    const natalChart = toChart(natalChartData)
    const majorTransits = findMajorTransits(transitChart, natalChart)
    const currentTransits = majorTransits.map((t) => ({
      transitPlanet: t.transitPlanet,
      natalPoint: t.natalPoint,
      aspectType: t.type,
      orb: t.orb?.toFixed(1),
      isApplying: t.isApplying,
    }))

    logger.warn('[chart-calculator] Current transits found:', currentTransits.length)
    return currentTransits
  } catch (e) {
    logger.warn('[chart-calculator] Failed to compute transits:', e)
    return []
  }
}

/**
 * Main function: Compute all chart data with caching
 */
export async function calculateChartData(
  input: ChartCalculationInput,
  existingSaju?: SajuDataStructure,
  existingAstro?: AstroDataStructure
): Promise<ChartCalculationResult> {
  const { birthDate, birthTime, gender, latitude, longitude, timeZone = 'Asia/Seoul' } = input

  let saju = existingSaju
  let astro = existingAstro
  let natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | undefined
  let currentTransits: unknown[] = []

  // Compute saju if not provided or empty
  if (!saju || !saju.dayMaster) {
    saju = await computeSajuData(birthDate, birthTime, gender, timeZone)

    // 🔍 DEBUG: Log saju.unse to verify daeun data
    logger.warn('[chart-calculator] saju.unse exists:', !!saju?.unse)
    logger.warn('[chart-calculator] saju.unse.daeun count:', saju?.unse?.daeun?.length ?? 0)
    if (saju?.unse?.daeun?.[0]) {
      logger.warn('[chart-calculator] First daeun:', JSON.stringify(saju.unse.daeun[0]))
    }
  }

  // Compute astro if not provided or empty
  if (!astro || !astro.sun) {
    const astroResult = await computeAstroData(birthDate, birthTime, latitude, longitude, timeZone)
    astro = astroResult.astro
    natalChartData = astroResult.natalChartData
  }

  // Compute current transits for future predictions
  if (natalChartData) {
    currentTransits = await computeCurrentTransits(natalChartData, latitude, longitude, timeZone)
  }

  return {
    saju,
    astro,
    natalChartData,
    currentTransits,
  }
}
