/**
 * Tests for src/lib/destiny-map/calendar/cache.ts
 * DestinyCalendarCache 캐시 레이어 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DestinyCalendarCache, destinyCache } from '@/lib/destiny-map/calendar/cache';

describe('DestinyCalendarCache', () => {
  let cache: DestinyCalendarCache;

  beforeEach(() => {
    cache = new DestinyCalendarCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══ Analysis Cache ═══
  describe('analysis cache', () => {
    const date = new Date(2024, 5, 15);

    it('should set and get analysis data', () => {
      const data = { title: 'test', score: 80 } as any;
      cache.setAnalysis(date, 'saju1', 'astro1', data);

      const result = cache.getAnalysis(date, 'saju1', 'astro1');
      expect(result).toEqual(data);
    });

    it('should return undefined for cache miss', () => {
      const result = cache.getAnalysis(date, 'saju1', 'astro1');
      expect(result).toBeUndefined();
    });

    it('should store null values', () => {
      cache.setAnalysis(date, 'saju1', 'astro1', null);

      const result = cache.getAnalysis(date, 'saju1', 'astro1');
      expect(result).toBeNull();
    });

    it('should expire after TTL (1 hour)', () => {
      cache.setAnalysis(date, 'saju1', 'astro1', { title: 'test' } as any);

      // Advance past TTL
      vi.advanceTimersByTime(61 * 60 * 1000);

      const result = cache.getAnalysis(date, 'saju1', 'astro1');
      expect(result).toBeUndefined();
    });

    it('should not expire within TTL', () => {
      cache.setAnalysis(date, 'saju1', 'astro1', { title: 'test' } as any);

      // Advance within TTL
      vi.advanceTimersByTime(30 * 60 * 1000);

      const result = cache.getAnalysis(date, 'saju1', 'astro1');
      expect(result).toBeDefined();
    });

    it('should use different keys for different profiles', () => {
      cache.setAnalysis(date, 'saju1', 'astro1', { title: 'a' } as any);
      cache.setAnalysis(date, 'saju2', 'astro1', { title: 'b' } as any);

      expect(cache.getAnalysis(date, 'saju1', 'astro1')).toEqual({ title: 'a' });
      expect(cache.getAnalysis(date, 'saju2', 'astro1')).toEqual({ title: 'b' });
    });
  });

  // ═══ Daily Fortune Cache ═══
  describe('daily fortune cache', () => {
    it('should set and get daily fortune', () => {
      const birth = new Date(1990, 0, 1);
      const target = new Date(2024, 5, 15);
      const data = { score: 85, summary: 'good day' } as any;

      cache.setDailyFortune(birth, target, data);

      expect(cache.getDailyFortune(birth, target)).toEqual(data);
    });

    it('should return undefined for cache miss', () => {
      const birth = new Date(1990, 0, 1);
      const target = new Date(2024, 5, 15);

      expect(cache.getDailyFortune(birth, target)).toBeUndefined();
    });

    it('should expire after TTL', () => {
      const birth = new Date(1990, 0, 1);
      const target = new Date(2024, 5, 15);
      cache.setDailyFortune(birth, target, { score: 85 } as any);

      vi.advanceTimersByTime(61 * 60 * 1000);

      expect(cache.getDailyFortune(birth, target)).toBeUndefined();
    });
  });

  // ═══ Monthly Theme Cache ═══
  describe('monthly theme cache', () => {
    it('should set and get monthly theme', () => {
      const data = { theme: 'growth' } as any;
      cache.setMonthlyTheme(2024, 6, 'sajuKey1', data);

      expect(cache.getMonthlyTheme(2024, 6, 'sajuKey1')).toEqual(data);
    });

    it('should return undefined for cache miss', () => {
      expect(cache.getMonthlyTheme(2024, 6, 'sajuKey1')).toBeUndefined();
    });
  });

  // ═══ Weekly Theme Cache ═══
  describe('weekly theme cache', () => {
    it('should set and get weekly theme', () => {
      const startDate = new Date(2024, 5, 10);
      const data = { theme: 'focus' } as any;
      cache.setWeeklyTheme(startDate, 'saju1', data);

      expect(cache.getWeeklyTheme(startDate, 'saju1')).toEqual(data);
    });

    it('should return undefined for cache miss', () => {
      const startDate = new Date(2024, 5, 10);
      expect(cache.getWeeklyTheme(startDate, 'saju1')).toBeUndefined();
    });
  });

  // ═══ Clear ═══
  describe('clear', () => {
    it('should clear all caches', () => {
      const date = new Date(2024, 5, 15);
      cache.setAnalysis(date, 'a', 'b', null);
      cache.setDailyFortune(date, date, { score: 1 } as any);
      cache.setMonthlyTheme(2024, 6, 'k', { theme: 't' } as any);
      cache.setWeeklyTheme(date, 'k', { theme: 'w' } as any);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.analysis).toBe(0);
      expect(stats.daily).toBe(0);
      expect(stats.monthly).toBe(0);
      expect(stats.weekly).toBe(0);
    });
  });

  // ═══ Stats ═══
  describe('getStats', () => {
    it('should return correct counts', () => {
      const d = new Date(2024, 5, 15);
      cache.setAnalysis(d, 'a', 'b', null);
      cache.setAnalysis(d, 'c', 'd', null);
      cache.setDailyFortune(d, d, { score: 1 } as any);

      const stats = cache.getStats();
      expect(stats.analysis).toBe(2);
      expect(stats.daily).toBe(1);
      expect(stats.monthly).toBe(0);
      expect(stats.weekly).toBe(0);
    });
  });

  // ═══ Cleanup (eviction) ═══
  describe('cleanup', () => {
    it('should evict oldest entries when cache exceeds MAX_CACHE_SIZE', () => {
      // Fill analysis cache past 500 entries
      for (let i = 0; i < 501; i++) {
        const d = new Date(2024, 0, 1 + (i % 365));
        cache.setAnalysis(d, `saju${i}`, `astro${i}`, null);
      }

      const stats = cache.getStats();
      // After cleanup, ~250 entries should remain (half evicted)
      expect(stats.analysis).toBeLessThan(501);
      expect(stats.analysis).toBeGreaterThan(200);
    });
  });

  // ═══ Singleton ═══
  describe('destinyCache singleton', () => {
    it('should be an instance of DestinyCalendarCache', () => {
      expect(destinyCache).toBeInstanceOf(DestinyCalendarCache);
    });
  });
});
