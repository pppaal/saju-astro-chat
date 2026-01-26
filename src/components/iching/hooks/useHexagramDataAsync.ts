/**
 * Async version of useHexagramData with lazy-loaded enhanced data
 * Reduces initial bundle size by loading enhanced data on-demand
 * @module hooks/useHexagramDataAsync
 */

import { useState, useEffect, useMemo } from "react";
import { IChingResult } from "@/components/iching/types";
import {
  getPremiumHexagramData,
  getTrigramInfo,
  getLuckyInfo,
  calculateNuclearHexagram,
  calculateRelatedHexagrams,
  type PremiumHexagramData,
  type TrigramInfo,
  type LuckyInfo,
} from "@/lib/iChing/iChingPremiumData";
import type { EnhancedHexagramData } from "@/lib/iChing/types";
import { getHexagramWisdom, type HexagramWisdomData } from "@/lib/iChing/ichingWisdom";
import {
  analyzeSequencePosition,
  getXuguaPair,
  type SequenceAnalysis,
  type HexagramPair
} from "@/lib/iChing/ichingPatterns";
import {
  getEnhancedHexagramData,
  getEnhancedHexagramDataKo
} from "@/lib/iChing/enhancedDataLoader";

/** Nuclear hexagram calculation result */
interface NuclearHexagram {
  number: number;
  name_ko: string;
  name_en: string;
}

/** Related hexagrams calculation result */
interface RelatedHexagrams {
  inverted: { number: number; name_ko: string; name_en: string } | null;
  opposite: { number: number; name_ko: string; name_en: string } | null;
}

/**
 * Hexagram data return type with loading state
 */
export interface HexagramDataAsync {
  primaryNumber: number | undefined;
  resultingNumber: number | undefined;
  premiumData: PremiumHexagramData | null;
  resultingPremiumData: PremiumHexagramData | null;
  upperTrigram: TrigramInfo | null;
  lowerTrigram: TrigramInfo | null;
  luckyInfo: LuckyInfo | null;
  nuclearHexagram: NuclearHexagram | null;
  relatedHexagrams: RelatedHexagrams | null;
  enhancedData: EnhancedHexagramData | null;
  enhancedDataLoading: boolean;
  wisdomData: HexagramWisdomData | null;
  sequenceData: SequenceAnalysis | null;
  xuguaPairData: HexagramPair | null;
}

/**
 * Hook parameters
 */
export interface UseHexagramDataAsyncParams {
  result: IChingResult | null;
  language: "ko" | "en";
}

/**
 * Custom hook for hexagram data with async enhanced data loading
 * Consolidates all premium data, trigrams, lucky info, and pattern analysis
 * Enhanced data is loaded asynchronously to reduce bundle size
 *
 * @param params - Result and language parameters
 * @returns Object containing all hexagram-related data
 */
export const useHexagramDataAsync = ({
  result,
  language,
}: UseHexagramDataAsyncParams): HexagramDataAsync => {
  const primaryNumber = result?.primaryHexagram?.number;
  const resultingNumber = result?.resultingHexagram?.number;

  // State for async enhanced data
  const [enhancedData, setEnhancedData] = useState<EnhancedHexagramData | null>(null);
  const [enhancedDataLoading, setEnhancedDataLoading] = useState(false);

  // Premium data for primary hexagram (synchronous)
  const premiumData = useMemo(() => {
    if (!primaryNumber) return null;
    return getPremiumHexagramData(primaryNumber);
  }, [primaryNumber]);

  // Premium data for resulting hexagram (synchronous)
  const resultingPremiumData = useMemo(() => {
    if (!resultingNumber) return null;
    return getPremiumHexagramData(resultingNumber);
  }, [resultingNumber]);

  // Upper trigram information
  const upperTrigram = useMemo(() => {
    const trigramUpper = premiumData?.trigram_upper;
    if (!trigramUpper) return null;
    return getTrigramInfo(trigramUpper);
  }, [premiumData]);

  // Lower trigram information
  const lowerTrigram = useMemo(() => {
    const trigramLower = premiumData?.trigram_lower;
    if (!trigramLower) return null;
    return getTrigramInfo(trigramLower);
  }, [premiumData]);

  // Lucky information (colors, numbers, direction)
  const luckyInfo = useMemo(() => {
    if (!primaryNumber) return null;
    return getLuckyInfo(primaryNumber);
  }, [primaryNumber]);

  // Nuclear hexagram (inner structure)
  const nuclearHexagram = useMemo(() => {
    if (!primaryNumber) return null;
    return calculateNuclearHexagram(primaryNumber);
  }, [primaryNumber]);

  // Related hexagrams (opposite, inverse)
  const relatedHexagrams = useMemo(() => {
    if (!primaryNumber) return null;
    return calculateRelatedHexagrams(primaryNumber);
  }, [primaryNumber]);

  // Traditional wisdom data
  const wisdomData = useMemo(() => {
    if (!primaryNumber) return null;
    return getHexagramWisdom(primaryNumber);
  }, [primaryNumber]);

  // Sequence and pattern analysis
  const sequenceData = useMemo(() => {
    if (!primaryNumber) return null;
    return analyzeSequencePosition(primaryNumber);
  }, [primaryNumber]);

  // Xugua pair data
  const xuguaPairData = useMemo(() => {
    if (!primaryNumber) return null;
    return getXuguaPair(primaryNumber);
  }, [primaryNumber]);

  // Load enhanced data asynchronously
  useEffect(() => {
    if (!primaryNumber) {
      setEnhancedData(null);
      return;
    }

    let cancelled = false;
    setEnhancedDataLoading(true);

    const loadData = async () => {
      try {
        const data = language === "ko"
          ? await getEnhancedHexagramDataKo(primaryNumber)
          : await getEnhancedHexagramData(primaryNumber);

        if (!cancelled) {
          setEnhancedData(data);
          setEnhancedDataLoading(false);
        }
      } catch (error) {
        console.error('Failed to load enhanced hexagram data:', error);
        if (!cancelled) {
          setEnhancedData(null);
          setEnhancedDataLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [primaryNumber, language]);

  return {
    primaryNumber,
    resultingNumber,
    premiumData,
    resultingPremiumData,
    upperTrigram,
    lowerTrigram,
    luckyInfo,
    nuclearHexagram,
    relatedHexagrams,
    enhancedData,
    enhancedDataLoading,
    wisdomData,
    sequenceData,
    xuguaPairData,
  };
};
