// src/lib/destiny-matrix/compatibility/buildPremiumContext.ts
//
// Server-side orchestrator that runs the FULL compatibility engine (every
// module the existing /api/compatibility/counselor uses) for two birth
// profiles, plus the 3-layer summary used by the result page cards. The
// LLM narrative generator consumes the structured output of this builder
// so the magazine prose can quote격국·신살·대운·어스펙트 by name.

import { calculateFusionCompatibility } from '@/lib/compatibility/compatibilityFusion'
import type { FusionCompatibilityResult } from '@/lib/compatibility/compatibilityFusion'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { analyzeCoupleDeepInsights } from '@/lib/compatibility/coupleDeepInsights'
import { analyzeThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility/threeLayerSynastry'
import type {
  CompatibilityPerson,
  ThreeLayerCompatibility,
} from '@/lib/destiny-matrix/compatibility/threeLayerSynastry'
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
  /** Lightweight 3-layer summary, drives the score-cards row on the result page. */
  threeLayer: ThreeLayerCompatibility
  /** Fusion engine — overall saju × astro fusion score with category breakdown. */
  fusion: FusionCompatibilityResult | null
  /** Extended saju (격국·신살·60갑자·용신 비교 + 대운·세운 동행). */
  extendedSaju: ReturnType<typeof performExtendedSajuAnalysis> | null
  /** Extended astrology (어스펙트·하우스·트랜짓 매트릭스). */
  extendedAstro: ReturnType<typeof performExtendedAstrologyAnalysis> | null
  /** Couple deep insights (성격·소통·갈등 패턴). */
  deepInsights: ReturnType<typeof analyzeCoupleDeepInsights> | null
  /** Per-person ages used to drive timing analysis. */
  ages: { a: number; b: number }
  /** True when one or more profile inputs fell back to defaults. */
  usedDefaults: { locationA: boolean; locationB: boolean; timezoneA: boolean; timezoneB: boolean }
}

const FALLBACK_AGE = 30

/**
 * Runs every compatibility engine module the counselor uses (and a couple
 * extras) for two birth profiles. Designed to be called from a Next API
 * route — uses the existing routeSupport helpers verbatim so the inputs to
 * each module are byte-identical to the counselor pipeline.
 */
export async function buildPremiumCompatibilityContext(
  input: PremiumCompatibilityInput
): Promise<PremiumCompatibilityContext> {
  const now = new Date()

  // 1. Seeds + auto saju/astro context (Asia/Seoul fallback handled inside).
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

  // 2. Engine module inputs.
  const ageA = getAgeFromBirthDate(input.personA.birthDate) ?? FALLBACK_AGE
  const ageB = getAgeFromBirthDate(input.personB.birthDate) ?? FALLBACK_AGE
  const currentYear = now.getFullYear()

  const sajuProfileA = buildSajuProfile(autoSajuA as Record<string, unknown>)
  const sajuProfileB = buildSajuProfile(autoSajuB as Record<string, unknown>)
  const astroProfileA = buildAstroProfile(autoAstroA as Record<string, unknown>)
  const astroProfileB = buildAstroProfile(autoAstroB as Record<string, unknown>)
  const extendedAstroA = buildExtendedAstroProfile(autoAstroA as Record<string, unknown>)
  const extendedAstroB = buildExtendedAstroProfile(autoAstroB as Record<string, unknown>)

  // 3. 3-layer summary (used for the score-card row UI).
  const threeLayer = analyzeThreeLayerCompatibility(input.personA, input.personB)

  // 4. Full engine modules — each call wrapped so a single failure doesn't
  //    sink the whole report.
  let fusion: FusionCompatibilityResult | null = null
  let extendedSaju: ReturnType<typeof performExtendedSajuAnalysis> | null = null
  let extendedAstro: ReturnType<typeof performExtendedAstrologyAnalysis> | null = null
  let deepInsights: ReturnType<typeof analyzeCoupleDeepInsights> | null = null

  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    try {
      fusion = calculateFusionCompatibility(sajuProfileA, astroProfileA, sajuProfileB, astroProfileB)
    } catch (err) {
      logger.warn('[premium-compat] fusion failed', { err: String(err) })
    }
    try {
      extendedSaju = performExtendedSajuAnalysis(sajuProfileA, sajuProfileB, ageA, ageB, currentYear)
    } catch (err) {
      logger.warn('[premium-compat] extendedSaju failed', { err: String(err) })
    }
  }

  if (extendedAstroA && extendedAstroB) {
    try {
      extendedAstro = performExtendedAstrologyAnalysis(
        extendedAstroA,
        extendedAstroB,
        Math.abs(ageA - ageB)
      )
    } catch (err) {
      logger.warn('[premium-compat] extendedAstro failed', { err: String(err) })
    }
  }

  if (sajuProfileA && sajuProfileB && astroProfileA && astroProfileB) {
    try {
      const fusionScores = fusion?.breakdown ?? null
      const dynamics = fusion?.relationshipDynamics
      deepInsights = analyzeCoupleDeepInsights({
        p1Saju: sajuProfileA,
        p2Saju: sajuProfileB,
        p1Astro: extendedAstroA ?? astroProfileA,
        p2Astro: extendedAstroB ?? astroProfileB,
        fusion: {
          sajuScore: fusionScores?.saju ?? null,
          astrologyScore: fusionScores?.astrology ?? null,
          fusionScore: fusion?.overallScore ?? null,
          crossScore: fusionScores?.elementalHarmony ?? null,
          emotionalIntensity: dynamics?.emotionalIntensity ?? null,
          intellectualAlignment: dynamics?.intellectualAlignment ?? null,
          spiritualConnection: dynamics?.spiritualConnection ?? null,
        },
      })
    } catch (err) {
      logger.warn('[premium-compat] deepInsights failed', { err: String(err) })
    }
  }

  return {
    threeLayer,
    fusion,
    extendedSaju,
    extendedAstro,
    deepInsights,
    ages: { a: ageA, b: ageB },
    usedDefaults: {
      locationA: seedA.source.usedDefaultLocation,
      locationB: seedB.source.usedDefaultLocation,
      timezoneA: seedA.source.usedDefaultTimezone,
      timezoneB: seedB.source.usedDefaultTimezone,
    },
  }
}
