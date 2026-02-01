/**
 * I Ching Data Loader
 * Provides dynamic imports for iChingData to reduce bundle size.
 * Only loads the language needed at runtime.
 */

import type { Hexagram } from './iChingData';
import { logger } from '@/lib/logger';

let enCache: Hexagram[] | null = null;
let koCache: Hexagram[] | null = null;

export async function getIChingData(): Promise<Hexagram[]> {
  if (enCache) return enCache;

  try {
    const { IChingData } = await import(
      /* webpackChunkName: "iching-data-en" */
      './iChingData'
    );
    enCache = IChingData;
    return IChingData;
  } catch (error) {
    logger.error('Failed to load English I Ching data:', error);
    return [];
  }
}

export async function getIChingDataKo(): Promise<Hexagram[]> {
  if (koCache) return koCache;

  try {
    const { IChingDataKo } = await import(
      /* webpackChunkName: "iching-data-ko" */
      './iChingData.ko'
    );
    koCache = IChingDataKo;
    return IChingDataKo;
  } catch (error) {
    logger.error('Failed to load Korean I Ching data:', error);
    return [];
  }
}

export async function getIChingDataByLocale(locale: string): Promise<Hexagram[]> {
  return locale === 'ko' ? getIChingDataKo() : getIChingData();
}
