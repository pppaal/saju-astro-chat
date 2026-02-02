'use client'

import React from 'react'
import Image from 'next/image'
import type { DrawnCard, DeckStyle } from '@/lib/Tarot/tarot.types'
import type { CardInsight } from '../../types'
import { getCardImagePath } from '@/lib/Tarot/tarot.types'
import { InsightCard } from './InsightCard'
import styles from '../../tarot-reading.module.css'

interface DetailedCardItemProps {
  drawnCard: DrawnCard
  index: number
  positionTitle: string
  cardInsight?: CardInsight
  language: string
  isExpanded: boolean
  selectedDeckStyle: DeckStyle
  onToggle: (index: number) => void
  translate: (key: string, fallback: string) => string
}

export function DetailedCardItem({
  drawnCard,
  index,
  positionTitle,
  cardInsight,
  language,
  isExpanded,
  selectedDeckStyle,
  onToggle,
  translate,
}: DetailedCardItemProps) {
  const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright

  return (
    <div
      className={`${styles.resultCardSlot} ${isExpanded ? styles.expanded : ''}`}
      style={{ '--card-index': index } as React.CSSProperties}
      onClick={() => onToggle(index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(index)
        }
      }}
    >
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
          onError={(e) => {
            e.currentTarget.style.opacity = '0.3'
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
          {(language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords).map(
            (keyword, i) => (
              <span key={i} className={styles.keywordTag}>
                {keyword}
              </span>
            )
          )}
        </div>

        <p className={styles.meaning}>
          {language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning}
        </p>

        {/* Premium Insights */}
        {cardInsight && (
          <div className={styles.premiumInsights}>
            {/* AI Interpretation */}
            {cardInsight.interpretation &&
              cardInsight.interpretation.length > 0 &&
              cardInsight.interpretation !== meaning.meaning &&
              cardInsight.interpretation !== meaning.meaningKo && (
                <InsightCard
                  icon="🔮"
                  title={translate('tarot.insights.aiInterpretation', 'Deep Insight')}
                >
                  <p className={styles.insightText}>{cardInsight.interpretation}</p>
                </InsightCard>
              )}

            {/* Spirit Animal */}
            {cardInsight.spirit_animal && (
              <InsightCard
                icon="🦋"
                title={translate('tarot.insights.spiritAnimal', 'Spirit Animal')}
              >
                <div className={styles.spiritAnimal}>
                  <span className={styles.animalName}>{cardInsight.spirit_animal.name}</span>
                  <p className={styles.animalMeaning}>{cardInsight.spirit_animal.meaning}</p>
                  <p className={styles.animalMessage}>
                    &quot;{cardInsight.spirit_animal.message}&quot;
                  </p>
                </div>
              </InsightCard>
            )}

            {/* Chakra Connection */}
            {cardInsight.chakra && (
              <InsightCard
                icon="🧘"
                title={translate('tarot.insights.chakra', 'Chakra Connection')}
              >
                <div className={styles.chakraInfo}>
                  <span
                    className={styles.chakraDot}
                    style={{ backgroundColor: cardInsight.chakra.color }}
                  ></span>
                  <span className={styles.chakraName}>{cardInsight.chakra.name}</span>
                  <p className={styles.chakraGuidance}>{cardInsight.chakra.guidance}</p>
                </div>
              </InsightCard>
            )}

            {/* Shadow Work */}
            {cardInsight.shadow && (
              <InsightCard icon="🌙" title={translate('tarot.insights.shadowWork', 'Shadow Work')}>
                <p className={styles.shadowPrompt}>{cardInsight.shadow.prompt}</p>
                <p className={styles.shadowAffirmation}>💫 {cardInsight.shadow.affirmation}</p>
              </InsightCard>
            )}

            {/* Element Tag */}
            {cardInsight.element && (
              <div className={styles.elementTag}>
                {cardInsight.element === 'Fire' && '🔥'}
                {cardInsight.element === 'Water' && '💧'}
                {cardInsight.element === 'Air' && '🌬️'}
                {cardInsight.element === 'Earth' && '🌍'}
                {cardInsight.element}
              </div>
            )}
          </div>
        )}

        <div className={styles.expandHint}>
          {isExpanded
            ? translate('tarot.results.clickToCollapse', '▲ Click to collapse')
            : translate('tarot.results.clickToExpand', '▼ Click for more insights')}
        </div>
      </div>
    </div>
  )
}
