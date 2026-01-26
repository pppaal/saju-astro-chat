// tests/lib/performance/memoization.test.ts
// Comprehensive tests for React memoization utilities

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import {
  smartMemo,
  shallowEqual,
  shallowMemo,
  useStableCallback,
  useMemoizedCallback,
  useMemoCompare,
  useMemoObject,
  useMemoArray,
  useLazyMemo,
  useDebouncedMemo,
  useStableKeys,
  useMemoizedListItem,
  useRenderCount,
  usePerformanceMeasure,
  typedMemo,
  Memoization,
} from '@/lib/performance/memoization';

describe('shallowEqual', () => {
  it('should return true for equal shallow objects', () => {
    const obj1 = { a: 1, b: 'test', c: true };
    const obj2 = { a: 1, b: 'test', c: true };

    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false for different keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, c: 2 };

    expect(shallowEqual(obj1, obj2 as never)).toBe(false);
  });

  it('should return false for different key counts', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1 };

    expect(shallowEqual(obj1, obj2 as never)).toBe(false);
  });

  it('should return false for different values', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 3 };

    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should use strict equality for nested objects', () => {
    const nested = { x: 1 };
    const obj1 = { a: nested };
    const obj2 = { a: nested };
    const obj3 = { a: { x: 1 } };

    expect(shallowEqual(obj1, obj2)).toBe(true); // Same reference
    expect(shallowEqual(obj1, obj3)).toBe(false); // Different reference
  });
});

describe('smartMemo', () => {
  it('should create memoized component', () => {
    const Component = ({ value }: { value: number }) => createElement('div', null, value);
    const MemoComponent = smartMemo(Component);

    expect(MemoComponent).toBeDefined();
    expect(typeof MemoComponent).toBe('object'); // React.memo returns an object
  });

  it('should create memoized component with custom comparison', () => {
    const Component = ({ id, name }: { id: number; name: string }) =>
      createElement('div', null, `${id}: ${name}`);
    const compare = (prev: { id: number; name: string }, next: { id: number; name: string }) =>
      prev.id === next.id;
    const MemoComponent = smartMemo(Component, compare);

    expect(MemoComponent).toBeDefined();
  });
});

describe('shallowMemo', () => {
  it('should create memoized component with shallow comparison', () => {
    const Component = ({ a, b }: { a: number; b: string }) => createElement('div', null, `${a}-${b}`);
    const MemoComponent = shallowMemo(Component);

    expect(MemoComponent).toBeDefined();
  });
});

describe('useStableCallback', () => {
  it('should return stable callback reference', () => {
    const callback = vi.fn((x: number) => x * 2);

    const { result, rerender } = renderHook(({ cb }) => useStableCallback(cb), {
      initialProps: { cb: callback },
    });

    const firstRef = result.current;

    rerender({ cb: callback });

    expect(result.current).toBe(firstRef); // Same reference
  });

  it('should call latest callback implementation', () => {
    const callback1 = vi.fn((x: number) => x * 2);
    const callback2 = vi.fn((x: number) => x * 3);

    const { result, rerender } = renderHook(({ cb }) => useStableCallback(cb), {
      initialProps: { cb: callback1 },
    });

    result.current(5);
    expect(callback1).toHaveBeenCalledWith(5);

    rerender({ cb: callback2 });

    result.current(5);
    expect(callback2).toHaveBeenCalledWith(5);
  });
});

describe('useMemoizedCallback', () => {
  it('should memoize callback with dependencies', () => {
    let multiplier = 2;
    const callback = vi.fn((x: number) => x * multiplier);

    const { result, rerender } = renderHook(
      ({ dep }) => useMemoizedCallback((x: number) => x * dep, [dep]),
      {
        initialProps: { dep: 2 },
      }
    );

    const firstRef = result.current;

    rerender({ dep: 2 }); // Same dep
    expect(result.current).toBe(firstRef);

    // Test that callback works
    expect(result.current(5)).toBe(10);

    rerender({ dep: 3 }); // Different dep
    // Reference may or may not change depending on React internals
    // Just verify it works correctly
    expect(result.current(5)).toBe(15);
  });
});

describe('useMemoCompare', () => {
  it('should only recompute when comparison returns false', () => {
    const factory = vi.fn(() => ({ computed: true }));
    const compare = vi.fn((prev: { id: number }, next: { id: number }) => prev.id === next.id);

    const { result, rerender } = renderHook(
      ({ data }) => useMemoCompare(() => factory(), data, compare),
      {
        initialProps: { data: { id: 1, name: 'test' } },
      }
    );

    expect(factory).toHaveBeenCalledTimes(1);
    const firstValue = result.current;

    rerender({ data: { id: 1, name: 'changed' } }); // Same ID
    expect(compare).toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(1); // Not recomputed
    expect(result.current).toBe(firstValue);

    rerender({ data: { id: 2, name: 'test' } }); // Different ID
    expect(factory).toHaveBeenCalledTimes(2); // Recomputed
    expect(result.current).not.toBe(firstValue);
  });
});

