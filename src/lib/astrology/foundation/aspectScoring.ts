// src/lib/astrology/aspectScoring.ts
//
// Traditional-style aspect scoring.
//
//   1. Aspect kind base score:
//        conjunction       → depends on planet pair (benefic conj → +5, malefic
//                            conj → -3, mixed → 0)
//        sextile           → +3
//        trine             → +5
//        square            → -3
//        opposition        → -2
//   2. Orb scaling: scoreFactor = 1 - (orb / maxOrb).
//        Tighter orb → stronger effect, both for good and ill.
//   3. Retrograde modifier: -1 if either planet is retrograde and the aspect
//      is hard (square / opposition); 0 otherwise.
//
// Mirrors saju's hyeongchung scoring approach in spirit — relations have a
// base type, then local modifiers (positions) tune the strength.

import { getPairTone } from './dignities'
import type { AstroPlanetName, AspectKind } from '../interpretations'

export interface ScoredAspect {
  fromPlanet: AstroPlanetName
  toPlanet: AstroPlanetName
  kind: AspectKind
  orb: number
  /** True when either side is retrograde. */
  retrograde: boolean
  /** Final score (-10 to +10 typical range). */
  score: number
  /** Components used to compute it (debug / UI tooltip). */
  breakdown: {
    base: number
    orbFactor: number
    pairTone: number
    retrogradeModifier: number
  }
}

const MAX_ORB: Record<AspectKind, number> = {
  conjunction: 8,
  sextile: 4,
  square: 6,
  trine: 6,
  opposition: 8,
}

function baseScore(kind: AspectKind, fromPlanet: AstroPlanetName, toPlanet: AstroPlanetName): {
  base: number
  pairTone: number
} {
  const pairTone = getPairTone(fromPlanet, toPlanet)
  switch (kind) {
    case 'conjunction':
      // Conjunction = pair tone fully, scaled into ±5.
      return { base: pairTone * 2.5, pairTone }
    case 'sextile':
      return { base: 3 + pairTone * 0.5, pairTone }
    case 'trine':
      return { base: 5 + pairTone * 0.5, pairTone }
    case 'square':
      return { base: -3 + pairTone * 0.5, pairTone }
    case 'opposition':
      return { base: -2 + pairTone * 0.5, pairTone }
  }
}

export function scoreAspect(input: {
  fromPlanet: AstroPlanetName
  toPlanet: AstroPlanetName
  kind: AspectKind
  orb: number
  fromRetrograde?: boolean
  toRetrograde?: boolean
}): ScoredAspect {
  const { kind, orb } = input
  const orbCap = MAX_ORB[kind]
  // 1.0 at exact, 0 at orb-cap. Negative-allowed to dampen far aspects to 0.
  const orbFactor = Math.max(0, 1 - orb / orbCap)
  const { base, pairTone } = baseScore(kind, input.fromPlanet, input.toPlanet)
  const retrograde = !!input.fromRetrograde || !!input.toRetrograde
  // Hard aspects with retrograde compound the difficulty.
  const isHard = kind === 'square' || kind === 'opposition'
  const retrogradeModifier = retrograde && isHard ? -1 : 0

  const raw = base * orbFactor + retrogradeModifier
  return {
    fromPlanet: input.fromPlanet,
    toPlanet: input.toPlanet,
    kind,
    orb,
    retrograde,
    score: Number(raw.toFixed(2)),
    breakdown: {
      base: Number(base.toFixed(2)),
      orbFactor: Number(orbFactor.toFixed(2)),
      pairTone,
      retrogradeModifier,
    },
  }
}

/**
 * Sum of scored aspects, used as the chart-level "aspect environment"
 * input to comprehensive scoring.
 */
export function aggregateAspectScore(scored: ScoredAspect[]): number {
  return Number(scored.reduce((sum, a) => sum + a.score, 0).toFixed(2))
}
