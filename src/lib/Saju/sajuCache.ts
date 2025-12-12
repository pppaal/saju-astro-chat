/**
 * sajuCache.ts - 사주 캐싱 및 성능 최적화 시스템 (1000% 레벨)
 *
 * 사주 계산 결과 캐싱, 메모이제이션, 지연 로딩, 배치 처리
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

// ============================================================================
// 타입 정의
// ============================================================================

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

// ============================================================================
// LRU 캐시 구현
// ============================================================================

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: { hits: number; misses: number; totalAccessTime: number };
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttlMs: 3600000, // 1 hour
      cleanupIntervalMs: 300000, // 5 minutes
      enableCompression: false,
      persistToStorage: false,
      storageKey: 'saju_cache',
      ...config
    };

    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0 };

    // 자동 정리 시작
    this.startCleanup();

    // 저장소에서 복원
    if (this.config.persistToStorage) {
      this.restoreFromStorage();
    }
  }

  /**
   * 캐시에서 값 조회
   */
  get(key: string): T | undefined {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // TTL 체크
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 접근 정보 업데이트
    entry.accessedAt = Date.now();
    entry.accessCount++;

    // LRU: 최근 접근 항목을 끝으로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    this.stats.totalAccessTime += performance.now() - startTime;

    return entry.value;
  }

  /**
   * 캐시에 값 저장
   */
  set(key: string, value: T): void {
    // 크기 제한 체크
    if (this.cache.size >= this.config.maxSize) {
      // LRU: 가장 오래된 항목 제거 (Map의 첫 번째 항목)
      const keys = Array.from(this.cache.keys());
      if (keys.length > 0) {
        this.cache.delete(keys[0]);
      }
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 1,
      size: this.estimateSize(value),
      compressed: false
    };

    this.cache.set(key, entry);

    // 저장소에 저장
    if (this.config.persistToStorage) {
      this.persistToStorage();
    }
  }

  /**
   * 캐시에서 값 삭제
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0 };

    if (this.config.persistToStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * 캐시 존재 여부 확인
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // TTL 체크
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 캐시 통계
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const timestamps = entries.map(e => e.createdAt);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitCount: this.stats.hits,
      missCount: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      averageAccessTime: this.stats.totalAccessTime / (this.stats.hits || 1),
      oldestEntry: Math.min(...timestamps, Date.now()),
      newestEntry: Math.max(...timestamps, 0)
    };
  }

  /**
   * 만료된 항목 정리
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.createdAt > this.config.ttlMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * 자동 정리 시작
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * 정리 중지
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 크기 추정
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 추정
    } catch {
      return 1000; // 기본값
    }
  }

  /**
   * 저장소에 저장
   */
  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (e) {
      // 저장소 용량 초과 등
      console.warn('Cache persist failed:', e);
    }
  }

  /**
   * 저장소에서 복원
   */
  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        const entries: [string, CacheEntry<T>][] = JSON.parse(data);
        const now = Date.now();

        for (const [key, entry] of entries) {
          // TTL이 아직 유효한 항목만 복원
          if (now - entry.createdAt <= this.config.ttlMs) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (e) {
      console.warn('Cache restore failed:', e);
    }
  }
}

// ============================================================================
// 메모이제이션 유틸리티
// ============================================================================

/**
 * 함수 메모이제이션
 */
