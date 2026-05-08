/**
 * cache/index.ts - 사주 캐싱 및 성능 최적화 시스템 통합 exports
 */

// Types re-export
export type {
  SajuResult,
  CacheConfig,
  CacheEntry,
  CacheStats,
  BatchRequest,
  MemoizedFunction,
  LazyLoader,
  ComputationResult,
  PerformanceMetrics,
} from './types';

// LRU Cache
export { LRUCache } from './LRUCache';

// Memoization
export { memoize, memoizeAsync } from './memoize';

// Lazy Loader
export { createLazyLoader } from './lazyLoader';

// Batch Processor
export { BatchProcessor } from './batchProcessor';

// Saju Caches
export {
  sajuCache,
  daeunCache,
  compatibilityCache,
  generateSajuCacheKey,
  generateCompatibilityCacheKey,
  computeWithCache,
  getSajuFromCache,
  setSajuToCache,
  getDaeunFromCache,
  setDaeunToCache,
  getCompatibilityFromCache,
  setCompatibilityToCache,
  getAllCacheStats,
  clearAllCaches,
  cleanupAllCaches,
} from './sajuCaches';

// Performance Monitor
export {
  measurePerformance,
  getPerformanceStats,
  clearPerformanceHistory,
} from './performanceMonitor';
