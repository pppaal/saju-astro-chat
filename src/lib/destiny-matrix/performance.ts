// src/lib/destiny-matrix/performance.ts
// Destiny Fusion Matrix™ - Performance Optimization
// 메모이제이션, 캐싱, 성능 최적화

// ===========================
// LRU 캐시 구현
// ===========================

export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // LRU: 접근 시 맨 뒤로 이동
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // 이미 있으면 삭제 후 재삽입 (LRU 순서 유지)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 캐시 용량 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
    };
  }
}

// ===========================
// 메모이제이션 데코레이터
// ===========================

/**
 * 간단한 메모이제이션 함수
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options?: {
    maxSize?: number;
    keyGenerator?: (...args: TArgs) => string;
    ttl?: number; // Time to live in ms
  }
): (...args: TArgs) => TReturn {
  const cache = new LRUCache<string, { value: TReturn; timestamp: number }>(
    options?.maxSize || 100
  );

  const keyGen = options?.keyGenerator || ((...args: TArgs) => JSON.stringify(args));
  const ttl = options?.ttl || Infinity;

  return (...args: TArgs): TReturn => {
    const key = keyGen(...args);
    const cached = cache.get(key);

    // 캐시 히트 및 TTL 유효
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    // 캐시 미스 - 계산 후 저장
    const result = fn(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

/**
 * 비동기 메모이제이션
 */
export function memoizeAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: {
    maxSize?: number;
    keyGenerator?: (...args: TArgs) => string;
    ttl?: number;
    pendingMaxSize?: number; // pending Map 최대 크기
    pendingTimeoutMs?: number; // pending 요청 타임아웃
  }
): (...args: TArgs) => Promise<TReturn> {
  const cache = new LRUCache<string, { value: TReturn; timestamp: number }>(
    options?.maxSize || 100
  );
  const pending = new Map<string, { promise: Promise<TReturn>; timestamp: number }>();
  const pendingMaxSize = options?.pendingMaxSize || 100;
  const pendingTimeoutMs = options?.pendingTimeoutMs || 30000; // 30초 기본 타임아웃

  const keyGen = options?.keyGenerator || ((...args: TArgs) => JSON.stringify(args));
  const ttl = options?.ttl || Infinity;

  // pending Map 정리 함수 - 오래된 pending 요청 제거
  const cleanupPending = () => {
    const now = Date.now();
    for (const [key, entry] of pending.entries()) {
      if (now - entry.timestamp > pendingTimeoutMs) {
        pending.delete(key);
      }
    }
  };

  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyGen(...args);
    const cached = cache.get(key);

    // 캐시 히트 및 TTL 유효
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    // 이미 진행 중인 요청이 있으면 대기 (타임아웃 체크)
    const pendingEntry = pending.get(key);
    if (pendingEntry) {
      if (Date.now() - pendingEntry.timestamp < pendingTimeoutMs) {
        return pendingEntry.promise;
      } else {
        // 타임아웃된 pending 제거
        pending.delete(key);
      }
    }

    // pending Map 크기 제한 - 초과 시 오래된 항목 정리
    if (pending.size >= pendingMaxSize) {
      cleanupPending();
      // 정리 후에도 초과하면 가장 오래된 항목 제거
      if (pending.size >= pendingMaxSize) {
        const firstKey = pending.keys().next().value;
        if (firstKey !== undefined) {
          pending.delete(firstKey);
        }
      }
    }

    // 새 요청 시작
    const promise = fn(...args).then(result => {
      cache.set(key, { value: result, timestamp: Date.now() });
      pending.delete(key);
      return result;
    }).catch(error => {
      pending.delete(key);
      throw error;
    });

    pending.set(key, { promise, timestamp: Date.now() });
    return promise;
  };
}

// ===========================
// 입력 해시 생성
// ===========================

/**
 * MatrixCalculationInput을 해시 키로 변환
 */
export function generateInputHash(input: unknown): string {
  // 안정적인 해시를 위해 키 정렬
  const normalized = JSON.stringify(input, Object.keys(input as object).sort());
  return simpleHash(normalized);
}

