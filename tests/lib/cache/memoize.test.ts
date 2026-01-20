/**
 * Memoize Cache Tests
 * Tests for memoization and caching utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import { memoize, clearCache, getCacheStats } from "@/lib/cache/memoize";

describe("memoize", () => {
  beforeEach(() => {
    clearCache();
  });

  describe("basic memoization", () => {
    it("caches function results", () => {
      let callCount = 0;
      const expensiveFn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(expensiveFn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);

      expect(callCount).toBe(1);
    });

    it("returns different results for different arguments", () => {
      let callCount = 0;
      const expensiveFn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(expensiveFn);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(memoized(5)).toBe(10);

      expect(callCount).toBe(2);
    });

    it("handles multiple arguments", () => {
      let callCount = 0;
      const addFn = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoized = memoize(addFn);

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(memoized(2, 1)).toBe(3);
      expect(memoized(1, 2)).toBe(3);

      expect(callCount).toBe(2);
    });

    it("handles array arguments", () => {
      let callCount = 0;
      const sumFn = (arr: number[]) => {
        callCount++;
        return arr.reduce((a, b) => a + b, 0);
      };

      const memoized = memoize(sumFn);

      expect(memoized([1, 2, 3])).toBe(6);
      expect(memoized([1, 2, 3])).toBe(6);
      expect(memoized([1, 2, 4])).toBe(7);

      expect(callCount).toBe(2);
    });

    it("handles null values", () => {
      let callCount = 0;
      const processFn = (val: unknown) => {
        callCount++;
        return val === null ? "null" : "other";
      };

      const memoized = memoize(processFn);

      expect(memoized(null)).toBe("null");
      expect(memoized(null)).toBe("null");

      // null is cached
      expect(callCount).toBe(1);
    });

    it("handles different falsy values", () => {
      let callCount = 0;
      const processFn = (val: unknown) => {
        callCount++;
        return String(val);
      };

      const memoized = memoize(processFn);

      expect(memoized(0)).toBe("0");
      expect(memoized(0)).toBe("0");
      expect(memoized("")).toBe("");
      expect(memoized("")).toBe("");
      expect(memoized(false)).toBe("false");

      expect(callCount).toBe(3);
    });
  });

  describe("custom key function", () => {
    it("uses custom key function when provided", () => {
      let callCount = 0;
      const fn = (x: number, y: number) => {
        callCount++;
        return x + y;
      };

      const memoized = memoize(fn, {
        keyFn: (x) => `custom:${x}`,
      });

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 3)).toBe(3);
      expect(memoized(2, 2)).toBe(4);

      expect(callCount).toBe(2);
    });
  });

  describe("return types", () => {
    it("preserves string return type", () => {
      const fn = (x: number) => `result-${x}`;
      const memoized = memoize(fn);

      const result = memoized(5);
      expect(typeof result).toBe("string");
      expect(result).toBe("result-5");
    });

    it("preserves object return type", () => {
      const fn = (x: number) => ({ value: x, doubled: x * 2 });
      const memoized = memoize(fn);

      const result = memoized(5);
      expect(result).toEqual({ value: 5, doubled: 10 });
    });

    it("preserves array return type", () => {
      const fn = (x: number) => [x, x * 2, x * 3];
      const memoized = memoize(fn);

      const result = memoized(2);
      expect(result).toEqual([2, 4, 6]);
    });

    it("preserves boolean return type", () => {
      const fn = (x: number) => x > 0;
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(true);
      expect(memoized(-5)).toBe(false);
    });
  });
});

describe("clearCache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("clears all cache entries when called without pattern", () => {
    const fn1 = memoize((x: number) => x * 2);
    const fn2 = memoize((x: number) => x * 3);

    fn1(5);
    fn2(5);

    const statsBefore = getCacheStats();
    expect(statsBefore.size).toBeGreaterThan(0);

    clearCache();

    const statsAfter = getCacheStats();
    expect(statsAfter.size).toBe(0);
  });

  it("clears cache entries matching pattern", () => {
    let call1Count = 0;
    let call2Count = 0;

    const fn1 = memoize(
      (x: number) => {
        call1Count++;
        return x * 2;
      },
      { keyFn: (x) => `pattern1:${x}` }
    );

    const fn2 = memoize(
      (x: number) => {
        call2Count++;
        return x * 3;
      },
      { keyFn: (x) => `pattern2:${x}` }
    );

    fn1(5);
    fn2(5);

    clearCache("pattern1");

    fn1(5);
    expect(call1Count).toBe(2);

    fn2(5);
    expect(call2Count).toBe(1);
  });
});

describe("getCacheStats", () => {
  beforeEach(() => {
    clearCache();
  });

  it("returns cache statistics", () => {
    const stats = getCacheStats();

    expect(stats).toHaveProperty("size");
    expect(stats).toHaveProperty("max");
    expect(stats).toHaveProperty("calculatedSize");
  });

  it("tracks cache size correctly", () => {
    const fn = memoize((x: number) => x * 2);

    expect(getCacheStats().size).toBe(0);

    fn(1);
    expect(getCacheStats().size).toBe(1);

    fn(2);
    expect(getCacheStats().size).toBe(2);

    fn(1);
    expect(getCacheStats().size).toBe(2);
  });

  it("returns max cache size", () => {
    const stats = getCacheStats();
    expect(stats.max).toBe(500);
  });
});
