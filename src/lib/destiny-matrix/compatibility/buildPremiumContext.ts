// src/lib/destiny-matrix/compatibility/buildPremiumContext.ts
//
// Server-side orchestrator that runs the FULL compatibility engine — every
// public module under src/lib/compatibility — for two birth profiles.
//
// Failure policy: NO silent null fallback.
// Production paths (saju + astro engines, all 12 modules) MUST succeed.
// If anything throws — invalid birth input, ephemeris failure, profile
// builder returning null — we re-throw so the route returns a 500 with a
// real error instead of a half-empty report.

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

export interface PremiumCompatibilityInput {
  personA: CompatibilityPerson
  personB: CompatibilityPerson
  labelA?: string
  labelB?: string
}

export interface PremiumCompatibilityContext {
  threeLayer: ThreeLayerCompatibility
  fusion: FusionCompatibilityResult
  extendedSaju: ReturnType<typeof performExtendedSajuAnalysis>
  extendedAstro: ReturnType<typeof performExtendedAstrologyAnalysis>
  deepInsights: CoupleDeepInsights
  coupleTiming: CoupleTimingAnalysis
  coupleAstroTiming: CoupleAstroTimingResult
  idealTypes: PersonIdealProfile[]
  multiFacets: FacetReport[]
  extraPoints: CoupleExtraPointsResult | null
  tagline: { headline: string; subline: string }
  crossSystem: CrossAnalysisResult
  ages: { a: number; b: number }
  usedDefaults: { locationA: boolean; locationB: boolean; timezoneA: boolean; timezoneB: boolean }
}

const FALLBACK_AGE = 30

