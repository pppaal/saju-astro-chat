/**
 * React performance optimization utilities
 * useMemo, React.memo helpers
 */

'use client';

import { memo, useMemo, useCallback } from 'react';
import type { ComponentType, DependencyList } from 'react';

/**
 * Deep comparison for complex objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

/**
 * React.memo with deep comparison
 */
export function memoComponent<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prev: P, next: P) => boolean
): ComponentType<P> {
  return memo(Component, propsAreEqual || deepEqual);
}

/**
 * useMemo with stable dependencies
 * Automatically stringifies complex objects for comparison
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps.map((dep) =>
    typeof dep === 'object' && dep !== null
      ? JSON.stringify(dep)
      : dep
  ));
}

/**
 * useCallback for expensive calculations
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps.map((dep) =>
    typeof dep === 'object' && dep !== null
      ? JSON.stringify(dep)
      : dep
  )) as T;
}

/**
 * Lazy memoization - only calculate when accessed
 */
export function useLazyMemo<T>(factory: () => T): () => T {
  let cached: T | undefined;
  let calculated = false;

  return () => {
    if (!calculated) {
      cached = factory();
      calculated = true;
    }
    return cached as T;
  };
}

/**
 * Performance mark for expensive renders
 */
export function useRenderPerformance(componentName: string) {
  if (typeof window === 'undefined') return;
  if (!window.performance) return;

  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  const measureName = `${componentName}-render`;

  // Start mark
  performance.mark(startMark);

  // Cleanup and measure on unmount
  return () => {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    // Log if render took > 16ms (60fps threshold)
    const entries = performance.getEntriesByName(measureName);
    const lastEntry = entries[entries.length - 1];
    if (lastEntry && lastEntry.duration > 16) {
      console.warn(
        `[Performance] ${componentName} render took ${lastEntry.duration.toFixed(2)}ms`
      );
    }

    // Cleanup
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  };
}

/**
 * HOC for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
): ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const cleanup = useRenderPerformance(
      componentName || Component.displayName || Component.name || 'Unknown'
    );

    // Cleanup on unmount
    if (cleanup) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useMemo(() => cleanup, [cleanup]);
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformance(${componentName || Component.name})`;
  return WrappedComponent;
}

/**
 * Debounced value hook for expensive re-renders
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useState, useEffect } from 'react';

/**
 * Throttled callback for expensive operations
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const [lastRun, setLastRun] = useState(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun >= delay) {
        setLastRun(now);
        return callback(...args);
      }
    },
    [callback, delay, lastRun]
  ) as T;
}

/**
 * Intersection observer hook for lazy rendering
 */
export function useInView(options?: IntersectionObserverInit) {
  const [ref, setRef] = useState<Element | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      options
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options]);

  return { ref: setRef, inView };
}
