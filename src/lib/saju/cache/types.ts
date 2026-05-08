/**
 * cache/types.ts - 캐시 관련 타입 정의
 */

// 간소화된 사주 결과 인터페이스 (이 모듈 내부용)
interface SimplePillar {
  stem: string;
  branch: string;
}

interface SimpleFourPillars {
  year: SimplePillar;
  month: SimplePillar;
  day: SimplePillar;
  hour: SimplePillar;
}

export interface SajuResult {
  fourPillars: SimpleFourPillars;
  dayMaster?: string;
  [key: string]: unknown;
}

export interface CacheConfig {
  maxSize: number;
  ttlMs: number; // Time to live in milliseconds
  cleanupIntervalMs: number;
  enableCompression: boolean;
  persistToStorage: boolean;
  storageKey: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  size: number;
  compressed: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  averageAccessTime: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface BatchRequest<T, R> {
  id: string;
  input: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export interface MemoizedFunction<T extends (...args: never[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>;
  cache: Map<string, ReturnType<T>>;
  clear: () => void;
  stats: () => { hits: number; misses: number; size: number };
}

export interface LazyLoader<T> {
  get: () => Promise<T>;
  isLoaded: () => boolean;
  invalidate: () => void;
  preload: () => void;
}

export interface ComputationResult<T> {
  result: T;
  fromCache: boolean;
  computeTimeMs: number;
  cacheKey?: string;
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  cached: boolean;
  success: boolean;
}
