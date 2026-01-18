/**
 * Client-side Chart Data Cache
 * Hybrid approach: Redis via API + sessionStorage fallback
 *
 * This provides a transparent caching layer for the frontend:
 * 1. Try sessionStorage first (instant, local)
 * 2. Try Redis via API (distributed, persistent across devices)
 * 3. Calculate if both miss
 */

'use client';

import { logger } from '@/lib/logger';

const CACHE_KEY_PREFIX = 'destinyChartData_';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const MAX_CACHE_ENTRIES = 10;

export interface ChartCacheData {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
  timestamp: number;
  birthKey: string;
}

/**
 * Generate unique key for birth data
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
 * Get cache key for birth data
 */
function getCacheKey(birthDate: string, birthTime: string): string {
  return `${CACHE_KEY_PREFIX}${birthDate}_${birthTime}`;
}

/**
 * Cleanup expired sessionStorage entries
 */
function cleanupSessionStorage(): void {
  try {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;

      try {
        const data = JSON.parse(sessionStorage.getItem(key) || '{}');
        if (now - data.timestamp > CACHE_DURATION) {
          keysToDelete.push(key);
        }
      } catch {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => sessionStorage.removeItem(key));

    if (keysToDelete.length > 0) {
      logger.debug(`[ChartCache] Cleaned ${keysToDelete.length} expired entries`);
    }
  } catch (error) {
    logger.warn('[ChartCache] Cleanup failed:', error);
  }
}

/**
 * Manage sessionStorage size limit
 */
function manageCacheSize(newKey: string): void {
  try {
    const keys: { key: string; timestamp: number }[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;

      try {
        const data = JSON.parse(sessionStorage.getItem(key) || '{}');
        keys.push({ key, timestamp: data.timestamp || 0 });
      } catch {
        // Ignore invalid entries
      }
    }

    // Sort by timestamp (oldest first)
    keys.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries if exceeding limit
    while (keys.length >= MAX_CACHE_ENTRIES) {
      const oldest = keys.shift();
      if (oldest && oldest.key !== newKey) {
        sessionStorage.removeItem(oldest.key);
      }
    }
  } catch (error) {
    logger.warn('[ChartCache] Size management failed:', error);
  }
}

/**
 * Load from sessionStorage
 */
function loadFromSessionStorage(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): ChartCacheData | null {
  try {
    const key = getCacheKey(birthDate, birthTime);
    const stored = sessionStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const cached: ChartCacheData = JSON.parse(stored);

    // Check expiration
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(key);
      return null;
    }

    // Verify birth data matches
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);
    if (cached.birthKey !== birthKey) {
      return null;
    }

    return cached;
  } catch (error) {
    logger.warn('[ChartCache] SessionStorage load failed:', error);
    return null;
  }
}

/**
 * Save to sessionStorage
 */
function saveToSessionStorage(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  data: Omit<ChartCacheData, 'timestamp' | 'birthKey'>
): void {
  try {
    const key = getCacheKey(birthDate, birthTime);
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);

    const cacheData: ChartCacheData = {
      ...data,
      timestamp: Date.now(),
      birthKey,
    };

    manageCacheSize(key);
    sessionStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    logger.warn('[ChartCache] SessionStorage save failed:', error);
  }
}

/**
 * Load from Redis via API
 */
async function loadFromRedis(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): Promise<ChartCacheData | null> {
  try {
    const params = new URLSearchParams({
      birthDate,
      birthTime,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });

    const response = await fetch(`/api/cache/chart?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data as ChartCacheData;
    }

    return null;
  } catch (error) {
    logger.warn('[ChartCache] Redis load via API failed:', error);
    return null;
  }
}

/**
 * Save to Redis via API
 */
async function saveToRedis(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  data: Omit<ChartCacheData, 'timestamp' | 'birthKey'>
): Promise<boolean> {
  try {
    const response = await fetch('/api/cache/chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        birthDate,
        birthTime,
        latitude,
        longitude,
        data,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    logger.warn('[ChartCache] Redis save via API failed:', error);
    return false;
  }
}

/**
 * Save chart data (dual write to sessionStorage + Redis)
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
): Promise<void> {
  // Always save to sessionStorage first (instant)
  saveToSessionStorage(birthDate, birthTime, latitude, longitude, data);

  // Save to Redis asynchronously (fire and forget)
  saveToRedis(birthDate, birthTime, latitude, longitude, data).catch((err) => {
    logger.warn('[ChartCache] Background Redis save failed:', err);
  });
}

/**
 * Load chart data (try sessionStorage first, then Redis)
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
  // Cleanup old entries
  cleanupSessionStorage();

  // 1. Try sessionStorage first (instant)
  const sessionData = loadFromSessionStorage(birthDate, birthTime, latitude, longitude);
  if (sessionData) {
    logger.debug('[ChartCache] SessionStorage hit');
    return {
      saju: sessionData.saju,
      astro: sessionData.astro,
      advancedAstro: sessionData.advancedAstro,
    };
  }

  // 2. Try Redis via API
  try {
    const redisData = await loadFromRedis(birthDate, birthTime, latitude, longitude);
    if (redisData) {
      logger.debug('[ChartCache] Redis hit');

      // Populate sessionStorage for next time
      saveToSessionStorage(birthDate, birthTime, latitude, longitude, {
        saju: redisData.saju,
        astro: redisData.astro,
        advancedAstro: redisData.advancedAstro,
      });

      return {
        saju: redisData.saju,
        astro: redisData.astro,
        advancedAstro: redisData.advancedAstro,
      };
    }
  } catch (error) {
    logger.warn('[ChartCache] Redis fetch failed, will calculate:', error);
  }

  // 3. Cache miss
  return null;
}

/**
 * Check if cache exists
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
 * Clear chart cache (both sessionStorage and Redis)
 */
export async function clearChartCache(
  birthDate?: string,
  birthTime?: string
): Promise<void> {
  if (birthDate && birthTime) {
    // Clear specific entry
    const key = getCacheKey(birthDate, birthTime);
    sessionStorage.removeItem(key);

    // Clear from Redis via API
    try {
      await fetch('/api/cache/chart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, birthTime }),
      });
    } catch (error) {
      logger.warn('[ChartCache] Redis clear via API failed:', error);
    }
  } else {
    // Clear all
    const keysToDelete: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => sessionStorage.removeItem(key));
  }
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): {
  sessionEntries: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
} {
  let sessionEntries = 0;
  let oldestTimestamp: number | null = null;
  let newestTimestamp: number | null = null;

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith(CACHE_KEY_PREFIX)) continue;

    try {
      const data = JSON.parse(sessionStorage.getItem(key) || '{}');
      const timestamp = data.timestamp;

      if (timestamp) {
        sessionEntries++;
        if (!oldestTimestamp || timestamp < oldestTimestamp) {
          oldestTimestamp = timestamp;
        }
        if (!newestTimestamp || timestamp > newestTimestamp) {
          newestTimestamp = timestamp;
        }
      }
    } catch {
      // Ignore invalid entries
    }
  }

  return { sessionEntries, oldestTimestamp, newestTimestamp };
}
