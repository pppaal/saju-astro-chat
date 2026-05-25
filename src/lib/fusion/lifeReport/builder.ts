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
//
// Robustness: every section is wrapped in `safe()` so a throw inside one
// section degrades to an empty (hidden) section instead of blanking the
// entire report. The renderer hides sections with no paragraphs.

import type {
  BuilderInput,
  DecisiveTiming,
  DomainId,
  DomainNarrative,
  Headline,
  KarmaSection,
  LifeReport,
  LifeReportInput,
  LifeStage,
  LifeStageId,
  LifeStages,
} from './types'
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
import { plainifyKo } from './templates/sentences'

// Walk the finished report and plain-language any leftover stylized "결"
// noun across every string field. Korean-only regexes, so EN fields and
// signal-id strings pass through untouched.
function deepPlainify<T>(node: T): T {
  if (typeof node === 'string') return plainifyKo(node) as unknown as T
  if (Array.isArray(node)) return node.map((v) => deepPlainify(v)) as unknown as T
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node)) out[k] = deepPlainify(v)
    return out as unknown as T
  }
  return node
}

// Run a section builder; on throw, log (dev only) and return a safe,
// empty fallback so the rest of the report still renders.
function safe<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[lifeReport] section "${label}" failed; rendering empty:`, err)
    }
    return fallback
  }
}

const emptyHeadline: Headline = { ko: '', en: '', signals: { saju: [], astro: [] } }

const emptyStage = (id: LifeStageId, years: string): LifeStage => ({
  id,
  years,
  title: { ko: '', en: '' },
  paragraphs: [],
  signals: { saju: [], astro: [] },
})

const emptyLifeStages: LifeStages = {
  early: emptyStage('early', '0-20'),
  young: emptyStage('young', '20-40'),
  middle: emptyStage('middle', '40-60'),
  late: emptyStage('late', '60+'),
}

const emptyDecisiveTiming: DecisiveTiming = {
  decisiveYears: [],
  paragraphs: [],
  signals: { saju: [], astro: [] },
}

const emptyKarma: KarmaSection = { paragraphs: [], signals: { saju: [], astro: [] } }

const emptyDomain = (id: DomainId): DomainNarrative => ({
  id,
  title: { ko: '', en: '' },
  paragraphs: [],
  signals: { saju: [], astro: [], fusion: [] },
})

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
    // Shared across domain builders (run in fixed order) so each domain's
    // relation sentence claims a distinct 합/충 axis instead of repeating.
    relUsed: { ko: new Set<string>(), en: new Set<string>() },
  }
  const report: LifeReport = {
    generatedAt: new Date().toISOString(),
    generator: 'lifeReport-v3-deterministic',
    headline: safe('headline', () => buildHeadline(builderInput), emptyHeadline),
    lifeStages: safe('lifeStages', () => buildLifeStages(builderInput), emptyLifeStages),
    decisiveTiming: safe(
      'decisiveTiming',
      () => buildDecisiveTiming(builderInput),
      emptyDecisiveTiming
    ),
    karma: safe('karma', () => buildKarma(builderInput), emptyKarma),
    domains: [
      safe('career', () => buildCareer(builderInput), emptyDomain('career')),
      safe('love', () => buildLove(builderInput), emptyDomain('love')),
      safe('children', () => buildChildren(builderInput), emptyDomain('children')),
      safe('money', () => buildMoney(builderInput), emptyDomain('money')),
      safe('health', () => buildHealth(builderInput), emptyDomain('health')),
      safe('family', () => buildFamily(builderInput), emptyDomain('family')),
      safe('wisdom', () => buildWisdom(builderInput), emptyDomain('wisdom')),
      safe('creativity', () => buildCreativity(builderInput), emptyDomain('creativity')),
      safe('spirituality', () => buildSpirituality(builderInput), emptyDomain('spirituality')),
    ],
  }
  return deepPlainify(report)
}
