// chart-calculator.ts
// Handles computation of Saju and Astrology charts with caching

import { calculateSajuData } from '@/lib/Saju/saju'
import { toSajuDataStructure } from '@/lib/destiny-map/type-guards'
import { parseDateComponents, parseTimeComponents } from '@/lib/timing/utils'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'
import { performAdvancedAnalysis } from '@/app/api/saju/services/advancedAnalysis'
import { getTwelveStagesForPillars } from '@/lib/Saju/foundation/shinsal'
import { getJohuPrescription } from '@/lib/Saju/foundation/johuYongsin'
import { detectGeokgukVariation } from '@/lib/Saju/foundation/geokguk'
import { getIrreversibleActionGuards } from '@/lib/Saju/irreversibleActionGuards'
import type { SajuPillars, FiveElement } from '@/lib/Saju/foundation/types'
import type { SajuDataStructure, AstroDataStructure } from './index'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'

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
  natalChartData?: NatalChartData
  currentTransits: unknown[]
}

function isSwissephUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return (
    message.includes('swisseph') &&
    (message.includes('build/release/swisseph.node') ||
      message.includes('failed to load native module'))
  )
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
  natalChartData?: NatalChartData
}> {
  try {
    const { calculateNatalChart } = await import('@/lib/astrology')
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
    if (isSwissephUnavailableError(e)) {
      logger.error('[chart-calculator] swisseph unavailable, skipping astrology enrichment', {
        message: e instanceof Error ? e.message : String(e),
      })
      return {}
    }
    logger.warn('[chart-calculator] Failed to compute astro:', e)
    return {}
  }
}

/**
 * Compute current transits for predictions (cached per hour + location)
 */
export async function computeCurrentTransits(
  natalChartData: NatalChartData,
  latitude: number,
  longitude: number,
  timeZone = 'Asia/Seoul'
): Promise<unknown[]> {
  try {
    const { calculateTransitChart, findMajorTransits, toChart } = await import('@/lib/astrology')
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
    if (isSwissephUnavailableError(e)) {
      logger.error('[chart-calculator] swisseph unavailable, skipping transit enrichment', {
        message: e instanceof Error ? e.message : String(e),
      })
      return []
    }
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
  let natalChartData: NatalChartData | undefined
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

  // Attach advanced analysis (geokguk / yongsin / hyeongchung / tonggeun /
  // deukryeong / johuYongsin / sibsin / health / career / score / report) so
  // the counselor prompt builder can surface them instead of "-" placeholders.
  if (saju && !(saju as { advancedAnalysis?: unknown }).advancedAnalysis) {
    try {
      attachAdvancedAnalysis(saju as unknown as Record<string, unknown>)
    } catch (error) {
      logger.warn('[chart-calculator] Failed to attach advancedAnalysis:', error)
    }
  }

  return {
    saju,
    astro,
    natalChartData,
    currentTransits,
  }
}

/**
 * Run the same `performAdvancedAnalysis` pipeline that `/api/saju/route` runs
 * and attach the result to the saju object as `advancedAnalysis`. Idempotent.
 */
function attachAdvancedAnalysis(saju: Record<string, unknown>): void {
  const yearPillar = saju.yearPillar as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined
  const monthPillar = saju.monthPillar as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined
  const dayPillar = saju.dayPillar as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined
  const timePillar = saju.timePillar as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined

  const yStem = yearPillar?.heavenlyStem?.name
  const yBranch = yearPillar?.earthlyBranch?.name
  const mStem = monthPillar?.heavenlyStem?.name
  const mBranch = monthPillar?.earthlyBranch?.name
  const dStem = dayPillar?.heavenlyStem?.name
  const dBranch = dayPillar?.earthlyBranch?.name
  const tStem = timePillar?.heavenlyStem?.name
  const tBranch = timePillar?.earthlyBranch?.name
  if (!yStem || !yBranch || !mStem || !mBranch || !dStem || !dBranch || !tStem || !tBranch) {
    return
  }

  const simplePillars = {
    year: { stem: yStem, branch: yBranch },
    month: { stem: mStem, branch: mBranch },
    day: { stem: dStem, branch: dBranch },
    time: { stem: tStem, branch: tBranch },
    hour: { stem: tStem, branch: tBranch },
  }
  const pillarsWithHour = {
    year: simplePillars.year,
    month: simplePillars.month,
    day: simplePillars.day,
    hour: simplePillars.time,
  }

  const sajuPillars = saju.pillars as SajuPillars | undefined
  if (!sajuPillars) return

  const twelveStages = getTwelveStagesForPillars(
    sajuPillars as unknown as Parameters<typeof getTwelveStagesForPillars>[0]
  )
  const fiveElements = (saju.fiveElements as Record<FiveElement, number>) || {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
  }

  const advancedAnalysis = performAdvancedAnalysis(
    simplePillars,
    pillarsWithHour,
    sajuPillars,
    dStem,
    mBranch,
    twelveStages as unknown as Record<string, string>,
    fiveElements as unknown as Record<string, number>
  )

  saju.advancedAnalysis = advancedAnalysis

  // Traditional deep prescription layer — 정통 궁통보감 천간 처방,
  // 격국 변격/파격 detection, 비가역 행동 가드.
  try {
    const yongsinResult = advancedAnalysis?.yongsin
    const geokgukResult = advancedAnalysis?.geokguk
    const geokgukLabel = geokgukResult?.primary
    const daymasterStrength = yongsinResult?.daymasterStrength
    const strengthBucket =
      /신강|중강|강함/i.test(daymasterStrength || '')
        ? 'strong'
        : /신약|중약|약함/i.test(daymasterStrength || '')
          ? 'weak'
          : 'mid'

    const johu = getJohuPrescription({
      dayStem: dStem,
      monthBranch: mBranch,
      geokguk: geokgukLabel,
      strength: strengthBucket,
    })

    const variation = detectGeokgukVariation(
      String(geokgukLabel || 'unknown'),
      saju as unknown as Parameters<typeof detectGeokgukVariation>[1],
    )

    const kibsinList: FiveElement[] = []
    if (yongsinResult?.kibsin) kibsinList.push(yongsinResult.kibsin as FiveElement)
    if (yongsinResult?.gusin) kibsinList.push(yongsinResult.gusin as FiveElement)

    const annualList = (saju.unse as { annual?: Array<{ year?: number; heavenlyStem?: string; earthlyBranch?: string }> })?.annual || []
    const currentAnnual = annualList.find((a) => a.year === new Date().getFullYear())

    const guards = getIrreversibleActionGuards({
      daymaster: dStem,
      geokguk: geokgukLabel,
      strength: strengthBucket as 'strong' | 'mid' | 'weak',
      primaryYongsin: yongsinResult?.primaryYongsin as FiveElement | undefined,
      kibsin: kibsinList.length ? kibsinList : undefined,
      currentDaeunStem: (saju.daeWoon as { current?: { heavenlyStem?: string } } | undefined)
        ?.current?.heavenlyStem,
      currentDaeunBranch: (saju.daeWoon as { current?: { earthlyBranch?: string } } | undefined)
        ?.current?.earthlyBranch,
      currentSaeunStem: currentAnnual?.heavenlyStem,
      currentSaeunBranch: currentAnnual?.earthlyBranch,
    })

    ;(saju as { traditionalDeep?: unknown }).traditionalDeep = {
      johu,
      variation,
      guards,
    }
  } catch (deepErr) {
    logger.warn('[chart-calculator] traditionalDeep enrichment failed:', deepErr)
  }
}
