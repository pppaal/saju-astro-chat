/**
 * Cache Manager for Destiny Map calculations
 * 운명 지도 계산 결과 캐싱 관리
 */

import { logger } from "@/lib/logger";

export interface CacheConfig {
  ttl: number;        // Time to live in milliseconds
  maxSize: number;    // Maximum number of cached items
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000,  // 5 minutes
  maxSize: 50,
};

interface CacheEntry<T> {
  result: T;
  timestamp: number;
}

/**
 * Generic cache manager with TTL and size limits
 */
export class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private enableDebugLogs: boolean;

  constructor(config: Partial<CacheConfig> = {}, enableDebugLogs = false) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.enableDebugLogs = enableDebugLogs;
  }

  /**
   * Get cached item if it exists and is not expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableDebugLogs) {
        logger.debug("[Cache] Miss", { key });
      }
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.config.ttl) {
      this.cache.delete(key);
      if (this.enableDebugLogs) {
        logger.debug("[Cache] Expired", { key, age });
      }
      return null;
    }

    if (this.enableDebugLogs) {
      logger.debug("[Cache] Hit", { key, age });
    }
    return entry.result;
  }

  /**
   * Set cached item, evicting oldest if size limit reached
   */
  set(key: string, value: T): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result: value,
      timestamp: Date.now(),
    });

    if (this.enableDebugLogs) {
      logger.debug("[Cache] Set", { key, size: this.cache.size });
    }
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.enableDebugLogs) {
        logger.debug("[Cache] Evicted", { key: oldestKey });
      }
    }
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (this.enableDebugLogs) {
      logger.debug("[Cache] Cleared", { itemsRemoved: size });
    }
  }

  /**
   * Get current cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0 && this.enableDebugLogs) {
      logger.debug("[Cache] Cleanup", { removed, remaining: this.cache.size });
    }

    return removed;
  }
}

/**
 * Generate cache key for destiny map calculations
 */
export function generateDestinyMapCacheKey(input: {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  gender?: string;
  tz?: string;
}): string {
  const { birthDate, birthTime, latitude, longitude, gender, tz } = input;

  // Format: birthDate|birthTime|lat|lon|gender|tz
  // Exclude user name for privacy and better cache hits
  return [
    birthDate,
    birthTime,
    latitude.toFixed(4),
    longitude.toFixed(4),
    gender || 'male',
    tz || 'auto',
  ].join('|');
}
