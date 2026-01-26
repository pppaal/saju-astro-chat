// src/lib/destiny-matrix/cache.ts
// Destiny Fusion Matrix™ - Caching System

import { LRUCache } from 'lru-cache';
import type {
  MatrixCalculationInput,
  DestinyFusionMatrixComputed,
} from './types';
import { logger } from '@/lib/logger';

// ===========================
// Cache Configuration
// ===========================

export interface MatrixCacheConfig {
  max: number; // Maximum number of entries
  ttl: number; // Time to live in milliseconds
  updateAgeOnGet?: boolean;
  allowStale?: boolean;
}

const DEFAULT_CACHE_CONFIG: MatrixCacheConfig = {
  max: 100, // Store up to 100 matrix calculations
  ttl: 1000 * 60 * 30, // 30 minutes
  updateAgeOnGet: true,
  allowStale: false,
};

// ===========================
// LRU Cache Instance
// ===========================

let matrixCache: LRUCache<string, DestinyFusionMatrixComputed> | null = null;

/**
 * Initialize matrix cache with custom config
 */
export function initMatrixCache(config: Partial<MatrixCacheConfig> = {}) {
  const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config };

  matrixCache = new LRUCache<string, DestinyFusionMatrixComputed>({
    max: finalConfig.max,
    ttl: finalConfig.ttl,
    updateAgeOnGet: finalConfig.updateAgeOnGet,
    allowStale: finalConfig.allowStale,
    // Track cache hits/misses
    dispose: (value, key, reason) => {
      if (reason === 'evict') {
        logger.debug(`Matrix cache evicted: ${key.substring(0, 16)}...`);
      }
    },
  });

  logger.info('Matrix cache initialized', {
    max: finalConfig.max,
    ttlMinutes: finalConfig.ttl / 1000 / 60,
  });

  return matrixCache;
}

/**
 * Get cache instance (lazy initialization)
 */
export function getMatrixCache(): LRUCache<string, DestinyFusionMatrixComputed> {
  if (!matrixCache) {
    matrixCache = initMatrixCache();
  }
  return matrixCache;
}

// ===========================
// Hash Generation
// ===========================

/**
 * Generate deterministic hash from MatrixCalculationInput
 * Uses sorted keys to ensure same input = same hash
 */
export function hashMatrixInput(input: MatrixCalculationInput): string {
  try {
    // Create a normalized copy
    const normalized = {
      // Required fields
      dayMasterElement: input.dayMasterElement,
      pillarElements: input.pillarElements.sort(),

      // Sort object keys for deterministic hashing
      sibsinDistribution: sortObjectKeys(input.sibsinDistribution),
      twelveStages: sortObjectKeys(input.twelveStages),

      // Arrays
      relations: input.relations.map(r => `${r.kind}:${r.detail || ''}`).sort(),

      // Optional fields (only if defined)
      ...(input.dominantWesternElement && { dominantWesternElement: input.dominantWesternElement }),
      ...(input.planetHouses && { planetHouses: sortObjectKeys(input.planetHouses) }),
      ...(input.planetSigns && { planetSigns: sortObjectKeys(input.planetSigns) }),

      // Aspects
      aspects: (input.aspects || [])
        .map(a => `${a.planet1}-${a.planet2}:${a.type}`)
        .sort(),

      // Optional arrays
      ...(input.activeTransits && { activeTransits: [...input.activeTransits].sort() }),
      ...(input.shinsalList && { shinsalList: [...input.shinsalList].sort() }),

      // Single values
      ...(input.currentDaeunElement && { currentDaeunElement: input.currentDaeunElement }),
      ...(input.currentSaeunElement && { currentSaeunElement: input.currentSaeunElement }),
      ...(input.geokguk && { geokguk: input.geokguk }),
      ...(input.yongsin && { yongsin: input.yongsin }),

      // Layer 9 & 10
      ...(input.asteroidHouses && { asteroidHouses: sortObjectKeys(input.asteroidHouses) }),
      ...(input.extraPointSigns && { extraPointSigns: sortObjectKeys(input.extraPointSigns) }),

      // Lang doesn't affect calculation, exclude from hash
    };

    // Convert to JSON string (deterministic due to sorted keys)
    const jsonString = JSON.stringify(normalized);

    // Simple hash function (FNV-1a)
    return fnv1aHash(jsonString);
  } catch (error) {
    logger.error('Failed to hash matrix input:', error);
    // Return timestamp-based hash as fallback (no caching)
    return `fallback_${Date.now()}_${Math.random()}`;
  }
}

