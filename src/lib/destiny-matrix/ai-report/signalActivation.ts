/**
 * Signal Activation
 *
 * Computes how strongly a NormalizedSignal is "active" at a given target date.
 * This is the foundation for time-aware reports (Lifetime / Yearly / Monthly):
 * the same engine signals get re-weighted per period so prose is genuinely
 * different month-to-month, year-to-year, and not just the same template
 * with the date swapped.
 *
 * Design:
 *   activationFor(signal, ctx) -> { level: 0-100, reasons: [...], isActive }
 *
 *   level is a weighted blend of:
 *     - baseline by signal.layer (foundational signals stay warm even
 *       without time triggers; transit/state signals start cold and need
 *       a current activation to count)
 *     - sajuBasis ↔ current pillar overlap (any hanja stem/branch from
 *       sajuBasis appearing in current daeun/seun/wolun/iljin pillar)
 *     - astroBasis ↔ active transit overlap (planet name from astroBasis
 *       matching a TransitCycle currently flagged in ctx.activeTransits)
 *     - tags carrying state/rule hints from upstream engines
 */

import type { NormalizedSignal } from './signalSynthesizer'
import type { ActiveTransit } from '../interpreter/types'

// ============================================
// Public types
// ============================================

export interface PillarRef {
  /** Pillar string in hanja form when available (e.g. '乙亥', '丙午'). */
  pillar?: string
  /** ISO year+month range this pillar covers (inclusive). */
  startDate?: string
  endDate?: string
}

export interface ActivationContext {
  /** ISO YYYY-MM-DD — date the user is reading the report for. */
  targetDate: string
  daeun?: PillarRef
  seun?: PillarRef
  wolun?: PillarRef
  iljin?: PillarRef
  /** Active transits currently in window for this date (with influence + cycle). */
  activeTransits?: ActiveTransit[]
}

export interface ActivationScore {
  /** 0-100 activation intensity for this signal at the target date. */
  level: number
  /** Human-readable reasons that contributed to the score. */
  reasons: string[]
  /** Convenience: whether the score crosses the active threshold. */
  isActive: boolean
}

export interface ActivationOptions {
  /** Score threshold for `isActive`. Default 60. */
  activeThreshold?: number
}

// ============================================
// Constants
// ============================================

/**
 * Per-layer baseline. Lower layers are foundational/natal so they keep a
 * warm baseline regardless of timing. Higher layers (state / timing /
 * transit) start cold and need a current trigger to register.
 */
const LAYER_BASELINE: Record<number, number> = {
  1: 70,
  2: 65,
  3: 60,
  4: 50,
  5: 45,
  6: 40,
  7: 30,
  8: 25,
  9: 20,
  10: 25,
}

/** Planet names (English) that may appear inside `astroBasis`. */
const PLANET_NAMES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Node',
  'TrueNode',
  'NorthNode',
  'SouthNode',
] as const

/** Maps a planet to the TransitCycle ids that track it. */
const PLANET_CYCLE_HINTS: Record<string, string[]> = {
  Sun: [],
  Moon: [],
  Mercury: ['mercuryRetrograde'],
  Venus: ['venusRetrograde'],
  Mars: ['marsRetrograde'],
  Jupiter: ['jupiterReturn', 'jupiterRetrograde'],
  Saturn: ['saturnReturn', 'saturnRetrograde'],
  Uranus: ['uranusSquare'],
  Neptune: ['neptuneSquare'],
  Pluto: ['plutoTransit'],
  Node: ['nodeReturn', 'eclipse'],
  TrueNode: ['nodeReturn', 'eclipse'],
  NorthNode: ['nodeReturn', 'eclipse'],
  SouthNode: ['nodeReturn', 'eclipse'],
}

const HANJA_PILLAR_CHARS = /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/g

// ============================================
// Helpers
// ============================================

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function dedupeReasons(reasons: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of reasons) {
    if (!r) continue
    if (seen.has(r)) continue
    seen.add(r)
    out.push(r)
  }
  return out
}

function extractPillarChars(pillar?: string): Set<string> {
  if (!pillar) return new Set()
  const matches = pillar.match(HANJA_PILLAR_CHARS) || []
  return new Set(matches)
}

function pillarOverlap(basis: string | undefined, pillar?: string): string[] {
  if (!basis || !pillar) return []
  const inPillar = extractPillarChars(pillar)
  if (inPillar.size === 0) return []
  const matches = basis.match(HANJA_PILLAR_CHARS) || []
  const overlap = new Set<string>()
  for (const ch of matches) {
    if (inPillar.has(ch)) overlap.add(ch)
  }
  return Array.from(overlap)
}

function dateInRange(target: string, start?: string, end?: string): boolean {
  if (!start || !end) return false
  return target >= start && target <= end
}

function planetsInBasis(basis: string | undefined): string[] {
  if (!basis) return []
  const found = new Set<string>()
  for (const planet of PLANET_NAMES) {
    if (basis.includes(planet)) found.add(planet)
  }
  return Array.from(found)
}

