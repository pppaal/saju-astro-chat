/**
 * Deck Selector Component
 *
 * 덱 스타일 선택 UI
 */

'use client';

import Image from 'next/image';
import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import { CARD_COLORS } from '../hooks/useTarotState';
import type { Spread } from '@/lib/Tarot/tarot.types';
import styles from '../tarot-reading.module.css';

interface DeckSelectorProps {
  spreadInfo: Spread;
  selectedColor: typeof CARD_COLORS[0];
  userTopic: string;
  language: string;
  onColorSelect: (color: typeof CARD_COLORS[0]) => void;
  onStartReading: () => void;
}

export default function DeckSelector({
  spreadInfo,
  selectedColor,
  userTopic,
  language,
  onColorSelect,
  onStartReading,
}: DeckSelectorProps) {
  const effectiveCardCount = spreadInfo?.cardCount || 3;

  return (
    <div className={styles.deckSelectPage}>
      {/* Fixed elements */}
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>

      {/* Main content */}
      <main className={styles.deckSelectMain}>
        <div className={styles.deckSelectContent}>
          {/* User Question Display */}
          {userTopic && (
            <div className={styles.userQuestionBanner}>
              <span className={styles.questionQuote}>&quot;</span>
              <p className={styles.userQuestionText}>{userTopic}</p>
              <span className={styles.questionQuote}>&quot;</span>
            </div>
          )}

          {/* Title Section */}
          <div className={styles.deckSelectHeader}>
            <div className={styles.spreadInfoBadge}>
              <span className={styles.spreadIcon}>🃏</span>
              <span className={styles.spreadName}>
                {language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}
              </span>
              <span className={styles.spreadCardCount}>
                {effectiveCardCount}
                {language === 'ko' ? '장' : ' cards'}
              </span>
            </div>
            <h1 className={styles.deckSelectTitle}>
              {language === 'ko' ? '덱 스타일 선택' : 'Choose Your Deck'}
            </h1>
            <p className={styles.deckSelectSubtitle}>
              {language === 'ko'
                ? '마음에 드는 카드 뒷면을 선택하세요'
                : 'Select the card back that resonates with you'}
            </p>
          </div>

          {/* Deck Grid */}
          <div className={styles.deckGrid}>
            {CARD_COLORS.map(deck => (
              <button
                key={deck.id}
                className={`${styles.deckOption} ${
                  selectedColor.id === deck.id ? styles.deckSelected : ''
                }`}
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
                <span className={styles.deckName}>{language === 'ko' ? deck.nameKo : deck.name}</span>
                {selectedColor.id === deck.id && <div className={styles.deckCheckmark}>✓</div>}
              </button>
            ))}
          </div>

          {/* Start Button */}
          <button className={styles.startReadingButton} onClick={onStartReading}>
            {language === 'ko' ? '카드 뽑기' : 'Draw Cards'} →
          </button>
        </div>
      </main>
    </div>
  );
}
