// Pipeline entry: (saju + astro raw) → FortuneReport (+ optional rendered text).
// Stage 1 engines stay where they are; this module composes 2~6.

import { aggregate } from './aggregator'
import { runRules } from './engine'
import { metaRules as defaultMetaRules } from './metaRules'
import { normalizeAstro, type AstroNormalizerInput } from './normalizer/astro'
import { normalizeSaju, type SajuNormalizerInput } from './normalizer/saju'
import { render, renderToText } from './renderer'
import { allRules } from './rules'
import type { FortuneReport, MetaRule, Rule } from './types'

export interface CrossRulesInput {
  saju: SajuNormalizerInput
  astro: AstroNormalizerInput
  rules?: Rule[]
  metaRules?: MetaRule[]
}

export function runCrossRules(input: CrossRulesInput): FortuneReport {
  const sajuSignals = normalizeSaju(input.saju)
  const astroSignals = normalizeAstro(input.astro)
  const matches = runRules(input.rules ?? allRules, sajuSignals, astroSignals)
  return aggregate(matches, input.metaRules ?? defaultMetaRules)
}

export type { FortuneReport, Rule, MetaRule } from './types'
export { allRules } from './rules'
export { metaRules } from './metaRules'
export { render, renderToText } from './renderer'
