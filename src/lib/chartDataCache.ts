/**
 * Chart Data Cache Utility
 * Manages caching of Saju and Astrology calculation results
 */

const CACHE_KEY = "destinyChartData";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export interface ChartCacheData {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
  timestamp: number;
  birthKey: string; // Unique key for birth data
}

/**
 * Generate a unique key for birth data to identify cached charts
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
 * Save chart data to cache
 */
export function saveChartData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  data: {
    saju?: Record<string, unknown>;
    astro?: Record<string, unknown>;
    advancedAstro?: Record<string, unknown>;
  }
): void {
  try {
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);
    const cacheData: ChartCacheData = {
      ...data,
      timestamp: Date.now(),
      birthKey,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("[ChartCache] Failed to save cache:", error);
  }
}

/**
 * Load chart data from cache
 * Returns null if cache is invalid, expired, or doesn't match birth data
 */
export function loadChartData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
} | null {
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (!stored) return null;

    const cached: ChartCacheData = JSON.parse(stored);

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Check if birth data matches
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);
    if (cached.birthKey !== birthKey) {
      // Different birth data - clear cache
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Validate data integrity
    if (!cached.saju && !cached.astro) {
      return null;
    }

    return {
      saju: cached.saju,
      astro: cached.astro,
      advancedAstro: cached.advancedAstro,
    };
  } catch (error) {
    console.warn("[ChartCache] Failed to load cache:", error);
    // Clear corrupted cache
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Clear chart data cache
 */
export function clearChartCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn("[ChartCache] Failed to clear cache:", error);
  }
}

/**
 * Check if cache exists and is valid
 */
export function hasCachedData(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number
): boolean {
  const cached = loadChartData(birthDate, birthTime, latitude, longitude);
  return cached !== null && (!!cached.saju || !!cached.astro);
}
