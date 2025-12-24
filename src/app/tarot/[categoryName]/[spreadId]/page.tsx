'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data';
import { Spread, DrawnCard, DeckStyle, DECK_STYLES, DECK_STYLE_INFO, getCardImagePath } from '@/lib/Tarot/tarot.types';
import TarotChat from '@/components/tarot/TarotChat';
import { getStoredBirthDate } from '@/lib/userProfile';
import CreditBadge from '@/components/ui/CreditBadge';
import PersonalityInsight from '@/components/personality/PersonalityInsight';
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
  backImage: DECK_STYLE_INFO[style].backImage,
}));

// Theme-specific titles and icons for guidance/affirmation sections
const THEME_DISPLAY_INFO: Record<string, {
  guidanceIcon: string;
  guidanceTitle: string;
  guidanceTitleKo: string;
  guidanceFooter: string;
  guidanceFooterKo: string;
  affirmationIcon: string;
  affirmationTitle: string;
  affirmationTitleKo: string;
}> = {
  'general-insight': {
    guidanceIcon: '🔮',
    guidanceTitle: 'Guiding Light',
    guidanceTitleKo: '길잡이',
    guidanceFooter: 'Trust the flow of destiny',
    guidanceFooterKo: '운명의 흐름을 따라가세요',
    affirmationIcon: '✨',
    affirmationTitle: 'Soul Affirmation',
    affirmationTitleKo: '영혼의 다짐',
  },
  'love-relationships': {
    guidanceIcon: '💕',
    guidanceTitle: 'Heart\'s Whisper',
    guidanceTitleKo: '사랑의 속삭임',
    guidanceFooter: 'Let love guide your heart',
    guidanceFooterKo: '사랑이 마음을 이끌게 하세요',
    affirmationIcon: '❤️',
    affirmationTitle: 'Love\'s Promise',
    affirmationTitleKo: '사랑의 다짐',
  },
  'career-work': {
    guidanceIcon: '⚡',
    guidanceTitle: 'Path Forward',
    guidanceTitleKo: '성공의 나침반',
    guidanceFooter: 'Your potential is limitless',
    guidanceFooterKo: '당신의 가능성은 무한합니다',
    affirmationIcon: '🎯',
    affirmationTitle: 'Career Mantra',
    affirmationTitleKo: '성공의 주문',
  },
  'money-finance': {
    guidanceIcon: '💎',
    guidanceTitle: 'Abundance Guide',
    guidanceTitleKo: '풍요의 길잡이',
    guidanceFooter: 'Prosperity flows to you',
    guidanceFooterKo: '번영이 당신에게 흐릅니다',
    affirmationIcon: '🌟',
    affirmationTitle: 'Wealth Affirmation',
    affirmationTitleKo: '풍요의 다짐',
  },
  'well-being-health': {
    guidanceIcon: '🌿',
    guidanceTitle: 'Healing Wisdom',
    guidanceTitleKo: '치유의 지혜',
    guidanceFooter: 'Your body knows the way',
    guidanceFooterKo: '몸이 길을 알고 있습니다',
    affirmationIcon: '🙏',
    affirmationTitle: 'Wellness Vow',
    affirmationTitleKo: '건강의 서약',
  },
  'spiritual-growth': {
    guidanceIcon: '🕯️',
    guidanceTitle: 'Inner Light',
    guidanceTitleKo: '내면의 빛',
    guidanceFooter: 'Your soul knows the truth',
    guidanceFooterKo: '영혼이 진실을 알고 있습니다',
    affirmationIcon: '🦋',
    affirmationTitle: 'Spirit\'s Call',
    affirmationTitleKo: '영혼의 부름',
  },
  'decisions-crossroads': {
    guidanceIcon: '🧭',
    guidanceTitle: 'Crossroads Wisdom',
    guidanceTitleKo: '기로의 지혜',
    guidanceFooter: 'Trust your inner compass',
    guidanceFooterKo: '내면의 나침반을 믿으세요',
    affirmationIcon: '🔑',
    affirmationTitle: 'Choice Affirmation',
    affirmationTitleKo: '선택의 다짐',
  },
  'self-discovery': {
    guidanceIcon: '🪞',
    guidanceTitle: 'Mirror of Truth',
    guidanceTitleKo: '진실의 거울',
    guidanceFooter: 'Embrace your true self',
    guidanceFooterKo: '진정한 자신을 받아들이세요',
    affirmationIcon: '💫',
    affirmationTitle: 'Self Affirmation',
    affirmationTitleKo: '자아의 다짐',
  },
  'daily-reading': {
    guidanceIcon: '☀️',
    guidanceTitle: 'Daily Insight',
    guidanceTitleKo: '오늘의 메시지',
    guidanceFooter: 'Make today meaningful',
    guidanceFooterKo: '오늘을 의미있게 보내세요',
    affirmationIcon: '🌈',
    affirmationTitle: 'Today\'s Mantra',
    affirmationTitleKo: '오늘의 주문',
  },
};

