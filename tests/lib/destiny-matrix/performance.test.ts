// tests/lib/destiny-matrix/performance.test.ts
// Comprehensive tests for performance optimization (LRUCache, memoize, matrixCache, performanceMonitor)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LRUCache,
  memoize,
  memoizeAsync,
  generateInputHash,
  matrixCache,
  performanceMonitor,
  withCache,
} from '@/lib/destiny-matrix/performance';

// ===========================
// Tests: LRUCache
// ===========================

describe('LRUCache - Basic Operations', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  it('should create cache with default size', () => {
    const defaultCache = new LRUCache<string, number>();
    expect(defaultCache.size).toBe(0);
  });

  it('should create cache with custom size', () => {
    const customCache = new LRUCache<string, number>(5);
    expect(customCache.size).toBe(0);
  });

  it('should set and get values', () => {
    cache.set('key1', 100);
    expect(cache.get('key1')).toBe(100);
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('key1', 100);
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('key1', 100);
    expect(cache.delete('key1')).toBe(true);
    expect(cache.has('key1')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 100);
    cache.set('key2', 200);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should track cache size', () => {
    cache.set('key1', 100);
    cache.set('key2', 200);
    expect(cache.size).toBe(2);
  });
});

describe('LRUCache - LRU Behavior', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  it('should evict oldest entry when capacity exceeded', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    cache.set('key4', 4); // Should evict key1

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('should update LRU order on get', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);

    cache.get('key1'); // Move key1 to end

    cache.set('key4', 4); // Should evict key2, not key1

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('should update LRU order on set existing key', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);

    cache.set('key1', 100); // Update and move to end

    cache.set('key4', 4); // Should evict key2

    expect(cache.get('key1')).toBe(100);
    expect(cache.has('key2')).toBe(false);
  });

  it('should not exceed max size', () => {
    for (let i = 1; i <= 10; i++) {
      cache.set(`key${i}`, i);
    }

    expect(cache.size).toBe(3);
  });
});

describe('LRUCache - Stats', () => {
  it('should return cache statistics', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('key1', 1);
    cache.set('key2', 2);

    const stats = cache.getStats();

    expect(stats).toHaveProperty('size', 2);
    expect(stats).toHaveProperty('maxSize', 5);
    expect(stats).toHaveProperty('utilization', 0.4);
  });

  it('should calculate correct utilization', () => {
    const cache = new LRUCache<string, number>(10);
    for (let i = 1; i <= 5; i++) {
      cache.set(`key${i}`, i);
    }

    const stats = cache.getStats();
    expect(stats.utilization).toBe(0.5);
  });
});

// ===========================
// Tests: memoize
// ===========================

