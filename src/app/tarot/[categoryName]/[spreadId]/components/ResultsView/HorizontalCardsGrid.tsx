'use client'

import React from 'react'
import Image from 'next/image'
import type { ReadingResult } from '../../types'
import type { CardColor } from '../../constants'
import { getCardImagePath, type DeckStyle, type DrawnCard } from '@/lib/tarot/tarot.types'
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
  translate,
}: HorizontalCardsGridProps) {
  return (
    <div className={styles.resultsGridHorizontal}>
      {readingResult.drawnCards.map((drawnCard: DrawnCard, index: number) => {
        const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright
        // 자리 라벨은 LLM 응답에서 명명되지만 카드 선택 단계에서는
        // 아직 응답 전 → ordinal 만 표시.
        const positionTitle = language === 'ko' ? `${index + 1}번 카드` : `Card ${index + 1}`
        const revealed = isCardRevealed(index)
        const canReveal = canRevealCard(index)

        const handleCardClick = () => {
          if (revealed) {
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
                ? `${positionTitle}: ${language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name}${drawnCard.isReversed ? ` (${language === 'ko' ? '역방향' : 'reversed'})` : ''}`
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
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>
                {language === 'ko' ? '카드 위치' : 'Position'}
              </span>
              <div className={styles.positionBadgeHorizontal}>{positionTitle}</div>
            </div>

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
                      {translate(
                        'tarot.results.clickToReveal',
                        language === 'ko' ? '클릭하세요' : 'Click to reveal'
                      )}
                    </div>
                  )}
                  {!canReveal && <div className={styles.lockIcon}>🔒</div>}
                </div>
              )}
            </div>

            {revealed && (
              <div className={styles.cardInfoCompact}>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>{language === 'ko' ? '카드명' : 'Card'}</span>
                  <h3 className={styles.cardNameCompact}>
                    {language === 'ko'
                      ? drawnCard.card.nameKo || drawnCard.card.name
                      : drawnCard.card.name}
                  </h3>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>
                    {language === 'ko' ? '키워드' : 'Keywords'}
                  </span>
                  <div className={styles.keywordsCompact}>
                    {(language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords)
                      .slice(0, 2)
                      .map((keyword: string, keywordIndex: number) => (
                        <span key={keywordIndex} className={styles.keywordTagCompact}>
                          {keyword}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
