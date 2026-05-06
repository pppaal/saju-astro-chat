// src/lib/destiny-matrix/compatibility/buildPremiumContext.ts
//
// Server-side orchestrator that runs the FULL compatibility engine — every
// public module under src/lib/compatibility — for two birth profiles.
//
// Modules included (all 12):
//   1. analyzeThreeLayerCompatibility   (UI score-cards row)
//   2. calculateFusionCompatibility     (fusion engine)
//   3. performExtendedSajuAnalysis      (격국·신살·60갑자·용신·대운 동행)
//   4. performExtendedAstrologyAnalysis (어스펙트·하우스·트랜짓)
//   5. analyzeCoupleDeepInsights        (이상형·결혼·지속력)
//   6. analyzeCoupleTiming              (대운·세운 12개월 동행 타이밍)
//   7. analyzeCoupleAstroTiming         (점성 트랜짓 타이밍)
//   8. buildIdealTypeProfiles           (이상형 프로파일 — 6각도)
//   9. buildMultiFacetReport            (8 영역 다각도 리포트)
//  10. analyzeCoupleExtraPoints         (Lilith·Chiron·Vertex 등 가산점)
//  11. buildCoupleTagline               (한 줄 태그라인)
//  12. performCrossSystemAnalysis       (사주 ↔ 점성 교차 그래프)

import { calculateFusionCompatibility } from '@/lib/compatibility/compatibilityFusion'
import type { FusionCompatibilityResult } from '@/lib/compatibility/compatibilityFusion'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { analyzeCoupleDeepInsights } from '@/lib/compatibility/coupleDeepInsights'
import type { CoupleDeepInsights } from '@/lib/compatibility/coupleDeepInsights'
import { analyzeCoupleTiming } from '@/lib/compatibility/coupleTimingAnalysis'
import type { CoupleTimingAnalysis } from '@/lib/compatibility/coupleTimingAnalysis'
import { analyzeCoupleAstroTiming } from '@/lib/compatibility/coupleAstroTiming'
import type { CoupleAstroTimingResult } from '@/lib/compatibility/coupleAstroTiming'
import { buildIdealTypeProfiles } from '@/lib/compatibility/coupleIdealTypeProfile'
import type { PersonIdealProfile } from '@/lib/compatibility/coupleIdealTypeProfile'
import { buildMultiFacetReport } from '@/lib/compatibility/coupleMultiFacetReport'
import type { FacetReport } from '@/lib/compatibility/coupleMultiFacetReport'
import { analyzeCoupleExtraPoints } from '@/lib/compatibility/coupleExtraPoints'
import type { CoupleExtraPointsResult } from '@/lib/compatibility/coupleExtraPoints'
import { buildCoupleTagline } from '@/lib/compatibility/coupleTagline'
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'
import type {
  CrossAnalysisResult,
  SajuProfile as CrossSajuProfile,
  AstroProfile as CrossAstroProfile,
} from '@/lib/compatibility/crossSystemAnalysis'
import { analyzeThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility/threeLayerSynastry'
import type {
  CompatibilityPerson,
  ThreeLayerCompatibility,
} from '@/lib/destiny-matrix/compatibility/threeLayerSynastry'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateTransitChart } from '@/lib/astrology/foundation/transit'
import {
  buildAutoSajuContext,
  buildAutoAstroContext,
  buildPersonSeed,
  buildSajuProfile,
  buildAstroProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
} from '@/app/api/compatibility/counselor/routeSupport'
import { logger } from '@/lib/logger'

export interface PremiumCompatibilityInput {
  personA: CompatibilityPerson
  personB: CompatibilityPerson
  labelA?: string
  labelB?: string
}

export interface PremiumCompatibilityContext {
  threeLayer: ThreeLayerCompatibility
  fusion: FusionCompatibilityResult | null
  extendedSaju: ReturnType<typeof performExtendedSajuAnalysis> | null
  extendedAstro: ReturnType<typeof performExtendedAstrologyAnalysis> | null
  deepInsights: CoupleDeepInsights | null
  coupleTiming: CoupleTimingAnalysis | null
  coupleAstroTiming: CoupleAstroTimingResult | null
  idealTypes: PersonIdealProfile[] | null
  multiFacets: FacetReport[] | null
  extraPoints: CoupleExtraPointsResult | null
  tagline: { headline: string; subline: string } | null
  crossSystem: CrossAnalysisResult | null
  ages: { a: number; b: number }
  usedDefaults: { locationA: boolean; locationB: boolean; timezoneA: boolean; timezoneB: boolean }
}

const FALLBACK_AGE = 30

function tryRun<T>(label: string, fn: () => T): T | null {
  try {
    return fn()
  } catch (err) {
    logger.warn(`[premium-compat] ${label} failed`, { err: String(err) })
    return null
  }
}

async function tryRunAsync<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    logger.warn(`[premium-compat] ${label} failed`, { err: String(err) })
    return null
  }
}