function activeTransitCycles(activeTransits: ActiveTransit[] | undefined): Set<string> {
  const set = new Set<string>()
  if (!activeTransits) return set
  for (const t of activeTransits) {
    if (t?.cycle) set.add(t.cycle)
  }
  return set
}

// ============================================
// Main API
// ============================================

export function activationFor(
  signal: NormalizedSignal,
  ctx: ActivationContext,
  options: ActivationOptions = {}
): ActivationScore {
  const threshold = options.activeThreshold ?? 60
  const reasons: string[] = []

  const baseline = LAYER_BASELINE[signal.layer] ?? 30
  let level = baseline
  reasons.push(`레이어 ${signal.layer} 기본 활성도 ${baseline}%`)

  // ---- Saju overlap with current period pillars ----
  const periods: Array<{ name: string; ref?: PillarRef; weight: number }> = [
    { name: '대운', ref: ctx.daeun, weight: 12 },
    { name: '세운', ref: ctx.seun, weight: 18 },
    { name: '월운', ref: ctx.wolun, weight: 22 },
    { name: '일진', ref: ctx.iljin, weight: 18 },
  ]

  for (const { name, ref, weight } of periods) {
    if (!ref?.pillar || !signal.sajuBasis) continue
    // Only count if target date actually falls in this period's window.
    // For lifetime/yearly callers that don't pass a window, fall back to
    // counting the overlap regardless (they rely on the pillar context
    // for the period they're asking about).
    const inWindow =
      ref.startDate && ref.endDate
        ? dateInRange(ctx.targetDate, ref.startDate, ref.endDate)
        : true
    if (!inWindow) continue
    const overlap = pillarOverlap(signal.sajuBasis, ref.pillar)
    if (overlap.length === 0) continue
    const boost = Math.min(weight, overlap.length * (weight / 2))
    level += boost
    reasons.push(`${name}(${ref.pillar})에 ${overlap.join('·')} 활성 +${boost.toFixed(0)}%`)
  }

  // ---- Astro overlap with active transit cycles ----
  const planets = planetsInBasis(signal.astroBasis)
  if (planets.length > 0) {
    const cycles = activeTransitCycles(ctx.activeTransits)
    if (cycles.size > 0) {
      const matched: string[] = []
      for (const planet of planets) {
        const hints = PLANET_CYCLE_HINTS[planet] || []
        if (hints.some((c) => cycles.has(c))) matched.push(planet)
      }
      if (matched.length > 0) {
        const boost = Math.min(25, matched.length * 12)
        level += boost
        reasons.push(`현재 트랜짓에서 ${matched.join('·')} 활성 +${boost}%`)
      }
    }
  }

  // ---- Tag-based hints from upstream state/rule engines ----
  const tags = signal.tags || []
  const tagBoosts: Array<[RegExp, number, string]> = [
    [/^state:opening$/, 15, '국면 진입(opening) +15%'],
    [/^state:active$/, 10, '진행 중(active) +10%'],
    [/^state:peak$/, 18, '정점(peak) +18%'],
    [/^state:closing$/, 8, '마감(closing) +8%'],
    [/^rule:execute$/, 10, '실행 규칙 +10%'],
    [/^rule:verify$/, 6, '검증 규칙 +6%'],
  ]
  for (const [pattern, boost, reason] of tagBoosts) {
    if (tags.some((tag) => pattern.test(tag))) {
      level += boost
      reasons.push(reason)
    }
  }

  // ---- Polarity-based small adjustment (caution should still surface) ----
  if (signal.polarity === 'caution' && level < 50) {
    // A caution signal that didn't get any boost is still worth surfacing —
    // floor it slightly so risks don't drop below useful threshold.
    level = Math.max(level, 35)
  }

  const finalLevel = clamp(Math.round(level))
  return {
    level: finalLevel,
    reasons: dedupeReasons(reasons),
    isActive: finalLevel >= threshold,
  }
}

/**
 * Convenience: rank a list of signals by activation for a given context.
 * Returns the signals annotated with their activation score, sorted from
 * most-active to least-active.
 */
export function rankSignalsByActivation(
  signals: NormalizedSignal[],
  ctx: ActivationContext,
  options: ActivationOptions = {}
): Array<{ signal: NormalizedSignal; activation: ActivationScore }> {
  return signals
    .map((signal) => ({ signal, activation: activationFor(signal, ctx, options) }))
    .sort((a, b) => b.activation.level - a.activation.level)
}

/**
 * Convenience: filter to currently-active signals, optionally capped at N.
 */
export function filterActiveSignals(
  signals: NormalizedSignal[],
  ctx: ActivationContext,
  options: ActivationOptions & { limit?: number } = {}
): Array<{ signal: NormalizedSignal; activation: ActivationScore }> {
  const ranked = rankSignalsByActivation(signals, ctx, options)
  const active = ranked.filter((entry) => entry.activation.isActive)
  return typeof options.limit === 'number' ? active.slice(0, options.limit) : active
}