const getThemeDisplayInfo = (categoryId: string | undefined) => {
  return THEME_DISPLAY_INFO[categoryId || ''] || THEME_DISPLAY_INFO['general-insight'];
};

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
  const [selectedDeckStyle, setSelectedDeckStyle] = useState<DeckStyle>('celestial');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [userTopic, setUserTopic] = useState<string>('');
  const [selectionOrderMap, setSelectionOrderMap] = useState<Map<number, number>>(new Map());
  const selectionOrderRef = useRef<Map<number, number>>(new Map());
  const [readingResult, setReadingResult] = useState<ReadingResponse | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const detailedSectionRef = useRef<HTMLDivElement>(null);

  // Streaming interpretation state
  const [streamingOverall, setStreamingOverall] = useState<string>('');
  const [streamingCardInsights, setStreamingCardInsights] = useState<Map<number, string>>(new Map());
  const [streamingGuidance, setStreamingGuidance] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSection, setStreamingSection] = useState<string>('');

  // Custom smooth scroll function for elegant animation
  const smoothScrollTo = (element: HTMLElement, duration: number = 2000) => {
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  // Scroll to detailed section when button is clicked
  const scrollToDetails = () => {
    if (detailedSectionRef.current) {
      smoothScrollTo(detailedSectionRef.current, 800);
    }
  };

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
    // Prefetch RAG context while user selects cards (non-blocking)
    fetch('/api/tarot/prefetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: categoryName, spreadId })
    }).catch(() => {}); // Silently ignore prefetch errors
  };

  const handleCardClick = (index: number) => {
    const currentMap = selectionOrderRef.current;
    console.log('=== Card Click ===');
    console.log('Clicked index:', index);
    console.log('Current map size:', currentMap.size);
    console.log('Current map entries:', Array.from(currentMap.entries()));

    if (gameState !== 'picking') {
      console.log('Rejected: not in picking state');
      return;
    }
    if (currentMap.size >= (spreadInfo?.cardCount ?? 0)) {
      console.log('Rejected: max cards reached');
      return;
    }
    if (currentMap.has(index)) {
      console.log('Rejected: card already selected');
      return;
    }

    const newOrder = currentMap.size + 1;
    const newMap = new Map(currentMap).set(index, newOrder);
    selectionOrderRef.current = newMap;

    console.log('New order:', newOrder);
    console.log('New map entries:', Array.from(newMap.entries()));

    setSelectionOrderMap(newMap);
    setSelectedIndices((prev) => [...prev, index]);
  };

  const fetchInterpretation = useCallback(async (result: ReadingResponse) => {
    // Try streaming first for faster perceived response
    setIsStreaming(true);
    setStreamingOverall('');
    setStreamingCardInsights(new Map());
    setStreamingGuidance('');

    try {
      const response = await fetch('/api/tarot/interpret/stream', {
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
          userQuestion: userTopic,
          userTopic: userTopic,
          language: language || 'ko'
        })
      });

      const contentType = response.headers.get('content-type');

      if (response.ok && contentType?.includes('text/event-stream') && response.body) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let overallMessage = '';
        const cardInsights: CardInsight[] = [];
        let guidance = '';
        let followupQuestions: string[] = [];

        // Initialize card insights array
        for (let i = 0; i < result.drawnCards.length; i++) {
          cardInsights.push({
            position: result.spread.positions[i]?.title || `Card ${i + 1}`,
            card_name: result.drawnCards[i].card.name,
            is_reversed: result.drawnCards[i].isReversed,
            interpretation: ''
          });
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.section === 'overall_message') {
                  if (data.content) {
                    overallMessage += data.content;
                    setStreamingOverall(overallMessage);
                    setStreamingSection('overall');
                  }
                  if (data.status === 'done') {
                    // Show results state once overall message is ready
                    setGameState('results');
                  }
                }

                if (data.section === 'card_insight') {
                  const idx = data.index;
                  if (data.content && idx < cardInsights.length) {
                    cardInsights[idx].interpretation += data.content;
                    setStreamingCardInsights(prev => new Map(prev).set(idx, cardInsights[idx].interpretation));
                    setStreamingSection(`card_${idx}`);
                  }
                  if (data.status === 'done' && data.extras) {
                    cardInsights[idx].spirit_animal = data.extras.spirit_animal ? { name: data.extras.spirit_animal, meaning: '', message: '' } : null;
                    cardInsights[idx].chakra = data.extras.chakra ? { name: data.extras.chakra, color: '', guidance: '' } : null;
                    cardInsights[idx].element = data.extras.element;
                  }
                }

                if (data.section === 'guidance') {
                  if (data.content) {
                    guidance += data.content;
                    setStreamingGuidance(guidance);
                    setStreamingSection('guidance');
                  }
                }

                if (data.section === 'followup') {
                  followupQuestions = data.questions || [];
                }

                if (data.done) {
                  // Finalize interpretation
                  setInterpretation({
                    overall_message: overallMessage,
                    card_insights: cardInsights,
                    guidance: guidance,
                    affirmation: '나는 우주의 지혜와 연결되어 있습니다.',
                    followup_questions: followupQuestions
                  });
                  setIsStreaming(false);
                }

                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        // Ensure final state is set even if done signal not received
        if (!interpretation) {
          setInterpretation({
            overall_message: overallMessage || translate('tarot.results.defaultMessage', 'The cards have revealed their wisdom to you.'),
            card_insights: cardInsights,
            guidance: guidance || translate('tarot.results.defaultGuidance', 'Trust your intuition.'),
            affirmation: '나는 우주의 지혜와 연결되어 있습니다.',
            followup_questions: followupQuestions
          });
        }
        setIsStreaming(false);
        return;
      }

      // Fallback to non-streaming endpoint
      setIsStreaming(false);
      const fallbackResponse = await fetch('/api/tarot/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: categoryName,
          spreadId,
          spreadTitle: result.spread.title,
          cards: result.drawnCards.map((dc, idx) => {
            const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright;
            return {
              name: dc.card.name,
              nameKo: dc.card.nameKo,
              isReversed: dc.isReversed,
              position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
              positionKo: result.spread.positions[idx]?.titleKo,
              meaning: meaning.meaning,
              meaningKo: meaning.meaningKo,
              keywords: meaning.keywords,
              keywordsKo: meaning.keywordsKo
            };
          }),
          language: language || 'ko',
          birthdate: getStoredBirthDate()
        })
      });

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        setInterpretation(data);
      } else {
        throw new Error('Fallback also failed');
      }
    } catch (error) {
      console.error('Failed to fetch interpretation:', error);
      setIsStreaming(false);
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
  }, [categoryName, spreadId, language, translate, interpretation, setGameState, userTopic]);

  useEffect(() => {
    const targetCardCount = spreadInfo?.cardCount || 0;
    if (spreadInfo && selectedIndices.length === targetCardCount && gameState === 'picking') {
      const fetchReading = async () => {
        setGameState('revealing');
        try {
          const response = await fetch('/api/tarot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: categoryName, spreadId, cardCount: targetCardCount, userTopic }),
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
  }, [selectedIndices, spreadInfo, categoryName, spreadId, fetchInterpretation, gameState, userTopic]);

  const handleReset = () => {
    router.push('/tarot');
  };

  const handleStartChat = () => {
    setShowChat(true);
    setGameState('chat');
    // Scroll to top when entering chat mode
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCardExpand = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  // Handle card reveal - only allow revealing in order
  const handleCardReveal = (index: number) => {
    // Only allow revealing the next card in sequence
    const nextToReveal = revealedCards.length;
    if (index === nextToReveal && !revealedCards.includes(index)) {
      setRevealedCards(prev => [...prev, index]);
    }
  };

  const isCardRevealed = (index: number) => revealedCards.includes(index);
  const canRevealCard = (index: number) => index === revealedCards.length;

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

  // Get card count from spread
  const effectiveCardCount = spreadInfo?.cardCount || 3;

  // Deck style selection state
  if (gameState === 'color-select') {
    return (
      <div className={styles.colorSelectContainer}>
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
        </div>
        <div className={styles.backButtonWrapper}>
          <BackButton />
        </div>
        <div className={styles.colorSelectHeader}>
          <h1 className={styles.colorSelectTitle}>
            {translate('tarot.deckSelect.title', 'Choose Your Deck Style')}
          </h1>
          <p className={styles.colorSelectSubtitle}>
            {translate('tarot.deckSelect.subtitle', 'Select the aesthetic that resonates with your spirit')}
          </p>
        </div>

        {/* User Topic Input */}
        <div className={styles.topicInputSection}>
          <label className={styles.topicLabel}>
            {language === 'ko' ? '🔮 상담 주제를 입력하세요' : '🔮 Enter your question or topic'}
          </label>
          <textarea
            className={styles.topicInput}
            value={userTopic}
            onChange={(e) => setUserTopic(e.target.value)}
            placeholder={language === 'ko'
              ? '예: 이직을 고민하고 있어요 / 연애 운이 궁금해요 / 올해 재정 상황은 어떨까요?'
              : 'E.g.: Should I change jobs? / What about my love life? / How will my finances be this year?'}
            rows={3}
            maxLength={500}
          />
          <p className={styles.topicHint}>
            {language === 'ko'
              ? '구체적인 질문을 입력하면 더 정확한 해석을 받을 수 있어요'
              : 'A specific question leads to a more accurate reading'}
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
                <Image
                  src={deck.backImage}
                  alt={deck.name}
                  width={130}
                  height={200}
                  className={styles.deckBackImage}
                />
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
          <h3 className={styles.spreadPreviewTitle}>{language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}</h3>
          <p className={styles.spreadPreviewDesc}>{effectiveCardCount} {translate('tarot.spread.cards', 'cards')}</p>
          {userTopic && (
            <p className={styles.topicPreview}>
              {language === 'ko' ? '주제: ' : 'Topic: '}{userTopic.slice(0, 50)}{userTopic.length > 50 ? '...' : ''}
            </p>
          )}
        </div>

        <button className={styles.startButton} onClick={handleStartReading}>
          {translate('tarot.colorSelect.start', 'Begin Reading')} →
        </button>
      </div>
    );
  }

  // Interpreting state - with streaming UI
  if (gameState === 'interpreting') {
    // Show streaming content if available
    if (isStreaming && (streamingOverall || streamingCardInsights.size > 0 || streamingGuidance)) {
      return (
        <div className={styles.streamingContainer}>
          <div className={styles.streamingHeader}>
            <h1 className={styles.streamingTitle}>
              {language === 'ko' ? readingResult?.spread.titleKo || readingResult?.spread.title : readingResult?.spread.title}
            </h1>
            <p className={styles.streamingSubtitle}>
              {translate('tarot.streaming.generating', '해석을 생성하고 있습니다')}
              <span className={styles.streamingDots}>
                <span className={styles.streamingDot}></span>
                <span className={styles.streamingDot}></span>
                <span className={styles.streamingDot}></span>
              </span>
            </p>
          </div>

          {/* Overall Message Streaming */}
          {streamingOverall && (
            <div className={styles.streamingContentBox}>
              <div className={styles.streamingSectionLabel}>
                <span className={styles.streamingSectionIcon}>✨</span>
                {translate('tarot.streaming.overallMessage', '전체 메시지')}
              </div>
              <p className={styles.streamingText}>
                {streamingOverall}
                {streamingSection === 'overall' && <span className={styles.streamingCursor}></span>}
              </p>
            </div>
          )}

          {/* Card Insights Streaming */}
          {streamingCardInsights.size > 0 && (
            <div className={styles.streamingContentBox}>
              <div className={styles.streamingSectionLabel}>
                <span className={styles.streamingSectionIcon}>🃏</span>
                {translate('tarot.streaming.cardInsights', '카드별 해석')}
              </div>
              {Array.from(streamingCardInsights.entries()).map(([idx, text]) => (
                <div key={idx} className={styles.streamingCardInsightBox}>
                  <div className={styles.streamingCardLabel}>
                    <span className={styles.streamingCardNumber}>{idx + 1}</span>
                    <span className={styles.streamingCardName}>
                      {readingResult?.drawnCards[idx]?.card.name || `Card ${idx + 1}`}
                    </span>
                  </div>
                  <p className={styles.streamingText}>
                    {text}
                    {streamingSection === `card_${idx}` && <span className={styles.streamingCursor}></span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Guidance Streaming */}
          {streamingGuidance && (
            <div className={styles.streamingContentBox}>
              <div className={styles.streamingSectionLabel}>
                <span className={styles.streamingSectionIcon}>🔮</span>
                {translate('tarot.streaming.guidance', '조언')}
              </div>
              <p className={styles.streamingText}>
                {streamingGuidance}
                {streamingSection === 'guidance' && <span className={styles.streamingCursor}></span>}
              </p>
            </div>
          )}

          {/* Progress indicator */}
          <div className={styles.streamingProgress}>
            <div className={styles.progressSteps}>
              <span className={`${styles.progressStep} ${streamingOverall ? styles.completed : ''} ${streamingSection === 'overall' ? styles.active : ''}`}></span>
              <span className={`${styles.progressStep} ${streamingCardInsights.size > 0 ? styles.completed : ''} ${streamingSection?.startsWith('card_') ? styles.active : ''}`}></span>
              <span className={`${styles.progressStep} ${streamingGuidance ? styles.completed : ''} ${streamingSection === 'guidance' ? styles.active : ''}`}></span>
            </div>
            <span className={styles.progressLabel}>
              {streamingSection === 'overall' && translate('tarot.streaming.step1', '전체 메시지 생성 중...')}
              {streamingSection?.startsWith('card_') && translate('tarot.streaming.step2', '카드 해석 생성 중...')}
              {streamingSection === 'guidance' && translate('tarot.streaming.step3', '조언 생성 중...')}
            </span>
          </div>
        </div>
      );
    }

    // Default loading state (before streaming starts)
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
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
        </div>
        {/* Header */}
        <div className={styles.resultsHeader}>
          <h1 className={styles.resultsTitle}>{language === 'ko' ? readingResult.spread.titleKo || readingResult.spread.title : readingResult.spread.title}</h1>
          <p className={styles.resultsSubtitle}>
            {translate('tarot.results.subtitle', 'Your cards have spoken')}
          </p>
          {userTopic && (
            <div className={styles.userTopicDisplay}>
              <span className={styles.topicIcon}>💭</span>
              <span className={styles.topicText}>{userTopic}</span>
            </div>
          )}
        </div>

        {/* Overall Message */}
        {insight?.overall_message && (
          <div className={styles.overallMessage}>
            <div className={styles.messageIcon}>✨</div>
            <p className={styles.messageText}>{insight.overall_message}</p>
          </div>
        )}

        {/* Cards Grid - Horizontal */}
        <div className={styles.resultsGridHorizontal}>
          {readingResult.drawnCards.map((drawnCard, index) => {
            const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright;
            const position = readingResult.spread.positions[index];
            const positionTitle = (language === 'ko' ? position?.titleKo || position?.title : position?.title) || (language === 'ko' ? `카드 ${index + 1}` : `Card ${index + 1}`);
            const revealed = isCardRevealed(index);
            const canReveal = canRevealCard(index);

            return (
              <div
                key={index}
                className={`${styles.resultCardHorizontal} ${revealed ? styles.revealed : ''} ${canReveal ? styles.canReveal : ''}`}
                style={{
                  animationDelay: `${index * 0.15}s`,
                  '--card-back-image': `url(${selectedColor.backImage})`,
                  '--card-border': selectedColor.border,
                } as React.CSSProperties}
                onClick={() => !revealed && canReveal && handleCardReveal(index)}
              >
                <div className={styles.cardNumberBadge}>{index + 1}</div>
                <div className={styles.positionBadgeHorizontal}>{positionTitle}</div>

                <div className={styles.cardContainerLarge}>
                  {revealed ? (
                    <div
                      className={styles.cardFlipInnerSlow}
                    >
                      <div className={styles.cardBackResultLarge}></div>
                      <div className={styles.cardFrontLarge}>
                        <Image
                          src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
                          alt={drawnCard.card.name}
                          width={180}
                          height={315}
                          className={styles.resultCardImageLarge}
                        />
                        {drawnCard.isReversed && (
                          <div className={styles.reversedLabelLarge}>
                            {translate('tarot.results.reversed', 'Reversed')}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`${styles.cardBackLarge} ${canReveal ? styles.clickable : styles.locked}`}>
                      <div className={styles.cardBackImageLarge}></div>
                      {canReveal && (
                        <div className={styles.clickPrompt}>
                          {translate('tarot.results.clickToReveal', '클릭하세요')}
                        </div>
                      )}
                      {!canReveal && (
                        <div className={styles.lockIcon}>🔒</div>
                      )}
                    </div>
                  )}
                </div>

                {revealed && (
                  <div className={styles.cardInfoCompact}>
                    <h3 className={styles.cardNameCompact}>
                      {language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name}
                    </h3>
                    <div className={styles.keywordsCompact}>
                      {(language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords).slice(0, 2).map((keyword, i) => (
                        <span key={i} className={styles.keywordTagCompact}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scroll to Details Button - shown after all cards revealed */}
        {revealedCards.length === readingResult.drawnCards.length && (
          <button className={styles.scrollToDetailsButton} onClick={scrollToDetails}>
            {translate('tarot.results.viewDetails', '상세 해석 보기')} ↓
          </button>
        )}

        {/* Detailed Card Info - shown after all cards revealed */}
        {revealedCards.length === readingResult.drawnCards.length && (
          <div className={styles.detailedCardsSection} ref={detailedSectionRef}>
            <h2 className={styles.detailedSectionTitle}>
              {translate('tarot.results.detailedReadings', '상세 해석')}
            </h2>
            <div className={styles.resultsGrid}>
              {readingResult.drawnCards.map((drawnCard, index) => {
                const meaning = drawnCard.isReversed ? drawnCard.card.reversed : drawnCard.card.upright;
                const position = readingResult.spread.positions[index];
                const positionTitle = (language === 'ko' ? position?.titleKo || position?.title : position?.title) || (language === 'ko' ? `카드 ${index + 1}` : `Card ${index + 1}`);
                const cardInsight = insight?.card_insights?.[index];
                const isExpanded = expandedCard === index;

                return (
                  <div
                    key={index}
                    className={`${styles.resultCardSlot} ${isExpanded ? styles.expanded : ''}`}
                    style={{ '--card-index': index } as React.CSSProperties}
                    onClick={() => toggleCardExpand(index)}
                  >
                    <div className={styles.positionBadgeWithNumber}>
                      <span className={styles.cardNumberSmall}>{index + 1}</span>
                      <span>{positionTitle}</span>
                    </div>

                    <div className={styles.imageContainer}>
                      <Image
                        src={getCardImagePath(drawnCard.card.id, selectedDeckStyle)}
                        alt={drawnCard.card.name}
                        width={180}
                        height={315}
                        className={styles.resultCardImage}
                      />
                      {drawnCard.isReversed && (
                        <div className={styles.reversedLabel}>
                          {translate('tarot.results.reversed', 'Reversed')}
                        </div>
                      )}
                    </div>

                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardName}>
                        {language === 'ko' ? drawnCard.card.nameKo || drawnCard.card.name : drawnCard.card.name}
                      </h3>

                      <div className={styles.keywords}>
                        {(language === 'ko' ? meaning.keywordsKo || meaning.keywords : meaning.keywords).map((keyword, i) => (
                          <span key={i} className={styles.keywordTag}>
                            {keyword}
                          </span>
                        ))}
                      </div>

                      <p className={styles.meaning}>
                        {language === 'ko' ? meaning.meaningKo || meaning.meaning : meaning.meaning}
                      </p>

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
          </div>
        )}

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
        {(() => {
          const themeInfo = getThemeDisplayInfo(categoryName);
          return (
            <div className={styles.guidanceSection}>
              {insight?.guidance && (
                <div className={styles.guidanceBox}>
                  <div className={styles.guidanceIcon}>
                    <span className={styles.iconGlow}>{themeInfo.guidanceIcon}</span>
                  </div>
                  <h3 className={styles.guidanceTitle}>
                    {language === 'ko' ? themeInfo.guidanceTitleKo : themeInfo.guidanceTitle}
                  </h3>
                  <p className={styles.guidanceText}>{insight.guidance}</p>
                  <div className={styles.guidanceFooter}>
                    <span className={styles.starDecor}>✦</span>
                    <span className={styles.footerText}>
                      {language === 'ko' ? themeInfo.guidanceFooterKo : themeInfo.guidanceFooter}
                    </span>
                    <span className={styles.starDecor}>✦</span>
                  </div>
                </div>
              )}

              {insight?.affirmation && (
                <div className={styles.affirmationBox}>
                  <div className={styles.affirmationIcon}>
                    <span className={styles.iconPulse}>{themeInfo.affirmationIcon}</span>
                  </div>
                  <h3 className={styles.affirmationTitle}>
                    {language === 'ko' ? themeInfo.affirmationTitleKo : themeInfo.affirmationTitle}
                  </h3>
                  <p className={styles.affirmationText}>"{insight.affirmation}"</p>
                  <div className={styles.affirmationMoon}>🌙</div>
                </div>
              )}
            </div>
          );
        })()}

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

        {/* Personality Insight (from Nova Persona quiz) */}
        <PersonalityInsight lang={language} compact className={styles.personalityInsight} />

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
        <h1 className={styles.instructionTitle}>{language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}</h1>
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
                {translate('tarot.reading.choose', 'Choose')} {effectiveCardCount} {translate('tarot.reading.cards', 'cards')}
              </p>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(selectedIndices.length / effectiveCardCount) * 100}%` }}
                ></div>
              </div>
              <p className={styles.progressText}>
                {selectedIndices.length} / {effectiveCardCount}
              </p>
            </>
          )}
        </div>
      </div>

      <div className={styles.cardSpreadContainer}>
        {Array.from({ length: 78 }).map((_, index) => {
          const isSelected = selectionOrderMap.has(index);
          const displayNumber = selectionOrderMap.get(index) || 0;
          return (
            <div
              key={`card-${index}-${displayNumber}`}
              className={`${styles.cardWrapper} ${isSelected ? styles.selected : ''} ${gameState === 'revealing' ? styles.revealing : ''}`}
              style={{
                '--selection-order': displayNumber,
                '--i': index,
                '--card-gradient': selectedColor.gradient,
                '--card-border': selectedColor.border,
                '--card-back-image': `url(${selectedColor.backImage})`,
              } as React.CSSProperties}
              onClick={() => handleCardClick(index)}
            >
              <div className={styles.cardBack}>
                <div className={styles.cardPattern}></div>
                <div className={styles.cardCenterIcon}>✦</div>
              </div>
              {isSelected && (
                <div className={styles.selectionNumber}>{displayNumber}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset/Redraw button */}
      {selectedIndices.length > 0 && gameState === 'picking' && (
        <button
          className={styles.redrawButton}
          onClick={() => {
            setSelectedIndices([]);
            setSelectionOrderMap(new Map());
            selectionOrderRef.current = new Map();
          }}
        >
          {translate('tarot.reading.redraw', '다시 그리기')}
        </button>
      )}
    </div>
  );
}
