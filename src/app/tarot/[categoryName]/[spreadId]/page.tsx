'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data';
import { Spread, DrawnCard, DeckStyle, DECK_STYLES, DECK_STYLE_INFO, getCardImagePath } from '@/lib/Tarot/tarot.types';
import TarotChat from '@/components/tarot/TarotChat';
import { getStoredBirthDate } from '@/lib/userProfile';
import styles from './tarot-reading.module.css';

// Card back color options - now linked to deck styles
const CARD_COLORS = DECK_STYLES.map(style => ({
  id: style,
  name: DECK_STYLE_INFO[style].name,
  nameKo: DECK_STYLE_INFO[style].nameKo,
  description: DECK_STYLE_INFO[style].description,
  descriptionKo: DECK_STYLE_INFO[style].descriptionKo,
  gradient: DECK_STYLE_INFO[style].gradient,
  border: `${DECK_STYLE_INFO[style].accent}99`,
  accent: DECK_STYLE_INFO[style].accent,
}));

interface CardInsight {
  position: string;
  card_name: string;
  is_reversed: boolean;
  interpretation: string;
  spirit_animal?: { name: string; meaning: string; message: string } | null;
  chakra?: { name: string; color: string; guidance: string } | null;
  element?: string | null;
  numerology?: { number: number; meaning: string } | null;
  shadow?: { prompt: string; affirmation: string } | null;
}

interface InterpretationResult {
  overall_message: string;
  card_insights: CardInsight[];
  guidance: string;
  affirmation: string;
  combinations?: { cards: string[]; meaning: string }[];
  moon_phase_advice?: string;
  followup_questions?: string[];
  fallback?: boolean;
}

interface ReadingResponse {
  category: string;
  spread: Spread;
  drawnCards: DrawnCard[];
}

type GameState = 'loading' | 'color-select' | 'picking' | 'revealing' | 'interpreting' | 'results' | 'chat' | 'error';

