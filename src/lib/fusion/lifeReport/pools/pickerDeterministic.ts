// src/lib/fusion/lifeReport/pools/pickerDeterministic.ts
//
// Deterministic variation picker.
//
// Same seedKeys -> same hash -> same variation. Different chart inputs
// produce different seedKeys, so two different sajus naturally land on
// different variations even though the picker itself is 100% pure.
//
// Used by every variations pool in this folder so the LifeReport stays
// reproducible (same input -> same output) while shedding the old
// fixed-string narrative.

/**
 * Pick one variation from `pool` deterministically based on `seedKeys`.
 *
 * The hash is the classic 32-bit djb2-style mix used widely across the
 * codebase — it is intentionally simple and stable across Node/browsers.
 *
 * - Empty pool returns `undefined` (callers should treat that as "no
 *   variation available" and fall back to their default sentence).
 * - Single-element pool short-circuits and returns that element.
 */
export function pickVariation<T>(
  pool: readonly T[] | undefined,
  seedKeys: ReadonlyArray<string | number | undefined | null>,
): T | undefined {
  if (!pool || pool.length === 0) return undefined
  if (pool.length === 1) return pool[0]

  let hash = 0
  for (const raw of seedKeys) {
    if (raw === undefined || raw === null) continue
    const k = String(raw)
    for (let i = 0; i < k.length; i++) {
      hash = (hash << 5) - hash + k.charCodeAt(i)
      hash |= 0 // force 32-bit
    }
  }
  const idx = Math.abs(hash) % pool.length
  return pool[idx]
}

/**
 * Convenience helper: pick a variation and fall back to the supplied
 * default when the pool is empty or yields undefined. Keeps the call
 * site to a single line.
 */
export function pickVariationOr<T>(
  pool: readonly T[] | undefined,
  seedKeys: ReadonlyArray<string | number | undefined | null>,
  fallback: T,
): T {
  return pickVariation(pool, seedKeys) ?? fallback
}
