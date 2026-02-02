/**
 * Unified cache result types
 *
 * Distinguishes between cache miss (normal) and cache error (infrastructure failure).
 * Callers that don't care about the distinction can use cacheGetValue() helper.
 */

/** Result of a cache read operation */
export type CacheResult<T> =
  | { hit: true; data: T }
  | { hit: false; data: null; error?: Error }

/** Result of a cache write operation */
export type CacheWriteResult =
  | { ok: true }
  | { ok: false; error: Error }

/** Extract the data from a CacheResult (returns null on miss or error) */
export function cacheResultValue<T>(result: CacheResult<T>): T | null {
  return result.hit ? result.data : null;
}
