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
  mode?: 'summary' | 'full'
}

function sentenceSlice(text: string, maxSentences: number): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const parts =
    cleaned
      .match(/[^.!?\n]+[.!?]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) || []
  if (parts.length === 0) return cleaned
  return parts.slice(0, maxSentences).join(' ')
}

function emphasizeKeyPoints(text: string) {
  const blocks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return blocks.map((line, lineIndex) => (
    <p key={`p-${lineIndex}`} className={styles.insightParagraph}>
      {line}
    </p>
  ))
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
  mode = 'full',
}: DetailedCardItemProps) {
  const isSummaryMode = mode === 'summary'
  const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright
  const baseMeaning = language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning
  const shortMeaning = sentenceSlice(baseMeaning, 1)
  const practicalMeaning =
    language === 'ko'
      ? `${positionTitle} 포지션에서는 이 의미를 오늘 가능한 한 가지 행동으로 바꾸는 것이 핵심입니다.`
      : `In the ${positionTitle} position, convert this message into one concrete action today.`

  const aiInterpretation = cardInsight?.interpretation?.trim() || ''
  const hasAiInterpretation =
    aiInterpretation.length > 0 &&
    aiInterpretation !== meaning.meaning &&
    aiInterpretation !== meaning.meaningKo
  const aiSummary = sentenceSlice(aiInterpretation, 2)

  const shownKeywords = (
    language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords
  ).slice(0, isSummaryMode ? 2 : 8)

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
          {shownKeywords.map((keyword, i) => (
            <span key={i} className={styles.keywordTag}>
              {keyword}
            </span>
          ))}
        </div>

        <p className={styles.meaning}>{isSummaryMode ? shortMeaning : baseMeaning}</p>
        <p className={styles.practicalMeaning}>{practicalMeaning}</p>

        {hasAiInterpretation && (
          <div className={styles.premiumInsights}>
            <InsightCard
              icon="🔮"
              title={
                language === 'ko'
                  ? translate('tarot.insights.aiInterpretation', '질문 맞춤 AI 해석')
                  : translate('tarot.insights.aiInterpretation', 'Question-tailored insight')
              }
            >
              <div className={styles.insightText}>
                {isSummaryMode ? (
                  <p className={styles.insightParagraph}>{aiSummary || aiInterpretation}</p>
                ) : (
                  emphasizeKeyPoints(aiInterpretation)
                )}
              </div>
            </InsightCard>

            {!isSummaryMode && cardInsight?.spirit_animal && (
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

            {!isSummaryMode && cardInsight?.chakra && (
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

            {!isSummaryMode && cardInsight?.shadow && (
              <InsightCard icon="🌙" title={translate('tarot.insights.shadowWork', 'Shadow Work')}>
                <p className={styles.shadowPrompt}>{cardInsight.shadow.prompt}</p>
                <p className={styles.shadowAffirmation}>💫 {cardInsight.shadow.affirmation}</p>
              </InsightCard>
            )}

            {!isSummaryMode && cardInsight?.element && (
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
