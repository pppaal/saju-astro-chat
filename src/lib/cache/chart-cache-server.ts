/**
 * Server-side Chart Data Cache using Redis
 * Replaces sessionStorage with Redis for distributed caching
 *
 * This module provides server-side caching for chart calculations.
 * Frontend will call API routes that use this cache.
 */

import { cacheGet, cacheSet, cacheDel, CacheKeys, CACHE_TTL } from './redis-cache';
import { logger } from '@/lib/logger';

export interface ChartCacheData {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
  timestamp: number;
  birthKey: string;
}

/**
 * Generate unique birth key for caching
 */
function generateBirthKey(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): string {
  return `${birthDate}_${birthTime}_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
}

/**
 * Save chart data to Redis cache
 */
export async function saveChartData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  data: {
    saju?: Record<string, unknown>;
    astro?: Record<string, unknown>;
    advancedAstro?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);

    // Create cache data with timestamp
    const cacheData: ChartCacheData = {
      ...data,
      timestamp: Date.now(),
      birthKey,
    };

    // Store with composite key for direct access
    const cacheKey = CacheKeys.destinyMap(birthDate, birthTime);
    const success = await cacheSet(cacheKey, cacheData, CACHE_TTL.DESTINY_MAP);

    if (success) {
      logger.debug(`[ChartCache] Saved chart data for ${birthKey}`);
    }

    return success;
  } catch (error) {
    logger.error('[ChartCache] Failed to save chart data:', error);
    return false;
  }
}

/**
 * Load chart data from Redis cache
 */
export async function loadChartData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): Promise<{
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
} | null> {
  try {
    const cacheKey = CacheKeys.destinyMap(birthDate, birthTime);
    const cached = await cacheGet<ChartCacheData>(cacheKey);

    if (!cached) {
      return null;
    }

    // Verify birth data matches (security check)
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);
    if (cached.birthKey !== birthKey) {
      logger.warn('[ChartCache] Birth key mismatch, ignoring cache');
      return null;
    }

    // Validate data integrity
    if (!cached.saju && !cached.astro) {
      logger.warn('[ChartCache] Invalid cache data, no saju or astro');
      return null;
    }

    logger.debug(`[ChartCache] Loaded chart data for ${birthKey}`);

    return {
      saju: cached.saju,
      astro: cached.astro,
      advancedAstro: cached.advancedAstro,
    };
  } catch (error) {
    logger.error('[ChartCache] Failed to load chart data:', error);
    return null;
  }
}

/**
 * Check if cached data exists for given birth info
 */
export async function hasCachedData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  const cached = await loadChartData(birthDate, birthTime, latitude, longitude);
  return cached !== null && (!!cached.saju || !!cached.astro);
}

/**
 * Clear chart cache for specific birth info
 */
export async function clearChartCache(
  birthDate: string,
  birthTime: string
): Promise<boolean> {
  try {
    const cacheKey = CacheKeys.destinyMap(birthDate, birthTime);
    const success = await cacheDel(cacheKey);

    if (success) {
      logger.debug(`[ChartCache] Cleared cache for ${birthDate} ${birthTime}`);
    }

    return success;
  } catch (error) {
    logger.error('[ChartCache] Failed to clear cache:', error);
    return false;
  }
}

/**
 * Cache or calculate pattern for chart data
 */
export async function cacheOrCalculateChart<T>(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  calculate: () => Promise<T>,
  dataType: 'saju' | 'astro' | 'advancedAstro'
): Promise<T> {
  // Try to load from cache first
  const cached = await loadChartData(birthDate, birthTime, latitude, longitude);

  if (cached?.[dataType]) {
    logger.debug(`[ChartCache] Cache hit for ${dataType}`);
    return cached[dataType] as T;
  }

  // Calculate
  logger.debug(`[ChartCache] Cache miss for ${dataType}, calculating...`);
  const result = await calculate();

  // Save to cache (fire and forget)
  const dataToSave = {
    ...cached,
    [dataType]: result,
  };

  saveChartData(birthDate, birthTime, latitude, longitude, dataToSave).catch((err) => {
    logger.error('[ChartCache] Background save failed:', err);
  });

  return result;
}
