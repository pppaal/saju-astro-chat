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
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    keyFn?: (...args: Parameters<T>) => string;
    ttl?: number;
  }
): T {
  const { keyFn, ttl } = options || {};

  return ((...args: Parameters<T>): ReturnType<T> => {
    // Generate cache key
    const cacheKey = keyFn
      ? keyFn(...args)
      : `${fn.name}:${JSON.stringify(args)}`;

    // Check cache
    const cached = calculationCache.get(cacheKey);
    if (cached !== undefined) {
      return cached.value as ReturnType<T>;
    }

    // Calculate and cache
    const result = fn(...args);
    calculationCache.set(cacheKey, { value: result }, { ttl });

    return result;
  }) as T;
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
