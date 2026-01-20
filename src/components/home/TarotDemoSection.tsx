import React from 'react';
import type { TarotCard } from '@/data/home';
import styles from './TarotDemoSection.module.css';

interface TarotDemoSectionProps {
  selectedCards: TarotCard[];
  flippedCards: boolean[];
  isDeckSpread: boolean;
  locale: string;
  onCardClick: (index: number) => void;
  onDeckClick: () => void;
  translate: (key: string, fallback: string) => string;
  cardBackImage: string;
}

export function TarotDemoSection({
  selectedCards,
  flippedCards,
  isDeckSpread,
  locale,
  onCardClick,
  onDeckClick,
  translate,
  cardBackImage,
}: TarotDemoSectionProps) {
  return (
    <div className={styles.tarotContainer}>
      {/* Card Deck - Semi-circular spread */}
      <div className={styles.tarotDeckContainer}>
        <div
          className={`${styles.tarotDeck} ${isDeckSpread ? styles.deckSpread : ''}`}
          onClick={onDeckClick}
        >
          {[...Array(13)].map((_, i) => {
            const totalCards = 13;
            const centerIndex = (totalCards - 1) / 2;
            const angleSpread = 120;
            const anglePerCard = angleSpread / (totalCards - 1);
            const cardAngle = (i - centerIndex) * anglePerCard;
            const radius = 160;

            return (
              <div
                key={i}
                className={styles.deckCard}
                style={{
                  transform: isDeckSpread
                    ? `rotate(${cardAngle}deg) translateY(-${radius}px)`
                    : `translateY(${i * 0.3}px) rotate(${(i - centerIndex) * 0.3}deg)`,
                  zIndex: isDeckSpread ? (i <= centerIndex ? i + 1 : totalCards - i) : totalCards - i,
                  transition: `all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s`,
                  transformOrigin: 'center bottom',
                }}
              >
                <div className={styles.deckCardDesign}>
                  <span className={styles.deckCardIcon}>✦</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className={styles.deckLabel} suppressHydrationWarning>
          {isDeckSpread
            ? translate('landing.tarotDeckReset', '클릭하여 카드 그리기')
            : translate('landing.tarotDeckLabel', '클릭하여 카드 그리기')}
        </p>
      </div>

      {/* Selected Cards - only show when cards are drawn */}
      {selectedCards.length > 0 && (
        <>
          <div className={styles.tarotCards}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`${styles.tarotCard} ${flippedCards[index] ? styles.flipped : ''}`}
                onClick={() => onCardClick(index)}
              >
                <div className={styles.cardInner}>
                  <div className={styles.cardBack}>
                    <div className={styles.cardBackDesign}>
                      <div className={styles.cardBackBorder}>
                        <span className={styles.cardBackIcon}>✦</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardFront}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedCards[index]?.image || cardBackImage}
                      alt={selectedCards[index]?.name || 'Tarot Card'}
                      className={styles.cardImage}
                    />
                    <div className={styles.cardName}>
                      {locale === 'ko' ? selectedCards[index]?.nameKo : selectedCards[index]?.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.tarotLabels}>
            <span>{translate('landing.tarotPast', '과거')}</span>
            <span>{translate('landing.tarotPresent', '현재')}</span>
            <span>{translate('landing.tarotFuture', '미래')}</span>
            <span>{translate('landing.tarotAdvice', '조언')}</span>
          </div>
        </>
      )}
    </div>
  );
}
