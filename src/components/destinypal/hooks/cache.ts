/**
 * @file cache.ts
 * In-memory cache + de-duped in-flight registry for destinypal hooks.
 *
 * Why both? When two components mount in the same tick with the same key,
 * we want them to share a single fetch — not race two identical requests.
 * That's what the `inflight` map gives us. The `store` map is the post-
 * fetch result cache (lives for the page session; cleared on refresh).
 *
 * Why not SWR? The brief says "SWR or fetch". The rest of the codebase
 * uses raw fetch + per-hook useState (see useDateDetail.ts). Staying with
 * that pattern keeps the bundle slim and avoids a dependency just for
 * this layer. The envelope shape (data/isLoading/error) still mirrors
 * SWR so a future migration is a drop-in.
 *
 * TTL: cache entries live for `DEFAULT_TTL_MS` (5 min). Calendar data
 * shifts at the day boundary but birth chart never shifts; we use a
 * conservative 5min to balance freshness vs. tab-switch UX. `refetch()`
 * always bypasses cache.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  value: T
  ts: number
}

// Module-scoped — survives navigation between routes within the same SPA
// session (but not full reloads). Intentionally not persisted to
// localStorage; DestinyMatrixPlannerClient already does that for the
// hot path, and persisting raw payloads here would compete with it.
const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

/**
 * Read from cache; returns undefined if missing or expired.
 */
export function readCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | undefined {
  const hit = store.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.ts > ttlMs) {
    store.delete(key)
    return undefined
  }
  return hit.value as T
}

export function writeCache<T>(key: string, value: T): void {
  store.set(key, { value, ts: Date.now() })
}

/**
 * Deduplicate concurrent fetches by key. If a fetch with the same key
 * is already in flight, return its promise rather than starting a new one.
 *
 * The supplied `fetcher` runs at most once per (key, in-flight window).
 */
export async function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const p = fetcher().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, p)
  return p
}

/**
 * Clear specific cache key (or whole cache if no key passed).
 * Used by `refetch()` to force a fresh round-trip.
 */
export function invalidate(key?: string): void {
  if (key === undefined) {
    store.clear()
    inflight.clear()
    return
  }
  store.delete(key)
  inflight.delete(key)
}

// ─────────────────────────────────────────────────────────────────────
// Key builders — every hook uses one of these so cache keys are stable.
// Stems off the same fields BirthInfo cache keys use (see
// DestinyMatrixPlannerClient.cacheKey) so we get the same hit rate.
// ─────────────────────────────────────────────────────────────────────

export interface BirthKeyFields {
  birthDate: string
  birthTime?: string
  birthPlace?: string
  gender?: string
  locale?: string
}

function birthSegment(b: BirthKeyFields): string {
  return [
    b.birthDate,
    b.birthTime ?? '',
    b.birthPlace ?? '',
    b.gender ?? '',
    b.locale ?? '',
  ].join('|')
}

export function natalKey(b: BirthKeyFields): string {
  return `dp:natal:${birthSegment(b)}`
}

export function lifetimeKey(b: BirthKeyFields): string {
  // Lifetime === natal context for now (Life tier IS the chart).
  // Separate key prefix so future Lifetime-specific enrichment doesn't
  // collide with the bare natal cache.
  return `dp:life:${birthSegment(b)}`
}

export function decadeKey(b: BirthKeyFields, year: number): string {
  return `dp:decade:${birthSegment(b)}:${year}`
}

export function yearKey(b: BirthKeyFields, year: number): string {
  return `dp:year:${birthSegment(b)}:${year}`
}

export function monthKey(b: BirthKeyFields, year: number, month: number): string {
  return `dp:month:${birthSegment(b)}:${year}-${String(month).padStart(2, '0')}`
}

export function dayKey(b: BirthKeyFields, date: string): string {
  return `dp:day:${birthSegment(b)}:${date}`
}
