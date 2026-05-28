/**
 * Tiny math helpers that keep getting copy-pasted into scoring modules.
 *
 * The clamp/round primitives the destiny-matrix engine works in were
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