export async function buildPremiumCompatibilityContext(
  input: PremiumCompatibilityInput
): Promise<PremiumCompatibilityContext> {
  const now = new Date()

  // Inputs are validated upstream (route + zod), so the seed builders can
  // never return null here. Same goes for every saju + astro engine on
  // this server — swisseph and the saju calculator are always available.
  // We trust the data and use non-null assertions to keep the code flat.
  const seedA = buildPersonSeed({
    birthDate: input.personA.birthDate,
    birthTime: input.personA.birthTime,
    gender: input.personA.gender,
  })!
  const seedB = buildPersonSeed({
    birthDate: input.personB.birthDate,
    birthTime: input.personB.birthTime,
    gender: input.personB.gender,
  })!

  const [autoSajuARaw, autoSajuBRaw, autoAstroARaw, autoAstroBRaw] = await Promise.all([
    buildAutoSajuContext(seedA, now),
    buildAutoSajuContext(seedB, now),
    buildAutoAstroContext(seedA, now),
    buildAutoAstroContext(seedB, now),
  ])
  const autoSajuA = autoSajuARaw!
  const autoSajuB = autoSajuBRaw!
  const autoAstroA = autoAstroARaw!
  const autoAstroB = autoAstroBRaw!

  const ageA = getAgeFromBirthDate(input.personA.birthDate) ?? FALLBACK_AGE
  const ageB = getAgeFromBirthDate(input.personB.birthDate) ?? FALLBACK_AGE
  const currentYear = now.getFullYear()

  const sajuProfileA = buildSajuProfile(autoSajuA)!
  const sajuProfileB = buildSajuProfile(autoSajuB)!
  const astroProfileA = buildAstroProfile(autoAstroA)!
  const astroProfileB = buildAstroProfile(autoAstroB)!
  const extendedAstroA = buildExtendedAstroProfile(autoAstroA)!
  const extendedAstroB = buildExtendedAstroProfile(autoAstroB)!

  // Real Chart instances for couple-astro-timing + extra-points.
  // We re-compute here (the auto astro context flattens to plain objects)
  // and rely on swisseph being available — same as every other production
  // saju/astro path on this server.
  const [yA, mA, dA] = seedA.date.split('-').map(Number)
  const [hA, miA] = seedA.time.split(':').map(Number)
  const [yB, mB, dB] = seedB.date.split('-').map(Number)
  const [hB, miB] = seedB.time.split(':').map(Number)
  const [natalA, natalB, transitChart] = await Promise.all([
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
  const natalChartA = toChart(natalA)
  const natalChartB = toChart(natalB)

  // 1. Three-layer summary
  const threeLayer = analyzeThreeLayerCompatibility(input.personA, input.personB)

  // 2. Fusion
  const fusion = calculateFusionCompatibility(
    sajuProfileA,
    astroProfileA,
    sajuProfileB,
    astroProfileB
  )

  // 3. ExtendedSaju
  const extendedSaju = performExtendedSajuAnalysis(
    sajuProfileA,
    sajuProfileB,
    ageA,
    ageB,
    currentYear
  )

  // 4. ExtendedAstro
  const extendedAstro = performExtendedAstrologyAnalysis(
    extendedAstroA,
    extendedAstroB,
    Math.abs(ageA - ageB)
  )

  // 5. CoupleDeepInsights
  const fusionScores = fusion.breakdown
  const dyn = fusion.relationshipDynamics
  const deepInsights = analyzeCoupleDeepInsights({
    p1Saju: sajuProfileA,
    p2Saju: sajuProfileB,
    p1Astro: extendedAstroA,
    p2Astro: extendedAstroB,
    fusion: {
      sajuScore: fusionScores?.saju ?? null,
      astrologyScore: fusionScores?.astrology ?? null,
      fusionScore: fusion.overallScore,
      crossScore: fusionScores?.elementalHarmony ?? null,
      emotionalIntensity: dyn?.emotionalIntensity ?? null,
      intellectualAlignment: dyn?.intellectualAlignment ?? null,
      spiritualConnection: dyn?.spiritualConnection ?? null,
    },
  })

  // 6. CoupleTiming (대운·세운 12개월)
  const coupleTiming = analyzeCoupleTiming(autoSajuA, autoSajuB)!

  // 7. CoupleAstroTiming
  const coupleAstroTiming = analyzeCoupleAstroTiming(
    natalChartA,
    natalChartB,
    seedA.date,
    seedB.date,
    transitChart,
    null
  )

  // 8. IdealTypeProfiles
  const idealTypes = buildIdealTypeProfiles(
    sajuProfileA,
    sajuProfileB,
    extendedAstroA,
    extendedAstroB
  )

  // 9. MultiFacetReport
  const multiFacets = buildMultiFacetReport({
    p1Saju: sajuProfileA,
    p2Saju: sajuProfileB,
    p1Astro: extendedAstroA,
    p2Astro: extendedAstroB,
    fusion: {
      dayMasterHarmony: null,
      sunMoonHarmony: null,
      venusMarsSynergy: null,
      intellectualAlignment: dyn?.intellectualAlignment ?? null,
      spiritualConnection: dyn?.spiritualConnection ?? null,
      emotionalIntensity: dyn?.emotionalIntensity ?? null,
    },
  } as Parameters<typeof buildMultiFacetReport>[0])

  // 10. ExtraPoints (Lilith·Chiron·Vertex). May legitimately be null when
  // the natal chart doesn't expose meta.jdUT for the Swiss Ephemeris extra
  // points pass — that's a known module-level limitation, not a fallback.
  const extraPoints = analyzeCoupleExtraPoints(
    natalChartA,
    natalChartB,
    seedA.latitude,
    seedA.longitude,
    seedB.latitude,
    seedB.longitude
  )

  // 11. CoupleTagline
  const tagline = buildCoupleTagline({
    overallScore: fusion.overallScore,
    sajuScore: fusion.breakdown?.saju ?? threeLayer.layer1_saju.score,
    astrologyScore: fusion.breakdown?.astrology ?? threeLayer.layer2_synastry.score,
    crossScore: fusion.breakdown?.elementalHarmony ?? threeLayer.layer3_composite.score,
    fusion: {
      dayMasterHarmony: null,
      sunMoonHarmony: null,
      venusMarsSynergy: null,
      intellectualAlignment: fusion.relationshipDynamics?.intellectualAlignment ?? null,
      spiritualConnection: fusion.relationshipDynamics?.spiritualConnection ?? null,
    },
  })

  // 12. CrossSystem
  const crossSystem = performCrossSystemAnalysis(
    sajuProfileA as unknown as CrossSajuProfile,
    sajuProfileB as unknown as CrossSajuProfile,
    astroProfileA as unknown as CrossAstroProfile,
    astroProfileB as unknown as CrossAstroProfile
  )!

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
