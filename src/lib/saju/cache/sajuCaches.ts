/**
 * sajuCaches.ts - 사주 전용 캐시 인스턴스 및 함수
 */

import type { SajuResult, CacheStats, ComputationResult } from './types';
import { LRUCache } from './LRUCache';
import {
  SAJU_CACHE,
  DAEUN_CACHE,
  COMPATIBILITY_CACHE,
  CACHE_KEY,
} from '@/lib/constants/cache';

// 사주 계산 결과 캐시
export const sajuCache = new LRUCache<SajuResult>({
  maxSize: SAJU_CACHE.MAX_SIZE,
  ttlMs: SAJU_CACHE.LONG_TTL_MS,
  persistToStorage: true,
  storageKey: 'saju_results_cache'
});

// 대운 계산 캐시
export const daeunCache = new LRUCache<unknown>({
  maxSize: DAEUN_CACHE.MAX_SIZE,
  ttlMs: DAEUN_CACHE.TTL_MS,
  persistToStorage: false,
  storageKey: 'saju_daeun_cache'
});

// 궁합 계산 캐시
export const compatibilityCache = new LRUCache<unknown>({
  maxSize: COMPATIBILITY_CACHE.MAX_SIZE,
  ttlMs: COMPATIBILITY_CACHE.TTL_MS,
  persistToStorage: false,
  storageKey: 'saju_compatibility_cache'
});

/**
 * 사주 캐시 키 생성
 * - null byte 구분자 + JSON 직렬화로 키 충돌 방지
 */
export function generateSajuCacheKey(
  birthDate: Date,
  birthHour: number,
  gender: 'male' | 'female',
  isLunar: boolean = false
): string {
  const sep = CACHE_KEY.SEPARATOR;
  const dateStr = birthDate.toISOString().split('T')[0];
  const params = [dateStr, birthHour, gender, isLunar];
  return `${CACHE_KEY.PREFIX.SAJU}${sep}${params.map(p => JSON.stringify(p)).join(sep)}`;
}

/**
 * 궁합 캐시 키 생성
 * - 순서에 관계없이 동일한 키 생성
 * - null byte 구분자로 키 충돌 방지
 */
export function generateCompatibilityCacheKey(
  person1Key: string,
  person2Key: string
): string {
  const sep = CACHE_KEY.SEPARATOR;
  // 순서에 관계없이 같은 키 생성
  const keys = [person1Key, person2Key].sort();
  return `${CACHE_KEY.PREFIX.COMPATIBILITY}${sep}${keys.join(sep)}`;
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
