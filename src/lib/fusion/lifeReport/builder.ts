// src/lib/fusion/lifeReport/builder.ts
// Top-level builder. Composes the headline, 4 life-stages, decisive
// timing, karma section, and 6 domain narratives into a single
// LifeReport. Fully deterministic — same input always produces the
// same output (except the generatedAt timestamp in metadata).

import type { BuilderInput, LifeReport, LifeReportInput } from './types'
import { buildHeadline } from './sections/headline'
import { buildLifeStages } from './sections/lifeStages'
import { buildDecisiveTiming } from './sections/decisiveTiming'
import { buildKarma } from './sections/karma'
import { buildCareer } from './sections/domains/career'
import { buildChildren } from './sections/domains/children'
import { buildFamily } from './sections/domains/family'
import { buildHealth } from './sections/domains/health'
import { buildLove } from './sections/domains/love'
import { buildMoney } from './sections/domains/money'

export function buildLifeReport(input: LifeReportInput): LifeReport {
  const builderInput: BuilderInput = { ...input, isKo: true }
  return {
    generatedAt: new Date().toISOString(),
    generator: 'lifeReport-v2-deterministic',
    headline: buildHeadline(builderInput),
    lifeStages: buildLifeStages(builderInput),
    decisiveTiming: buildDecisiveTiming(builderInput),
    karma: buildKarma(builderInput),
    domains: [
      buildCareer(builderInput),
      buildLove(builderInput),
      buildChildren(builderInput),
      buildMoney(builderInput),
      buildHealth(builderInput),
      buildFamily(builderInput),
    ],
  }
}
