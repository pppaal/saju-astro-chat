/**
 * lazyLoader.ts - 지연 로딩
 */

import type { LazyLoader } from './types';

/**
 * 지연 로더 생성
 */
export function createLazyLoader<T>(
  loader: () => Promise<T>,
  options: { preloadOnCreate?: boolean; cacheResult?: boolean } = {}
): LazyLoader<T> {
  let value: T | undefined;
  let loading: Promise<T> | undefined;
  let loaded = false;

  const load = async (): Promise<T> => {
    if (loaded && options.cacheResult !== false) {
      return value as T;
    }

    if (loading) {
      return loading;
    }

    loading = loader();

    try {
      value = await loading;
      loaded = true;
      return value;
    } finally {
      loading = undefined;
    }
  };

  if (options.preloadOnCreate) {
    load();
  }

  return {
    get: load,
    isLoaded: () => loaded,
    invalidate: () => {
      loaded = false;
      value = undefined;
    },
    preload: () => { load(); }
  };
}
