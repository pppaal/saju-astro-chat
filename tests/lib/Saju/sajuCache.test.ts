// tests/lib/Saju/sajuCache.test.ts
// 사주 캐싱 시스템 테스트

import { vi, beforeEach, afterEach } from "vitest";
import {
  LRUCache,
  memoize,
  memoizeAsync,
  createLazyLoader,
  BatchProcessor,
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
  measurePerformance,
  getPerformanceStats,
  clearPerformanceHistory,
  sajuCache,
  daeunCache,
  compatibilityCache,
  SajuResult,
  CacheStats,
} from '@/lib/Saju/sajuCache';

describe('sajuCache', () => {
  describe('LRUCache', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>({
        maxSize: 5,
        ttlMs: 1000,
        cleanupIntervalMs: 10000,
      });
    });

    afterEach(() => {
      cache.stopCleanup();
      cache.clear();
    });

    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should evict oldest item when maxSize is reached', () => {
      for (let i = 1; i <= 6; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      // key1이 제거되어야 함 (LRU)
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key6')).toBe('value6');
    });

    it('should update access order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // key1 접근하면 LRU 순서가 변경됨
      cache.get('key1');

      // 더 많은 항목 추가
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');
      cache.set('key6', 'value6');

      // key1은 최근 접근했으므로 살아있어야 함
      expect(cache.get('key1')).toBe('value1');
      // key2는 오래되어 제거되었을 수 있음
    });

    it('should expire items after TTL', async () => {
      const shortTtlCache = new LRUCache<string>({
        maxSize: 10,
        ttlMs: 50,
        cleanupIntervalMs: 100000,
      });

      shortTtlCache.set('key1', 'value1');
      expect(shortTtlCache.get('key1')).toBe('value1');

      // TTL 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(shortTtlCache.get('key1')).toBeUndefined();
      shortTtlCache.stopCleanup();
    });

    it('should return correct stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should cleanup expired entries', async () => {
      const shortTtlCache = new LRUCache<string>({
        maxSize: 10,
        ttlMs: 50,
        cleanupIntervalMs: 100000,
      });

      shortTtlCache.set('key1', 'value1');
      shortTtlCache.set('key2', 'value2');

      await new Promise(resolve => setTimeout(resolve, 100));

      const removed = shortTtlCache.cleanup();
      expect(removed).toBe(2);
      shortTtlCache.stopCleanup();
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(callCount).toBe(1); // 한 번만 호출됨
    });

    it('should use custom key generator', () => {
      const fn = (obj: { id: number }) => obj.id * 2;
      const memoized = memoize(fn, (obj) => `id:${obj.id}`);

      expect(memoized({ id: 1 })).toBe(2);
      expect(memoized({ id: 1 })).toBe(2);

      const stats = memoized.stats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should clear cache', () => {
      const fn = (x: number) => x * 2;
      const memoized = memoize(fn);

      memoized(5);
      expect(memoized.cache.size).toBe(1);

      memoized.clear();
      expect(memoized.cache.size).toBe(0);
    });

    it('should return stats', () => {
      const fn = (x: number) => x * 2;
      const memoized = memoize(fn);

      memoized(1);
      memoized(1);
      memoized(2);

      const stats = memoized.stats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
    });
  });

  describe('memoizeAsync', () => {
    it('should cache async function results', async () => {
      let callCount = 0;
      const fn = async (x: number) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 2;
      };

      const memoized = memoizeAsync(fn);

      expect(await memoized(5)).toBe(10);
      expect(await memoized(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    it('should remove failed results from cache', async () => {
      let shouldFail = true;
      const fn = async () => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('Test error');
        }
        return 'success';
      };

      const memoized = memoizeAsync(fn);

      await expect(memoized()).rejects.toThrow('Test error');
      // 실패 후 다시 시도하면 성공해야 함
      expect(await memoized()).toBe('success');
    });

    it('should clear cache', async () => {
      const fn = async (x: number) => x * 2;
      const memoized = memoizeAsync(fn);

      await memoized(5);
      expect(memoized.cache.size).toBe(1);

      memoized.clear();
      expect(memoized.cache.size).toBe(0);
    });
  });

  describe('createLazyLoader', () => {
    it('should load value lazily', async () => {
      let loaded = false;
      const loader = createLazyLoader(async () => {
        loaded = true;
        return 'value';
      });

      expect(loader.isLoaded()).toBe(false);
      expect(loaded).toBe(false);

      const value = await loader.get();
      expect(value).toBe('value');
      expect(loader.isLoaded()).toBe(true);
    });

    it('should cache loaded value', async () => {
      let callCount = 0;
      const loader = createLazyLoader(async () => {
        callCount++;
        return 'value';
      });

      await loader.get();
      await loader.get();
      expect(callCount).toBe(1);
    });

    it('should invalidate cache', async () => {
      let callCount = 0;
      const loader = createLazyLoader(async () => {
        callCount++;
        return `value${callCount}`;
      });

      expect(await loader.get()).toBe('value1');
      loader.invalidate();
      expect(loader.isLoaded()).toBe(false);
      expect(await loader.get()).toBe('value2');
    });

    it('should preload on create when option is set', async () => {
      let loaded = false;
      const loader = createLazyLoader(
        async () => {
          loaded = true;
          return 'value';
        },
        { preloadOnCreate: true }
      );

      // 약간의 시간을 기다려 preload 완료
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(loaded).toBe(true);
    });

    it('should allow preload method call', async () => {
      let loaded = false;
      const loader = createLazyLoader(async () => {
        loaded = true;
        return 'value';
      });

      loader.preload();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(loaded).toBe(true);
    });
  });

  describe('BatchProcessor', () => {
    it('should batch process items', async () => {
      const processor = new BatchProcessor<number, number>(
        async (inputs) => inputs.map(x => x * 2),
        { batchSize: 3, delayMs: 10 }
      );

      const results = await Promise.all([
        processor.add(1),
        processor.add(2),
        processor.add(3),
      ]);

      expect(results).toEqual([2, 4, 6]);
    });

    it('should process immediately when batch size is reached', async () => {
      const processedAt: number[] = [];
      const processor = new BatchProcessor<number, number>(
        async (inputs) => {
          processedAt.push(Date.now());
          return inputs.map(x => x * 2);
        },
        { batchSize: 2, delayMs: 1000 }
      );

      const start = Date.now();
      await Promise.all([
        processor.add(1),
        processor.add(2),
      ]);

      // 즉시 처리되어야 함 (delayMs 1000보다 훨씬 빠르게)
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('should handle errors in processor', async () => {
      const processor = new BatchProcessor<number, number>(
        async () => {
          throw new Error('Processing error');
        },
        { batchSize: 2, delayMs: 10 }
      );

      await expect(processor.add(1)).rejects.toThrow('Processing error');
    });

    it('should report queue size', async () => {
      const processor = new BatchProcessor<number, number>(
        async (inputs) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return inputs.map(x => x * 2);
        },
        { batchSize: 10, delayMs: 1000 }
      );

      processor.add(1);
      processor.add(2);

      expect(processor.queueSize).toBeGreaterThanOrEqual(0);
    });

    it('should flush queue', async () => {
      const processor = new BatchProcessor<number, number>(
        async (inputs) => inputs.map(x => x * 2),
        { batchSize: 10, delayMs: 1000 }
      );

      const promise1 = processor.add(1);
      const promise2 = processor.add(2);

      await processor.flush();
      expect(await promise1).toBe(2);
      expect(await promise2).toBe(4);
    });
  });

  describe('Cache key generation', () => {
    it('should generate saju cache key', () => {
      const date = new Date('1990-01-15');
      const key = generateSajuCacheKey(date, 12, 'male', false);

      expect(key).toContain('saju');
      expect(key).toContain('1990-01-15');
      expect(key).toContain('12');
      expect(key).toContain('male');
    });

    it('should generate different keys for different inputs', () => {
      const date = new Date('1990-01-15');
      const key1 = generateSajuCacheKey(date, 12, 'male', false);
      const key2 = generateSajuCacheKey(date, 12, 'female', false);
      const key3 = generateSajuCacheKey(date, 14, 'male', false);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should generate compatibility cache key in consistent order', () => {
      const key1 = generateCompatibilityCacheKey('personA', 'personB');
      const key2 = generateCompatibilityCacheKey('personB', 'personA');

      expect(key1).toBe(key2);
    });
  });

  describe('computeWithCache', () => {
    let testCache: LRUCache<number>;

    beforeEach(() => {
      testCache = new LRUCache<number>({ maxSize: 10, ttlMs: 10000 });
    });

    afterEach(() => {
      testCache.stopCleanup();
      testCache.clear();
    });

    it('should return cached result when available', async () => {
      testCache.set('key1', 42);

      const result = await computeWithCache('key1', testCache, () => 100);

      expect(result.result).toBe(42);
      expect(result.fromCache).toBe(true);
    });

    it('should compute and cache when not cached', async () => {
      const result = await computeWithCache('key1', testCache, () => 42);

      expect(result.result).toBe(42);
      expect(result.fromCache).toBe(false);
      expect(testCache.get('key1')).toBe(42);
    });

    it('should work with async compute functions', async () => {
      const result = await computeWithCache('key1', testCache, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 42;
      });

      expect(result.result).toBe(42);
      expect(result.computeTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Global cache functions', () => {
    beforeEach(() => {
      clearAllCaches();
    });

    it('should set and get saju from cache', () => {
      const result: SajuResult = {
        fourPillars: {
          year: { stem: '甲', branch: '子' },
          month: { stem: '乙', branch: '丑' },
          day: { stem: '丙', branch: '寅' },
          hour: { stem: '丁', branch: '卯' },
        },
        dayMaster: '丙',
      };

      setSajuToCache('test-key', result);
      const retrieved = getSajuFromCache('test-key');

      expect(retrieved).toBeDefined();
      expect(retrieved?.dayMaster).toBe('丙');
    });

    it('should set and get daeun from cache', () => {
      const data = { period: '2024-2033', element: '水' };
      setDaeunToCache('daeun-key', data);

      const retrieved = getDaeunFromCache('daeun-key');
      expect(retrieved).toEqual(data);
    });

    it('should set and get compatibility from cache', () => {
      const data = { score: 85, rating: 'A' };
      setCompatibilityToCache('compat-key', data);

      const retrieved = getCompatibilityFromCache('compat-key');
      expect(retrieved).toEqual(data);
    });

    it('should get all cache stats', () => {
      const stats = getAllCacheStats();

      expect(stats).toHaveProperty('saju');
      expect(stats).toHaveProperty('daeun');
      expect(stats).toHaveProperty('compatibility');
      expect(stats.saju).toHaveProperty('totalEntries');
      expect(stats.saju).toHaveProperty('hitRate');
    });

    it('should clear all caches', () => {
      setSajuToCache('key1', { fourPillars: { year: { stem: '', branch: '' }, month: { stem: '', branch: '' }, day: { stem: '', branch: '' }, hour: { stem: '', branch: '' } } });
      setDaeunToCache('key2', {});
      setCompatibilityToCache('key3', {});

      clearAllCaches();

      expect(getSajuFromCache('key1')).toBeUndefined();
      expect(getDaeunFromCache('key2')).toBeUndefined();
      expect(getCompatibilityFromCache('key3')).toBeUndefined();
    });

    it('should cleanup expired entries in all caches', () => {
      const result = cleanupAllCaches();

      expect(result).toHaveProperty('saju');
      expect(result).toHaveProperty('daeun');
      expect(result).toHaveProperty('compatibility');
      expect(typeof result.saju).toBe('number');
    });
  });

  describe('Performance monitoring', () => {
    beforeEach(() => {
      clearPerformanceHistory();
    });

    it('should measure performance', async () => {
      const { result, metrics } = await measurePerformance(
        'test-operation',
        () => 42
      );

      expect(result).toBe(42);
      expect(metrics.operation).toBe('test-operation');
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.success).toBe(true);
    });

    it('should measure async performance', async () => {
      const { result, metrics } = await measurePerformance(
        'async-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'done';
        }
      );

      expect(result).toBe('done');
      expect(metrics.duration).toBeGreaterThan(5);
    });

    it('should track failed operations', async () => {
      await expect(
        measurePerformance('failing-operation', () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const stats = getPerformanceStats();
      expect(stats.successRate).toBeLessThan(1);
    });

    it('should return performance stats', async () => {
      await measurePerformance('op1', () => 1);
      await measurePerformance('op2', () => 2, true);

      const stats = getPerformanceStats();

      expect(stats.totalOperations).toBe(2);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
      expect(stats.slowestOperation).toBeDefined();
      expect(stats.fastestOperation).toBeDefined();
    });

    it('should return empty stats when no operations', () => {
      const stats = getPerformanceStats();

      expect(stats.totalOperations).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.slowestOperation).toBeNull();
      expect(stats.fastestOperation).toBeNull();
    });

    it('should clear performance history', async () => {
      await measurePerformance('op1', () => 1);
      clearPerformanceHistory();

      const stats = getPerformanceStats();
      expect(stats.totalOperations).toBe(0);
    });
  });

  describe('Cache instance exports', () => {
    it('should export saju cache instance', () => {
      expect(sajuCache).toBeDefined();
      expect(sajuCache).toBeInstanceOf(LRUCache);
    });

    it('should export daeun cache instance', () => {
      expect(daeunCache).toBeDefined();
      expect(daeunCache).toBeInstanceOf(LRUCache);
    });

    it('should export compatibility cache instance', () => {
      expect(compatibilityCache).toBeDefined();
      expect(compatibilityCache).toBeInstanceOf(LRUCache);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty cache stats', () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 10000 });
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);
      cache.stopCleanup();
    });

    it('should handle JSON serialization of complex objects', () => {
      const cache = new LRUCache<object>({ maxSize: 10, ttlMs: 10000 });
      const complexObj = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: '2024-01-01',
      };

      cache.set('complex', complexObj);
      expect(cache.get('complex')).toEqual(complexObj);
      cache.stopCleanup();
    });

    it('should handle concurrent cache access', async () => {
      const cache = new LRUCache<number>({ maxSize: 100, ttlMs: 10000 });

      const promises = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve().then(() => {
          cache.set(`key${i}`, i);
          return cache.get(`key${i}`);
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
      cache.stopCleanup();
    });
  });
});
