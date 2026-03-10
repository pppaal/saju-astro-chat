'use client'

import React from 'react'
import type { ReadingResult, InterpretationResult } from '../../types'
import { ChatMessage } from './ChatMessage'
import styles from '../../tarot-reading.module.css'

interface CardInterpretationChatProps {
  readingResult: ReadingResult
  interpretation: InterpretationResult | null
  language: string
  revealedCards: number[]
}

/**
 * Per-card AI interpretations displayed as chat messages
 */
export function CardInterpretationChat({
  readingResult,
  interpretation,
  language,
  revealedCards,
}: CardInterpretationChatProps) {
  if (revealedCards.length !== readingResult.drawnCards.length || !interpretation) {
    return null
  }

  return (
    <div className={styles.cardInterpretationsChat}>
      {readingResult.drawnCards.map((drawnCard, index) => {
        const cardInsight = interpretation?.card_insights?.[index]
        const position = readingResult.spread.positions[index]
        const positionTitle =
          (language === 'ko' ? position?.titleKo || position?.title : position?.title) ||
          `Card ${index + 1}`
        const cardName =
          language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name
        const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright

        const interp = cardInsight?.interpretation?.trim() || ''
        const isDefaultGenericMessage =
          interp.includes('카드의 메시지에 귀 기울여') || interp.includes('Listen to the cards')

        if (
          !interp ||
          interp === meaning.meaning ||
          interp === meaning.meaningKo ||
          isDefaultGenericMessage
        ) {
          return null
        }

        return (
          <ChatMessage
            key={index}
            avatar="🃏"
            name={
              <>
                <span className={styles.cardPosition}>{positionTitle}</span>
                <span className={styles.cardNameLabel}>
                  {cardName}
                  {drawnCard.isReversed ? ' (역방향)' : ''}
                </span>
              </>
            }
          >
            <p className={styles.chatText}>{interp}</p>
          </ChatMessage>
        )
      })}
    </div>
  )
}