/**
 * 간단한 해시 함수 (djb2)
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ===========================
// 글로벌 매트릭스 캐시
// ===========================

interface CachedMatrixResult {
  matrix: unknown;
  report?: unknown;
  timestamp: number;
}

class MatrixCache {
  private cache: LRUCache<string, CachedMatrixResult>;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 50, defaultTTL: number = 5 * 60 * 1000) { // 5분
    this.cache = new LRUCache(maxSize);
    this.defaultTTL = defaultTTL;
  }

  /**
   * 캐시에서 매트릭스 가져오기
   */
  getMatrix(inputHash: string): unknown | null {
    const cached = this.cache.get(inputHash);

    if (!cached) {return null;}

    // TTL 체크
    if (Date.now() - cached.timestamp > this.defaultTTL) {
      this.cache.delete(inputHash);
      return null;
    }

    return cached.matrix;
  }

  /**
   * 매트릭스 캐시에 저장
   */
  setMatrix(inputHash: string, matrix: unknown): void {
    const existing = this.cache.get(inputHash);

    this.cache.set(inputHash, {
      matrix,
      report: existing?.report,
      timestamp: Date.now(),
    });
  }

  /**
   * 리포트 캐시에서 가져오기
   */
  getReport(inputHash: string): unknown | null {
    const cached = this.cache.get(inputHash);

    if (!cached || !cached.report) {return null;}

    if (Date.now() - cached.timestamp > this.defaultTTL) {
      return null;
    }

    return cached.report;
  }

  /**
   * 리포트 캐시에 저장
   */
  setReport(inputHash: string, report: unknown): void {
    const existing = this.cache.get(inputHash);

    if (existing) {
      existing.report = report;
      existing.timestamp = Date.now();
    } else {
      this.cache.set(inputHash, {
        matrix: null,
        report,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 캐시 통계
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilization: number;
    ttl: number;
  } {
    const cacheStats = this.cache.getStats();
    return {
      ...cacheStats,
      ttl: this.defaultTTL,
    };
  }

  /**
   * 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }
}

// 글로벌 인스턴스
export const matrixCache = new MatrixCache();

// ===========================
// 성능 측정 유틸리티
// ===========================

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHit?: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;

  start(operationName: string): (cacheHit?: boolean) => PerformanceMetrics {
    const metric: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
    };

    return (cacheHit = false) => {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.cacheHit = cacheHit;

      this.addMetric(metric);
      return metric;
    };
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // 최대 개수 초과 시 오래된 것 제거
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getAverageTime(operationName: string): number {
    const filtered = this.metrics.filter(m => m.operationName === operationName && m.duration);

    if (filtered.length === 0) {return 0;}

    const total = filtered.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / filtered.length;
  }

  getCacheHitRate(operationName: string): number {
    const filtered = this.metrics.filter(m => m.operationName === operationName);

    if (filtered.length === 0) {return 0;}

    const hits = filtered.filter(m => m.cacheHit).length;
    return hits / filtered.length;
  }

  getStats(): {
    totalOperations: number;
    averageDuration: number;
    cacheHitRate: number;
    operationBreakdown: Record<string, { count: number; avgDuration: number; hitRate: number }>;
  } {
    const operations = new Set(this.metrics.map(m => m.operationName));
    const breakdown: Record<string, { count: number; avgDuration: number; hitRate: number }> = {};

    for (const op of operations) {
      breakdown[op] = {
        count: this.metrics.filter(m => m.operationName === op).length,
        avgDuration: this.getAverageTime(op),
        hitRate: this.getCacheHitRate(op),
      };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const totalHits = this.metrics.filter(m => m.cacheHit).length;

    return {
      totalOperations: this.metrics.length,
      averageDuration: this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
      cacheHitRate: this.metrics.length > 0 ? totalHits / this.metrics.length : 0,
      operationBreakdown: breakdown,
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// 글로벌 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// ===========================
// 최적화된 계산 래퍼
// ===========================

/**
 * 캐시를 활용한 매트릭스 계산
 */
export function withCache<T>(
  operationName: string,
  inputHash: string,
  computeFn: () => T,
  cacheGetter: (hash: string) => T | null,
  cacheSetter: (hash: string, value: T) => void
): T {
  const end = performanceMonitor.start(operationName);

  // 캐시 체크
  const cached = cacheGetter(inputHash);
  if (cached !== null) {
    end(true);
    return cached;
  }

  // 계산 실행
  const result = computeFn();

  // 캐시 저장
  cacheSetter(inputHash, result);

  end(false);
  return result;
}
