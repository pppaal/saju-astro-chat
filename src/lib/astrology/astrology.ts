// src/lib/astrology/astrology.ts
//
// Main astrology entry point — mirrors src/lib/Saju/saju.ts.
//
// One async call returns:
//   natal       (사주 4기둥 격)
//   daily       (일운, transits + aspects)
//   monthly     (월운, lunar return)
//   yearly      (세운, solar return)
//   daewoon     (대운, secondary progressions)
//   advanced    (소행성 · Chiron · Lilith · Vertex · Part of Fortune ·
//                항성 · 미드포인트 · 이클립스 영향 · 드라코닉 비교)
//
// Heavy lifts run in parallel via Promise.all.

import { calculateNatalChart, toChart } from './foundation/astrologyService'
import type { NatalChartData, NatalChartInput } from './foundation/astrologyService'
import { calculateTransitChart, findTransitAspects } from './foundation/transit'
import type { TransitAspect } from './foundation/transit'
import { calculateSolarReturn, calculateLunarReturn } from './foundation/returns'
import { calculateSecondaryProgressions } from './foundation/progressions'
import { calculateAllAsteroids } from './foundation/asteroids'
import type { Asteroid } from './foundation/asteroids'
import { calculateExtraPoints } from './foundation/extraPoints'
import { findFixedStarConjunctions } from './foundation/fixedStars'
import type { FixedStarConjunction } from './foundation/fixedStars'
import { calculateMidpoints, findMidpointActivations } from './foundation/midpoints'
import type { Midpoint, MidpointActivation } from './foundation/midpoints'
import { findEclipseImpact } from './foundation/eclipses'
import type { EclipseImpact } from './foundation/eclipses'
import { compareDraconicToNatal } from './foundation/draconic'
import type { DraconicComparison } from './foundation/draconic'
import type {
  Chart,
  ExtraPoint,
  NatalInput,
  ProgressedChart,
  ReturnChart,
} from './foundation/types'

export interface CalculateAstrologyInput {
  birth: NatalChartInput
  nowIso?: string
  solarReturnYear?: number
  lunarReturn?: { year: number; month: number }
  progressionTargetDate?: string
  limits?: {
    transitAspects?: number
    fixedStarOrbDeg?: number
    midpointOrbDeg?: number
  }
}

export interface AstrologyAdvanced {
  asteroids: Asteroid[]
  extraPoints: {
    chiron: ExtraPoint
    lilith: ExtraPoint
    partOfFortune: ExtraPoint
    vertex: ExtraPoint
  }
  fixedStarConjunctions: FixedStarConjunction[]
  midpoints: Midpoint[]
  midpointActivations: MidpointActivation[]
  eclipseImpacts: EclipseImpact[]
  draconic: DraconicComparison
}

export interface AstrologyData {
  natal: NatalChartData
  daily: {
    asOfIso: string
    chart: Chart
    aspects: TransitAspect[]
  }
  monthly: ReturnChart
  yearly: ReturnChart
  daewoon: ProgressedChart
  advanced: AstrologyAdvanced
  meta: {
    computedAtIso: string
    nowIso: string
    progressionTargetDate: string
    solarReturnYear: number
    lunarReturnYear: number
    lunarReturnMonth: number
  }
}

const DEFAULT_TRANSIT_LIMIT = 80
const DEFAULT_FIXED_STAR_ORB = 1.0
const DEFAULT_MIDPOINT_ORB = 1.5

