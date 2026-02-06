/**
 * memoize.ts - 메모이제이션 유틸리티
 */

import type { MemoizedFunction } from './types';

/**
 * 함수 메모이제이션
 */
export function memoize<T extends (...args: never[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  maxSize: number = 500 // 캐시 최대 크기 제한
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>();
  let hits = 0;
  let misses = 0;

  const generateKey = keyGenerator || ((...args: Parameters<T>) => JSON.stringify(args));

  const memoized = function (...args: Parameters<T>): ReturnType<T> {
    const key = generateKey(...args);

    if (cache.has(key)) {
      hits++;
      // LRU: 최근 접근 항목을 끝으로 이동
      const value = cache.get(key) as ReturnType<T>;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }

    misses++;

    // 캐시 크기 제한 - 초과 시 가장 오래된 항목 제거
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

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
  keyGenerator?: (...args: Parameters<T>) => string,
  maxSize: number = 500 // 캐시 최대 크기 제한
): T & { cache: Map<string, Awaited<ReturnType<T>>>; clear: () => void } {
  const cache = new Map<string, Promise<Awaited<ReturnType<T>>>>();
  const generateKey = keyGenerator || ((...args: Parameters<T>) => JSON.stringify(args));

  const memoized = async function (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    const key = generateKey(...args);

    if (cache.has(key)) {
      // LRU: 최근 접근 항목을 끝으로 이동
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);
      return value as Awaited<ReturnType<T>>;
    }

    // 캐시 크기 제한 - 초과 시 가장 오래된 항목 제거
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
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
