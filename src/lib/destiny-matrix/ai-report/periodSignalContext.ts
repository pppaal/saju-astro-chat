/**
 * Period Signal Context
 *
 * Translates a `TimingData` snapshot + active transit list into an
 * `ActivationContext` tailored to a specific report period
 * (Lifetime / Yearly / Monthly). The activation engine uses this context
 * to weight engine signals — same signal pool, different intensity per
 * period, so monthly reports surface different content than yearly /
 * lifetime ones.
 *
 * Design:
 *   - Lifetime: leaves daeun/seun/wolun/iljin out of the activation
 *     context. Signals settle to layer baseline + tag boosts only — this
 *     is "who you are at the bottom", not "what's hot this month".
 *   - Yearly: includes daeun + seun pillars. Wolun/iljin are dropped so
 *     the year reads as a coherent arc rather than a 365-day diary.
 *   - Monthly: includes everything (daeun + seun + wolun + iljin).
 *     Activation is most differentiated here because monthly pillar
 *     overlap with sajuBasis hanja is what drives signal reweighting.
 */

import type { ActiveTransit } from '../interpreter/types'
import type { ActivationContext, PillarRef } from './signalActivation'
import type { TimingData } from './types'

// ============================================
// Public types
// ============================================

export type ReportPeriodScope = 'lifetime' | 'yearly' | 'monthly'

export interface PeriodContextInput {
  /** Which report period this context is for. */
  period: ReportPeriodScope
  /** Reference date the report is rendered against (ISO YYYY-MM-DD). */
  targetDate: string
  /** Output of buildTimingData / buildAutoDaeunTiming for this date. */
  timingData?: TimingData
  /** Currently-flagged transit cycles for this date. */
  activeTransits?: ActiveTransit[]
}

// ============================================
// Helpers
// ============================================

function pillarFromTimingPart(
  part: { heavenlyStem?: string; earthlyBranch?: string } | undefined
): string | undefined {
  if (!part) return undefined
  const stem = (part.heavenlyStem || '').trim()
  const branch = (part.earthlyBranch || '').trim()
  if (!stem && !branch) return undefined
  return `${stem}${branch}`
}

function daeunRef(timing?: TimingData['daeun'], birthYear?: number): PillarRef | undefined {
  if (!timing) return undefined
  const pillar = pillarFromTimingPart(timing)
  if (!pillar) return undefined
  // Daeun cycles run from startAge to endAge — translate to a YYYY-MM-DD
  // window when we know the user's birth year. Without it the window is
  // open and the activation engine treats the pillar as always in-window.
  let startDate: string | undefined
  let endDate: string | undefined
  if (typeof birthYear === 'number' && Number.isFinite(birthYear)) {
    startDate = `${birthYear + timing.startAge}-01-01`
    endDate = `${birthYear + timing.endAge}-12-31`
  }
  return { pillar, startDate, endDate }
}

function seunRef(timing?: TimingData['seun']): PillarRef | undefined {
  if (!timing) return undefined
  const pillar = pillarFromTimingPart(timing)
  if (!pillar) return undefined
  const year = timing.year
  if (!Number.isFinite(year)) return { pillar }
  return {
    pillar,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  }
}

function wolunRef(
  timing?: TimingData['wolun'],
  fallbackYear?: number
): PillarRef | undefined {
  if (!timing) return undefined
  const pillar = pillarFromTimingPart(timing)
  if (!pillar) return undefined
  const year = fallbackYear
  const month = timing.month
  if (!Number.isFinite(year) || !Number.isFinite(month)) return { pillar }
  const monthStr = String(month).padStart(2, '0')
  // Compute the last day of the month without pulling a date library:
  // creating Date(year, month, 0) returns the last day of `month`.
  const lastDay = new Date(year as number, month as number, 0).getDate()
  return {
    pillar,
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  }
}

function iljinRef(timing?: TimingData['iljin']): PillarRef | undefined {
  if (!timing) return undefined
  const pillar = pillarFromTimingPart(timing)
  if (!pillar) return undefined
  const date = timing.date
  if (!date) return { pillar }
  return { pillar, startDate: date, endDate: date }
}

// ============================================
// Main API
// ============================================

export function buildPeriodActivationContext(
  input: PeriodContextInput,
  options: { birthYear?: number } = {}
): ActivationContext {
  const { period, targetDate, timingData, activeTransits } = input
  const birthYear = options.birthYear

  const ctx: ActivationContext = {
    targetDate,
    activeTransits: activeTransits && activeTransits.length > 0 ? activeTransits : undefined,
  }

  if (period === 'lifetime') {
    // Intentionally drop pillar refs — lifetime activation should be
    // layer baseline + tag boosts, not "what's hot today".
    return ctx
  }

  if (period === 'yearly') {
    ctx.daeun = daeunRef(timingData?.daeun, birthYear)
    ctx.seun = seunRef(timingData?.seun)
    return ctx
  }

  // monthly — include everything
  ctx.daeun = daeunRef(timingData?.daeun, birthYear)
  ctx.seun = seunRef(timingData?.seun)
  ctx.wolun = wolunRef(timingData?.wolun, timingData?.seun?.year)
  ctx.iljin = iljinRef(timingData?.iljin)
  return ctx
}

/**
 * Convenience: ranks signals by activation under the given period context.
 * Returns up to `limit` signals (default unlimited) sorted by descending
 * activation level.
 */
export function selectSignalsForPeriod<T extends { id: string }>(
  signals: T[],
  ctx: ActivationContext,
  rank: (signal: T, ctx: ActivationContext) => number,
  options: { limit?: number; minLevel?: number } = {}
): Array<{ signal: T; level: number }> {
  const ranked = signals
    .map((signal) => ({ signal, level: rank(signal, ctx) }))
    .sort((a, b) => b.level - a.level)
  const filtered =
    typeof options.minLevel === 'number'
      ? ranked.filter((entry) => entry.level >= (options.minLevel as number))
      : ranked
  return typeof options.limit === 'number' ? filtered.slice(0, options.limit) : filtered
}
