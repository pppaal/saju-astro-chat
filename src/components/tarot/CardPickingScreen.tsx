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
              âœ¨{' '}
              {isKo
                ? 'ë§ˆìŒì´ ì´ë„ëŠ” ëŒ€ë¡œ ì¹´ë“œë¥¼ ì„ íƒí•˜ì„¸ìš”'
                : 'Let your intuition guide you to the cards'}
            </p>
          )}
          {gameState === 'revealing' && (
            <>
              <div className={styles.revealingOrb}></div>
              <p className={styles.revealingText}>
                âœ¨{' '}
                {isKo
                  ? 'ì„ íƒ ì™„ë£Œ! ìš´ëª…ì„ ê³µê°œí•˜ëŠ” ì¤‘...'
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
              Ã—
            </button>
            <div className={styles.tooltipIcon}>ðŸ”®</div>
            <h3 className={styles.tooltipTitle}>
              {isKo ? 'ì¹´ë“œ ì„ íƒ ê°€ì´ë“œ' : 'Card Selection Guide'}
            </h3>
            <div className={styles.tooltipSteps}>
              <div className={styles.tooltipStep}>
                <span className={styles.tooltipStepNumber}>1</span>
                <p>
                  {isKo
                    ? 'ì§ˆë¬¸ì— ì§‘ì¤‘í•˜ë©° ë§ˆìŒì„ ê°€ë¼ì•‰ížˆì„¸ìš”'
                    : 'Focus on your question and calm your mind'}
                </p>
              </div>
              <div className={styles.tooltipStep}>
                <span className={styles.tooltipStepNumber}>2</span>
                <p>
                  {isKo
                    ? `ì§ê´€ì ìœ¼ë¡œ ëŒë¦¬ëŠ” ì¹´ë“œ ${cardCount}ìž¥ì„ ì„ íƒí•˜ì„¸ìš”`
                    : `Intuitively select ${cardCount} cards that call to you`}
                </p>
              </div>
              <div className={styles.tooltipStep}>
                <span className={styles.tooltipStepNumber}>3</span>
                <p>
                  {isKo
                    ? 'ì²« ëŠë‚Œì„ ë¯¿ê³  ë„ˆë¬´ ê³ ë¯¼í•˜ì§€ ë§ˆì„¸ìš”'
                    : "Trust your first instinct, don't overthink"}
                </p>
              </div>
            </div>
            <button className={styles.tooltipButton} onClick={handleDismissTooltip}>
              {isKo ? 'ì‹œìž‘í•˜ê¸°' : 'Start'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'picking' && (
        <>
          <div className={styles.topRightControls}>
            <div className={styles.progressBadge}>
              <span className={styles.progressLabel}>{isKo ? 'ì„ íƒ' : 'Selected'}</span>
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
              {isKo ? 'ë‹¤ì‹œ íŽ¼ì¹˜ê¸°' : 'Redraw'}
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
                  ? `ì¹´ë“œ ${index + 1}${isSelected ? `, ì„ íƒë¨ (${displayNumber}ë²ˆì§¸)` : ''}`
                  : `Card ${index + 1}${isSelected ? `, selected (${displayNumber})` : ''}`
              }
              disabled={gameState !== 'picking'}
            >
              <div className={styles.cardBack}>
                <div className={styles.cardPattern}></div>
                <div className={styles.cardCenterIcon}>âœ¦</div>
              </div>
              {isSelected && <div className={styles.selectionNumber}>{displayNumber}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
