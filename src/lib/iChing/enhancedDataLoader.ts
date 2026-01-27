/**
 * Enhanced Hexagram Data Loader
 * Provides dynamic imports for enhanced hexagram data to reduce bundle size
 *
 * This loader splits the large enhancedData.ts file (293KB) into separate chunks
 * that are loaded on-demand, significantly reducing the initial bundle size.
 */

import type { EnhancedHexagramData, EnhancedHexagramDataKo } from './types';

/**
 * Cache for loaded enhanced data to avoid redundant imports
 */
const enhancedDataCache: Record<number, EnhancedHexagramData> = {};
const enhancedDataKoCache: Record<number, EnhancedHexagramDataKo> = {};

/**
 * Get enhanced hexagram data (English) with dynamic import
 *
 * @param hexagramNumber - Hexagram number (1-64)
 * @returns Promise resolving to enhanced hexagram data
 *
 * @example
 * ```ts
 * const data = await getEnhancedHexagramData(1);
 * console.log(data.quickSummary.oneLiner);
 * ```
 */
export async function getEnhancedHexagramData(
  hexagramNumber: number
): Promise<EnhancedHexagramData | null> {
  if (hexagramNumber < 1 || hexagramNumber > 64) {
    console.warn(`Invalid hexagram number: ${hexagramNumber}`);
    return null;
  }

  // Return cached data if available
  if (enhancedDataCache[hexagramNumber]) {
    return enhancedDataCache[hexagramNumber];
  }

  try {
    // Dynamic import - this creates a separate chunk for the enhanced data
    const { enhancedHexagramData } = await import(
      /* webpackChunkName: "iching-enhanced-data" */
      './enhancedData'
    );

    const data = enhancedHexagramData[hexagramNumber];

    if (!data) {
      console.warn(`No enhanced data found for hexagram ${hexagramNumber}`);
      return null;
    }

    // Cache the result
    enhancedDataCache[hexagramNumber] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load enhanced data for hexagram ${hexagramNumber}:`, error);
    return null;
  }
}

/**
 * Get enhanced hexagram data (Korean) with dynamic import
 *
 * @param hexagramNumber - Hexagram number (1-64)
 * @returns Promise resolving to enhanced hexagram data (Korean)
 *
 * @example
 * ```ts
 * const data = await getEnhancedHexagramDataKo(1);
 * console.log(data.quickSummary.oneLiner);
 * ```
 */
export async function getEnhancedHexagramDataKo(
  hexagramNumber: number
): Promise<EnhancedHexagramDataKo | null> {
  if (hexagramNumber < 1 || hexagramNumber > 64) {
    console.warn(`Invalid hexagram number: ${hexagramNumber}`);
    return null;
  }

  // Return cached data if available
  if (enhancedDataKoCache[hexagramNumber]) {
    return enhancedDataKoCache[hexagramNumber];
  }

  try {
    // Dynamic import - this creates a separate chunk for the enhanced data
    const { enhancedHexagramDataKo } = await import(
      /* webpackChunkName: "iching-enhanced-data-ko" */
      './enhancedData'
    );

    const data = enhancedHexagramDataKo[hexagramNumber];

    if (!data) {
      console.warn(`No enhanced Korean data found for hexagram ${hexagramNumber}`);
      return null;
    }

    // Cache the result
    enhancedDataKoCache[hexagramNumber] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load enhanced Korean data for hexagram ${hexagramNumber}:`, error);
    return null;
  }
}

/**
 * Preload enhanced data for multiple hexagrams
 * Useful for prefetching data that will likely be needed soon
 *
 * @param hexagramNumbers - Array of hexagram numbers to preload
 * @param language - Language to preload ('en' | 'ko')
 *
 * @example
 * ```ts
 * // Preload data for hexagrams 1, 2, and 3
 * await preloadEnhancedData([1, 2, 3], 'ko');
 * ```
 */
export async function preloadEnhancedData(
  hexagramNumbers: number[],
  language: 'en' | 'ko' = 'en'
): Promise<void> {
  const loader = language === 'ko' ? getEnhancedHexagramDataKo : getEnhancedHexagramData;

  await Promise.all(
    hexagramNumbers.map(num => loader(num))
  );
}

/**
 * Clear the enhanced data cache
 * Useful for memory management in long-running applications
 */
export function clearEnhancedDataCache(): void {
  Object.keys(enhancedDataCache).forEach(key => {
    delete enhancedDataCache[Number(key)];
  });
  Object.keys(enhancedDataKoCache).forEach(key => {
    delete enhancedDataKoCache[Number(key)];
  });
}