/**
 * Sort object keys for deterministic hashing
 */
function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {return obj;}

  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});

  return sorted as T;
}

/**
 * FNV-1a hash algorithm (fast, good distribution)
 */
function fnv1aHash(str: string): string {
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  // Convert to positive 32-bit integer and then to hex
  return (hash >>> 0).toString(36); // Base36 for shorter strings
}

// ===========================
// Cache Operations
// ===========================

/**
 * Get cached matrix result
 */
export function getCachedMatrix(
  input: MatrixCalculationInput
): DestinyFusionMatrixComputed | undefined {
  const cache = getMatrixCache();
  const key = hashMatrixInput(input);

  const result = cache.get(key);

  if (result) {
    logger.debug('Matrix cache hit', { key: key.substring(0, 16) });
  } else {
    logger.debug('Matrix cache miss', { key: key.substring(0, 16) });
  }

  return result;
}

/**
 * Set cached matrix result
 */
export function setCachedMatrix(
  input: MatrixCalculationInput,
  result: DestinyFusionMatrixComputed
): void {
  const cache = getMatrixCache();
  const key = hashMatrixInput(input);

  cache.set(key, result);

  logger.debug('Matrix cached', {
    key: key.substring(0, 16),
    size: cache.size,
    max: cache.max,
  });
}

/**
 * Clear entire matrix cache
 */
export function clearMatrixCache(): void {
  const cache = getMatrixCache();
  const size = cache.size;
  cache.clear();

  logger.info('Matrix cache cleared', { entriesRemoved: size });
}

/**
 * Extended cache type with optional hit tracking
 */
interface CacheWithStats extends LRUCache<string, DestinyFusionMatrixComputed> {
  hits?: number;
  misses?: number;
}

/**
 * Get cache statistics
 */
export function getMatrixCacheStats() {
  const cache = getMatrixCache() as CacheWithStats;

  const stats: {
    size: number;
    max: number;
    calculatedSize: number;
    hits?: number;
    misses?: number;
    hitRate?: number;
  } = {
    size: cache.size,
    max: cache.max,
    calculatedSize: cache.calculatedSize || 0,
  };

  // Add hit rate if tracking is available
  if (cache.hits !== undefined && cache.misses !== undefined) {
    stats.hits = cache.hits;
    stats.misses = cache.misses;
    const total = cache.hits + cache.misses;
    stats.hitRate = total > 0 ? cache.hits / total : 0;
  }

  return stats;
}

/**
 * Check if caching is enabled
 */
export function isCachingEnabled(): boolean {
  return matrixCache !== null;
}

/**
 * Disable caching (for testing)
 */
export function disableCache(): void {
  if (matrixCache) {
    clearMatrixCache();
    matrixCache = null;
    logger.info('Matrix cache disabled');
  }
}

// ===========================
// Cache Warmup (Optional)
// ===========================

/**
 * Pre-warm cache with common inputs
 * Useful for production deployment
 */
export async function warmupMatrixCache(
  commonInputs: MatrixCalculationInput[],
  calculateFn: (input: MatrixCalculationInput) => DestinyFusionMatrixComputed
): Promise<number> {
  logger.info('Starting matrix cache warmup', { count: commonInputs.length });

  let warmed = 0;

  for (const input of commonInputs) {
    try {
      const result = calculateFn(input);
      setCachedMatrix(input, result);
      warmed++;
    } catch (error) {
      logger.error('Failed to warmup cache entry:', error);
    }
  }

  logger.info('Matrix cache warmup completed', {
    warmed,
    total: commonInputs.length,
    cacheSize: getMatrixCache().size,
  });

  return warmed;
}

// ===========================
// Exports
// ===========================

export default {
  initMatrixCache,
  getMatrixCache,
  hashMatrixInput,
  getCachedMatrix,
  setCachedMatrix,
  clearMatrixCache,
  getMatrixCacheStats,
  isCachingEnabled,
  disableCache,
  warmupMatrixCache,
};
