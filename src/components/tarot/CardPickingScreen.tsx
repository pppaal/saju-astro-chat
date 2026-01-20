import React from 'react';
import BackButton from '@/components/ui/BackButton';
import type { Spread } from '@/lib/Tarot/tarot.types';
import type { CardColorOption } from '@/lib/Tarot/tarotThemeConfig';
import styles from './CardPickingScreen.module.css';

interface CardPickingScreenProps {
  locale: string;
  spreadInfo: Spread;
  selectedColor: CardColorOption;
  selectedIndices: number[];
  selectionOrderMap: Map<number, number>;
  gameState: string;
  isSpreading: boolean;
  onCardClick: (index: number) => void;
  onRedraw: () => void;
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
  const isKo = locale === 'ko';
  const cardCount = spreadInfo?.cardCount || 3;

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
          {gameState === 'revealing' && (
            <>
              <div className={styles.revealingOrb}></div>
              <p className={styles.revealingText}>
                ✨ {isKo ? '선택 완료! 운명을 공개하는 중...' : 'Selection Complete! Revealing your destiny...'}
              </p>
            </>
          )}
        </div>
      </div>

      {gameState === 'picking' && (
        <div className={styles.topRightControls}>
          <div className={styles.progressBadge}>
            <span className={styles.progressLabel}>{isKo ? '선택' : 'Selected'}</span>
            <span className={styles.progressCount}>
              {selectedIndices.length} / {cardCount}
            </span>
          </div>
          {selectedIndices.length > 0 && (
            <button className={styles.redrawButton} onClick={onRedraw}>
              {isKo ? '다시 그리기' : 'Redraw'}
            </button>
          )}
        </div>
      )}

      <div className={styles.cardSpreadContainer}>
        {Array.from({ length: 78 }).map((_, index) => {
          const isSelected = selectionOrderMap.has(index);
          const displayNumber = selectionOrderMap.get(index) || 0;
          return (
            <div
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
            >
              <div className={styles.cardBack}>
                <div className={styles.cardPattern}></div>
                <div className={styles.cardCenterIcon}>✦</div>
              </div>
              {isSelected && <div className={styles.selectionNumber}>{displayNumber}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
