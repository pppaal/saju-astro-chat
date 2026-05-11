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

  // Compose life-stage / sequence context from saju adapter outputs.
  const ageYears = input.saju.ageYears
  let lifeStage:
    | 'child'
    | 'teen'
    | 'young-adult'
    | 'mid-adult'
    | 'late-adult'
    | 'elder'
    | 'adult'
    | undefined
  if (typeof ageYears === 'number') {
    if (ageYears < 12) lifeStage = 'child'
    else if (ageYears < 20) lifeStage = 'teen'
    else if (ageYears < 35) lifeStage = 'young-adult'
    else if (ageYears < 55) lifeStage = 'mid-adult'
    else if (ageYears < 70) lifeStage = 'late-adult'
    else lifeStage = 'elder'
  }
  const ds = input.saju.daeunSequence
  const context = {
    ageYears,
    lifeStage,
    daeun: ds
      ? {
          index: ds.index,
          yearsIntoCurrent: ds.yearsIntoCurrent,
          yearsToNext: ds.yearsToNext,
          previousSibsin: ds.previous?.sibsin?.cheon,
          nextSibsin: ds.next?.sibsin?.cheon,
          transitionImminent: !!ds.next && ds.yearsToNext <= 1,
        }
      : undefined,
  }
  return aggregate(matches, input.metaRules ?? defaultMetaRules, context)
}

export type { FortuneReport, Rule, MetaRule } from './types'
export { allRules } from './rules'
export { metaRules } from './metaRules'
export { render, renderToText } from './renderer'
export { renderWithLlm } from './llmRenderer'
export type { RenderMode, RenderedSection, LlmRenderResult } from './llmRenderer'
export { chatWithFortune } from './chat'
export type { ChatOptions, ChatResult, ChatTurn } from './chat'
export { runFortune, runFortuneWithRaw } from './adapters/orchestrator'
export type { BirthProfile, RunFortuneInput } from './adapters/orchestrator'
export { serializeBirthSnapshot } from './birthSnapshot'
export type { BirthSnapshotOptions } from './birthSnapshot'
