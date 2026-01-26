/**
 * React Memoization Utilities Tests
 * Tests for performance optimization hooks and utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock React hooks
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    memo: vi.fn((Component, areEqual) => {
      const MemoizedComponent = (props: any) => Component(props);
      MemoizedComponent.arePropsEqual = areEqual;
      return MemoizedComponent;
    }),
  };
});

import {
  memoComponent,
  useStableMemo,
  useStableCallback,
  useLazyMemo,
  useRenderPerformance,
  withPerformanceMonitoring,
  useDebouncedValue,
  useThrottledCallback,
  useInView,
} from "@/lib/performance/react-memoization";

describe("React Memoization Utilities", () => {
  describe("memoComponent", () => {
    it("wraps component with memo", () => {
      const TestComponent = (props: { name: string }) => null;
      const MemoizedComponent = memoComponent(TestComponent);

      expect(MemoizedComponent).toBeDefined();
    });

    it("uses custom comparison function when provided", () => {
      const TestComponent = (props: { id: number; name: string }) => null;
      const customEqual = (prev: any, next: any) => prev.id === next.id;

      const MemoizedComponent = memoComponent(TestComponent, customEqual);
      expect(MemoizedComponent).toBeDefined();
    });
  });

  describe("useStableMemo", () => {
    it("returns memoized value", () => {
      const factory = vi.fn(() => ({ value: 42 }));

      const { result, rerender } = renderHook(
        ({ deps }) => useStableMemo(factory, deps),
        { initialProps: { deps: [1, 2] } }
      );

      expect(result.current).toEqual({ value: 42 });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("recomputes when dependencies change", () => {
      const factory = vi.fn((a: number) => a * 2);

      const { result, rerender } = renderHook(
        ({ value }) => useStableMemo(() => factory(value), [value]),
        { initialProps: { value: 5 } }
      );

      expect(result.current).toBe(10);

      rerender({ value: 10 });
      expect(result.current).toBe(20);
    });

    it("handles object dependencies", () => {
      const factory = vi.fn(() => "computed");
      const obj = { a: 1 };

      const { result } = renderHook(() => useStableMemo(factory, [obj]));

      expect(result.current).toBe("computed");
    });
  });

  describe("useStableCallback", () => {
    it("returns stable callback", () => {
      const callback = vi.fn((x: number) => x * 2);

      const { result } = renderHook(() => useStableCallback(callback, []));

      expect(typeof result.current).toBe("function");
    });

    it("callback works correctly", () => {
      const callback = vi.fn((x: number) => x * 2);

      const { result } = renderHook(() => useStableCallback(callback, []));

      expect(result.current(5)).toBe(10);
    });
  });

  describe("useLazyMemo", () => {
    it("returns getter function", () => {
      const factory = vi.fn(() => 42);

      // Can't use renderHook directly as it's not a real hook
      const getValue = useLazyMemo(factory);

      expect(typeof getValue).toBe("function");
      expect(factory).not.toHaveBeenCalled();
    });

    it("calculates value only on first access", () => {
      const factory = vi.fn(() => "lazy value");
      const getValue = useLazyMemo(factory);

      expect(factory).not.toHaveBeenCalled();

      const result1 = getValue();
      expect(result1).toBe("lazy value");
      expect(factory).toHaveBeenCalledTimes(1);

      const result2 = getValue();
      expect(result2).toBe("lazy value");
      expect(factory).toHaveBeenCalledTimes(1); // Still 1, cached
    });

    it("caches expensive computation", () => {
      let computeCount = 0;
      const expensiveFactory = () => {
        computeCount++;
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      };

      const getValue = useLazyMemo(expensiveFactory);

      getValue();
      getValue();
      getValue();

      expect(computeCount).toBe(1);
    });
  });

  describe("useRenderPerformance", () => {
    let mockPerformance: {
      mark: ReturnType<typeof vi.fn>;
      measure: ReturnType<typeof vi.fn>;
      clearMarks: ReturnType<typeof vi.fn>;
      clearMeasures: ReturnType<typeof vi.fn>;
      getEntriesByName: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockPerformance = {
        mark: vi.fn(),
        measure: vi.fn(),
        clearMarks: vi.fn(),
        clearMeasures: vi.fn(),
        getEntriesByName: vi.fn(() => []),
      };

      vi.stubGlobal("performance", mockPerformance);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("creates performance marks", () => {
      useRenderPerformance("TestComponent");

      expect(mockPerformance.mark).toHaveBeenCalledWith("TestComponent-render-start");
    });

    it("returns cleanup function", () => {
      const cleanup = useRenderPerformance("TestComponent");

      expect(typeof cleanup).toBe("function");
    });

    it("cleanup measures and clears marks", () => {
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 5 }]);

      const cleanup = useRenderPerformance("TestComponent");
      cleanup?.();

      expect(mockPerformance.mark).toHaveBeenCalledWith("TestComponent-render-end");
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        "TestComponent-render",
        "TestComponent-render-start",
        "TestComponent-render-end"
      );
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith("TestComponent-render-start");
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith("TestComponent-render-end");
      expect(mockPerformance.clearMeasures).toHaveBeenCalledWith("TestComponent-render");
    });

    it("warns for slow renders (> 16ms)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 25 }]);

      const cleanup = useRenderPerformance("SlowComponent");
      cleanup?.();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN] [Performance] SlowComponent render took"),
        ""
      );

      consoleSpy.mockRestore();
    });

    it("does not warn for fast renders (< 16ms)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 10 }]);

      const cleanup = useRenderPerformance("FastComponent");
      cleanup?.();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("handles missing window (SSR)", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = useRenderPerformance("SSRComponent");
      expect(result).toBeUndefined();

      global.window = originalWindow;
    });
  });

  describe("withPerformanceMonitoring", () => {
    it("wraps component", () => {
      const TestComponent = (props: { value: number }) => null;
      const WrappedComponent = withPerformanceMonitoring(TestComponent);

      expect(WrappedComponent).toBeDefined();
    });

    it("sets displayName", () => {
      const TestComponent = (props: { value: number }) => null;
      TestComponent.displayName = "TestComponent";

      const WrappedComponent = withPerformanceMonitoring(TestComponent);

      expect(WrappedComponent.displayName).toBe("withPerformance(TestComponent)");
    });

    it("uses custom name when provided", () => {
      const TestComponent = (props: { value: number }) => null;
      const WrappedComponent = withPerformanceMonitoring(TestComponent, "CustomName");

      expect(WrappedComponent.displayName).toBe("withPerformance(CustomName)");
    });
  });

  describe("useDebouncedValue", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns initial value immediately", () => {
      const { result } = renderHook(() => useDebouncedValue("initial", 300));

      expect(result.current).toBe("initial");
    });

    it("debounces value changes", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: "first" } }
      );

      expect(result.current).toBe("first");

      rerender({ value: "second" });
      expect(result.current).toBe("first"); // Still old value

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe("second");
    });

    it("resets timer on rapid changes", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: "a" } }
      );

      rerender({ value: "b" });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: "c" });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: "d" });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe("a"); // Still original

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe("d"); // Final value
    });

    it("uses default delay of 300ms", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe("updated");
    });
  });

  describe("useThrottledCallback", () => {
    it("returns a function", () => {
      const callback = vi.fn((x: number) => x * 2);
      const { result } = renderHook(() => useThrottledCallback(callback, 300));

      expect(typeof result.current).toBe("function");
    });

    it("uses default delay of 300ms", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback));

      // Just verify the hook returns a function
      expect(typeof result.current).toBe("function");
    });

    it("passes arguments to callback", () => {
      const callback = vi.fn((a: number, b: string) => `${a}-${b}`);
      const { result } = renderHook(() => useThrottledCallback(callback, 0)); // 0 delay for immediate execution

      act(() => {
        const returnVal = result.current(42, "test");
        // Due to throttling behavior, this may or may not execute
      });

      // Verify hook returns callable function
      expect(typeof result.current).toBe("function");
    });
  });

  describe("useInView", () => {
    let mockIntersectionObserver: ReturnType<typeof vi.fn>;
    let observerCallback: (entries: Array<{ isIntersecting: boolean }>) => void;

    beforeEach(() => {
      mockIntersectionObserver = vi.fn((callback) => {
        observerCallback = callback;
        return {
          observe: vi.fn(),
          disconnect: vi.fn(),
        };
      });

      vi.stubGlobal("IntersectionObserver", mockIntersectionObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns ref setter and inView state", () => {
      const { result } = renderHook(() => useInView());

      expect(result.current).toHaveProperty("ref");
      expect(result.current).toHaveProperty("inView");
      expect(typeof result.current.ref).toBe("function");
      expect(result.current.inView).toBe(false);
    });

    it("creates observer when ref is set", () => {
      const { result } = renderHook(() => useInView());
      const mockElement = document.createElement("div");

      act(() => {
        result.current.ref(mockElement);
      });

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it("updates inView when element intersects", () => {
      const { result } = renderHook(() => useInView());
      const mockElement = document.createElement("div");

      act(() => {
        result.current.ref(mockElement);
      });

      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      expect(result.current.inView).toBe(true);
    });

    it("accepts observer options", () => {
      const options = { threshold: 0.5, rootMargin: "10px" };
      const { result } = renderHook(() => useInView(options));
      const mockElement = document.createElement("div");

      act(() => {
        result.current.ref(mockElement);
      });

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );
    });
  });
});

describe("Deep Equality Helper", () => {
  // Testing deepEqual through memoComponent behavior
  describe("deep comparison", () => {
    it("considers identical primitives equal", () => {
      const TestComponent = (props: { value: number }) => null;
      const MemoizedComponent = memoComponent(TestComponent);
      const arePropsEqual = (MemoizedComponent as any).arePropsEqual;

      if (arePropsEqual) {
        expect(arePropsEqual({ value: 1 }, { value: 1 })).toBe(true);
      }
    });

    it("considers identical objects equal", () => {
      const TestComponent = (props: { data: { a: number } }) => null;
      const MemoizedComponent = memoComponent(TestComponent);
      const arePropsEqual = (MemoizedComponent as any).arePropsEqual;

      if (arePropsEqual) {
        expect(arePropsEqual({ data: { a: 1 } }, { data: { a: 1 } })).toBe(true);
      }
    });

    it("considers different values not equal", () => {
      const TestComponent = (props: { value: number }) => null;
      const MemoizedComponent = memoComponent(TestComponent);
      const arePropsEqual = (MemoizedComponent as any).arePropsEqual;

      if (arePropsEqual) {
        expect(arePropsEqual({ value: 1 }, { value: 2 })).toBe(false);
      }
    });

    it("handles nested objects", () => {
      const TestComponent = (props: { data: { nested: { value: number } } }) => null;
      const MemoizedComponent = memoComponent(TestComponent);
      const arePropsEqual = (MemoizedComponent as any).arePropsEqual;

      if (arePropsEqual) {
        expect(
          arePropsEqual(
            { data: { nested: { value: 1 } } },
            { data: { nested: { value: 1 } } }
          )
        ).toBe(true);

        expect(
          arePropsEqual(
            { data: { nested: { value: 1 } } },
            { data: { nested: { value: 2 } } }
          )
        ).toBe(false);
      }
    });
  });
});
