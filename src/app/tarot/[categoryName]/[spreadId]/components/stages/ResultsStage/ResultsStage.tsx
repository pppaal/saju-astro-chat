import React from 'react'
import dynamic from 'next/dynamic'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import styles from '../../../tarot-reading.module.css'
import type { ReadingResponse, InterpretationResult } from '../../../types'
import type { DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardColor } from '../../../constants'
import {
  HorizontalCardsGrid,
  DetailedCardsSection,
  OverallMessageChat,
  CardInterpretationChat,
  ActionButtons,
} from '../../index'
import { ResultsHeader } from './ResultsHeader'
import { CombinationsSection } from './CombinationsSection'
import { GuidanceSection } from './GuidanceSection'
import { FollowupSection } from './FollowupSection'

const PersonalityInsight = dynamic(() => import('@/components/personality/PersonalityInsight'), {
  ssr: false,
})

export interface ResultsStageProps {
  readingResult: ReadingResponse
  interpretation: InterpretationResult | null
  selectedColor: CardColor
  selectedDeckStyle: DeckStyle
  revealedCards: number[]
  expandedCard: number | null
  detailedSectionRef: React.RefObject<HTMLDivElement | null>
  language: string
  translate: (key: string, fallback: string) => string
  userTopic: string

  // Handlers
  handleCardReveal: (index: number) => void
  canRevealCard: (index: number) => boolean
  isCardRevealed: (index: number) => boolean
  scrollToDetails: () => void
  toggleCardExpand: (index: number) => void

  // Save state
  isSaving: boolean
  isSaved: boolean
  saveMessage: string
  handleSaveReading: () => Promise<void>
  handleReset: () => void
}

export function ResultsStage(props: ResultsStageProps) {
  const {
    readingResult,
    interpretation,
    selectedColor,
    selectedDeckStyle,
    revealedCards,
    expandedCard,
    detailedSectionRef,
    language,
    translate,
    userTopic,
    handleCardReveal,
    canRevealCard,
    isCardRevealed,
    scrollToDetails,
    toggleCardExpand,
    isSaving,
    isSaved,
    saveMessage,
    handleSaveReading,
    handleReset,
  } = props

  const insight = interpretation

  return (
    <div className={styles.resultsContainer}>
      {/* Header */}
      <ResultsHeader
        readingResult={readingResult}
        userTopic={userTopic}
        language={language}
        translate={translate}
      />

      {/* Cards Grid */}
      <HorizontalCardsGrid
        readingResult={readingResult}
        selectedColor={selectedColor}
        selectedDeckStyle={selectedDeckStyle}
        language={language}
        revealedCards={revealedCards}
        onCardReveal={handleCardReveal}
        canRevealCard={canRevealCard}
        isCardRevealed={isCardRevealed}
        translate={translate}
      />

      {/* Scroll to Details Button */}
      {revealedCards.length === readingResult.drawnCards.length && (
        <button className={styles.scrollToDetailsButton} onClick={scrollToDetails}>
          {translate('tarot.results.viewDetails', '상세 해석 보기')} ↓
        </button>
      )}

      {/* Detailed Section - Card meanings without AI */}
      {/* Shown first so users see basic card data before AI interpretation */}
      <DetailedCardsSection
        readingResult={readingResult}
        interpretation={interpretation}
        language={language}
        selectedDeckStyle={selectedDeckStyle}
        revealedCards={revealedCards}
        expandedCard={expandedCard}
        onToggleExpand={toggleCardExpand}
        detailedSectionRef={detailedSectionRef}
        translate={translate}
      />

      {/* AI Overall Message */}
      <OverallMessageChat
        message={insight?.overall_message}
        isLoading={insight?.fallback}
        language={language}
      />

      {/* Card Interpretations - AI chat per card */}
      <CardInterpretationChat
        readingResult={readingResult}
        interpretation={interpretation}
        language={language}
        revealedCards={revealedCards}
      />

      {/* Combinations */}
      {insight?.combinations && insight.combinations.length > 0 && (
        <CombinationsSection combinations={insight.combinations} translate={translate} />
      )}

      {/* Guidance */}
      {insight?.guidance && !insight.fallback && (
        <GuidanceSection guidance={insight.guidance} language={language} />
      )}

      {/* Follow-up Questions */}
      {insight?.followup_questions && insight.followup_questions.length > 0 && (
        <FollowupSection questions={insight.followup_questions} translate={translate} />
      )}

      {/* Personality Insight */}
      <ErrorBoundary>
        <PersonalityInsight lang={language} compact className={styles.personalityInsight} />
      </ErrorBoundary>

      {saveMessage && (
        <div className={styles.saveMessage} role="status" aria-live="polite">
          {saveMessage}
        </div>
      )}

      {/* Action Buttons */}
      <ActionButtons
        language={language}
        isSaved={isSaved}
        isSaving={isSaving}
        onSave={handleSaveReading}
        onReset={handleReset}
      />
    </div>
  )
}