export async function calculateAstrologyData(
  input: CalculateAstrologyInput
): Promise<AstrologyData> {
  const nowIso = input.nowIso ?? new Date().toISOString()
  const now = new Date(nowIso)
  const solarReturnYear = input.solarReturnYear ?? now.getUTCFullYear()
  const lunarReturnYear = input.lunarReturn?.year ?? now.getUTCFullYear()
  const lunarReturnMonth = input.lunarReturn?.month ?? now.getUTCMonth() + 1
  const progressionTargetDate =
    input.progressionTargetDate ?? nowIso.slice(0, 10)
  const transitLimit = input.limits?.transitAspects ?? DEFAULT_TRANSIT_LIMIT
  const fixedStarOrb = input.limits?.fixedStarOrbDeg ?? DEFAULT_FIXED_STAR_ORB
  const midpointOrb = input.limits?.midpointOrbDeg ?? DEFAULT_MIDPOINT_ORB

  // 1. Natal chart (single ephemeris pass).
  const natal = await calculateNatalChart(input.birth)
  const natalChart = toChart(natal)

  const natalInput: NatalInput = {
    year: input.birth.year,
    month: input.birth.month,
    date: input.birth.date,
    hour: input.birth.hour,
    minute: input.birth.minute,
    latitude: input.birth.latitude,
    longitude: input.birth.longitude,
    timeZone: input.birth.timeZone,
  }

  const houseCusps = natal.houses.map((h) => h.cusp)
  const jdUT = natal.meta?.jdUT
  const sunPlanet = natal.planets.find((p) => p.name === 'Sun')
  const moonPlanet = natal.planets.find((p) => p.name === 'Moon')

  // 2. Run timing + advanced layers in parallel.
  const [transitChart, yearly, monthly, daewoon, asteroidsCollection, extraPoints] =
    await Promise.all([
      calculateTransitChart({
        iso: nowIso,
        latitude: input.birth.latitude,
        longitude: input.birth.longitude,
        timeZone: input.birth.timeZone,
      }),
      calculateSolarReturn({ natal: natalInput, year: solarReturnYear }),
      calculateLunarReturn({
        natal: natalInput,
        year: lunarReturnYear,
        month: lunarReturnMonth,
      }),
      calculateSecondaryProgressions({
        natal: natalInput,
        targetDate: progressionTargetDate,
      }),
      jdUT !== undefined
        ? Promise.resolve(calculateAllAsteroids(jdUT, houseCusps))
        : Promise.resolve(null),
      jdUT !== undefined && sunPlanet && moonPlanet && natal.ascendant
        ? calculateExtraPoints(
            jdUT,
            input.birth.latitude,
            input.birth.longitude,
            natal.ascendant.longitude,
            sunPlanet.longitude,
            moonPlanet.longitude,
            sunPlanet.house,
            houseCusps
          )
        : Promise.resolve(null),
    ])

  // 3. Daily transit aspects.
  const aspects = findTransitAspects(
    transitChart,
    natalChart,
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
    1.0
  ).slice(0, transitLimit)

  // 4. Synchronous advanced computations on top of natal chart.
  const asteroids: Asteroid[] = asteroidsCollection
    ? [
        asteroidsCollection.Ceres,
        asteroidsCollection.Pallas,
        asteroidsCollection.Juno,
        asteroidsCollection.Vesta,
      ]
    : []

  const fixedStarConjunctions = findFixedStarConjunctions(
    natalChart,
    input.birth.year,
    fixedStarOrb
  )
  const midpoints = calculateMidpoints(natalChart)
  const midpointActivations = findMidpointActivations(natalChart, midpointOrb)
  const eclipseImpacts = findEclipseImpact(natalChart)
  const draconic = compareDraconicToNatal(natalChart)

  // Fallbacks for the rare case where extraPoints couldn't be computed
  // (missing Sun/Moon/Ascendant somehow).
  const safeExtraPoints = extraPoints ?? {
    chiron: emptyExtraPoint('Chiron'),
    lilith: emptyExtraPoint('Lilith'),
    partOfFortune: emptyExtraPoint('Part of Fortune'),
    vertex: emptyExtraPoint('Vertex'),
  }

  return {
    natal,
    daily: {
      asOfIso: nowIso,
      chart: transitChart,
      aspects,
    },
    monthly,
    yearly,
    daewoon,
    advanced: {
      asteroids,
      extraPoints: safeExtraPoints,
      fixedStarConjunctions,
      midpoints,
      midpointActivations,
      eclipseImpacts,
      draconic,
    },
    meta: {
      computedAtIso: new Date().toISOString(),
      nowIso,
      progressionTargetDate,
      solarReturnYear,
      lunarReturnYear,
      lunarReturnMonth,
    },
  }
}

function emptyExtraPoint(name: string): ExtraPoint {
  return {
    name,
    longitude: 0,
    sign: 'Aries' as ExtraPoint['sign'],
    degree: 0,
    minute: 0,
    formatted: '',
    house: 1,
  }
}
