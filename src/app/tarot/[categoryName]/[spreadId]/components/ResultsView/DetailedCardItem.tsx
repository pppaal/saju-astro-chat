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

function emphasizeKeyPoints(text: string) {
  const blocks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const keyPointRegex =
    /^(결론|요약|핵심|메시지|오늘|이번\s*주|다음\s*7일|action|summary|key|today|this week|within 7 days)\s*[:：-]/i

  return blocks.map((line, lineIndex) => {
    const keyPointMatch = line.match(keyPointRegex)
    if (keyPointMatch) {
      const marker = keyPointMatch[0]
      const content = line.slice(marker.length).trim()
      return (
        <p key={`kp-${lineIndex}`} className={styles.insightParagraph}>
          <strong className={styles.insightKeyPoint}>{marker.trim()}</strong>
          {content ? ` ${content}` : ''}
        </p>
      )
    }

    const bulletMatch = line.match(/^[-•]\s*(.+)$/)
    if (bulletMatch) {
      return (
        <p key={`bl-${lineIndex}`} className={styles.insightParagraph}>
          • {bulletMatch[1]}
        </p>
      )
    }

    return (
      <p key={`p-${lineIndex}`} className={styles.insightParagraph}>
        {line}
      </p>
    )
  })
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
  const baseMeaning = language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning
  const practicalMeaning =
    language === 'ko'
      ? `${positionTitle} 자리에서는 '${baseMeaning}' 메시지를 오늘 실행 1개로 바꾸는 게 핵심입니다. 지금 바로 20분 안에 끝낼 수 있는 행동 하나를 정하고, 이번 주에 결과를 기록해 다음 선택 기준으로 삼으세요.`
      : `In the ${positionTitle} position, the key message is "${baseMeaning}". Convert it into one action you can complete within 20 minutes today, then log outcomes this week to refine your next choice.`

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

        <p className={styles.meaning}>{baseMeaning}</p>
        <p className={styles.practicalMeaning}>{practicalMeaning}</p>

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
                  title={
                    language === 'ko'
                      ? translate('tarot.insights.aiInterpretation', '질문 맞춤 AI 해석')
                      : translate('tarot.insights.aiInterpretation', 'Question-tailored insight')
                  }
                >
                  <div className={styles.insightText}>
                    {emphasizeKeyPoints(cardInsight.interpretation)}
                  </div>
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
