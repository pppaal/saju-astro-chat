/**
 * useTabData Hook
 * Shared hook for tab components to extract and memoize Saju/Astro data
 *
 * Eliminates duplicate data extraction logic across 8+ tab components
 */

import { useMemo } from 'react'
import {
  extractSajuData,
  extractAstroData,
  extractAllData,
  type SajuDataExtended,
  type AstroData,
} from '@/lib/utils/data-extraction'

/**
 * Common tab props interface
 */
export interface TabProps {
  saju?: SajuDataExtended | null
  astro?: AstroData | null
  lang?: 'ko' | 'en'
  isKo?: boolean
  data?: Record<string, unknown> | null
}

/**
 * Hook to extract and memoize Saju data
 */
export function useSajuData(saju: SajuDataExtended | null | undefined) {
  return useMemo(() => extractSajuData(saju), [saju])
}

/**
 * Hook to extract and memoize Astro data
 */
export function useAstroData(astro: AstroData | null | undefined) {
  return useMemo(() => extractAstroData(astro), [astro])
}

/**
 * Hook to extract and memoize both Saju and Astro data
 */
export function useAllData(
  saju: SajuDataExtended | null | undefined,
  astro: AstroData | null | undefined
) {
  return useMemo(() => extractAllData(saju, astro), [saju, astro])
}

/**
 * Main hook for tab components
 * Provides all common data extraction in a single call
 */
export function useTabData({ saju, astro, lang, isKo, data }: TabProps) {
  const sajuData = useSajuData(saju)
  const astroData = useAstroData(astro)

  const locale = useMemo(() => {
    return {
      lang: lang ?? 'ko',
      isKo: isKo ?? lang !== 'en',
    }
  }, [lang, isKo])

  const isLoading = !data

  return {
    // Saju data
    dayMaster: sajuData.dayMaster,
    dayMasterElement: sajuData.dayMasterElement,
    currentDaeun: sajuData.currentDaeun,
    currentSaeun: sajuData.currentSaeun,
    yongsin: sajuData.yongsin,
    kibsin: sajuData.kibsin,

    // Astro data
    planets: astroData.planets,
    sunSign: astroData.sunSign,
    moonSign: astroData.moonSign,
    ascendant: astroData.ascendant,
    jupiterSign: astroData.jupiterSign,
    jupiterHouse: astroData.jupiterHouse,
    saturnSign: astroData.saturnSign,
    saturnHouse: astroData.saturnHouse,
    marsSign: astroData.marsSign,
    venusSign: astroData.venusSign,

    // Locale
    lang: locale.lang,
    isKo: locale.isKo,

    // State
    isLoading,
    data,

    // Raw data for advanced use
    rawSaju: saju,
    rawAstro: astro,
  }
}

/**
 * Loading state component for tabs
 */
export function TabLoading() {
  return <div className="text-gray-400 text-center p-6">Loading...</div>
}

/**
 * Empty state component for tabs
 */
export function TabEmpty({ message = 'No data available' }: { message?: string }) {
  return <div className="text-gray-400 text-center p-6">{message}</div>
}
