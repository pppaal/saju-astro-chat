/**
 * Chart Data Cache Utility
 * Manages caching of Saju and Astrology calculation results
 */

const CACHE_KEY_PREFIX = "destinyChartData_";
const CACHE_KEY_INDEX = "destinyChartDataKey";
const LEGACY_CACHE_KEY = "destinyChartData"; // 레거시 호환
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
    const cacheKey = `${CACHE_KEY_PREFIX}${birthDate}_${birthTime}`;
    const cacheData: ChartCacheData = {
      ...data,
      timestamp: Date.now(),
      birthKey,
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    // 현재 활성 캐시 키 저장
    sessionStorage.setItem(CACHE_KEY_INDEX, cacheKey);
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
    // 새로운 키 형식 시도
    const cacheKey = `${CACHE_KEY_PREFIX}${birthDate}_${birthTime}`;
    let stored = sessionStorage.getItem(cacheKey);

    // 레거시 키로 폴백
    if (!stored) {
      stored = sessionStorage.getItem(LEGACY_CACHE_KEY);
    }

    if (!stored) return null;

    const cached: ChartCacheData = JSON.parse(stored);

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(LEGACY_CACHE_KEY);
      return null;
    }

    // Check if birth data matches
    const birthKey = generateBirthKey(birthDate, birthTime, latitude, longitude);
    if (cached.birthKey !== birthKey) {
      // Different birth data - don't use this cache
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
    return null;
  }
}

/**
 * Load the most recent chart data (without birth data validation)
 * Useful for counselor page where we trust the cached data
 */
export function loadCurrentChartData(): {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
  birthDate?: string;
  birthTime?: string;
} | null {
  try {
    // 현재 활성 캐시 키 확인
    const currentKey = sessionStorage.getItem(CACHE_KEY_INDEX);
    let stored = currentKey ? sessionStorage.getItem(currentKey) : null;

    // 레거시 키로 폴백
    if (!stored) {
      stored = sessionStorage.getItem(LEGACY_CACHE_KEY);
    }

    if (!stored) return null;

    const cached = JSON.parse(stored);

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
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
      birthDate: cached.birthDate,
      birthTime: cached.birthTime,
    };
  } catch (error) {
    console.warn("[ChartCache] Failed to load current cache:", error);
    return null;
  }
}

/**
 * Clear chart data cache
 */
export function clearChartCache(): void {
  try {
    // 현재 활성 캐시 키 확인 후 삭제
    const currentKey = sessionStorage.getItem(CACHE_KEY_INDEX);
    if (currentKey) {
      sessionStorage.removeItem(currentKey);
    }
    sessionStorage.removeItem(CACHE_KEY_INDEX);
    sessionStorage.removeItem(LEGACY_CACHE_KEY);
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