describe('useMemoObject', () => {
  it('should memoize object based on values', () => {
    const { result, rerender } = renderHook(({ obj }) => useMemoObject(obj), {
      initialProps: { obj: { a: 1, b: 2 } },
    });

    const firstRef = result.current;

    rerender({ obj: { a: 1, b: 2 } }); // Same values
    expect(result.current).toBe(firstRef);

    rerender({ obj: { a: 1, b: 3 } }); // Different values
    expect(result.current).not.toBe(firstRef);
  });
});

describe('useMemoArray', () => {
  it('should memoize array based on items', () => {
    const { result, rerender } = renderHook(({ arr }) => useMemoArray(arr), {
      initialProps: { arr: [1, 2, 3] },
    });

    const firstRef = result.current;

    rerender({ arr: [1, 2, 3] }); // Same items
    expect(result.current).toBe(firstRef);

    rerender({ arr: [1, 2, 4] }); // Different items
    expect(result.current).not.toBe(firstRef);
  });
});

describe('useLazyMemo', () => {
  it('should not compute until getter is called', () => {
    const factory = vi.fn(() => 'computed');

    const { result } = renderHook(() => useLazyMemo(factory));

    expect(factory).not.toHaveBeenCalled();
    expect(result.current[0]).toBeUndefined();

    const value = result.current[1]();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(value).toBe('computed');
  });

  it('should only compute once', () => {
    const factory = vi.fn(() => 'computed');

    const { result } = renderHook(() => useLazyMemo(factory));

    const getter = result.current[1];
    getter();
    getter();
    getter();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should return cached value after first computation', () => {
    const factory = vi.fn(() => ({ value: 'computed' }));

    const { result } = renderHook(() => useLazyMemo(factory));

    const firstResult = result.current[1]();
    const secondResult = result.current[1]();

    expect(firstResult).toBe(secondResult);
  });
});

describe('useDebouncedMemo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce value updates', () => {
    const factory = vi.fn(() => 'computed');

    const { result, rerender } = renderHook(
      ({ dep }) => useDebouncedMemo(factory, 300, [dep]),
      {
        initialProps: { dep: 1 },
      }
    );

    expect(factory).toHaveBeenCalledTimes(1); // Initial call

    rerender({ dep: 2 });
    expect(factory).toHaveBeenCalledTimes(1); // Not yet updated

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(factory).toHaveBeenCalledTimes(2); // Now updated
  });

  it('should cancel previous timer on rapid changes', () => {
    const factory = vi.fn(() => 'computed');

    const { rerender } = renderHook(({ dep }) => useDebouncedMemo(factory, 300, [dep]), {
      initialProps: { dep: 1 },
    });

    rerender({ dep: 2 });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ dep: 3 });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Only 2 calls: initial + final (after 300ms from last change)
    expect(factory).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe('useStableKeys', () => {
  it('should generate stable keys for items', () => {
    const { result } = renderHook(() => useStableKeys());

    const getKey = result.current;
    const item1 = { id: 1 };
    const item2 = { id: 2 };

    const key1a = getKey(item1, 0);
    const key1b = getKey(item1, 0);
    const key2 = getKey(item2, 1);

    expect(key1a).toBe(key1b); // Same item = same key
    expect(key1a).not.toBe(key2); // Different item = different key
  });

  it('should maintain stable reference across renders', () => {
    const { result, rerender } = renderHook(() => useStableKeys());

    const firstRef = result.current;
    rerender();

    expect(result.current).toBe(firstRef);
  });
});

describe('useMemoizedListItem', () => {
  it('should memoize list item component', () => {
    const Component = ({ value }: { value: number }) => createElement('div', null, value);

    const { result, rerender } = renderHook(() => useMemoizedListItem(Component));

    const firstRef = result.current;
    rerender();

    expect(result.current).toBe(firstRef);
  });
});

describe('useRenderCount', () => {
  it('should track render count', () => {
    const { result, rerender } = renderHook(() => useRenderCount('TestComponent'));

    expect(result.current).toBe(0); // First render

    rerender();
    expect(result.current).toBe(1); // Second render

    rerender();
    expect(result.current).toBe(2); // Third render
  });

  it('should log in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { rerender } = renderHook(() => useRenderCount('TestComponent'));

    rerender();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [Performance] TestComponent rendered'),
      ""
    );

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should not log in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { rerender } = renderHook(() => useRenderCount('TestComponent'));

    rerender();

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});