export function memoize<T extends (...args: never[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>();
  let hits = 0;
  let misses = 0;

  const generateKey = keyGenerator || ((...args: Parameters<T>) => JSON.stringify(args));

  const memoized = function (...args: Parameters<T>): ReturnType<T> {
    const key = generateKey(...args);

    if (cache.has(key)) {
      hits++;
      return cache.get(key) as ReturnType<T>;
    }

    misses++;
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  } as MemoizedFunction<T>;

  memoized.cache = cache;
  memoized.clear = () => {
    cache.clear();
    hits = 0;
    misses = 0;
  };
  memoized.stats = () => ({ hits, misses, size: cache.size });

  return memoized;
}

/**
 * 비동기 함수 메모이제이션
 */
export function memoizeAsync<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T & { cache: Map<string, Awaited<ReturnType<T>>>; clear: () => void } {
  const cache = new Map<string, Promise<Awaited<ReturnType<T>>>>();
  const generateKey = keyGenerator || ((...args: Parameters<T>) => JSON.stringify(args));

  const memoized = async function (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    const key = generateKey(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const resultPromise = fn(...args) as Promise<Awaited<ReturnType<T>>>;
    cache.set(key, resultPromise);

    try {
      return await resultPromise;
    } catch (e) {
      cache.delete(key); // 실패 시 캐시에서 제거
      throw e;
    }
  } as T & { cache: Map<string, Awaited<ReturnType<T>>>; clear: () => void };

  memoized.cache = cache as Map<string, Awaited<ReturnType<T>>>;
  memoized.clear = () => cache.clear();

  return memoized;
}

// ============================================================================
// 지연 로딩
// ============================================================================

/**
 * 지연 로더 생성
 */
export function createLazyLoader<T>(
  loader: () => Promise<T>,
  options: { preloadOnCreate?: boolean; cacheResult?: boolean } = {}
): LazyLoader<T> {
  let value: T | undefined;
  let loading: Promise<T> | undefined;
  let loaded = false;

  const load = async (): Promise<T> => {
    if (loaded && options.cacheResult !== false) {
      return value as T;
    }

    if (loading) {
      return loading;
    }

    loading = loader();

    try {
      value = await loading;
      loaded = true;
      return value;
    } finally {
      loading = undefined;
    }
  };

  if (options.preloadOnCreate) {
    load();
  }

  return {
    get: load,
    isLoaded: () => loaded,
    invalidate: () => {
      loaded = false;
      value = undefined;
    },
    preload: () => { load(); }
  };
}

// ============================================================================
// 배치 처리
// ============================================================================

/**
 * 배치 프로세서
 */
export class BatchProcessor<T, R> {
  private queue: BatchRequest<T, R>[] = [];
  private processing = false;
  private batchSize: number;
  private delayMs: number;
  private processor: (inputs: T[]) => Promise<R[]>;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    processor: (inputs: T[]) => Promise<R[]>,
    options: { batchSize?: number; delayMs?: number } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.delayMs = options.delayMs || 50;
  }

  /**
   * 항목 추가
   */
  add(input: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Math.random().toString(36).substring(7),
        input,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.scheduleProcess();
    });
  }

  /**
   * 처리 스케줄
   */
  private scheduleProcess(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // 배치 크기에 도달하면 즉시 처리
    if (this.queue.length >= this.batchSize) {
      this.process();
      return;
    }

    // 지연 후 처리
    this.timer = setTimeout(() => {
      this.process();
    }, this.delayMs);
  }

  /**
   * 배치 처리
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const inputs = batch.map(b => b.input);
      const results = await this.processor(inputs);

      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve(results[i]);
      }
    } catch (error) {
      for (const request of batch) {
        request.reject(error as Error);
      }
    } finally {
      this.processing = false;

      // 대기 중인 항목이 있으면 계속 처리
      if (this.queue.length > 0) {
        this.scheduleProcess();
      }
    }
  }

  /**
   * 대기열 크기
   */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * 대기열 비우기
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.queue.length === 0) {
        resolve();
        return;
      }

      const checkEmpty = () => {
        if (this.queue.length === 0 && !this.processing) {
          resolve();
        } else {
          setTimeout(checkEmpty, 10);
        }
      };

      this.process().then(checkEmpty);
    });
  }
}

// ============================================================================
// 사주 전용 캐시
// ============================================================================

// 사주 계산 결과 캐시
const sajuCache = new LRUCache<SajuResult>({
  maxSize: 500,
  ttlMs: 86400000, // 24 hours
  persistToStorage: true,
  storageKey: 'saju_results_cache'
});

// 대운 계산 캐시
const daeunCache = new LRUCache<unknown>({
  maxSize: 200,
  ttlMs: 86400000,
  persistToStorage: false,
  storageKey: 'saju_daeun_cache'
});

// 궁합 계산 캐시
const compatibilityCache = new LRUCache<unknown>({
  maxSize: 300,
  ttlMs: 3600000, // 1 hour
  persistToStorage: false,
  storageKey: 'saju_compatibility_cache'
});

/**
 * 사주 캐시 키 생성
 */
export function generateSajuCacheKey(
  birthDate: Date,
  birthHour: number,
  gender: 'male' | 'female',
  isLunar: boolean = false
): string {
  const dateStr = birthDate.toISOString().split('T')[0];
  return `saju:${dateStr}:${birthHour}:${gender}:${isLunar}`;
}

/**
 * 궁합 캐시 키 생성
 */
export function generateCompatibilityCacheKey(
  person1Key: string,
  person2Key: string
): string {
  // 순서에 관계없이 같은 키 생성
  const keys = [person1Key, person2Key].sort();
  return `compatibility:${keys.join(':')}`;
}

/**
 * 캐시된 사주 계산
 */
