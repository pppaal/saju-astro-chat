'use client'

/**
 * I Ching Result Display Component (Redesigned with Tabs)
 * Enhanced UX with tabbed navigation and better information hierarchy
 * @module components/iching/ResultDisplayNew
 */

import React, { useEffect, useRef, useState } from 'react'
import { IChingResult } from '@/components/iching/types'
import { useI18n } from '@/i18n/I18nProvider'
import { useAiStreaming, useHexagramDataAsync, useAiCompletion } from './hooks'
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
} from './sections'
import { ResultTabs, TabId } from './ResultTabs'
import { HexagramComparison } from './HexagramComparison'
import { CollapsibleSection } from './CollapsibleSection'
import styles from './ResultDisplay.module.css'

/**
 * Component props interface
 */
interface ResultDisplayProps {
  result: IChingResult | null
  question?: string
  autoStartAi?: boolean
  onAiComplete?: (aiText: { overview: string; changing: string; advice: string }) => void
}

/**
 * ResultDisplayNew Component
 * Displays comprehensive I Ching hexagram reading with enhanced tabbed navigation
 */
function ResultDisplayNew({
  result,
  question = '',
  autoStartAi = true,
  onAiComplete,
}: ResultDisplayProps) {
  const { translate, locale } = useI18n()
  const lang = locale === 'ko' ? 'ko' : 'en'
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Custom hooks
  const hexagramData = useHexagramDataAsync({ result, language: lang })

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
  })

  // Handle AI completion notification
  useAiCompletion({
    aiStatus,
    overviewText,
    changingText,
    adviceText,
    onAiComplete,
  })

  // Auto-start AI interpretation
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (autoStartAi && result?.primaryHexagram && !hasStartedRef.current && aiStatus === 'idle') {
      hasStartedRef.current = true
      const timer = setTimeout(() => {
        startAiInterpretation()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoStartAi, result, aiStatus, startAiInterpretation])

  // Cleanup on unmount
  useEffect(() => {
    const controller = abortControllerRef.current
    return () => {
      controller?.abort()
    }
  }, [abortControllerRef])

  // Early returns
  if (!result) return null
  if (result.error) return <p className={styles.errorText}>{result.error}</p>

  const changingLineIndices = result.changingLines.map((cl) => cl.index)

  return (
    <div className={styles.resultContainer}>
      {/* Hexagram Comparison Visual */}
      <HexagramComparison
        primaryHexagram={result.primaryHexagram}
        resultingHexagram={result.resultingHexagram}
        changingLineIndices={changingLineIndices}
      />

      {/* Tabs Navigation */}
      <ResultTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
            {/* Quick Summary - Always visible */}
            <div className={styles.resultCard}>
              <QuickSummarySection enhancedData={hexagramData.enhancedData} translate={translate} />
            </div>

            {/* Core Meaning */}
            {hexagramData.premiumData && (
              <div className={styles.resultCard}>
                <div className={styles.sectionLabel}>
                  {translate('iching.coreMeaning', 'Core Meaning')}
                </div>
                <p className={styles.coreMeaningText}>
                  {hexagramData.premiumData.core_meaning[lang]}
                </p>
              </div>
            )}

            {/* AI Interpretation - Priority placement */}
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

            {/* Visual Imagery */}
            <div className={styles.resultCard}>
              <VisualImagerySection
                enhancedData={hexagramData.enhancedData}
                translate={translate}
              />
            </div>

            {/* Life Areas Grid */}
            <LifeAreasGrid
              premiumData={hexagramData.premiumData}
              lang={lang}
              translate={translate}
            />
          </div>
        )}

        {/* TRADITIONAL TAB */}
        {activeTab === 'traditional' && (
          <div role="tabpanel" id="tabpanel-traditional" aria-labelledby="tab-traditional">
            {/* Primary Hexagram Details */}
            <div className={styles.resultCard}>
              <div className={styles.hexagramHeader}>
                <div className={styles.hexagramIcon}>☯</div>
                <div className={styles.hexagramInfo}>
                  <h2 className={styles.hexagramTitle}>
                    {result.primaryHexagram.name}
                    <span className={styles.hexagramSymbol}>{result.primaryHexagram.symbol}</span>
                  </h2>
                  {hexagramData.premiumData && (
                    <p className={styles.hexagramSubtitle}>
                      {hexagramData.premiumData.name_hanja} · {hexagramData.premiumData.element}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.divider} />

              {/* Trigram Composition */}
              <TrigramComposition
                upperTrigram={hexagramData.upperTrigram}
                lowerTrigram={hexagramData.lowerTrigram}
                lang={lang}
                translate={translate}
              />

              <div className={styles.divider} />

              {/* Judgment */}
              <div>
                <div className={styles.sectionLabel}>
                  {translate('iching.judgment', 'Judgment')}
                </div>
                <p className={styles.sectionText}>{result.primaryHexagram.judgment}</p>
              </div>

              <div className={styles.divider} />

              {/* Image */}
              <div>
                <div className={styles.sectionLabel}>{translate('iching.image', 'Image')}</div>
                <p className={styles.imageText}>{result.primaryHexagram.image}</p>
              </div>
            </div>

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

            {/* Traditional Wisdom - Collapsible */}
            {hexagramData.wisdomData && (
              <CollapsibleSection title="Traditional Wisdom" icon="📚" defaultOpen={false}>
                <TraditionalWisdomSection
                  wisdomData={hexagramData.wisdomData}
                  translate={translate}
                />
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* PRACTICAL TAB */}
        {activeTab === 'practical' && (
          <div role="tabpanel" id="tabpanel-practical" aria-labelledby="tab-practical">
            {/* Plain Language Explanation */}
            <div className={styles.resultCard}>
              <PlainLanguageExplanation
                enhancedData={hexagramData.enhancedData}
                translate={translate}
              />
            </div>

            {/* Actionable Advice */}
            <ActionableAdviceSection
              enhancedData={hexagramData.enhancedData}
              translate={translate}
            />

            {/* Situation Template */}
            {question && (
              <SituationTemplateSection
                enhancedData={hexagramData.enhancedData}
                question={question}
                translate={translate}
              />
            )}
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <div role="tabpanel" id="tabpanel-advanced" aria-labelledby="tab-advanced">
            {/* Deeper Insight Card */}
            <DeeperInsightCard
              luckyInfo={hexagramData.luckyInfo}
              nuclearHexagram={hexagramData.nuclearHexagram}
              relatedHexagrams={hexagramData.relatedHexagrams}
              lang={lang}
              translate={translate}
            />

            {/* Sequence Analysis - Collapsible */}
            {(hexagramData.sequenceData || hexagramData.xuguaPairData) && (
              <CollapsibleSection title="Sequence Analysis" icon="🔄" defaultOpen={false}>
                <SequenceAnalysisSection
                  sequenceData={hexagramData.sequenceData}
                  xuguaPairData={hexagramData.xuguaPairData}
                  lang={lang}
                  translate={translate}
                />
              </CollapsibleSection>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultDisplayNew
