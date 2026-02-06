/**
 * performanceMonitor.ts - 성능 측정 유틸
 */

import type { PerformanceMetrics } from './types';

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
  let result: T | undefined;

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

  // result는 try 블록에서 성공하면 반드시 할당되고, 실패하면 throw되므로 여기에 도달하면 result가 존재
  return { result: result as T, metrics: performanceHistory[performanceHistory.length - 1] };
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