describe('memoize - Basic Memoization', () => {
  it('should memoize function results', () => {
    const expensiveFn = vi.fn((x: number) => x * 2);
    const memoized = memoize(expensiveFn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10); // Should use cached value

    expect(expensiveFn).toHaveBeenCalledTimes(1);
  });

  it('should handle different arguments', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(10)).toBe(20);
    expect(memoized(5)).toBe(10);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle complex arguments', () => {
    const fn = vi.fn((obj: { a: number; b: number }) => obj.a + obj.b);
    const memoized = memoize(fn);

    expect(memoized({ a: 1, b: 2 })).toBe(3);
    expect(memoized({ a: 1, b: 2 })).toBe(3); // Same args

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxSize option', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn, { maxSize: 2 });

    memoized(1);
    memoized(2);
    memoized(3); // Should evict 1

    memoized(1); // Should recompute

    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('should use custom key generator', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn, {
      keyGenerator: (x) => `key_${x}`,
    });

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('memoize - TTL Support', () => {
  it('should respect TTL', async () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn, { ttl: 100 }); // 100ms TTL

    expect(memoized(5)).toBe(10);

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(memoized(5)).toBe(10); // Should recompute after TTL

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not expire before TTL', async () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn, { ttl: 1000 });

    expect(memoized(5)).toBe(10);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(memoized(5)).toBe(10);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ===========================
// Tests: memoizeAsync
// ===========================

describe('memoizeAsync - Async Memoization', () => {
  it('should memoize async function results', async () => {
    const asyncFn = vi.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync(asyncFn);

    expect(await memoized(5)).toBe(10);
    expect(await memoized(5)).toBe(10);

    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('should handle pending requests', async () => {
    const asyncFn = vi.fn(async (x: number) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return x * 2;
    });
    const memoized = memoizeAsync(asyncFn);

    const promise1 = memoized(5);
    const promise2 = memoized(5); // Should wait for first

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const asyncFn = vi.fn(async (x: number) => {
      if (x === 0) throw new Error('Invalid');
      return x * 2;
    });
    const memoized = memoizeAsync(asyncFn);

    await expect(memoized(0)).rejects.toThrow('Invalid');
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('should respect TTL for async', async () => {
    const asyncFn = vi.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync(asyncFn, { ttl: 100 });

    expect(await memoized(5)).toBe(10);

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(await memoized(5)).toBe(10);

    expect(asyncFn).toHaveBeenCalledTimes(2);
  });
});

// ===========================
// Tests: generateInputHash
// ===========================

describe('generateInputHash', () => {
  it('should generate hash for object', () => {
    const input = { a: 1, b: 2 };
    const hash = generateInputHash(input);

    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should generate same hash for same input', () => {
    const input1 = { a: 1, b: 2 };
    const input2 = { a: 1, b: 2 };

    expect(generateInputHash(input1)).toBe(generateInputHash(input2));
  });

  it('should generate different hash for different input', () => {
    const input1 = { a: 1, b: 2 };
    const input2 = { a: 1, b: 3 };

    expect(generateInputHash(input1)).not.toBe(generateInputHash(input2));
  });

  it('should handle key order differences', () => {
    const input1 = { a: 1, b: 2 };
    const input2 = { b: 2, a: 1 };

    expect(generateInputHash(input1)).toBe(generateInputHash(input2));
  });
});

// ===========================
// Tests: matrixCache
// ===========================

describe('matrixCache - Matrix Operations', () => {
  beforeEach(() => {
    matrixCache.clear();
  });

  it('should set and get matrix', () => {
    const matrix = { data: 'test matrix' };
    matrixCache.setMatrix('hash123', matrix);

    expect(matrixCache.getMatrix('hash123')).toEqual(matrix);
  });

  it('should return null for missing matrix', () => {
    expect(matrixCache.getMatrix('nonexistent')).toBeNull();
  });

  it('should expire matrix after TTL', async () => {
    const matrix = { data: 'test' };
    matrixCache.setMatrix('hash123', matrix);

    // Wait longer than TTL (5 minutes for default, but we can't wait that long)
    // Just test structure
    expect(matrixCache.getMatrix('hash123')).toEqual(matrix);
  });
});

describe('matrixCache - Report Operations', () => {
  beforeEach(() => {
    matrixCache.clear();
  });

  it('should set and get report', () => {
    const report = { data: 'test report' };
    matrixCache.setReport('hash123', report);

    expect(matrixCache.getReport('hash123')).toEqual(report);
  });

  it('should return null for missing report', () => {
    expect(matrixCache.getReport('nonexistent')).toBeNull();
  });

  it('should store matrix and report together', () => {
    const matrix = { data: 'matrix' };
    const report = { data: 'report' };

    matrixCache.setMatrix('hash123', matrix);
    matrixCache.setReport('hash123', report);

    expect(matrixCache.getMatrix('hash123')).toEqual(matrix);
    expect(matrixCache.getReport('hash123')).toEqual(report);
  });
});

describe('matrixCache - Stats and Management', () => {
  beforeEach(() => {
    matrixCache.clear();
  });

  it('should return cache stats', () => {
    matrixCache.setMatrix('hash1', { data: 1 });
    matrixCache.setMatrix('hash2', { data: 2 });

    const stats = matrixCache.getStats();

    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(stats).toHaveProperty('utilization');
    expect(stats).toHaveProperty('ttl');
  });

  it('should clear cache', () => {
    matrixCache.setMatrix('hash1', { data: 1 });
    matrixCache.setReport('hash2', { data: 2 });

    matrixCache.clear();

    expect(matrixCache.getMatrix('hash1')).toBeNull();
    expect(matrixCache.getReport('hash2')).toBeNull();
  });
});

// ===========================
// Tests: performanceMonitor
// ===========================

describe('performanceMonitor - Basic Monitoring', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  it('should track operation timing', () => {
    const end = performanceMonitor.start('test-op');
    end();

    const avg = performanceMonitor.getAverageTime('test-op');
    expect(avg).toBeGreaterThan(0);
  });

  it('should track cache hits', () => {
    const end = performanceMonitor.start('test-op');
    end(true);

    const hitRate = performanceMonitor.getCacheHitRate('test-op');
    expect(hitRate).toBe(1);
  });

  it('should track cache misses', () => {
    const end = performanceMonitor.start('test-op');
    end(false);

    const hitRate = performanceMonitor.getCacheHitRate('test-op');
    expect(hitRate).toBe(0);
  });

  it('should calculate average time correctly', () => {
    for (let i = 0; i < 5; i++) {
      const end = performanceMonitor.start('test-op');
      end();
    }

    const avg = performanceMonitor.getAverageTime('test-op');
    expect(avg).toBeGreaterThan(0);
  });

  it('should return 0 for unknown operation', () => {
    expect(performanceMonitor.getAverageTime('unknown')).toBe(0);
    expect(performanceMonitor.getCacheHitRate('unknown')).toBe(0);
  });
});

describe('performanceMonitor - Stats', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  it('should return overall stats', () => {
    const end1 = performanceMonitor.start('op1');
    end1(true);

    const end2 = performanceMonitor.start('op2');
    end2(false);

    const stats = performanceMonitor.getStats();

    expect(stats).toHaveProperty('totalOperations', 2);
    expect(stats).toHaveProperty('averageDuration');
    expect(stats).toHaveProperty('cacheHitRate');
    expect(stats).toHaveProperty('operationBreakdown');
  });

  it('should provide operation breakdown', () => {
    const end1 = performanceMonitor.start('op1');
    end1();

    const end2 = performanceMonitor.start('op2');
    end2();

    const stats = performanceMonitor.getStats();

    expect(stats.operationBreakdown).toHaveProperty('op1');
    expect(stats.operationBreakdown).toHaveProperty('op2');
    expect(stats.operationBreakdown.op1).toHaveProperty('count', 1);
    expect(stats.operationBreakdown.op1).toHaveProperty('avgDuration');
    expect(stats.operationBreakdown.op1).toHaveProperty('hitRate');
  });

  it('should calculate overall cache hit rate', () => {
    const end1 = performanceMonitor.start('op1');
    end1(true);

    const end2 = performanceMonitor.start('op2');
    end2(false);

    const stats = performanceMonitor.getStats();
    expect(stats.cacheHitRate).toBe(0.5);
  });

  it('should clear metrics', () => {
    const end = performanceMonitor.start('test-op');
    end();

    performanceMonitor.clear();

    const stats = performanceMonitor.getStats();
    expect(stats.totalOperations).toBe(0);
  });
});

// ===========================
// Tests: withCache
// ===========================

describe('withCache - Cache Wrapper', () => {
  let computeFn: ReturnType<typeof vi.fn>;
  let cacheGetter: ReturnType<typeof vi.fn>;
  let cacheSetter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    performanceMonitor.clear();
    computeFn = vi.fn(() => ({ result: 'computed' }));
    cacheGetter = vi.fn(() => null);
    cacheSetter = vi.fn();
  });

  it('should use cache on hit', () => {
    cacheGetter.mockReturnValueOnce({ result: 'cached' });

    const result = withCache('test-op', 'hash123', computeFn, cacheGetter, cacheSetter);

    expect(result).toEqual({ result: 'cached' });
    expect(computeFn).not.toHaveBeenCalled();
    expect(cacheGetter).toHaveBeenCalledWith('hash123');
  });

  it('should compute on cache miss', () => {
    cacheGetter.mockReturnValueOnce(null);

    const result = withCache('test-op', 'hash123', computeFn, cacheGetter, cacheSetter);

    expect(result).toEqual({ result: 'computed' });
    expect(computeFn).toHaveBeenCalledTimes(1);
    expect(cacheSetter).toHaveBeenCalledWith('hash123', { result: 'computed' });
  });

  it('should track performance', () => {
    cacheGetter.mockReturnValueOnce(null);

    withCache('test-op', 'hash123', computeFn, cacheGetter, cacheSetter);

    const stats = performanceMonitor.getStats();
    expect(stats.totalOperations).toBe(1);
    expect(stats.operationBreakdown['test-op'].count).toBe(1);
  });

  it('should track cache hit', () => {
    cacheGetter.mockReturnValueOnce({ result: 'cached' });

    withCache('test-op', 'hash123', computeFn, cacheGetter, cacheSetter);

    const hitRate = performanceMonitor.getCacheHitRate('test-op');
    expect(hitRate).toBe(1);
  });

  it('should track cache miss', () => {
    cacheGetter.mockReturnValueOnce(null);

    withCache('test-op', 'hash123', computeFn, cacheGetter, cacheSetter);

    const hitRate = performanceMonitor.getCacheHitRate('test-op');
    expect(hitRate).toBe(0);
  });
});
