'use client'

import React from 'react'
import type { DeckStyle } from '@/lib/Tarot/tarot.types'
import type { ReadingResult, InterpretationResult } from '../../types'
import { DetailedCardItem } from './DetailedCardItem'
import styles from '../../tarot-reading.module.css'

interface DetailedCardsSectionProps {
  readingResult: ReadingResult
  interpretation: InterpretationResult | null
  language: string
  selectedDeckStyle: DeckStyle
  revealedCards: number[]
  expandedCard: number | null
  onToggleExpand: (index: number) => void
  detailedSectionRef: React.RefObject<HTMLDivElement | null>
  translate: (key: string, fallback: string) => string
}

export function DetailedCardsSection({
  readingResult,
  interpretation,
  language,
  selectedDeckStyle,
  revealedCards,
  expandedCard,
  onToggleExpand,
  detailedSectionRef,
  translate,
}: DetailedCardsSectionProps) {
  // Only show when all cards are revealed
  if (revealedCards.length !== readingResult.drawnCards.length) {
    return null
  }

  return (
    <div className={styles.detailedCardsSection} ref={detailedSectionRef}>
      <h2 className={styles.detailedSectionTitle}>
        {translate('tarot.results.detailedReadings', '상세 해석')}
      </h2>
      <div className={styles.resultsGrid}>
        {readingResult.drawnCards.map((drawnCard, index) => {
          const position = readingResult.spread.positions[index]
          const positionTitle =
            (language === 'ko' ? position?.titleKo || position?.title : position?.title) ||
            (language === 'ko' ? `카드 ${index + 1}` : `Card ${index + 1}`)
          const cardInsight = interpretation?.card_insights?.[index]
          const isExpanded = expandedCard === index

          return (
            <DetailedCardItem
              key={index}
              drawnCard={drawnCard}
              index={index}
              positionTitle={positionTitle}
              cardInsight={cardInsight}
              language={language}
              isExpanded={isExpanded}
              selectedDeckStyle={selectedDeckStyle}
              onToggle={onToggleExpand}
              translate={translate}
            />
          )
        })}
      </div>
    </div>
  )
}
