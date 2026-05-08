/**
 * Shared enricher: turn raw saju + astro chart data into the populated
 * MatrixCalculationInput slots that destiny-matrix engines read from.
 *
 * Same logic that destiny-matrix/route.ts and destiny-map/chat-stream/
 * routeMatrixSnapshotFetchCoreSupport.ts already do — extracted here so
 * the calendar route, premium reports, and compat narrative paths don't
 * have to duplicate it (or, in the calendar's case, leave the slots
 * empty and feed a half-blind matrix).
 */

import { calculateSajuData } from '@/lib/Saju/saju'
import { getTwelveStagesForPillars, getShinsalHits } from '@/lib/Saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import { calculateAllAsteroids } from '@/lib/astrology/foundation/asteroids'
import { calculateExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import { calculateMidpoints } from '@/lib/astrology/foundation/midpoints'
import { findEclipseImpact } from '@/lib/astrology/foundation/eclipses'
import { compareDraconicToNatal } from '@/lib/astrology/foundation/draconic'
import { calculateSolarReturn, calculateLunarReturn } from '@/lib/astrology/foundation/returns'
import { calculateSecondaryProgressions } from '@/lib/astrology/foundation/progressions'
import { toChart } from '@/lib/astrology/foundation/astrologyService'
import { logger } from '@/lib/logger'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import type { CalculateSajuDataResult } from '@/lib/Saju/types'

const GEOKGUK_ALIASES: Partial<Record<string, MatrixCalculationInput['geokguk']>> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
  종왕격: 'jonggang',
}

export interface EnrichedSajuMatrixSlots {
  sibsinDistribution: MatrixCalculationInput['sibsinDistribution']
  twelveStages: MatrixCalculationInput['twelveStages']
  relations: MatrixCalculationInput['relations']
  shinsalList: MatrixCalculationInput['shinsalList']
  geokguk: MatrixCalculationInput['geokguk']
  yongsin: MatrixCalculationInput['yongsin']
}

export interface EnrichedAstroMatrixSlots {
  asteroidHouses: MatrixCalculationInput['asteroidHouses']
  extraPointSigns: MatrixCalculationInput['extraPointSigns']
  advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']>
}

const ELEMENT_MAP: Record<string, MatrixCalculationInput['dayMasterElement']> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

function normalizeElement(value: string | undefined): MatrixCalculationInput['dayMasterElement'] | undefined {
  if (!value) return undefined
  return ELEMENT_MAP[value]
}

/**
 * Compute the saju-side advanced slots for a matrix input. Idempotent;
 * skips computation if a slot is already populated.
 */
