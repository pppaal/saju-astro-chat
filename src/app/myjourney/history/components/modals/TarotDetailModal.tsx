import { useState } from 'react'
import Image from 'next/image'
import type { TarotContent, ServiceRecord } from '../../lib'
import { formatDate } from '../../lib'
import { getCardImagePath } from '@/lib/Tarot/tarot.types'
import styles from '../../history.module.css'

type TarotDetailModalProps = {
  detail: TarotContent
  selectedRecord?: ServiceRecord
  recordDate?: string
}

export function TarotDetailModal({ detail, selectedRecord, recordDate }: TarotDetailModalProps) {
  const displayDate = recordDate || selectedRecord?.date
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <div className={styles.tarotDetail}>
      {/* Header */}
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>🃏</span>
        <div>
          <h2>타로 리딩</h2>
          <p className={styles.destinyTheme}>{detail.spreadTitle}</p>
        </div>
      </div>

      {/* User Question */}
      {detail.userQuestion && (
        <div className={styles.questionBox}>
          <span className={styles.questionIcon}>❓</span>
          <p>{detail.userQuestion}</p>
        </div>
      )}

      {/* Overall Message */}
      {detail.overallMessage && (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>🔮</span> AI 해석
          </h3>
          <div className={styles.aiBlock}>
            <p>{detail.overallMessage}</p>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>뽑은 카드</h3>
        <div className={styles.tarotCards}>
          {detail.cards.map((card, idx) => {
            const cardInsight = detail.cardInsights?.find(
              (ci) => ci.card_name === card.name || ci.card_name === card.nameKo
            )
            const isExpanded = expandedCards.has(idx)
            const cardImagePath = card.cardId
              ? getCardImagePath(card.cardId)
              : card.image || '/images/tarot/card-back.webp'

            return (
              <div
                key={idx}
                className={`${styles.tarotCard} ${isExpanded ? styles.tarotCardExpanded : ''}`}
                onClick={() => toggleCard(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleCard(idx)
                  }
                }}
              >
                <div className={styles.tarotCardHeader}>
                  {card.position && <span className={styles.cardPosition}>{card.position}</span>}
                  <span
                    className={`${styles.cardOrientation} ${card.isReversed ? styles.reversed : ''}`}
                  >
                    {card.isReversed ? '역방향' : '정방향'}
                  </span>
                </div>

                {/* Card Image */}
                <div
                  className={`${styles.cardImageWrapper} ${card.isReversed ? styles.cardImageReversed : ''}`}
                >
                  <Image
                    src={cardImagePath}
                    alt={card.nameKo || card.name}
                    width={140}
                    height={245}
                    className={styles.cardImage}
                  />
                </div>

                <div className={styles.cardName}>{card.nameKo || card.name}</div>
                {card.nameKo && card.name !== card.nameKo && (
                  <div className={styles.cardNameEn}>{card.name}</div>
                )}

                {isExpanded && cardInsight?.interpretation && (
                  <div className={styles.cardInsight}>
                    <p>{cardInsight.interpretation}</p>
                  </div>
                )}

                <div className={styles.expandHint}>
                  {isExpanded ? '▲ 클릭하여 닫기' : '▼ 클릭하여 자세히 보기'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Guidance */}
      {detail.guidance && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>💡 조언</h3>
          <p>{detail.guidance}</p>
        </div>
      )}

      {/* Affirmation */}
      {detail.affirmation && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>✨ 확언</h3>
          <p className={styles.affirmation}>{detail.affirmation}</p>
        </div>
      )}

      {/* Timestamp */}
      {displayDate && <p className={styles.timestamp}>{formatDate(displayDate)}</p>}
    </div>
  )
}
