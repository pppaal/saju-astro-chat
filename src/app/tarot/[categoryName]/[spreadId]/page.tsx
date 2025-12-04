'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data';
import { Spread, DrawnCard } from '@/lib/Tarot/tarot.types';
import styles from './tarot-reading.module.css';

interface ReadingResponse {
  category: string;
  spread: Spread;
  drawnCards: DrawnCard[];
}

export default function TarotReadingPage() {
  const router = useRouter();
  const params = useParams();
  const { translate } = useI18n();
  const { categoryName, spreadId } = params;

  const [gameState, setGameState] = useState<'loading' | 'picking' | 'revealing' | 'results' | 'error'>('loading');
  const [spreadInfo, setSpreadInfo] = useState<Spread | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [readingResult, setReadingResult] = useState<ReadingResponse | null>(null);

  useEffect(() => {
    const theme = tarotThemes.find((t) => t.id === categoryName);
    const spread = theme?.spreads.find((s) => s.id === spreadId);

    if (spread) {
      setSpreadInfo(spread);
      setGameState('picking');
    } else {
      setGameState('error');
    }
  }, [categoryName, spreadId]);

  const handleCardClick = (index: number) => {
    if (gameState !== 'picking' || selectedIndices.length >= (spreadInfo?.cardCount ?? 0) || selectedIndices.includes(index)) {
      return;
    }
    setSelectedIndices((prev) => [...prev, index]);
  };

  useEffect(() => {
    if (spreadInfo && selectedIndices.length === spreadInfo.cardCount) {
      const fetchReading = async () => {
        setGameState('revealing');
        try {
          const response = await fetch('/api/tarot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: categoryName, spreadId }),
          });
          if (!response.ok) throw new Error('Failed to fetch reading');
          const data = await response.json();
          setReadingResult(data);
          setTimeout(() => setGameState('results'), 1500);
        } catch (error) {
          console.error(error);
          setGameState('error');
        }
      };
      setTimeout(fetchReading, 1000);
    }
  }, [selectedIndices, spreadInfo, categoryName, spreadId]);

  const handleReset = () => {
    router.push(`/tarot/${categoryName}`);
  };

  if (gameState === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingOrb}></div>
        <p>✨ {translate('tarot.reading.preparing', 'Preparing your cards...')}</p>
      </div>
    );
  }

  if (gameState === 'error' || !spreadInfo) {
    return (
      <div className={styles.error}>
        <h1>😢 {translate('tarot.reading.invalidAccess', 'Invalid Access')}</h1>
        <Link href="/tarot" className={styles.errorLink}>
          {translate('tarot.reading.backToHome', 'Back to Home')}
        </Link>
      </div>
    );
  }

  if (gameState === 'results' && readingResult) {
    return (
      <div className={styles.resultsContainer}>
        <div className={styles.resultsHeader}>
          <h1 className={styles.resultsTitle}>{readingResult.spread.title}</h1>
          <p className={styles.resultsSubtitle}>
            {translate('tarot.results.subtitle', 'Your cards have spoken')}
          </p>
        </div>

        <div className={styles.resultsGrid}>
          {readingResult.drawnCards.map((drawnCard, index) => {
            const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright;
            const positionTitle = readingResult.spread.positions[index]?.title || `Card ${index + 1}`;
            return (
              <div
                key={index}
                className={styles.resultCardSlot}
                style={{ animationDelay: `${index * 0.15}s` } as React.CSSProperties}
              >
                <div className={styles.positionBadge}>{positionTitle}</div>

                <div className={`${styles.imageContainer} ${drawnCard.isReversed ? styles.reversedContainer : ''}`}>
                  <Image
                    src={drawnCard.card.image}
                    alt={drawnCard.card.name}
                    width={250}
                    height={438}
                    className={`${styles.resultCardImage} ${drawnCard.isReversed ? styles.reversed : ''}`}
                  />
                  {drawnCard.isReversed && (
                    <div className={styles.reversedLabel}>
                      {translate('tarot.results.reversed', 'Reversed')}
                    </div>
                  )}
                </div>

                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{drawnCard.card.name}</h3>

                  <div className={styles.keywords}>
                    {meaning.keywords.map((keyword, i) => (
                      <span key={i} className={styles.keywordTag}>
                        {keyword}
                      </span>
                    ))}
                  </div>

                  <p className={styles.meaning}>{meaning.meaning}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleReset} className={styles.resetButton}>
          {translate('tarot.results.askAnother', 'Ask Another Question')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.readingContainer}>
      <div className={styles.instructions}>
        <h1 className={styles.instructionTitle}>{spreadInfo.title}</h1>
        <div className={styles.instructionContent}>
          {gameState === 'revealing' ? (
            <>
              <div className={styles.revealingOrb}></div>
              <p className={styles.revealingText}>
                ✨ {translate('tarot.reading.revealing', 'Selection Complete! Revealing your destiny...')}
              </p>
            </>
          ) : (
            <>
              <p className={styles.pickingText}>
                {translate('tarot.reading.choose', 'Choose')} {spreadInfo.cardCount} {translate('tarot.reading.cards', 'cards')}
              </p>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(selectedIndices.length / spreadInfo.cardCount) * 100}%` }}
                ></div>
              </div>
              <p className={styles.progressText}>
                {selectedIndices.length} / {spreadInfo.cardCount}
              </p>
            </>
          )}
        </div>
      </div>

      <div className={styles.cardSpreadContainer}>
        {Array.from({ length: 78 }).map((_, index) => {
          const isSelected = selectedIndices.includes(index);
          const selectionOrder = selectedIndices.indexOf(index);
          return (
            <div
              key={index}
              className={`${styles.cardWrapper} ${isSelected ? styles.selected : ''} ${gameState === 'revealing' ? styles.revealing : ''}`}
              style={{ '--selection-order': selectionOrder + 1, '--i': index } as React.CSSProperties}
              onClick={() => handleCardClick(index)}
            >
              <div className={styles.cardBack}>
                <div className={styles.cardPattern}></div>
                <div className={styles.cardCenterIcon}>✦</div>
              </div>
              {isSelected && (
                <div className={styles.selectionNumber}>{selectionOrder + 1}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
