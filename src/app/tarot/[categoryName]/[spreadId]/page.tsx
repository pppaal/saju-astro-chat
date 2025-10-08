'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// ▼▼▼ 1. next/image에서 Image 컴포넌트를 가져옵니다. ▼▼▼
import Image from 'next/image';
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
    return <div className={styles.loading}>✨ Preparing your cards...</div>;
  }

  if (gameState === 'error' || !spreadInfo) {
    return <div className={styles.error}>😢 Invalid Access. <Link href="/tarot">Back to Home</Link></div>;
  }
  
  if (gameState === 'results' && readingResult) {
    return (
        <div className={styles.resultsContainer}>
            <h1 className={styles.resultsHeader}>{readingResult.spread.title}</h1>
            <div className={styles.resultsGrid}>
                {readingResult.drawnCards.map((drawnCard, index) => {
                    const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright;
                    const positionTitle = readingResult.spread.positions[index]?.title || `Card ${index + 1}`;
                    return (
                        <div key={index} className={styles.resultCardSlot}>
                            <h2 className={styles.positionTitle}>{positionTitle}</h2>
                            <div className={styles.imageContainer}>
                                {/* ▼▼▼ 2. <img>를 <Image>로 바꾸고, width와 height를 추가합니다. ▼▼▼ */}
                                <Image 
                                    src={drawnCard.card.image} 
                                    alt={drawnCard.card.name} 
                                      width={250}  // 실제 카드 이미지 너비에 맞게 조절해주세요.
                                      height={438} // 실제 카드 이미지 높이에 맞게 조절해주세요.
                                    className={`${styles.resultCardImage} ${drawnCard.isReversed ? styles.reversed : ''}`}
                                />
                                {/* ▲▲▲ 여기까지 수정 ▲▲▲ */}
                            </div>
                            <h3 className={styles.cardName}>
                                {drawnCard.card.name} {drawnCard.isReversed && '(Reversed)'}
                            </h3>
                            <p className={styles.keywords}>{meaning.keywords.join(', ')}</p>
                            <p className={styles.meaning}>{meaning.meaning}</p>
                        </div>
                    );
                })}
            </div>
            <button onClick={handleReset} className={styles.resetButton}>Ask Another Question</button>
        </div>
    );
  }

  return (
    <div className={styles.readingContainer}>
      <div className={styles.instructions}>
        <h1>{spreadInfo.title}</h1>
        <p>
          {gameState === 'revealing' 
            ? 'Selection Complete! Revealing your destiny...'
            : `Choose ${spreadInfo.cardCount} cards. (${selectedIndices.length} / ${spreadInfo.cardCount})`
          }
        </p>
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
              <div className={styles.cardBack}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
