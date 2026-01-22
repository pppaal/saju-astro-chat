/**
 * React Performance Optimization Utilities
 *
 * Memoization helpers and performance optimization tools
 */

import { memo, useMemo, useCallback, useRef, useEffect, type ComponentType } from 'react';

// ============ Smart Memo Wrapper ============

/**
 * Enhanced memo with custom comparison
 *
 * @example
 * const MyComponent = smartMemo(({ data }) => {
 *   return <div>{data.name}</div>;
 * }, (prev, next) => prev.data.id === next.data.id);
 */
export function smartMemo<P extends object>(
  Component: ComponentType<P>,
  compare?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): ComponentType<P> {
  return memo(Component, compare);
}

/**
 * Shallow comparison for objects (only checks first level)
 */
export function shallowEqual<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => obj1[key] === obj2[key]);
}

/**
 * Memo with shallow prop comparison
 */
export function shallowMemo<P extends Record<string, unknown>>(
  Component: ComponentType<P>
): ComponentType<P> {
  return memo(Component, shallowEqual);
}

// ============ Stable Callback Hooks ============

/**
 * useStableCallback - callback that never changes reference
 * Useful when passing callbacks to memoized children
 *
 * @example
 * const handleClick = useStableCallback((id: string) => {
 *   console.log('Clicked:', id);
 * });
 */
export function useStableCallback<T extends (...args: never[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * useMemoizedCallback - memoized callback with dependencies
 * Only recreates when dependencies change
 */
export function useMemoizedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps) as T;
}

// ============ Computed Value Memoization ============

/**
 * useMemoCompare - only recompute when custom comparison returns false
 *
 * @example
 * const processedData = useMemoCompare(
 *   () => expensiveComputation(data),
 *   data,
 *   (prev, next) => prev.id === next.id
 * );
 */
export function useMemoCompare<T, D>(
  factory: () => T,
  dependency: D,
  compare: (prev: D, next: D) => boolean
): T {
  const ref = useRef<{ value: T; dependency: D }>();

  if (!ref.current || !compare(ref.current.dependency, dependency)) {
    ref.current = {
      value: factory(),
      dependency,
    };
  }

  return ref.current.value;
}

/**
 * useMemoObject - memoize object to prevent recreation on every render
 *
 * @example
 * const config = useMemoObject({ theme: 'dark', locale: 'ko' });
 */
export function useMemoObject<T extends Record<string, unknown>>(obj: T): T {
  return useMemo(() => obj, Object.values(obj));
}

/**
 * useMemoArray - memoize array to prevent recreation
 *
 * @example
 * const items = useMemoArray(['a', 'b', 'c']);
 */
export function useMemoArray<T>(array: T[]): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => array, array);
}

// ============ Lazy Computation ============

/**
 * useLazyMemo - only compute on first access
 *
 * @example
 * const [heavyData, getHeavyData] = useLazyMemo(() => {
 *   return computeHeavyData();
 * });
 *
 * // Later when needed:
 * const data = getHeavyData();
 */
export function useLazyMemo<T>(
  factory: () => T
): [value: T | undefined, getter: () => T] {
  const ref = useRef<{ computed: boolean; value?: T }>({ computed: false });

  const getter = useCallback(() => {
    if (!ref.current.computed) {
      ref.current.value = factory();
      ref.current.computed = true;
    }
    return ref.current.value as T;
  }, [factory]);

  return [ref.current.value, getter];
}

// ============ Debounced Memo ============

/**
 * useDebouncedMemo - memo that only updates after value stabilizes
 *
 * @example
 * const debouncedValue = useDebouncedMemo(() => searchQuery, 300);
 */
export function useDebouncedMemo<T>(
  factory: () => T,
  delay: number,
  deps: React.DependencyList
): T {
  const [value, setValue] = useState<T>(factory);

  useEffect(() => {
    const timer = setTimeout(() => {
      setValue(factory());
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);

  return value;
}

// ============ List Optimization ============

/**
 * Generate stable keys for list items
 * Useful when items don't have unique IDs
 *
 * @example
 * const getKey = useStableKeys();
 * items.map((item, index) => (
 *   <Item key={getKey(item, index)} {...item} />
 * ));
 */
export function useStableKeys<T>(): (item: T, index: number) => string {
  const keysRef = useRef<Map<T, string>>(new Map());
  const counterRef = useRef(0);

  return useCallback((item: T, index: number) => {
    let key = keysRef.current.get(item);
    if (!key) {
      key = `item-${counterRef.current++}-${index}`;
      keysRef.current.set(item, key);
    }
    return key;
  }, []);
}

/**
 * Memoize list item renderer
 *
 * @example
 * const MemoizedItem = useMemoizedListItem(Item);
 */
export function useMemoizedListItem<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return useMemo(() => memo(Component), [Component]);
}

// ============ Performance Monitoring ============

/**
 * Measure render performance (development only)
 *
 * @example
 * useRenderCount('MyComponent');
 */
export function useRenderCount(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered ${renderCount.current} times`);
    }
  });

  return renderCount.current;
}

/**
 * Measure expensive computation time
 *
 * @example
 * const result = usePerformanceMeasure(
 *   'ExpensiveComputation',
 *   () => computeHeavyData(),
 *   [data]
 * );
 */
export function usePerformanceMeasure<T>(
  label: string,
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now();
      const result = factory();
      const end = performance.now();
      console.log(`[Performance] ${label} took ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ============ Type-Safe Memoization ============

/**
 * Type-safe memo for components with generic props
 */
export function typedMemo<T, P = T>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
  return memo(Component, propsAreEqual) as ComponentType<P>;
}

// ============ Helper: useState Import ============
import { useState } from 'react';

// Export all memoization utilities
export const Memoization = {
  smartMemo,
  shallowMemo,
  typedMemo,
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
};

export default Memoization;
