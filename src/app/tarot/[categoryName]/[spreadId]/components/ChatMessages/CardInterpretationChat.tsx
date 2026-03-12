'use client'

import React from 'react'
import type { ReadingResult, InterpretationResult } from '../../types'
import { ChatMessage } from './ChatMessage'
import styles from '../../tarot-reading.module.css'

interface CardInterpretationChatProps {
  readingResult: ReadingResult
  interpretation: InterpretationResult | null
  language: string
}

function sentenceList(text: string): string[] {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  return (
    cleaned
      .match(/[^.!?\n]+[.!?]?/g)
      ?.map((line) => line.trim())
      .filter(Boolean) || []
  )
}

function firstSentence(text: string): string {
  return sentenceList(text)[0] || ''
}

export function CardInterpretationChat({
  readingResult,
  interpretation,
  language,
}: CardInterpretationChatProps) {
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
        const defaultMeaning =
          language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning
        const coreLine = firstSentence(defaultMeaning)

        const aiExplanation = firstSentence(cardInsight?.interpretation?.trim() || '')
        const explanationLine =
          aiExplanation && aiExplanation !== coreLine
            ? aiExplanation
            : language === 'ko'
              ? '이 질문에서는 이 카드가 보여주는 핵심 변수부터 확인하는 흐름입니다.'
              : 'In this question, this card asks you to verify the key variable first.'

        return (
          <ChatMessage
            key={index}
            avatar="🃏"
            name={
              <>
                <span className={styles.cardPosition}>{positionTitle}</span>
                <span className={styles.cardNameLabel}>
                  {language === 'ko' ? `카드 - ${cardName}` : `Card - ${cardName}`}
                  {drawnCard.isReversed ? (language === 'ko' ? ' (역방향)' : ' (Reversed)') : ''}
                </span>
              </>
            }
          >
            <div className={styles.chatTextGroup}>
              <p className={`${styles.chatText} ${styles.chatParagraph} ${styles.cardQuickLine}`}>
                <strong>{language === 'ko' ? '핵심:' : 'Core:'}</strong> {coreLine}
              </p>
              <p className={`${styles.chatText} ${styles.chatParagraph} ${styles.cardQuickLine}`}>
                <strong>{language === 'ko' ? '설명:' : 'Explanation:'}</strong> {explanationLine}
              </p>
            </div>
          </ChatMessage>
        )
      })}
    </div>
  )
}