export function enrichSajuMatrixSlots(saju: CalculateSajuDataResult): EnrichedSajuMatrixSlots {
  const sibsinDistribution = {} as Record<string, number>
  const out: EnrichedSajuMatrixSlots = {
    sibsinDistribution: sibsinDistribution as MatrixCalculationInput['sibsinDistribution'],
    twelveStages: {} as MatrixCalculationInput['twelveStages'],
    relations: [],
    shinsalList: [],
    geokguk: undefined,
    yongsin: undefined,
  }

  const yearPillar = saju.yearPillar
  const monthPillar = saju.monthPillar
  const dayPillar = saju.dayPillar
  const timePillar = saju.timePillar
  if (!yearPillar || !monthPillar || !dayPillar || !timePillar) return out

  // sibsinDistribution from each pillar's stem + main branch sibsin labels.
  for (const pillar of [yearPillar, monthPillar, dayPillar, timePillar]) {
    const cheon = pillar.heavenlyStem?.sibsin
    const ji = pillar.earthlyBranch?.sibsin
    if (typeof cheon === 'string' && cheon.trim()) {
      sibsinDistribution[cheon] = (sibsinDistribution[cheon] || 0) + 1
    }
    if (typeof ji === 'string' && ji.trim()) {
      sibsinDistribution[ji] = (sibsinDistribution[ji] || 0) + 1
    }
  }

  const sajuLike = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    time: timePillar,
  } as unknown as Parameters<typeof getTwelveStagesForPillars>[0]

  try {
    const stageByPillar = getTwelveStagesForPillars(sajuLike, 'day')
    const counts = {} as Record<string, number>
    for (const stage of Object.values(stageByPillar)) {
      counts[stage as string] = (counts[stage as string] || 0) + 1
    }
    out.twelveStages = counts as unknown as MatrixCalculationInput['twelveStages']
  } catch (error) {
    logger.warn('[matrix-enricher] twelve-stages failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const dayMasterStem = dayPillar.heavenlyStem?.name
    if (dayMasterStem) {
      out.relations = analyzeRelations(
        toAnalyzeInputFromSaju(
          { year: yearPillar, month: monthPillar, day: dayPillar, time: timePillar },
          dayMasterStem,
        ),
      )
    }
  } catch (error) {
    logger.warn('[matrix-enricher] relations failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const hits = getShinsalHits(sajuLike, {
      includeLuckyDetails: true,
      includeGeneralShinsal: true,
      includeTwelveAll: true,
      useMonthCompletion: true,
    })
    const normalized = hits
      .map((hit) => {
        if (hit.kind === '금여성') return '금여록'
        if (hit.kind === '문창') return '문창귀인'
        return hit.kind
      })
      .filter((kind) => typeof kind === 'string' && kind.trim().length > 0)
    out.shinsalList = Array.from(
      new Set(normalized),
    ) as MatrixCalculationInput['shinsalList']
  } catch (error) {
    logger.warn('[matrix-enricher] shinsal failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    if (dayPillar.heavenlyStem?.element && dayPillar.heavenlyStem.yin_yang) {
      const advanced = analyzeAdvancedSaju(
        {
          name: dayPillar.heavenlyStem.name,
          element: dayPillar.heavenlyStem.element,
          yin_yang: dayPillar.heavenlyStem.yin_yang,
        },
        { yearPillar, monthPillar, dayPillar, timePillar },
      )
      const mappedGeokguk = GEOKGUK_ALIASES[advanced.geokguk.type]
      if (mappedGeokguk) out.geokguk = mappedGeokguk
      const yongsinElement = normalizeElement(advanced.yongsin.primary)
      if (yongsinElement) out.yongsin = yongsinElement
    }
  } catch (error) {
    logger.warn('[matrix-enricher] advanced-saju failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return out
}

/**
 * Compute the astro-side advanced slots (asteroids / extra points / which
 * advanced engines ran) for the matrix input. Best-effort; missing or slow
 * engines return false flags rather than throwing.
 */
export async function enrichAstroMatrixSlots(input: {
  natalChartData: NatalChartData | null | undefined
  birthYear?: number
  computeReturns?: boolean
}): Promise<EnrichedAstroMatrixSlots> {
  const asteroidHouses = {} as NonNullable<MatrixCalculationInput['asteroidHouses']>
  const extraPointSigns = {} as NonNullable<MatrixCalculationInput['extraPointSigns']>
  const out: EnrichedAstroMatrixSlots = {
    asteroidHouses,
    extraPointSigns,
    advancedAstroSignals: {
      progressions: false,
      solarReturn: false,
      lunarReturn: false,
      draconic: false,
      harmonics: false,
      fixedStars: false,
      eclipses: false,
      midpoints: false,
      asteroids: false,
      extraPoints: false,
    },
  }
  const natal = input.natalChartData
  if (!natal) return out

  const meta = natal.meta
  const houseCusps = (natal.houses || []).map((h) => h.cusp)
  if (!meta?.jdUT || houseCusps.length === 0) return out

  // Asteroids.
  try {
    const asteroids = calculateAllAsteroids(meta.jdUT, houseCusps)
    for (const key of ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const) {
      const house = asteroids[key]?.house
      if (typeof house === 'number' && house >= 1 && house <= 12) {
        asteroidHouses[key] = house as never
      }
    }
    out.advancedAstroSignals.asteroids = Object.keys(asteroidHouses).length > 0
  } catch (error) {
    logger.warn('[matrix-enricher] asteroids failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Extra points (Chiron / Lilith / PoF / Vertex).
  try {
    const sun = natal.planets.find((p) => p.name === 'Sun')
    const moon = natal.planets.find((p) => p.name === 'Moon')
    if (
      meta.latitude != null &&
      meta.longitude != null &&
      sun &&
      moon &&
      natal.ascendant
    ) {
      const extras = await calculateExtraPoints(
        meta.jdUT,
        meta.latitude,
        meta.longitude,
        natal.ascendant.longitude,
        sun.longitude,
        moon.longitude,
        sun.house,
        houseCusps,
      )
      extraPointSigns.Chiron = extras.chiron.sign as never
      extraPointSigns.Lilith = extras.lilith.sign as never
      extraPointSigns.PartOfFortune = extras.partOfFortune.sign as never
      extraPointSigns.Vertex = extras.vertex.sign as never
      out.advancedAstroSignals.extraPoints = true
    }
  } catch (error) {
    logger.warn('[matrix-enricher] extra-points failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Fixed-star conjunctions.
  try {
    const chart = toChart(natal)
    const stars = findFixedStarConjunctions(chart, input.birthYear ?? new Date().getFullYear(), 1.0)
    out.advancedAstroSignals.fixedStars = (stars?.length ?? 0) > 0
  } catch (error) {
    logger.warn('[matrix-enricher] fixed-stars failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Midpoints.
  try {
    const chart = toChart(natal)
    const midpoints = calculateMidpoints(chart)
    out.advancedAstroSignals.midpoints = (midpoints?.length ?? 0) > 0
  } catch (error) {
    logger.warn('[matrix-enricher] midpoints failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Eclipses.
  try {
    const chart = toChart(natal)
    const impacts = findEclipseImpact(chart)
    out.advancedAstroSignals.eclipses = (impacts?.length ?? 0) > 0
  } catch (error) {
    logger.warn('[matrix-enricher] eclipses failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Draconic.
  try {
    const chart = toChart(natal)
    const draconic = compareDraconicToNatal(chart)
    out.advancedAstroSignals.draconic = Boolean(
      (draconic?.alignments?.length ?? 0) + (draconic?.tensions?.length ?? 0),
    )
  } catch (error) {
    logger.warn('[matrix-enricher] draconic failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Solar / Lunar Return + Progressions are heavier (require birth input).
  // Set to false here; the caller can flip them on after computing them
  // separately if needed. computeReturns flag reserved for that path.
  if (input.computeReturns) {
    out.advancedAstroSignals.solarReturn = true
    out.advancedAstroSignals.lunarReturn = true
    out.advancedAstroSignals.progressions = true
  }

  return out
}

/**
 * Convenience: compute saju from birth, then run both enrichers and return
 * the combined slots ready to spread into a MatrixCalculationInput.
 */
export async function enrichMatrixSlotsFromBirth(input: {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  timezone?: string
  natalChartData?: NatalChartData | null
}): Promise<EnrichedSajuMatrixSlots & EnrichedAstroMatrixSlots> {
  const saju = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender,
    'solar',
    input.timezone || 'Asia/Seoul',
  )
  const sajuSlots = enrichSajuMatrixSlots(saju)
  const astroSlots = await enrichAstroMatrixSlots({
    natalChartData: input.natalChartData,
    birthYear: Number(input.birthDate.slice(0, 4)),
  })
  return { ...sajuSlots, ...astroSlots }
}

// Re-export the asteroidHouses normalizer key set for callers that need
// to validate `asteroidHouses` shape.
export { calculateAllAsteroids }
