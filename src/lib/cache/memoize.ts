/**
 * Performance optimization utilities
 * Memoization and caching helpers
 */

import { LRUCache } from 'lru-cache';

// Wrapper type to satisfy LRUCache constraints (value must extend {})
type CacheValue<T = unknown> = { value: T };

// In-memory LRU cache for frequently accessed calculations
const calculationCache = new LRUCache<string, CacheValue>({
  max: 500, // Maximum 500 entries
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true,
});

/**
 * Memoize function with LRU cache
 * Perfect for expensive calculations like grading, saju, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic memoization requires flexible function signature
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options?: {
    keyFn?: (...args: TArgs) => string;
    ttl?: number;
  }
): (...args: TArgs) => TReturn {
  const { keyFn, ttl } = options || {};

  return (...args: TArgs): TReturn => {
    // Generate cache key
    const cacheKey = keyFn
      ? keyFn(...args)
      : `${fn.name}:${JSON.stringify(args)}`;

    // Check cache
    const cached = calculationCache.get(cacheKey);
    if (cached !== undefined) {
      return cached.value as TReturn;
    }

    // Calculate and cache
    const result = fn(...args);
    calculationCache.set(cacheKey, { value: result }, { ttl });

    return result;
  };
}

/**
 * Clear cache for specific function or all
 */
export function clearCache(pattern?: string) {
  if (!pattern) {
    calculationCache.clear();
    return;
  }

  // Clear keys matching pattern
  for (const key of calculationCache.keys()) {
    if (key.includes(pattern)) {
      calculationCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: calculationCache.size,
    max: calculationCache.max,
    calculatedSize: calculationCache.calculatedSize,
  };
}
