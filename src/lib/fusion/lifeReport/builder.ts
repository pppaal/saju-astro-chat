// src/lib/fusion/lifeReport/builder.ts
// Top-level builder. Composes the headline, 4 life-stages, decisive
// timing, karma section, and 9 domain narratives into a single
// LifeReport. Fully deterministic — same input always produces the
// same output (except the generatedAt timestamp in metadata).
//
// Phase 5: the builder now auto-populates calendarSignals via
// adaptCalendarEngineSignals when the caller does not supply them,
// so deep Hellenistic / harmonic / draconic / midpoint signals are
// always available to downstream sections.

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
import { buildWisdom } from './sections/domains/wisdom'
import { buildCreativity } from './sections/domains/creativity'
import { buildSpirituality } from './sections/domains/spirituality'
import { adaptCalendarEngineSignals } from './adapters/fromCalendarEngine'

export function buildLifeReport(input: LifeReportInput): LifeReport {
  // Auto-populate calendar-engine signals when caller did not pass them.
  // Wrapped in try/catch so partial chart data cannot break the whole report.
  let calendarSignals = input.calendarSignals
  if (!calendarSignals) {
    try {
      calendarSignals = adaptCalendarEngineSignals({
        saju: input.saju,
        astro: input.astro,
      })
    } catch {
      calendarSignals = undefined
    }
  }

  const builderInput: BuilderInput = {
    ...input,
    calendarSignals,
    isKo: true,
  }
  return {
    generatedAt: new Date().toISOString(),
    generator: 'lifeReport-v3-deterministic',
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
      buildWisdom(builderInput),
      buildCreativity(builderInput),
      buildSpirituality(builderInput),
    ],
  }
}
