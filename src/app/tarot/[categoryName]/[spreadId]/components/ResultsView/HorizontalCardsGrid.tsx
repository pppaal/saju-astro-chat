'use client'

import React from 'react'
import Image from 'next/image'
import type { ReadingResult } from '../../types'
import type { CardColor } from '../../constants'
import { getCardImagePath, type DeckStyle, type DrawnCard } from '@/lib/Tarot/tarot.types'
import styles from '../../tarot-reading.module.css'

interface HorizontalCardsGridProps {
  readingResult: ReadingResult
  selectedColor: CardColor
  selectedDeckStyle: string
  language: string
  revealedCards: number[]
  onCardReveal: (index: number) => void
  canRevealCard: (index: number) => boolean
  isCardRevealed: (index: number) => boolean
  onCardSelect?: (index: number) => void
  translate: (key: string, fallback: string) => string
}

export function HorizontalCardsGrid({
  readingResult,
  selectedColor,
  selectedDeckStyle,
  language,
  onCardReveal,
  canRevealCard,
  isCardRevealed,
  onCardSelect,
  translate,
}: HorizontalCardsGridProps) {
  return (
    <div className={styles.resultsGridHorizontal}>
      {readingResult.drawnCards.map((drawnCard: DrawnCard, index: number) => {
        const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright
        const position = readingResult.spread.positions[index]
        const positionTitle =
          (language === 'ko' ? position?.titleKo || position?.title : position?.title) ||
          (language === 'ko' ? `카드 ${index + 1}` : `Card ${index + 1}`)
        const revealed = isCardRevealed(index)
        const canReveal = canRevealCard(index)

        const handleCardClick = () => {
          if (revealed) {
            onCardSelect?.(index)
            return
          }
          if (canReveal) {
            onCardReveal(index)
          }
        }

        return (
          <div
            key={index}
            className={`${styles.resultCardHorizontal} ${revealed ? styles.revealed : ''} ${canReveal ? styles.canReveal : ''}`}
            style={
              {
                animationDelay: `${index * 0.15}s`,
                '--card-back-image': `url(${selectedColor.backImage})`,
                '--card-border': selectedColor.border,
              } as React.CSSProperties
            }
            onClick={handleCardClick}
            role="button"
            tabIndex={revealed || canReveal ? 0 : -1}
            aria-label={
              revealed
                ? `${positionTitle}: ${language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name}${drawnCard.isReversed ? ` (${language === 'ko' ? '역위' : 'reversed'})` : ''}`
                : `${positionTitle} - ${canReveal ? (language === 'ko' ? '클릭하여 공개' : 'Click to reveal') : language === 'ko' ? '잠김' : 'Locked'}`
            }
            aria-pressed={revealed}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') {
                return
              }
              event.preventDefault()
              handleCardClick()
            }}
          >
            <div className={styles.cardNumberBadge}>{index + 1}</div>
            <div className={styles.positionBadgeHorizontal}>{positionTitle}</div>

            <div className={styles.cardContainerLarge}>
              {revealed ? (
                <div className={styles.cardFlipInnerSlow}>
                  <div className={styles.cardBackResultLarge}></div>
                  <div className={styles.cardFrontLarge}>
                    <Image
                      src={getCardImagePath(drawnCard.card.id, selectedDeckStyle as DeckStyle)}
                      alt={drawnCard.card.name}
                      width={180}
                      height={315}
                      className={styles.resultCardImageLarge}
                      placeholder="empty"
                      onError={(event) => {
                        event.currentTarget.style.opacity = '0.3'
                      }}
                    />
                    {drawnCard.isReversed && (
                      <div className={styles.reversedLabelLarge}>
                        {translate('tarot.results.reversed', 'Reversed')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`${styles.cardBackLarge} ${canReveal ? styles.clickable : styles.locked}`}
                >
                  <div className={styles.cardBackImageLarge}></div>
                  {canReveal && (
                    <div className={styles.clickPrompt}>
                      {translate('tarot.results.clickToReveal', language === 'ko' ? '클릭하세요' : 'Click to reveal')}
                    </div>
                  )}
                  {!canReveal && <div className={styles.lockIcon}>🔒</div>}
                </div>
              )}
            </div>

            {revealed && (
              <div className={styles.cardInfoCompact}>
                <h3 className={styles.cardNameCompact}>
                  {language === 'ko'
                    ? drawnCard.card.nameKo || drawnCard.card.name
                    : drawnCard.card.name}
                </h3>
                <div className={styles.keywordsCompact}>
                  {(language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords)
                    .slice(0, 2)
                    .map((keyword: string, keywordIndex: number) => (
                      <span key={keywordIndex} className={styles.keywordTagCompact}>
                        {keyword}
                      </span>
                    ))}
                </div>
                <div className={styles.detailHintCompact}>
                  {translate(
                    'tarot.results.viewCardDetail',
                    language === 'ko' ? '눌러서 상세 해석 보기' : 'Tap for detailed reading'
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