describe('usePerformanceMeasure', () => {
  it('should measure computation time in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const factory = vi.fn(() => 'result');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { result } = renderHook(() => usePerformanceMeasure('TestComputation', factory, []));

    expect(result.current).toBe('result');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [Performance] TestComputation took'),
      ""
    );
    const firstCall = consoleSpy.mock.calls[0]?.[0] ?? "";
    expect(firstCall).toContain("ms");

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should not log in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const factory = vi.fn(() => 'result');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { result } = renderHook(() => usePerformanceMeasure('TestComputation', factory, []));

    expect(result.current).toBe('result');
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should recompute when dependencies change', () => {
    const factory = vi.fn(() => 'result');

    const { rerender } = renderHook(({ dep }) => usePerformanceMeasure('Test', factory, [dep]), {
      initialProps: { dep: 1 },
    });

    expect(factory).toHaveBeenCalledTimes(1);

    rerender({ dep: 1 }); // Same dep
    expect(factory).toHaveBeenCalledTimes(1);

    rerender({ dep: 2 }); // Different dep
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe('typedMemo', () => {
  it('should create typed memoized component', () => {
    const Component = ({ value }: { value: number }) => createElement('div', null, value);
    const MemoComponent = typedMemo(Component);

    expect(MemoComponent).toBeDefined();
  });

  it('should create typed memoized component with custom comparison', () => {
    const Component = ({ id }: { id: number }) => createElement('div', null, id);
    const compare = (prev: { id: number }, next: { id: number }) => prev.id === next.id;
    const MemoComponent = typedMemo(Component, compare);

    expect(MemoComponent).toBeDefined();
  });
});

describe('Memoization namespace', () => {
  it('should export all utilities', () => {
    expect(Memoization.smartMemo).toBe(smartMemo);
    expect(Memoization.shallowMemo).toBe(shallowMemo);
    expect(Memoization.typedMemo).toBe(typedMemo);
    expect(Memoization.useStableCallback).toBe(useStableCallback);
    expect(Memoization.useMemoizedCallback).toBe(useMemoizedCallback);
    expect(Memoization.useMemoCompare).toBe(useMemoCompare);
    expect(Memoization.useMemoObject).toBe(useMemoObject);
    expect(Memoization.useMemoArray).toBe(useMemoArray);
    expect(Memoization.useLazyMemo).toBe(useLazyMemo);
    expect(Memoization.useDebouncedMemo).toBe(useDebouncedMemo);
    expect(Memoization.useStableKeys).toBe(useStableKeys);
    expect(Memoization.useMemoizedListItem).toBe(useMemoizedListItem);
    expect(Memoization.useRenderCount).toBe(useRenderCount);
    expect(Memoization.usePerformanceMeasure).toBe(usePerformanceMeasure);
  });
});

describe('Edge cases', () => {
  it('useStableCallback should handle functions with no arguments', () => {
    const callback = vi.fn(() => 'result');

    const { result } = renderHook(() => useStableCallback(callback));

    expect(result.current()).toBe('result');
    expect(callback).toHaveBeenCalled();
  });

  it('useStableCallback should handle functions with multiple arguments', () => {
    const callback = vi.fn((a: number, b: string, c: boolean) => `${a}-${b}-${c}`);

    const { result } = renderHook(() => useStableCallback(callback));

    expect(result.current(1, 'test', true)).toBe('1-test-true');
    expect(callback).toHaveBeenCalledWith(1, 'test', true);
  });

  it('useMemoCompare should handle initial render', () => {
    const factory = vi.fn(() => 'result');
    const compare = vi.fn(() => true);

    const { result } = renderHook(() =>
      useMemoCompare(factory, { id: 1 }, compare)
    );

    expect(result.current).toBe('result');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(compare).not.toHaveBeenCalled(); // No previous value on first render
  });

  it('useLazyMemo should handle factory returning undefined', () => {
    const factory = vi.fn(() => undefined);

    const { result } = renderHook(() => useLazyMemo(factory));

    const value = result.current[1]();
    expect(value).toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('shallowEqual should handle empty objects', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it('useMemoObject should handle empty object', () => {
    const { result } = renderHook(() => useMemoObject({}));

    expect(result.current).toEqual({});
  });

  it('useMemoArray should handle empty array', () => {
    const { result } = renderHook(() => useMemoArray([]));

    expect(result.current).toEqual([]);
  });
});
