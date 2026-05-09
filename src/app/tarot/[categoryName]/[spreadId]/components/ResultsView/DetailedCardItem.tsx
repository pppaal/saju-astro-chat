'use client'

import React from 'react'
import Image from 'next/image'
import type { DrawnCard, DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardInsight } from '../../types'
import { getCardImagePath } from '@/lib/Tarot/tarot.types'
import styles from '../../tarot-reading.module.css'

interface DetailedCardItemProps {
  drawnCard: DrawnCard
  index: number
  positionTitle: string
  cardInsight?: CardInsight
  language: string
  selectedDeckStyle: DeckStyle
  translate: (key: string, fallback: string) => string
}

export function DetailedCardItem({
  drawnCard,
  index,
  positionTitle,
  cardInsight,
  language,
  selectedDeckStyle,
  translate,
}: DetailedCardItemProps) {
  const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright
  const baseMeaning = language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning

  const aiInterpretation = cardInsight?.interpretation?.trim() || ''
  const hasAiInterpretation =
    aiInterpretation.length > 0 &&
    aiInterpretation !== meaning.meaning &&
    aiInterpretation !== meaning.meaningKo

  const shownKeywords = (
    language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords
  ).slice(0, 4)

  return (
    <div className={styles.resultCardSlot} style={{ '--card-index': index } as React.CSSProperties}>
      <div className={styles.positionBadgeWithNumber}>
        <span className={styles.cardNumberSmall}>{index + 1}</span>
        <span>{positionTitle}</span>
      </div>

      <div className={styles.imageContainer}>
        <Image
          src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
          alt={drawnCard.card.name}
          width={180}
          height={315}
          className={styles.resultCardImage}
          onError={(event) => {
            event.currentTarget.style.opacity = '0.3'
          }}
        />
        {drawnCard.isReversed && (
          <div className={styles.reversedLabel}>
            {translate('tarot.results.reversed', 'Reversed')}
          </div>
        )}
      </div>

      <div className={styles.cardInfo}>
        <h3 className={styles.cardName}>
          {language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name}
        </h3>

        <div className={styles.keywords}>
          {shownKeywords.map((keyword, keywordIndex) => (
            <span key={keywordIndex} className={styles.keywordTag}>
              {keyword}
            </span>
          ))}
        </div>

        {hasAiInterpretation ? (
          <p className={styles.insightParagraph}>{aiInterpretation}</p>
        ) : (
          <p className={styles.meaning}>{baseMeaning}</p>
        )}
      </div>
    </div>
  )
}
