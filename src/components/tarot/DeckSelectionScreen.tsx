import React from 'react';
import Image from 'next/image';
import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import { CARD_COLORS, type CardColorOption } from '@/lib/tarot/tarotThemeConfig';
import type { Spread } from '@/lib/Tarot/tarot.types';
import styles from './DeckSelectionScreen.module.css';

interface DeckSelectionScreenProps {
  locale: string;
  spreadInfo: Spread;
  userTopic?: string;
  selectedColor: CardColorOption;
  onColorSelect: (color: CardColorOption) => void;
  onStartReading: () => void;
}

export function DeckSelectionScreen({
  locale,
  spreadInfo,
  userTopic,
  selectedColor,
  onColorSelect,
  onStartReading,
}: DeckSelectionScreenProps) {
  const isKo = locale === 'ko';
  const cardCount = spreadInfo?.cardCount || 3;

  return (
    <div className={styles.deckSelectPage}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>

      <main className={styles.deckSelectMain}>
        <div className={styles.deckSelectContent}>
          {userTopic && (
            <div className={styles.userQuestionBanner}>
              <span className={styles.questionQuote}>&quot;</span>
              <p className={styles.userQuestionText}>{userTopic}</p>
              <span className={styles.questionQuote}>&quot;</span>
            </div>
          )}

          <div className={styles.deckSelectHeader}>
            <div className={styles.spreadInfoBadge}>
              <span className={styles.spreadIcon}>🃏</span>
              <span className={styles.spreadName}>
                {isKo ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}
              </span>
              <span className={styles.spreadCardCount}>
                {cardCount}
                {isKo ? '장' : ' cards'}
              </span>
            </div>
            <h1 className={styles.deckSelectTitle}>{isKo ? '덱 스타일 선택' : 'Choose Your Deck'}</h1>
            <p className={styles.deckSelectSubtitle}>
              {isKo ? '마음에 드는 카드 뒷면을 선택하세요' : 'Select the card back that resonates with you'}
            </p>
          </div>

          <div className={styles.deckGrid}>
            {CARD_COLORS.map((deck) => (
              <button
                key={deck.id}
                className={`${styles.deckOption} ${selectedColor.id === deck.id ? styles.deckSelected : ''}`}
                onClick={() => onColorSelect(deck)}
              >
                <div className={styles.deckCardPreview}>
                  <Image
                    src={deck.backImage}
                    alt={deck.name}
                    width={100}
                    height={155}
                    className={styles.deckBackImage}
                  />
                </div>
                <span className={styles.deckName}>{isKo ? deck.nameKo : deck.name}</span>
                {selectedColor.id === deck.id && <div className={styles.deckCheckmark}>✓</div>}
              </button>
            ))}
          </div>

          <button className={styles.startReadingButton} onClick={onStartReading}>
            {isKo ? '카드 뽑기' : 'Draw Cards'} →
          </button>
        </div>
      </main>
    </div>
  );
}
