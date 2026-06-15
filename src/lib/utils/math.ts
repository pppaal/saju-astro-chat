/**
 * Tiny math helpers that keep getting copy-pasted into scoring modules.
 *
 * The clamp/round primitives the scoring engines work in were
 * defined ten times (clamp01) and nine times (round2) with subtly
 * different behavior — four of the clamp01 copies forgot to handle
 * NaN, so a single Math.max(0, Math.min(1, NaN)) would propagate
 * NaN out and surface as broken scores downstream. Consolidate.
 */

/** Clamp `value` into `[min, max]`. Returns 0 when value is NaN/Infinity. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < min) return min
  if (value > max) return max
  return value
}

/** Clamp into [0, 1]. NaN/Infinity become 0. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

/** Round to one decimal place. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Round to two decimal places. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Round to three decimal places. */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Round a score into the integer range [0, 100]. NaN / undefined / out-
 * of-range inputs collapse to 50 (the neutral midpoint) so a downstream
 * "75% confidence" badge never says "NaN%". Used by the narrative
 * builders and the icp/persona scoring layers, which all kept their own
 * copy of the same clamp-round-fallback pattern.
 */
export function clampScore0to100(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 50
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Same idea on the 1-10 scale the scoring engines use for their
 * layer scores. Fallback midpoint is 5.
 */
export function clampScore1to10(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 5
  return Math.max(1, Math.min(10, Math.round(value)))
}

/** Arithmetic mean. Empty input returns 0 (no NaN leak). */
export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
