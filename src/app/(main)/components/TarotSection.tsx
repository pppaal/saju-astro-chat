"use client";

import { useCallback, useReducer, memo } from "react";
import Image from "next/image";
import styles from "../main-page.module.css";
import { TAROT_DECK, TAROT_CARD_BACK, type TarotCard } from "@/data/home";

interface TarotSectionProps {
  translate: (key: string, fallback: string) => string;
  locale: string;
}

type TarotState = {
  flippedCards: boolean[];
  selectedCards: TarotCard[];
  usedCardIndices: Set<number>;
  isDeckSpread: boolean;
};

type TarotAction =
  | { type: 'FLIP_CARD'; index: number }
  | { type: 'DRAW_ALL_CARDS'; cards: TarotCard[]; usedIndices: number[] }
  | { type: 'RESET' };

const initialTarotState: TarotState = {
  flippedCards: [false, false, false, false],
  selectedCards: [],
  usedCardIndices: new Set(),
  isDeckSpread: false,
};

function tarotReducer(state: TarotState, action: TarotAction): TarotState {
  switch (action.type) {
    case 'FLIP_CARD': {
      if (state.selectedCards.length === 0) {return state;}
      const newFlipped = [...state.flippedCards];
      newFlipped[action.index] = !newFlipped[action.index];
      return { ...state, flippedCards: newFlipped };
    }
    case 'DRAW_ALL_CARDS': {
      return {
        ...state,
        selectedCards: action.cards,
        usedCardIndices: new Set(action.usedIndices),
        flippedCards: [false, false, false, false],
        isDeckSpread: true,
      };
    }
    case 'RESET':
      return initialTarotState;
    default:
      return state;
  }
}

// Fisher-Yates shuffle for uniform randomness
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function TarotSection({ translate, locale }: TarotSectionProps) {
  const [tarotState, dispatchTarot] = useReducer(tarotReducer, initialTarotState);
  const { flippedCards, selectedCards, isDeckSpread } = tarotState;

  const handleCardClick = useCallback((index: number) => {
    if (selectedCards.length > 0) {
      dispatchTarot({ type: 'FLIP_CARD', index });
    }
  }, [selectedCards.length]);

  const handleDeckClick = useCallback(() => {
    if (isDeckSpread) {
      dispatchTarot({ type: 'RESET' });
    } else {
      const indices = Array.from({ length: TAROT_DECK.length }, (_, i) => i);
      const shuffled = fisherYatesShuffle(indices);
      const selectedIndices = shuffled.slice(0, 4);
      const cards = selectedIndices.map(i => TAROT_DECK[i]);
      dispatchTarot({ type: 'DRAW_ALL_CARDS', cards, usedIndices: selectedIndices });
    }
  }, [isDeckSpread]);

  return (
    <section className={styles.featureSection}>
      <h2 className={styles.featureSectionTitle}>
        {translate("landing.tarotSectionTitle", "오늘의 타로 리딩")}
      </h2>
      <p className={styles.featureSectionSubtitle}>
        {translate("landing.tarotSectionSubtitle", "카드에 담긴 메시지를 들어보세요.")}
      </p>

      {/* Card Deck - Semi-circular spread */}
      <div className={styles.tarotDeckContainer}>
        <div
          className={`${styles.tarotDeck} ${isDeckSpread ? styles.deckSpread : ''}`}
          onClick={handleDeckClick}
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
            ? translate("landing.tarotDeckReset", "클릭하여 카드 그리기")
            : translate("landing.tarotDeckLabel", "클릭하여 카드 그리기")}
        </p>
      </div>

      {/* Selected Cards */}
      {selectedCards.length > 0 && (
        <>
          <div className={styles.tarotCards}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`${styles.tarotCard} ${flippedCards[index] ? styles.flipped : ''}`}
                onClick={() => handleCardClick(index)}
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
                    <Image
                      src={selectedCards[index]?.image || TAROT_CARD_BACK}
                      alt={selectedCards[index]?.name || 'Tarot Card'}
                      className={styles.cardImage}
                      width={200}
                      height={350}
                      loading="eager"
                      quality={75}
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjM1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjM1MCIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg=="
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
            <span>{translate("landing.tarotPast", "과거")}</span>
            <span>{translate("landing.tarotPresent", "현재")}</span>
            <span>{translate("landing.tarotFuture", "미래")}</span>
            <span>{translate("landing.tarotAdvice", "조언")}</span>
          </div>
        </>
      )}
    </section>
  );
}

// Memoize TarotSection - only re-render if translate or locale changes
export default memo(TarotSection);
