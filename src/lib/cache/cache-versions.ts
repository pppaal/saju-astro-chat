/**
 * Cache Version Management
 *
 * Increment versions when cache logic changes to auto-invalidate old entries.
 * This prevents serving stale data after algorithm updates.
 *
 * Version History:
 * - v1: Initial implementation
 * - v2: [Update this when incrementing]
 */

export const CACHE_VERSIONS = {
  // Saju (사주) analysis cache
  SAJU_BASIC: 1,
  SAJU_DETAILED: 1,
  SAJU_FULL: 1,

  // Tarot reading cache
  TAROT_ONE_CARD: 1,
  TAROT_THREE_CARD: 1,
  TAROT_SPREAD: 1,

  // Compatibility analysis cache
  COMPATIBILITY: 1,
  COMPATIBILITY_GROUP: 1,

  // Astrology cache
  ASTROLOGY_CHART: 1,
  ASTROLOGY_TRANSITS: 1,

  // User data cache
  USER_PROFILE: 1,
  USER_PREMIUM: 1,

  // Daily fortune cache
  DAILY_FORTUNE: 1,
} as const

/**
 * Get cache key with version
 *
 * @example
 * const key = getCacheKey('saju', { userId: '123', date: '2024-01-01' }, CACHE_VERSIONS.SAJU_BASIC)
 * // Result: "saju:v1:date:2024-01-01|userId:123"
 */
export function getCacheKey(
  prefix: string,
  params: Record<string, unknown>,
  version: number
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join('|');
  return `${prefix}:v${version}:${sorted}`
}
