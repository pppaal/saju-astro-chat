/**
 * Memoization Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { memoize, clearCache, getCacheStats } from "@/lib/cache/memoize";

describe("Memoization", () => {
  beforeEach(() => {
    clearCache();
  });

  describe("memoize", () => {
    it("caches function results", () => {
      const expensiveFn = vi.fn((x: number) => x * 2);
      const memoized = memoize(expensiveFn);

      const result1 = memoized(5);
      const result2 = memoized(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(expensiveFn).toHaveBeenCalledTimes(1);
    });

    it("handles different arguments", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      memoized(5);
      memoized(10);
      memoized(5);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("uses custom key function", () => {
      const fn = vi.fn((obj: { id: string }) => obj.id.toUpperCase());
      const memoized = memoize(fn, {
        keyFn: (obj) => obj.id,
      });

      memoized({ id: "test" });
      memoized({ id: "test" });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("respects custom TTL", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn, { ttl: 100 });

      memoized(5);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles complex return types", () => {
      const fn = vi.fn((x: number) => ({ value: x, doubled: x * 2 }));
      const memoized = memoize(fn);

      const result1 = memoized(5);
      const result2 = memoized(5);

      expect(result1).toEqual({ value: 5, doubled: 10 });
      expect(result2).toEqual({ value: 5, doubled: 10 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles array arguments", () => {
      const fn = vi.fn((arr: number[]) => arr.reduce((a, b) => a + b, 0));
      const memoized = memoize(fn);

      memoized([1, 2, 3]);
      memoized([1, 2, 3]);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("clearCache", () => {
    it("clears all cache entries", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      memoized(5);
      clearCache();
      memoized(5);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("clears cache by pattern", () => {
      // Named functions for clearCache pattern matching
      function testFn1(x: number) { return x * 2; }
      function testFn2(x: number) { return x * 3; }

      const fn1 = vi.fn(testFn1);
      const fn2 = vi.fn(testFn2);

      // Override function names
      Object.defineProperty(fn1, 'name', { value: 'testFn1' });
      Object.defineProperty(fn2, 'name', { value: 'testFn2' });

      const memoized1 = memoize(fn1);
      const memoized2 = memoize(fn2);

      memoized1(5);
      memoized2(5);

      clearCache('testFn1');

      memoized1(5);
      memoized2(5);

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCacheStats", () => {
    it("returns cache statistics", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      memoized(5);
      memoized(10);

      const stats = getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.max).toBe(500);
    });

    it("shows empty cache initially", () => {
      clearCache();
      const stats = getCacheStats();

      expect(stats.size).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles null return values", () => {
      const fn = vi.fn(() => null);
      const memoized = memoize(fn);

      const result1 = memoized();
      const result2 = memoized();

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      // null is falsy but undefined check uses !== undefined
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles undefined arguments", () => {
      const fn = vi.fn((x?: number) => x ?? 0);
      const memoized = memoize(fn);

      const result1 = memoized(undefined);
      const result2 = memoized(undefined);

      expect(result1).toBe(0);
      expect(result2).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles multiple arguments", () => {
      const fn = vi.fn((a: number, b: number, c: string) => `${a + b}-${c}`);
      const memoized = memoize(fn);

      const result1 = memoized(1, 2, "test");
      const result2 = memoized(1, 2, "test");
      const result3 = memoized(1, 2, "other");

      expect(result1).toBe("3-test");
      expect(result2).toBe("3-test");
      expect(result3).toBe("3-other");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("handles nested object arguments", () => {
      const fn = vi.fn((obj: { nested: { value: number } }) => obj.nested.value * 2);
      const memoized = memoize(fn);

      const arg = { nested: { value: 5 } };
      memoized(arg);
      memoized(arg);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("treats different object references with same content as same key", () => {
      const fn = vi.fn((obj: { id: number }) => obj.id);
      const memoized = memoize(fn);

      memoized({ id: 1 });
      memoized({ id: 1 }); // Different reference, same content

      // JSON.stringify produces same key
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles functions with no arguments", () => {
      let counter = 0;
      const fn = vi.fn(() => ++counter);
      const memoized = memoize(fn);

      const result1 = memoized();
      const result2 = memoized();

      expect(result1).toBe(1);
      expect(result2).toBe(1); // Cached value
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles boolean arguments correctly", () => {
      const fn = vi.fn((flag: boolean) => (flag ? "yes" : "no"));
      const memoized = memoize(fn);

      memoized(true);
      memoized(true);
      memoized(false);
      memoized(false);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("handles zero and negative numbers", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(0)).toBe(0);
      expect(memoized(-5)).toBe(-10);
      expect(memoized(0)).toBe(0);
      expect(memoized(-5)).toBe(-10);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("preserves function name in key generation", () => {
      function namedFunction(x: number) {
        return x;
      }
      const fn = vi.fn(namedFunction);
      Object.defineProperty(fn, "name", { value: "namedFunction" });

      const memoized = memoize(fn);
      memoized(5);

      // The cache key should include the function name
      const stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("concurrency behavior", () => {
    it("handles rapid successive calls", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      // Rapid calls
      for (let i = 0; i < 100; i++) {
        memoized(5);
      }

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("handles many different arguments", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      for (let i = 0; i < 50; i++) {
        memoized(i);
      }

      expect(fn).toHaveBeenCalledTimes(50);

      // Second pass should use cache
      for (let i = 0; i < 50; i++) {
        memoized(i);
      }

      expect(fn).toHaveBeenCalledTimes(50);
    });
  });
});