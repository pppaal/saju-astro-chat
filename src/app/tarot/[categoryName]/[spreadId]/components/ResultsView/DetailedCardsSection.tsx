'use client'

import React from 'react'
import type { DeckStyle } from '@/lib/tarot/tarot.types'
import type { ReadingResult, InterpretationResult } from '../../types'
import { DetailedCardItem } from './DetailedCardItem'

interface DetailedCardsSectionProps {
  readingResult: ReadingResult
  interpretation: InterpretationResult | null
  language: string
  selectedDeckStyle: DeckStyle
  revealedCards: number[]
  detailedSectionRef?: React.RefObject<HTMLDivElement | null>
  translate: (key: string, fallback: string) => string
}

export function DetailedCardsSection({
  readingResult,
  interpretation,
  language,
  selectedDeckStyle,
  revealedCards,
  detailedSectionRef,
  translate,
}: DetailedCardsSectionProps) {
  if (revealedCards.length !== readingResult.drawnCards.length) {
    return null
  }

  const isKo = language === 'ko'

  return (
    <section ref={detailedSectionRef} className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-indigo-300 tracking-wider uppercase">
          {translate(
            'tarot.results.detailedReadings',
            isKo ? '카드별 해석' : 'Per-Card Reading'
          )}
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {readingResult.drawnCards.map((drawnCard, index) => {
          const position = readingResult.spread.positions[index]
          const positionTitle =
            (isKo ? position?.titleKo || position?.title : position?.title) ||
            (isKo ? `카드 ${index + 1}` : `Card ${index + 1}`)
          const cardInsight = interpretation?.card_insights?.[index]

          return (
            <DetailedCardItem
              key={index}
              drawnCard={drawnCard}
              index={index}
              positionTitle={positionTitle}
              cardInsight={cardInsight}
              language={language}
              selectedDeckStyle={selectedDeckStyle}
              translate={translate}
            />
          )
        })}
      </div>
    </section>
  )
}
