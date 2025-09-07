"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { tarotDeck, Card } from '@/lib/tarot-data';
import styles from './TarotReader.module.css';

interface TarotReaderProps {
  onBack: () => void;
}

type GameState = 'themeSelection' | 'shuffling' | 'picking' | 'revealed';

const themes = {
  love: { name: '연애운', description: '사랑과 관계에 대한 조언' },
  work: { name: '직업/학업운', description: '경력과 성취에 대한 통찰' },
  health: { name: '건강운', description: '몸과 마음의 균형 찾기' },
  general: { name: '오늘의 총운', description: '오늘 하루를 위한 전반적인 조언' },
};
type ThemeKey = keyof typeof themes;

const SPREAD_POSITIONS = ['과거 (Past)', '현재 (Present)', '미래 (Future)'];

const TarotReader = ({ onBack }: TarotReaderProps) => {
  const [gameState, setGameState] = useState<GameState>('themeSelection');
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey | null>(null);
  
  const [drawnCards, setDrawnCards] = useState<(Card | null)[]>([]);
  const [cardReversals, setCardReversals] = useState<boolean[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const shuffledDeck = useMemo(() => {
    if (gameState === 'picking') {
      return [...tarotDeck].sort(() => Math.random() - 0.5);
    }
    return [];
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'shuffling') {
      const timer = setTimeout(() => setGameState('picking'), 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleThemeSelect = (theme: ThemeKey) => {
    setSelectedTheme(theme);
    setGameState('shuffling');
  };

  const handleCardSelect = (index: number) => {
    if (gameState !== 'picking' || drawnCards.length >= 3 || selectedIndices.includes(index)) return;

    const newCard = shuffledDeck[drawnCards.length];
    const isReversed = Math.random() < 0.3;

    setDrawnCards(prev => [...prev, newCard]);
    setCardReversals(prev => [...prev, isReversed]);
    setSelectedIndices(prev => [...prev, index]);
  };
  
  useEffect(() => {
    if (drawnCards.length === 3) {
      const timer = setTimeout(() => setGameState('revealed'), 1000);
      return () => clearTimeout(timer);
    }
  }, [drawnCards]);

  const handleReset = () => {
    setGameState('themeSelection');
    setSelectedTheme(null);
    setDrawnCards([]);
    setCardReversals([]);
    setSelectedIndices([]);
  };

  const generateFinalInterpretation = () => {
    if (drawnCards.length < 3 || !selectedTheme) return "";
    const themeName = themes[selectedTheme].name;

    const [card1, card2, card3] = drawnCards;
    const [rev1, rev2, rev3] = cardReversals;

    return `
      <p>선택하신 <strong>${themeName}</strong>에 대한 운세를 해석해 드립니다.</p>
      <p><strong>과거</strong>에는 <strong>${card1?.name}</strong> 카드의 영향으로, ${rev1 ? card1?.meaning_rev.split('.')[0] : card1?.meaning_up.split('.')[0]}와 같은 상황에 있었습니다.</p>
      <p><strong>현재</strong> 당신은 <strong>${card2?.name}</strong> 카드가 보여주듯, ${rev2 ? card2?.meaning_rev.split('.')[0] : card2?.meaning_up.split('.')[0]}는 국면을 맞이하고 있습니다. 이 카드는 당신에게 현재 상황을 어떻게 받아들여야 할지 알려줍니다.</p>
      <p>이를 바탕으로 <strong>미래</strong>에는 <strong>${card3?.name}</strong> 카드가 암시하는 ${rev3 ? card3?.meaning_rev.split('.')[0] : card3?.meaning_up.split('.')[0]}는 결과로 나아갈 가능성이 높습니다.</p>
      <p><strong>[종합 조언]</strong>: 세 카드의 흐름을 종합해 볼 때, ${themeName}에 대해 가장 중요한 것은 현재의 선택입니다. 과거의 경험을 발판 삼아 현재의 문제에 지혜롭게 대처한다면, 당신이 원하는 미래를 만들어갈 수 있을 것입니다.</p>
    `;
  };

  const renderContent = () => {
    switch (gameState) {
      case 'themeSelection':
        return (
          <>
            <p className="subtitle">어떤 점이 궁금하신가요?</p>
            <div className={styles.themeSelectionContainer}>
              {(Object.keys(themes) as ThemeKey[]).map(key => (
                <button key={key} className={styles.themeButton} onClick={() => handleThemeSelect(key)}>
                  {themes[key].name}
                </button>
              ))}
            </div>
          </>
        );

      case 'shuffling':
        return (
          <>
            <p className="subtitle">당신의 운명을 위해 카드를 섞는 중입니다...</p>
            <div className={styles.cardShuffleAnimation}>
              <div className={styles.shuffleCard}></div>
              <div className={styles.shuffleCard}></div>
              <div className={styles.shuffleCard}></div>
            </div>
          </>
        );

      case 'picking': {
        const numCards = 78;
        // [핵심 변경점] 부채꼴의 전체 각도를 170도로 확장!
        const totalAngle = 170; 
        const anglePerCard = totalAngle / (numCards - 1);
        const startAngle = -totalAngle / 2;

        return (
          <>
            <p className="subtitle">
              {drawnCards.length === 0 && "마음이 이끄는 카드 3장을 선택하세요."}
              {drawnCards.length === 1 && "2장 더 선택하세요."}
              {drawnCards.length === 2 && "마지막 1장을 선택하세요."}
            </p>
            <div className={styles.fanSpreadContainer}>
              {Array.from({ length: numCards }).map((_, index) => {
                const rotation = startAngle + (index * anglePerCard);
                
                const cardClasses = [
                  styles.fanCard,
                  styles.flipCard,
                  selectedIndices.includes(index) ? styles.cardDisabled : ''
                ].join(' ');

                return (
                  <div
                    key={index}
                    className={cardClasses}
                    style={{ transform: `rotate(${rotation}deg)` }}
                    onClick={() => handleCardSelect(index)}
                  >
                    <div className={styles.flipCardInner}>
                      <div className={styles.flipCardFront}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      }

      case 'revealed':
        return (
          <div className={styles.resultLayout}>
            <div className={styles.resultCardsContainer}>
              {drawnCards.map((card, index) => (
                <div key={index} className={styles.resultCard}>
                  <p className={styles.positionTitle}>{SPREAD_POSITIONS[index]}</p>
                  <div className={`${styles.flipCard} ${styles.flipped}`}>
                    <div className={styles.flipCardInner}>
                      <div className={styles.flipCardFront}></div>
                      <div className={styles.flipCardBack}>
                        <span className={styles.cardName}>{card?.name}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className={styles.cardOrientation}>{cardReversals[index] ? '역방향' : '정방향'}</h3>
                </div>
              ))}
            </div>
            <div className={styles.interpretationSection}>
              <h2 className={styles.interpretationTitle}>종합 해석</h2>
              <div dangerouslySetInnerHTML={{ __html: generateFinalInterpretation() }} />
            </div>
            <button onClick={handleReset} className="submit-button">새로운 점 보기</button>
          </div>
        );
    }
  };

  return (
    <>
      <h1 className="main-title">오늘의 타로</h1>
      {renderContent()}
      <button onClick={onBack} className="back-button">메인 메뉴로</button>
    </>
  );
};

export default TarotReader;