export default function TarotReadingPage() {
  const router = useRouter();
  const params = useParams();
  const { translate, language } = useI18n();
  const categoryName = params?.categoryName as string | undefined;
  const spreadId = params?.spreadId as string | undefined;

  const [gameState, setGameState] = useState<GameState>('loading');
  const [spreadInfo, setSpreadInfo] = useState<Spread | null>(null);
  const [selectedDeckStyle, setSelectedDeckStyle] = useState<DeckStyle>('mystic');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [readingResult, setReadingResult] = useState<ReadingResponse | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const theme = tarotThemes.find((t) => t.id === categoryName);
    const spread = theme?.spreads.find((s) => s.id === spreadId);

    if (spread) {
      setSpreadInfo(spread);
      setGameState('color-select');
    } else {
      setGameState('error');
    }
  }, [categoryName, spreadId]);

  const handleColorSelect = (color: typeof CARD_COLORS[0]) => {
    setSelectedColor(color);
    setSelectedDeckStyle(color.id as DeckStyle);
  };

  const handleStartReading = () => {
    setGameState('picking');
  };

  const handleCardClick = (index: number) => {
    if (gameState !== 'picking' || selectedIndices.length >= (spreadInfo?.cardCount ?? 0) || selectedIndices.includes(index)) {
      return;
    }
    setSelectedIndices((prev) => [...prev, index]);
  };

  const fetchInterpretation = useCallback(async (result: ReadingResponse) => {
    try {
      const response = await fetch('/api/tarot/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: categoryName,
          spreadId,
          spreadTitle: result.spread.title,
          cards: result.drawnCards.map((dc, idx) => ({
            name: dc.card.name,
            isReversed: dc.isReversed,
            position: result.spread.positions[idx]?.title || `Card ${idx + 1}`
          })),
          language: language || 'ko',
          birthdate: getStoredBirthDate()  // For personalization (Birth Card, Year Card)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInterpretation(data);
      } else {
        setInterpretation({
          overall_message: translate('tarot.results.defaultMessage', 'The cards have revealed their wisdom to you.'),
          card_insights: result.drawnCards.map((dc, idx) => ({
            position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
            card_name: dc.card.name,
            is_reversed: dc.isReversed,
            interpretation: dc.isReversed ? dc.card.reversed.meaning : dc.card.upright.meaning
          })),
          guidance: translate('tarot.results.defaultGuidance', 'Trust your intuition as you reflect on these cards.'),
          affirmation: translate('tarot.results.defaultAffirmation', 'I am open to the wisdom of the universe.'),
          fallback: true
        });
      }
    } catch (error) {
      console.error('Failed to fetch interpretation:', error);
      setInterpretation({
        overall_message: translate('tarot.results.defaultMessage', 'The cards have revealed their wisdom to you.'),
        card_insights: [],
        guidance: translate('tarot.results.defaultGuidance', 'Trust your intuition.'),
        affirmation: '',
        fallback: true
      });
    }
  }, [categoryName, spreadId, language, translate]);

  useEffect(() => {
    if (spreadInfo && selectedIndices.length === spreadInfo.cardCount && gameState === 'picking') {
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

          setTimeout(async () => {
            setGameState('interpreting');
            await fetchInterpretation(data);
            setGameState('results');
          }, 1500);
        } catch (error) {
          console.error(error);
          setGameState('error');
        }
      };
      setTimeout(fetchReading, 1000);
    }
  }, [selectedIndices, spreadInfo, categoryName, spreadId, fetchInterpretation, gameState]);

  const handleReset = () => {
    router.push('/tarot');
  };

  const handleStartChat = () => {
    setShowChat(true);
    setGameState('chat');
  };

  const toggleCardExpand = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  // Loading state
  if (gameState === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingOrb}></div>
        <p>✨ {translate('tarot.reading.preparing', 'Preparing your cards...')}</p>
      </div>
    );
  }

  // Error state
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

  // Deck style selection state
  if (gameState === 'color-select') {
    return (
      <div className={styles.colorSelectContainer}>
        <div className={styles.colorSelectHeader}>
          <h1 className={styles.colorSelectTitle}>
            {translate('tarot.deckSelect.title', 'Choose Your Deck Style')}
          </h1>
          <p className={styles.colorSelectSubtitle}>
            {translate('tarot.deckSelect.subtitle', 'Select the aesthetic that resonates with your spirit')}
          </p>
        </div>

        <div className={styles.colorGrid}>
          {CARD_COLORS.map((deck) => (
            <button
              key={deck.id}
              className={`${styles.colorOption} ${selectedColor.id === deck.id ? styles.colorSelected : ''}`}
              onClick={() => handleColorSelect(deck)}
              style={{
                '--card-gradient': deck.gradient,
                '--card-border': deck.border,
              } as React.CSSProperties}
            >
              <div className={styles.colorCardPreview}>
                <div className={styles.colorCardBack}>
                  <div className={styles.colorCardPattern}></div>
                  <div className={styles.colorCardIcon}>✦</div>
                </div>
              </div>
              <span className={styles.colorName}>
                {language === 'ko' ? deck.nameKo : deck.name}
              </span>
              <span className={styles.colorDescription}>
                {language === 'ko' ? deck.descriptionKo : deck.description}
              </span>
              {selectedColor.id === deck.id && (
                <div className={styles.colorCheckmark}>✓</div>
              )}
            </button>
          ))}
        </div>

        <div className={styles.spreadPreview}>
          <h3 className={styles.spreadPreviewTitle}>{spreadInfo.title}</h3>
          <p className={styles.spreadPreviewDesc}>{spreadInfo.cardCount} {translate('tarot.spread.cards', 'cards')}</p>
        </div>

        <button className={styles.startButton} onClick={handleStartReading}>
          {translate('tarot.colorSelect.start', 'Begin Reading')} →
        </button>
      </div>
    );
  }

  // Interpreting state
  if (gameState === 'interpreting') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingOrb}></div>
        <p>🔮 {translate('tarot.reading.interpreting', 'The cards are speaking...')}</p>
        <p className={styles.interpretingSubtext}>
          {translate('tarot.reading.interpretingDesc', 'Consulting the cosmic wisdom...')}
        </p>
      </div>
    );
  }

  // Chat state
  if (gameState === 'chat' && readingResult && showChat) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <button className={styles.backToResults} onClick={() => { setShowChat(false); setGameState('results'); }}>
            ← {translate('tarot.chat.backToResults', 'Back to Cards')}
          </button>
          <h2 className={styles.chatTitle}>🔮 {translate('tarot.chat.title', 'Tarot Consultation')}</h2>
        </div>
        <TarotChat
          readingResult={readingResult}
          interpretation={interpretation}
          categoryName={categoryName || ''}
          spreadId={spreadId || ''}
          language={(language as 'ko' | 'en') || 'ko'}
        />
      </div>
    );
  }

  // Results state
  if (gameState === 'results' && readingResult) {
    const insight = interpretation;

    return (
      <div className={styles.resultsContainer}>
        {/* Header */}
        <div className={styles.resultsHeader}>
          <h1 className={styles.resultsTitle}>{readingResult.spread.title}</h1>
          <p className={styles.resultsSubtitle}>
            {translate('tarot.results.subtitle', 'Your cards have spoken')}
          </p>
        </div>

        {/* Overall Message */}
        {insight?.overall_message && (
          <div className={styles.overallMessage}>
            <div className={styles.messageIcon}>✨</div>
            <p className={styles.messageText}>{insight.overall_message}</p>
          </div>
        )}

        {/* Cards Grid */}
        <div className={styles.resultsGrid}>
          {readingResult.drawnCards.map((drawnCard, index) => {
            const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright;
            const positionTitle = readingResult.spread.positions[index]?.title || `Card ${index + 1}`;
            const cardInsight = insight?.card_insights?.[index];
            const isExpanded = expandedCard === index;

            return (
              <div
                key={index}
                className={`${styles.resultCardSlot} ${isExpanded ? styles.expanded : ''}`}
                style={{ animationDelay: `${index * 0.15}s` } as React.CSSProperties}
                onClick={() => toggleCardExpand(index)}
              >
                <div className={styles.positionBadge}>{positionTitle}</div>

                <div className={`${styles.imageContainer} ${drawnCard.isReversed ? styles.reversedContainer : ''}`}>
                  <Image
                    src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
                    alt={drawnCard.card.name}
                    width={220}
                    height={385}
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

                  {/* Premium Insights (expandable) */}
                  {isExpanded && cardInsight && (
                    <div className={styles.premiumInsights}>
                      {cardInsight.interpretation && cardInsight.interpretation !== meaning.meaning && (
                        <div className={styles.insightSection}>
                          <h4 className={styles.insightTitle}>🔮 {translate('tarot.insights.aiInterpretation', 'Deep Insight')}</h4>
                          <p className={styles.insightText}>{cardInsight.interpretation}</p>
                        </div>
                      )}

                      {cardInsight.spirit_animal && (
                        <div className={styles.insightSection}>
                          <h4 className={styles.insightTitle}>🦋 {translate('tarot.insights.spiritAnimal', 'Spirit Animal')}</h4>
                          <div className={styles.spiritAnimal}>
                            <span className={styles.animalName}>{cardInsight.spirit_animal.name}</span>
                            <p className={styles.animalMeaning}>{cardInsight.spirit_animal.meaning}</p>
                            <p className={styles.animalMessage}>"{cardInsight.spirit_animal.message}"</p>
                          </div>
                        </div>
                      )}

                      {cardInsight.chakra && (
                        <div className={styles.insightSection}>
                          <h4 className={styles.insightTitle}>🧘 {translate('tarot.insights.chakra', 'Chakra Connection')}</h4>
                          <div className={styles.chakraInfo}>
                            <span className={styles.chakraDot} style={{ backgroundColor: cardInsight.chakra.color }}></span>
                            <span className={styles.chakraName}>{cardInsight.chakra.name}</span>
                            <p className={styles.chakraGuidance}>{cardInsight.chakra.guidance}</p>
                          </div>
                        </div>
                      )}

                      {cardInsight.shadow && (
                        <div className={styles.insightSection}>
                          <h4 className={styles.insightTitle}>🌙 {translate('tarot.insights.shadowWork', 'Shadow Work')}</h4>
                          <p className={styles.shadowPrompt}>{cardInsight.shadow.prompt}</p>
                          <p className={styles.shadowAffirmation}>💫 {cardInsight.shadow.affirmation}</p>
                        </div>
                      )}

                      {cardInsight.element && (
                        <div className={styles.elementTag}>
                          {cardInsight.element === 'Fire' && '🔥'}
                          {cardInsight.element === 'Water' && '💧'}
                          {cardInsight.element === 'Air' && '🌬️'}
                          {cardInsight.element === 'Earth' && '🌍'}
                          {cardInsight.element}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.expandHint}>
                    {isExpanded
                      ? translate('tarot.results.clickToCollapse', '▲ Click to collapse')
                      : translate('tarot.results.clickToExpand', '▼ Click for more insights')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Combinations */}
        {insight?.combinations && insight.combinations.length > 0 && (
          <div className={styles.combinationsSection}>
            <h3 className={styles.sectionTitle}>🔗 {translate('tarot.insights.combinations', 'Card Combinations')}</h3>
            <div className={styles.combinationsList}>
              {insight.combinations.map((combo, idx) => (
                <div key={idx} className={styles.combinationItem}>
                  <span className={styles.comboCards}>{combo.cards.join(' + ')}</span>
                  <p className={styles.comboMeaning}>{combo.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guidance & Affirmation */}
        <div className={styles.guidanceSection}>
          {insight?.guidance && (
            <div className={styles.guidanceBox}>
              <h3 className={styles.guidanceTitle}>💡 {translate('tarot.insights.guidance', 'Guidance')}</h3>
              <p className={styles.guidanceText}>{insight.guidance}</p>
            </div>
          )}

          {insight?.affirmation && (
            <div className={styles.affirmationBox}>
              <h3 className={styles.affirmationTitle}>🌟 {translate('tarot.insights.affirmation', 'Affirmation')}</h3>
              <p className={styles.affirmationText}>"{insight.affirmation}"</p>
            </div>
          )}
        </div>

        {/* Follow-up Questions */}
        {insight?.followup_questions && insight.followup_questions.length > 0 && (
          <div className={styles.followupSection}>
            <h3 className={styles.sectionTitle}>❓ {translate('tarot.insights.followup', 'Questions for Reflection')}</h3>
            <ul className={styles.followupList}>
              {insight.followup_questions.map((q, idx) => (
                <li key={idx} className={styles.followupQuestion}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button onClick={handleStartChat} className={styles.chatButton}>
            💬 {translate('tarot.results.startChat', 'Continue with Consultation')}
          </button>
          <button onClick={handleReset} className={styles.resetButton}>
            {translate('tarot.results.askAnother', 'Ask Another Question')}
          </button>
        </div>
      </div>
    );
  }

  // Card picking state
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
              style={{
                '--selection-order': selectionOrder + 1,
                '--i': index,
                '--card-gradient': selectedColor.gradient,
                '--card-border': selectedColor.border,
              } as React.CSSProperties}
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