export async function computeWithCache<T>(
  cacheKey: string,
  cache: LRUCache<T>,
  computeFn: () => T | Promise<T>
): Promise<ComputationResult<T>> {
  const startTime = performance.now();

  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return {
      result: cached,
      fromCache: true,
      computeTimeMs: performance.now() - startTime,
      cacheKey
    };
  }

  // 계산 수행
  const result = await Promise.resolve(computeFn());
  const computeTimeMs = performance.now() - startTime;

  // 캐시에 저장
  cache.set(cacheKey, result);

  return {
    result,
    fromCache: false,
    computeTimeMs,
    cacheKey
  };
}

/**
 * 사주 결과 캐시 조회/저장
 */
export function getSajuFromCache(key: string): SajuResult | undefined {
  return sajuCache.get(key);
}

export function setSajuToCache(key: string, result: SajuResult): void {
  sajuCache.set(key, result);
}

/**
 * 대운 캐시 조회/저장
 */
export function getDaeunFromCache(key: string): unknown | undefined {
  return daeunCache.get(key);
}

export function setDaeunToCache(key: string, result: unknown): void {
  daeunCache.set(key, result);
}

/**
 * 궁합 캐시 조회/저장
 */
export function getCompatibilityFromCache(key: string): unknown | undefined {
  return compatibilityCache.get(key);
}

export function setCompatibilityToCache(key: string, result: unknown): void {
  compatibilityCache.set(key, result);
}

/**
 * 모든 캐시 통계
 */
export function getAllCacheStats(): {
  saju: CacheStats;
  daeun: CacheStats;
  compatibility: CacheStats;
} {
  return {
    saju: sajuCache.getStats(),
    daeun: daeunCache.getStats(),
    compatibility: compatibilityCache.getStats()
  };
}

/**
 * 모든 캐시 정리
 */
export function clearAllCaches(): void {
  sajuCache.clear();
  daeunCache.clear();
  compatibilityCache.clear();
}

/**
 * 만료된 항목 정리
 */
export function cleanupAllCaches(): { saju: number; daeun: number; compatibility: number } {
  return {
    saju: sajuCache.cleanup(),
    daeun: daeunCache.cleanup(),
    compatibility: compatibilityCache.cleanup()
  };
}

// ============================================================================
// 성능 모니터링
// ============================================================================

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  cached: boolean;
  success: boolean;
}

const performanceHistory: PerformanceMetrics[] = [];
const MAX_HISTORY = 1000;

/**
 * 성능 측정 래퍼
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>,
  isCached: boolean = false
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const startTime = performance.now();
  let success = true;
  let result: T;

  try {
    result = await Promise.resolve(fn());
  } catch (e) {
    success = false;
    throw e;
  } finally {
    const endTime = performance.now();
    const metrics: PerformanceMetrics = {
      operation,
      startTime,
      endTime,
      duration: endTime - startTime,
      cached: isCached,
      success
    };

    // 히스토리에 추가
    performanceHistory.push(metrics);
    if (performanceHistory.length > MAX_HISTORY) {
      performanceHistory.shift();
    }
  }

  return { result: result!, metrics: performanceHistory[performanceHistory.length - 1] };
}

/**
 * 성능 통계 조회
 */
export function getPerformanceStats(): {
  totalOperations: number;
  averageDuration: number;
  cacheHitRate: number;
  successRate: number;
  slowestOperation: PerformanceMetrics | null;
  fastestOperation: PerformanceMetrics | null;
} {
  if (performanceHistory.length === 0) {
    return {
      totalOperations: 0,
      averageDuration: 0,
      cacheHitRate: 0,
      successRate: 0,
      slowestOperation: null,
      fastestOperation: null
    };
  }

  const totalDuration = performanceHistory.reduce((sum, m) => sum + m.duration, 0);
  const cachedCount = performanceHistory.filter(m => m.cached).length;
  const successCount = performanceHistory.filter(m => m.success).length;

  const sorted = [...performanceHistory].sort((a, b) => b.duration - a.duration);

  return {
    totalOperations: performanceHistory.length,
    averageDuration: totalDuration / performanceHistory.length,
    cacheHitRate: cachedCount / performanceHistory.length,
    successRate: successCount / performanceHistory.length,
    slowestOperation: sorted[0],
    fastestOperation: sorted[sorted.length - 1]
  };
}

/**
 * 성능 히스토리 초기화
 */
export function clearPerformanceHistory(): void {
  performanceHistory.length = 0;
}

// ============================================================================
// 내보내기
// ============================================================================

export {
  sajuCache,
  daeunCache,
  compatibilityCache
};
