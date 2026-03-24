import React, { useEffect, useState } from 'react'
import BackButton from '@/components/ui/BackButton'
import { getDeckPreviewImagePath } from '@/lib/Tarot/deckPreview'
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
  const spreadTitle = isKo ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title
  const positionLabels = spreadInfo.positions
    .slice(0, cardCount)
    .map((position, index) =>
      isKo
        ? position.titleKo || position.title || `카드 ${index + 1}`
        : position.title || `Card ${index + 1}`
    )
  const nextSelectionOrder = Math.min(selectedIndices.length + 1, cardCount)
  const nextSelectionIndex = Math.min(selectedIndices.length, Math.max(cardCount - 1, 0))
  const activePositionLabel = positionLabels[nextSelectionIndex] || ''
  const fanBackImage = getDeckPreviewImagePath(selectedColor.backImage)
  const instructionTitle =
    gameState === 'revealing'
      ? isKo
        ? '선택한 카드의 흐름을 읽고 있습니다'
        : 'Reading the flow of your selected cards'
      : isKo
        ? `끌리는 카드를 ${cardCount}장 선택하세요`
        : `Select ${cardCount} cards that call to you`
  const guidanceText =
    gameState === 'revealing'
      ? isKo
        ? '선택이 완료되었습니다. 카드의 연결과 흐름을 해석하고 있습니다.'
        : 'Your selection is complete. Interpreting the links and flow between the cards.'
      : selectedIndices.length === 0
        ? isKo
          ? '자연스럽게 마음이 끌리는 카드부터 고르세요. 첫 느낌이 가장 정확합니다.'
          : 'Begin with the card that draws you in naturally. Your first instinct is usually right.'
        : activePositionLabel
          ? isKo
            ? `${nextSelectionOrder}번째 자리인 ${activePositionLabel}에 놓일 카드를 골라보세요.`
            : `Choose the card that belongs in the ${activePositionLabel} position next.`
          : isKo
            ? '질문을 떠올리며 순서대로 카드를 선택하세요.'
            : 'Keep your question in mind and continue choosing in order.'

  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('tarot_card_picking_tooltip_seen')
    if (!hasSeenTooltip && gameState === 'picking') {
      setShowTooltip(true)
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
        <p className={styles.spreadLabel}>{spreadTitle}</p>
        <h1 className={styles.instructionTitle}>{instructionTitle}</h1>
        <div className={styles.instructionContent}>
          <p className={styles.guidanceText}>{guidanceText}</p>
          {gameState === 'picking' && activePositionLabel ? (
            <div className={styles.currentPositionPanel}>
              <span className={styles.currentPositionNumber}>{nextSelectionOrder}</span>
              <div className={styles.currentPositionText}>
                <span className={styles.currentPositionEyebrow}>
                  {isKo ? '현재 선택할 위치' : 'Current position'}
                </span>
                <strong className={styles.currentPositionLabel}>{activePositionLabel}</strong>
              </div>
            </div>
          ) : null}
          {gameState === 'revealing' && (
            <>
              <div className={styles.revealingOrb}></div>
              <p className={styles.revealingText}>
                {isKo
                  ? '선택 완료. 해석을 준비하고 있어요. 보통 5~10초 정도 걸립니다.'
                  : 'Selection complete. Preparing your reading. This usually takes 5 to 10 seconds.'}
              </p>
            </>
          )}
        </div>
      </div>

      {showTooltip && gameState === 'picking' && (
        <div className={styles.tooltipOverlay} onClick={handleDismissTooltip}>
          <div className={styles.tooltipCard} onClick={(event) => event.stopPropagation()}>
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
          const selectionLabel = displayNumber > 0 ? positionLabels[displayNumber - 1] : ''

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
                  '--card-back-image': `url(${fanBackImage})`,
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
              {isSelected && selectionLabel ? (
                <div className={styles.selectionPositionLabel}>{selectionLabel}</div>
              ) : null}
            </button>
          )
        })}

        <div className={styles.positionGuide} aria-hidden>
          <div className={styles.positionGuideArc} />
          <div className={styles.positionGuideTrack}>
            {positionLabels.map((label, index) => {
              const order = index + 1
              const isComplete = selectedIndices.length > index
              const isCurrent = selectedIndices.length === index && gameState === 'picking'

              return (
                <div
                  key={`${spreadInfo.id}-position-${order}`}
                  className={`${styles.positionGuideItem} ${
                    isComplete ? styles.positionGuideItemComplete : ''
                  } ${isCurrent ? styles.positionGuideItemCurrent : ''}`}
                >
                  <span className={styles.positionGuideIndex}>{order}</span>
                  <span className={styles.positionGuideLabel}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
