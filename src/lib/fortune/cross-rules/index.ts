// Pipeline entry: (saju + astro raw) → FortuneReport.
// Stage 1 engines stay where they are; this module composes 2~5.

import { aggregate } from './aggregator'
import { runRules } from './engine'
import { normalizeAstro, type AstroNormalizerInput } from './normalizer/astro'
import { normalizeSaju, type SajuNormalizerInput } from './normalizer/saju'
import { allRules } from './rules'
import type { FortuneReport, Rule } from './types'

export interface CrossRulesInput {
  saju: SajuNormalizerInput
  astro: AstroNormalizerInput
  rules?: Rule[] // override for tests / progressive rollout
}

export function runCrossRules(input: CrossRulesInput): FortuneReport {
  const sajuSignals = normalizeSaju(input.saju)
  const astroSignals = normalizeAstro(input.astro)
  const matches = runRules(input.rules ?? allRules, sajuSignals, astroSignals)
  return aggregate(matches)
}

export type { FortuneReport, Rule } from './types'
export { allRules } from './rules'
