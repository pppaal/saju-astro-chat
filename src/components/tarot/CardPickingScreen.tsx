import React, { useState, useEffect } from 'react'
import BackButton from '@/components/ui/BackButton'
import type { Spread } from '@/lib/Tarot/tarot.types'
import type { CardColorOption } from '@/lib/Tarot/tarotThemeConfig'
import styles from './CardPickingScreen.module.css'

interface CardPickingScreenProps {
  locale: string
  spreadInfo: Spread
  selectedColor: CardColorOption
  selectedIndices: number[]
  selectionOrderMap: Map<number, number>
  gameState: string
  isSpreading: boolean
  onCardClick: (index: number) => void
  onRedraw: () => void
}

export function CardPickingScreen({
  locale,
  spreadInfo,
  selectedColor,
  selectedIndices,
  selectionOrderMap,
  gameState,
  isSpreading,
  onCardClick,
  onRedraw,
}: CardPickingScreenProps) {
  const isKo = locale === 'ko'
  const cardCount = spreadInfo?.cardCount || 3

  // First-time user tooltip
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    // Check if user has seen the tooltip before
    const hasSeenTooltip = localStorage.getItem('tarot_card_picking_tooltip_seen')
    if (!hasSeenTooltip && gameState === 'picking') {
      setShowTooltip(true)
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setShowTooltip(false)
        localStorage.setItem('tarot_card_picking_tooltip_seen', 'true')
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [gameState])

  const handleDismissTooltip = () => {
    setShowTooltip(false)
    localStorage.setItem('tarot_card_picking_tooltip_seen', 'true')
  }

  return (
    <div className={styles.readingContainer}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>

      <div className={styles.instructions}>
        <h1 className={styles.instructionTitle}>
          {isKo ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}
        </h1>
        <div className={styles.instructionContent}>
          {gameState === 'picking' && selectedIndices.length === 0 && (
            <p className={styles.guidanceText}>
              ✨{' '}
              {isKo
                ? '마음이 이끄는 대로 카드를 선택하세요'
                : 'Let your intuition guide you to the cards'}
            </p>
          )}
          {gameState === 'revealing' && (
            <>
              <div className={styles.revealingOrb}></div>
              <p className={styles.revealingText}>
                ✨{' '}
                {isKo
                  ? '선택 완료! 운명을 공개하는 중...'
                  : 'Selection Complete! Revealing your destiny...'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* First-time user tooltip */}
      {showTooltip && gameState === 'picking' && (
        <div className={styles.tooltipOverlay} onClick={handleDismissTooltip}>
          <div className={styles.tooltipCard} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.tooltipClose}
              onClick={handleDismissTooltip}
              aria-label="Close"
            >
              ×
            </button>
            <div className={styles.tooltipIcon}>🔮</div>
            <h3 className={styles.tooltipTitle}>
              {isKo ? '카드 선택 가이드' : 'Card Selection Guide'}
            </h3>
            <div className={styles.tooltipSteps}>
              <div className={styles.tooltipStep}>
                <span className={styles.tooltipStepNumber}>1</span>
                <p>
                  {isKo
                    ? '질문에 집중하며 마음을 가라앉히세요'
                    : 'Focus on your question and calm your mind'}
                </p>
              </div>
              <div className={styles.tooltipStep}>
                <span className={styles.tooltipStepNumber}>2</span>
                <p>
                  {isKo
                    ? `직관적으로 끌리는 카드 ${cardCount}장을 선택하세요`
                    : `Intuitively select ${cardCount} cards that call to you`}
                </p>
              </div>
              <div className={styles.tooltipStep}>
                <span className={styles.tooltipStepNumber}>3</span>
                <p>
                  {isKo
                    ? '첫 느낌을 믿고 너무 고민하지 마세요'
                    : "Trust your first instinct, don't overthink"}
                </p>
              </div>
            </div>
            <button className={styles.tooltipButton} onClick={handleDismissTooltip}>
              {isKo ? '시작하기' : 'Start'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'picking' && (
        <>
          <div className={styles.topRightControls}>
            <div className={styles.progressBadge}>
              <span className={styles.progressLabel}>{isKo ? '선택' : 'Selected'}</span>
              <span className={styles.progressCount}>
                {selectedIndices.length} / {cardCount}
              </span>
            </div>
          </div>
          {selectedIndices.length > 0 && (
            <button
              className={styles.redrawButtonBottomRight}
              onClick={onRedraw}
              data-testid="tarot-redraw-button"
            >
              {isKo ? '다시 펼치기' : 'Redraw'}
            </button>
          )}
        </>
      )}

      <div className={styles.cardSpreadContainer}>
        {Array.from({ length: 78 }).map((_, index) => {
          const isSelected = selectionOrderMap.has(index)
          const displayNumber = selectionOrderMap.get(index) || 0
          return (
            <button
              key={`card-${index}-${displayNumber}`}
              className={`${styles.cardWrapper} ${isSelected ? styles.selected : ''} ${
                gameState === 'revealing' ? styles.revealing : ''
              } ${isSpreading ? styles.spreading : ''}`}
              style={
                {
                  '--selection-order': displayNumber,
                  '--i': index,
                  '--card-gradient': selectedColor.gradient,
                  '--card-border': selectedColor.border,
                  '--card-back-image': `url(${selectedColor.backImage})`,
                } as React.CSSProperties
              }
              onClick={() => onCardClick(index)}
              data-testid={`tarot-card-${index}`}
              aria-label={
                isKo
                  ? `카드 ${index + 1}${isSelected ? `, 선택됨 (${displayNumber}번째)` : ''}`
                  : `Card ${index + 1}${isSelected ? `, selected (${displayNumber})` : ''}`
              }
              disabled={gameState !== 'picking'}
            >
              <div className={styles.cardBack}>
                <div className={styles.cardPattern}></div>
                <div className={styles.cardCenterIcon}>✦</div>
              </div>
              {isSelected && <div className={styles.selectionNumber}>{displayNumber}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
