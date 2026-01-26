"use client";

/**
 * I Ching Result Display Component (Refactored)
 * Main component for displaying hexagram reading results with AI interpretation
 * @module components/iching/ResultDisplay
 */

import React, { useEffect, useRef } from "react";
import { IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";
import { useAiStreaming, useHexagramData, useAiCompletion } from "./hooks";
import {
  TrigramComposition,
  QuickSummarySection,
  VisualImagerySection,
  PlainLanguageExplanation,
  LifeAreasGrid,
  ActionableAdviceSection,
  SituationTemplateSection,
  DeeperInsightCard,
  TraditionalWisdomSection,
  SequenceAnalysisSection,
  ChangingLinesSection,
  ResultingHexagramCard,
  AIInterpretationSection,
} from "./sections";
import styles from "./ResultDisplay.module.css";

/**
 * Component props interface
 */
interface ResultDisplayProps {
  result: IChingResult | null;
  question?: string;
  autoStartAi?: boolean;
  onAiComplete?: (aiText: { overview: string; changing: string; advice: string }) => void;
}

/**
 * ResultDisplay Component
 * Displays comprehensive I Ching hexagram reading with AI interpretation
 *
 * @param props - Component props
 * @returns JSX element or null if no result
 */
const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  question = "",
  autoStartAi = true,
  onAiComplete,
}) => {
  const { translate, locale } = useI18n();
  const lang = locale === "ko" ? "ko" : "en";

  // Custom hooks
  const hexagramData = useHexagramData({ result, language: lang });

  const {
    aiStatus,
    currentSection,
    overviewText,
    changingText,
    adviceText,
    aiError,
    startAiInterpretation,
    abortControllerRef,
  } = useAiStreaming({
    result,
    question,
    locale,
    lang,
    premiumData: hexagramData.premiumData,
  });

  // Handle AI completion notification
  useAiCompletion({
    aiStatus,
    overviewText,
    changingText,
    adviceText,
    onAiComplete,
  });

  // Auto-start AI interpretation
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (autoStartAi && result?.primaryHexagram && !hasStartedRef.current && aiStatus === "idle") {
      hasStartedRef.current = true;
      const timer = setTimeout(() => {
        startAiInterpretation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStartAi, result, aiStatus, startAiInterpretation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [abortControllerRef]);

  // Early returns
  if (!result) {return null;}
  if (result.error) {return <p className={styles.errorText}>{result.error}</p>;}

  return (
    <div className={styles.resultContainer}>
      {/* Primary Hexagram Card */}
      <div className={styles.resultCard}>
        <div className={styles.hexagramHeader}>
          <div className={styles.hexagramIcon}>☯</div>
          <div className={styles.hexagramInfo}>
            <h2 className={styles.hexagramTitle}>
              {translate("iching.today", "Today's Hexagram")}:{" "}
              {result.primaryHexagram.name}
              <span className={styles.hexagramSymbol}>
                {result.primaryHexagram.symbol}
              </span>
            </h2>
            {hexagramData.premiumData && (
              <p className={styles.hexagramSubtitle}>
                {hexagramData.premiumData.name_hanja} · {hexagramData.premiumData.element}
              </p>
            )}
          </div>
        </div>

        {/* Trigram Composition */}
        <TrigramComposition
          upperTrigram={hexagramData.upperTrigram}
          lowerTrigram={hexagramData.lowerTrigram}
          lang={lang}
          translate={translate}
        />

        <div className={styles.divider} />

        {/* Quick Summary */}
        <QuickSummarySection
          enhancedData={hexagramData.enhancedData}
          translate={translate}
        />

        {/* Visual Imagery */}
        <VisualImagerySection
          enhancedData={hexagramData.enhancedData}
          translate={translate}
        />

        {/* Core Meaning */}
        {hexagramData.premiumData && (
          <>
            <div className={styles.coreMeaningSection}>
              <div className={styles.sectionLabel}>
                {translate("iching.coreMeaning", "Core Meaning")}
              </div>
              <p className={styles.coreMeaningText}>
                {hexagramData.premiumData.core_meaning[lang]}
              </p>
            </div>
            <div className={styles.divider} />
          </>
        )}

        {/* Plain Language Explanation */}
        <PlainLanguageExplanation
          enhancedData={hexagramData.enhancedData}
          translate={translate}
        />

        {/* Judgment */}
        <div>
          <div className={styles.sectionLabel}>
            {translate("iching.judgment", "Judgment")}
          </div>
          <p className={styles.sectionText}>
            {result.primaryHexagram.judgment}
          </p>
        </div>

        <div className={styles.divider} />

        {/* Image */}
        <div>
          <div className={styles.sectionLabel}>
            {translate("iching.image", "Image")}
          </div>
          <p className={styles.imageText}>
            {result.primaryHexagram.image}
          </p>
        </div>
      </div>

      {/* Life Areas Grid */}
      <LifeAreasGrid
        premiumData={hexagramData.premiumData}
        lang={lang}
        translate={translate}
      />

      {/* Actionable Advice */}
      <ActionableAdviceSection
        enhancedData={hexagramData.enhancedData}
        translate={translate}
      />

      {/* Situation Template */}
      <SituationTemplateSection
        enhancedData={hexagramData.enhancedData}
        question={question}
        translate={translate}
      />

      {/* Deeper Insight Card */}
      <DeeperInsightCard
        luckyInfo={hexagramData.luckyInfo}
        nuclearHexagram={hexagramData.nuclearHexagram}
        relatedHexagrams={hexagramData.relatedHexagrams}
        lang={lang}
        translate={translate}
      />

      {/* Traditional Wisdom */}
      <TraditionalWisdomSection
        wisdomData={hexagramData.wisdomData}
        translate={translate}
      />

      {/* Sequence Analysis */}
      <SequenceAnalysisSection
        sequenceData={hexagramData.sequenceData}
        xuguaPairData={hexagramData.xuguaPairData}
        lang={lang}
        translate={translate}
      />

      {/* Changing Lines */}
      <ChangingLinesSection
        changingLines={result.changingLines}
        lang={lang}
        translate={translate}
      />

      {/* Resulting Hexagram */}
      <ResultingHexagramCard
        resultingHexagram={result.resultingHexagram ?? null}
        resultingPremiumData={hexagramData?.resultingPremiumData ?? null}
        lang={lang}
        translate={translate}
      />

      {/* AI Interpretation */}
      <AIInterpretationSection
        aiStatus={aiStatus}
        currentSection={currentSection}
        overviewText={overviewText}
        changingText={changingText}
        adviceText={adviceText}
        aiError={aiError}
        startAiInterpretation={startAiInterpretation}
        translate={translate}
      />
    </div>
  );
};

export default ResultDisplay;