export async function buildPremiumCompatibilityContext(
  input: PremiumCompatibilityInput
): Promise<PremiumCompatibilityContext> {
  const now = new Date()

  const seedA = buildPersonSeed({
    birthDate: input.personA.birthDate,
    birthTime: input.personA.birthTime,
    gender: input.personA.gender,
  })
  const seedB = buildPersonSeed({
    birthDate: input.personB.birthDate,
    birthTime: input.personB.birthTime,
    gender: input.personB.gender,
  })
  if (!seedA || !seedB) {
    throw new Error('invalid_birth_input')
  }

  const [autoSajuA, autoSajuB, autoAstroA, autoAstroB] = await Promise.all([
    buildAutoSajuContext(seedA, now),
    buildAutoSajuContext(seedB, now),
    buildAutoAstroContext(seedA, now),
    buildAutoAstroContext(seedB, now),
  ])

  const ageA = getAgeFromBirthDate(input.personA.birthDate) ?? FALLBACK_AGE
  const ageB = getAgeFromBirthDate(input.personB.birthDate) ?? FALLBACK_AGE
  const currentYear = now.getFullYear()

  const sajuProfileA = buildSajuProfile(autoSajuA as Record<string, unknown>)
  const sajuProfileB = buildSajuProfile(autoSajuB as Record<string, unknown>)
  const astroProfileA = buildAstroProfile(autoAstroA as Record<string, unknown>)
  const astroProfileB = buildAstroProfile(autoAstroB as Record<string, unknown>)
  const extendedAstroA = buildExtendedAstroProfile(autoAstroA as Record<string, unknown>)
  const extendedAstroB = buildExtendedAstroProfile(autoAstroB as Record<string, unknown>)

  // Real Chart instances for couple-astro-timing + extra-points (the auto
  // astro context flattens to plain objects, so we recompute the Chart
  // here). Skipped in tests where node_env disables ephemeris work.
  const chartPair = await tryRunAsync('chart-pair', async () => {
    const [yA, mA, dA] = seedA.date.split('-').map(Number)
    const [hA, miA] = seedA.time.split(':').map(Number)
    const [yB, mB, dB] = seedB.date.split('-').map(Number)
    const [hB, miB] = seedB.time.split(':').map(Number)
    const [natalA, natalB, transit] = await Promise.all([
      calculateNatalChart({
        year: yA, month: mA, date: dA, hour: hA, minute: miA,
        latitude: seedA.latitude, longitude: seedA.longitude, timeZone: seedA.timeZone,
      }),
      calculateNatalChart({
        year: yB, month: mB, date: dB, hour: hB, minute: miB,
        latitude: seedB.latitude, longitude: seedB.longitude, timeZone: seedB.timeZone,
      }),
      calculateTransitChart({
        iso: now.toISOString(),
        latitude: seedA.latitude,
        longitude: seedA.longitude,
        timeZone: seedA.timeZone,
      }),
    ])
    return {
      natalChartA: toChart(natalA),
      natalChartB: toChart(natalB),
      transitChart: transit,
      natalRawA: natalA,
      natalRawB: natalB,
    }
  })

  // 1. Three-layer summary (always runs).
  const threeLayer = analyzeThreeLayerCompatibility(input.personA, input.personB)

  // 2. Fusion + 3. ExtendedSaju
  let fusion: FusionCompatibilityResult | null = null
  let extendedSaju: ReturnType<typeof performExtendedSajuAnalysis> | null = null
  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    fusion = tryRun('fusion', () =>
      calculateFusionCompatibility(sajuProfileA, astroProfileA, sajuProfileB, astroProfileB)
    )
    extendedSaju = tryRun('extendedSaju', () =>
      performExtendedSajuAnalysis(sajuProfileA, sajuProfileB, ageA, ageB, currentYear)
    )
  }

  // 4. ExtendedAstro
  let extendedAstro: ReturnType<typeof performExtendedAstrologyAnalysis> | null = null
  if (extendedAstroA && extendedAstroB) {
    extendedAstro = tryRun('extendedAstro', () =>
      performExtendedAstrologyAnalysis(extendedAstroA, extendedAstroB, Math.abs(ageA - ageB))
    )
  }

  // 5. CoupleDeepInsights
  let deepInsights: CoupleDeepInsights | null = null
  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    const dyn = fusion?.relationshipDynamics
    const breakdown = fusion?.breakdown
    deepInsights = tryRun('deepInsights', () =>
      analyzeCoupleDeepInsights({
        p1Saju: sajuProfileA,
        p2Saju: sajuProfileB,
        p1Astro: extendedAstroA ?? astroProfileA,
        p2Astro: extendedAstroB ?? astroProfileB,
        fusion: {
          sajuScore: breakdown?.saju ?? null,
          astrologyScore: breakdown?.astrology ?? null,
          fusionScore: fusion?.overallScore ?? null,
          crossScore: breakdown?.elementalHarmony ?? null,
          emotionalIntensity: dyn?.emotionalIntensity ?? null,
          intellectualAlignment: dyn?.intellectualAlignment ?? null,
          spiritualConnection: dyn?.spiritualConnection ?? null,
        },
      })
    )
  }

  // 6. CoupleTiming (대운·세운 12개월)
  const coupleTiming = tryRun('coupleTiming', () =>
    analyzeCoupleTiming(
      autoSajuA as Record<string, unknown> | null,
      autoSajuB as Record<string, unknown> | null
    )
  )

  // 7. CoupleAstroTiming (점성 트랜짓 — needs Chart instances)
  let coupleAstroTiming: CoupleAstroTimingResult | null = null
  if (chartPair) {
    coupleAstroTiming = tryRun('coupleAstroTiming', () =>
      analyzeCoupleAstroTiming(
        chartPair.natalChartA,
        chartPair.natalChartB,
        seedA.date,
        seedB.date,
        chartPair.transitChart,
        null
      )
    )
  }

  // 8. IdealTypeProfiles
  let idealTypes: PersonIdealProfile[] | null = null
  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    idealTypes = tryRun('idealTypes', () =>
      buildIdealTypeProfiles(
        sajuProfileA,
        sajuProfileB,
        extendedAstroA ?? astroProfileA,
        extendedAstroB ?? astroProfileB
      )
    )
  }

  // 9. MultiFacetReport
  let multiFacets: FacetReport[] | null = null
  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    const dyn = fusion?.relationshipDynamics
    const breakdown = fusion?.breakdown
    multiFacets = tryRun('multiFacets', () =>
      buildMultiFacetReport({
        p1Saju: sajuProfileA,
        p2Saju: sajuProfileB,
        p1Astro: extendedAstroA ?? astroProfileA,
        p2Astro: extendedAstroB ?? astroProfileB,
        fusion: {
          sajuScore: breakdown?.saju ?? null,
          astrologyScore: breakdown?.astrology ?? null,
          fusionScore: fusion?.overallScore ?? null,
          crossScore: breakdown?.elementalHarmony ?? null,
          dayMasterHarmony: null,
          sunMoonHarmony: null,
          venusMarsSynergy: null,
          intellectualAlignment: dyn?.intellectualAlignment ?? null,
          spiritualConnection: dyn?.spiritualConnection ?? null,
          emotionalIntensity: dyn?.emotionalIntensity ?? null,
        },
      } as Parameters<typeof buildMultiFacetReport>[0])
    )
  }

  // 10. ExtraPoints (Lilith·Chiron·Vertex 등 — needs natal chart + lat/lon)
  let extraPoints: CoupleExtraPointsResult | null = null
  if (chartPair) {
    extraPoints = tryRun('extraPoints', () =>
      analyzeCoupleExtraPoints(
        chartPair.natalChartA,
        chartPair.natalChartB,
        seedA.latitude,
        seedA.longitude,
        seedB.latitude,
        seedB.longitude
      )
    )
  }

  // 11. CoupleTagline
  const tagline = tryRun('tagline', () =>
    buildCoupleTagline({
      overallScore: fusion?.overallScore ?? threeLayer.integrated.score,
      sajuScore: fusion?.breakdown?.saju ?? threeLayer.layer1_saju.score,
      astrologyScore: fusion?.breakdown?.astrology ?? threeLayer.layer2_synastry.score,
      crossScore: fusion?.breakdown?.elementalHarmony ?? threeLayer.layer3_composite.score,
      fusion: fusion
        ? {
            dayMasterHarmony: null,
            sunMoonHarmony: null,
            venusMarsSynergy: null,
            intellectualAlignment: fusion.relationshipDynamics?.intellectualAlignment ?? null,
            spiritualConnection: fusion.relationshipDynamics?.spiritualConnection ?? null,
          }
        : null,
    })
  )

  // 12. CrossSystem (사주 ↔ 점성 교차 그래프)
  let crossSystem: CrossAnalysisResult | null = null
  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    crossSystem = tryRun('crossSystem', () =>
      performCrossSystemAnalysis(
        sajuProfileA as unknown as CrossSajuProfile,
        sajuProfileB as unknown as CrossSajuProfile,
        astroProfileA as unknown as CrossAstroProfile,
        astroProfileB as unknown as CrossAstroProfile
      )
    )
  }

  return {
    threeLayer,
    fusion,
    extendedSaju,
    extendedAstro,
    deepInsights,
    coupleTiming,
    coupleAstroTiming,
    idealTypes,
    multiFacets,
    extraPoints,
    tagline,
    crossSystem,
    ages: { a: ageA, b: ageB },
    usedDefaults: {
      locationA: seedA.source.usedDefaultLocation,
      locationB: seedB.source.usedDefaultLocation,
      timezoneA: seedA.source.usedDefaultTimezone,
      timezoneB: seedB.source.usedDefaultTimezone,
    },
  }
}
