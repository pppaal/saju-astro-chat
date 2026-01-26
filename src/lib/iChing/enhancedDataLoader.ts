/**
 * Lazy loader for enhanced hexagram data
 * Loads data on-demand from JSON chunks to reduce initial bundle size
 *
 * Bundle optimization: Splits 293KB file into 8 chunks of ~30-40KB each
 * Only the needed chunk is loaded when a hexagram is requested
 */

import type { EnhancedHexagramData, EnhancedHexagramDataKo } from './types';

// Cache loaded chunks to avoid re-fetching
const cache: {
  en: Map<number, Record<number, EnhancedHexagramData>>;
  ko: Map<number, Record<number, EnhancedHexagramDataKo>>;
} = {
  en: new Map(),
  ko: new Map()
};

// Index of chunk ranges (loaded lazily)
let indexData: {
  totalHexagrams: number;
  chunkSize: number;
  chunks: Array<{ start: number; end: number; enFile: string; koFile: string }>;
} | null = null;

/**
 * Load the index file (only once)
 */
async function loadIndex() {
  if (indexData) return indexData;

  try {
    const response = await fetch('/data/iching/index.json');
    if (!response.ok) throw new Error('Failed to load index');
    indexData = await response.json();
    return indexData;
  } catch (error) {
    console.error('Failed to load iChing data index:', error);
    throw error;
  }
}

/**
 * Find which chunk contains the given hexagram number
 */
function findChunkForHexagram(hexagramNumber: number): { start: number; end: number } | null {
  if (!indexData) return null;

  for (const chunk of indexData.chunks) {
    if (hexagramNumber >= chunk.start && hexagramNumber <= chunk.end) {
      return chunk;
    }
  }

  return null;
}

/**
 * Calculate chunk ID from hexagram number
 */
function getChunkId(hexagramNumber: number): number {
  return Math.floor((hexagramNumber - 1) / 8);
}

/**
 * Load a specific chunk of English data
 */
async function loadEnChunk(chunkStart: number, chunkEnd: number): Promise<Record<number, EnhancedHexagramData>> {
  const chunkId = getChunkId(chunkStart);

  // Check cache first
  if (cache.en.has(chunkId)) {
    return cache.en.get(chunkId)!;
  }

  try {
    const filename = `enhanced-data-en-${chunkStart}-${chunkEnd}.json`;
    const response = await fetch(`/data/iching/${filename}`);

    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }

    const data = await response.json();
    cache.en.set(chunkId, data);
    return data;
  } catch (error) {
    console.error(`Failed to load English chunk ${chunkStart}-${chunkEnd}:`, error);
    throw error;
  }
}

/**
 * Load a specific chunk of Korean data
 */
async function loadKoChunk(chunkStart: number, chunkEnd: number): Promise<Record<number, EnhancedHexagramDataKo>> {
  const chunkId = getChunkId(chunkStart);

  // Check cache first
  if (cache.ko.has(chunkId)) {
    return cache.ko.get(chunkId)!;
  }

  try {
    const filename = `enhanced-data-ko-${chunkStart}-${chunkEnd}.json`;
    const response = await fetch(`/data/iching/${filename}`);

    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }

    const data = await response.json();
    cache.ko.set(chunkId, data);
    return data;
  } catch (error) {
    console.error(`Failed to load Korean chunk ${chunkStart}-${chunkEnd}:`, error);
    throw error;
  }
}

/**
 * Get enhanced data for a specific hexagram (English)
 * Loads the chunk on-demand if not already cached
 */
export async function getEnhancedHexagramData(
  hexagramNumber: number
): Promise<EnhancedHexagramData | null> {
  if (hexagramNumber < 1 || hexagramNumber > 64) {
    console.warn(`Invalid hexagram number: ${hexagramNumber}`);
    return null;
  }

  try {
    // Load index if not already loaded
    await loadIndex();

    // Find the chunk containing this hexagram
    const chunk = findChunkForHexagram(hexagramNumber);
    if (!chunk) {
      console.error(`No chunk found for hexagram ${hexagramNumber}`);
      return null;
    }

    // Load the chunk
    const data = await loadEnChunk(chunk.start, chunk.end);

    // Return the specific hexagram data
    return data[hexagramNumber] || null;
  } catch (error) {
    console.error(`Failed to get enhanced data for hexagram ${hexagramNumber}:`, error);
    return null;
  }
}

/**
 * Get enhanced data for a specific hexagram (Korean)
 * Loads the chunk on-demand if not already cached
 */
export async function getEnhancedHexagramDataKo(
  hexagramNumber: number
): Promise<EnhancedHexagramDataKo | null> {
  if (hexagramNumber < 1 || hexagramNumber > 64) {
    console.warn(`Invalid hexagram number: ${hexagramNumber}`);
    return null;
  }

  try {
    // Load index if not already loaded
    await loadIndex();

    // Find the chunk containing this hexagram
    const chunk = findChunkForHexagram(hexagramNumber);
    if (!chunk) {
      console.error(`No chunk found for hexagram ${hexagramNumber}`);
      return null;
    }

    // Load the chunk
    const data = await loadKoChunk(chunk.start, chunk.end);

    // Return the specific hexagram data
    return data[hexagramNumber] || null;
  } catch (error) {
    console.error(`Failed to get Korean enhanced data for hexagram ${hexagramNumber}:`, error);
    return null;
  }
}

/**
 * Preload a range of hexagrams (for performance optimization)
 * Useful when you know multiple hexagrams will be needed
 */
export async function preloadHexagramRange(
  start: number,
  end: number,
  language: 'en' | 'ko' | 'both' = 'both'
): Promise<void> {
  await loadIndex();

  const chunks = new Set<{ start: number; end: number }>();

  // Find all chunks needed for this range
  for (let i = start; i <= end; i++) {
    const chunk = findChunkForHexagram(i);
    if (chunk) {
      chunks.add(chunk);
    }
  }

  // Load all chunks in parallel
  const promises: Promise<any>[] = [];

  for (const chunk of chunks) {
    if (language === 'en' || language === 'both') {
      promises.push(loadEnChunk(chunk.start, chunk.end));
    }
    if (language === 'ko' || language === 'both') {
      promises.push(loadKoChunk(chunk.start, chunk.end));
    }
  }

  await Promise.all(promises);
}

/**
 * Clear the cache (useful for memory management)
 */
export function clearEnhancedDataCache(): void {
  cache.en.clear();
  cache.ko.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  return {
    enChunksLoaded: cache.en.size,
    koChunksLoaded: cache.ko.size,
    totalChunksLoaded: cache.en.size + cache.ko.size
  };
}
