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
  const sentences = sentenceList(text)
  return sentences[0] || ''
}

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

        const interpretationText = cardInsight?.interpretation?.trim() || ''
        const defaultMeaning =
          language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning
        const insights = sentenceList(interpretationText)
        const questionMeaning =
          insights.length > 0
            ? insights.slice(0, 2).join(' ')
            : language === 'ko'
              ? '이 카드의 흐름은 현재 질문에서 핵심 변수 점검이 필요하다는 뜻으로 읽힙니다.'
              : 'This card suggests checking key variables in your current question.'
        const cautionLine =
          insights.length > 1
            ? insights[insights.length - 1]
            : language === 'ko'
              ? '과한 기대나 단정은 피하고 반응을 확인하세요.'
              : 'Avoid forcing certainty and observe real responses first.'

        const isDefaultGenericMessage =
          interpretationText.includes('카드의 메시지에 귀 기울여') ||
          interpretationText.includes('Listen to the cards')

        if (
          !interpretationText ||
          interpretationText === meaning.meaning ||
          interpretationText === meaning.meaningKo ||
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
                  {language === 'ko' ? `핵심 신호 — ${cardName}` : `Signal — ${cardName}`}
                  {drawnCard.isReversed ? (language === 'ko' ? ' (역방향)' : ' (Reversed)') : ''}
                </span>
              </>
            }
          >
            <div className={styles.chatTextGroup}>
              <p className={`${styles.chatText} ${styles.chatParagraph} ${styles.cardQuickLine}`}>
                <strong>{language === 'ko' ? '핵심:' : 'Core:'}</strong>{' '}
                {firstSentence(defaultMeaning)}
              </p>
              <p className={`${styles.chatText} ${styles.chatParagraph} ${styles.cardQuickLine}`}>
                <strong>
                  {language === 'ko' ? '이 질문에서의 뜻:' : 'Meaning for this question:'}
                </strong>{' '}
                {questionMeaning}
              </p>
              <p className={`${styles.chatText} ${styles.chatParagraph} ${styles.cardQuickLine}`}>
                <strong>{language === 'ko' ? '주의/행동:' : 'Caution / action:'}</strong>{' '}
                {cautionLine}
              </p>
            </div>
          </ChatMessage>
        )
      })}
    </div>
  )
}
