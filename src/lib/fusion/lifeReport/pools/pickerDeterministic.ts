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

/**
 * Append a pool-selected variation to an existing paragraph string in
 * a typographically clean way:
 *
 *   - Trims trailing whitespace on the host paragraph.
 *   - Adds a period if the host did not already end in '.', '!', or '?'.
 *   - Inserts a single space between the two pieces.
 *   - Trims the variation itself and ensures it ends with a period.
 *   - Returns the host unchanged when the variation is null/undefined/empty.
 *
 * Used by domain builders to glue 5차 자연화 variation pools onto
 * generated paragraphs without the marker double-space / no-period
 * artefacts that the 4차 paragraph() helper introduced.
 */
export function appendToPara(
  paraKo: string,
  addKo: string | null | undefined,
): string {
  if (!addKo) return paraKo
  const add = addKo.trim()
  if (add.length === 0) return paraKo
  const host = paraKo.trimEnd()
  if (host.length === 0) {
    return /[.!?]$/.test(add) ? add : `${add}.`
  }
  const hostEnder = /[.!?]$/.test(host) ? '' : '.'
  const tail = /[.!?]$/.test(add) ? add : `${add}.`
  return `${host}${hostEnder} ${tail}`
}
