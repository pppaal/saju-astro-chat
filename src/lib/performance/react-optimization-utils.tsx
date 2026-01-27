/**
 * React Optimization Utilities
 *
 * Helper hooks and components for optimizing React performance
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DependencyList } from 'react';

/**
 * useDebounce - Debounce a value
 *
 * Delays updating the value until after the specified delay
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle - Throttle a value
 *
 * Limits updates to once per specified interval
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timeoutId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useIntersectionObserver - Observe element visibility
 *
 * Useful for lazy loading and infinite scroll
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [(node: Element | null) => void, IntersectionObserverEntry | null] {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (node) {
        observerRef.current = new IntersectionObserver(([entry]) => {
          setEntry(entry);
        }, options);

        observerRef.current.observe(node);
      }
    },
    [options.root, options.rootMargin, options.threshold]
  );

  return [ref, entry];
}

/**
 * useLazyLoad - Lazy load component when visible
 */
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  threshold: number = 0.1
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return [ref as React.RefObject<T>, isVisible];
}

/**
 * useEventCallback - Memoized callback that doesn't change on dependency updates
 *
 * Useful for preventing unnecessary re-renders while keeping latest values
 */
export function useEventCallback<T extends (...args: any[]) => any>(
  fn: T
): T {
  const ref = useRef<T>(fn);

  useEffect(() => {
    ref.current = fn;
  });

  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}

/**
 * usePrevious - Get previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useIsFirstRender - Check if it's the first render
 */
export function useIsFirstRender(): boolean {
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return isFirstRender.current;
}

/**
 * useMountEffect - Run effect only on mount
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}

/**
 * useUpdateEffect - Run effect only on updates (not on mount)
 */
export function useUpdateEffect(
  effect: () => void | (() => void),
  deps?: DependencyList
) {
  const isFirstRender = useIsFirstRender();

  useEffect(() => {
    if (!isFirstRender) {
      return effect();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useWindowSize - Get window dimensions
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * useMediaQuery - Match media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * LazyComponent - Wrapper for lazy-loaded components
 */
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
}

export function LazyComponent({
  children,
  fallback = null,
  threshold = 0.1,
}: LazyComponentProps) {
  const [ref, isVisible] = useLazyLoad(threshold);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}

/**
 * Memoized wrapper components
 */
export const MemoizedDiv = React.memo(({ children, ...props }: React.HTMLProps<HTMLDivElement>) => (
  <div {...props}>{children}</div>
));

MemoizedDiv.displayName = 'MemoizedDiv';

/**
 * Performance measurement decorator
 */
export function withPerformance<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo((props: P) => {
    const renderCount = useRef(0);

    useEffect(() => {
      renderCount.current += 1;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} rendered ${renderCount.current} times`);
      }
    });

    return <Component {...props} />;
  });
}

// Re-export React for convenience
import React from 'react';
export { React };
