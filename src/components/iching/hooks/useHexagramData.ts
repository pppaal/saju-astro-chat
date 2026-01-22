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
} from "@/lib/iChing/iChingPremiumData";
import { enhancedHexagramData, enhancedHexagramDataKo } from "@/lib/iChing/enhancedData";
import { getHexagramWisdom } from "@/lib/iChing/ichingWisdom";
import { analyzeSequencePosition, getXuguaPair } from "@/lib/iChing/ichingPatterns";

/**
 * Hexagram data return type
 */
export interface HexagramData {
  primaryNumber: number | undefined;
  resultingNumber: number | undefined;
  premiumData: any;
  resultingPremiumData: any;
  upperTrigram: any;
  lowerTrigram: any;
  luckyInfo: any;
  nuclearHexagram: any;
  relatedHexagrams: any;
  enhancedData: any;
  wisdomData: any;
  sequenceData: any;
  xuguaPairData: any;
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
