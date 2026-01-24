/**
 * Custom hook for consolidating hexagram data computations
 * Combines multiple useMemo calls into a single, optimized hook
 * @module hooks/useHexagramData
 */

import { useMemo } from "react";
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
import { enhancedHexagramData, enhancedHexagramDataKo } from "@/lib/iChing/enhancedData";
import type { EnhancedHexagramData } from "@/lib/iChing/types";
import { getHexagramWisdom, type HexagramWisdomData } from "@/lib/iChing/ichingWisdom";
import { analyzeSequencePosition, getXuguaPair, type SequenceAnalysis, type HexagramPair } from "@/lib/iChing/ichingPatterns";

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
 * Hexagram data return type
 */
export interface HexagramData {
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
  wisdomData: HexagramWisdomData | null;
  sequenceData: SequenceAnalysis | null;
  xuguaPairData: HexagramPair | null;
}

/**
 * Hook parameters
 */
export interface UseHexagramDataParams {
  result: IChingResult | null;
  language: "ko" | "en";
}

/**
 * Custom hook for hexagram data
 * Consolidates all premium data, trigrams, lucky info, and pattern analysis
 *
 * @param params - Result and language parameters
 * @returns Object containing all hexagram-related data
 */
export const useHexagramData = ({
  result,
  language,
}: UseHexagramDataParams): HexagramData => {
  const primaryNumber = result?.primaryHexagram?.number;
  const resultingNumber = result?.resultingHexagram?.number;

  // Premium data for primary hexagram
  const premiumData = useMemo(() => {
    if (!primaryNumber) return null;
    return getPremiumHexagramData(primaryNumber);
  }, [primaryNumber]);

  // Premium data for resulting hexagram
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

  // Enhanced data for better UX
  const enhancedData = useMemo(() => {
    if (!primaryNumber) return null;
    return language === "ko"
      ? enhancedHexagramDataKo[primaryNumber]
      : enhancedHexagramData[primaryNumber];
  }, [primaryNumber, language]);

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
    wisdomData,
    sequenceData,
    xuguaPairData,
  };
};
