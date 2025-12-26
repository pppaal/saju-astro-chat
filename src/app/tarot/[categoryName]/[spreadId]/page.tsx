'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data';
import { Spread, DrawnCard, DeckStyle, DECK_STYLES, DECK_STYLE_INFO, getCardImagePath } from '@/lib/Tarot/tarot.types';
import { getStoredBirthDate } from '@/lib/userProfile';
import CreditBadge from '@/components/ui/CreditBadge';
import PersonalityInsight from '@/components/personality/PersonalityInsight';
import { getCounselorById, TarotCounselor } from '@/lib/Tarot/tarot-counselors';
import { saveReading, formatReadingForSave, getSavedReadings } from '@/lib/Tarot/tarot-storage';
import { apiFetch } from '@/lib/api';
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
    guidanceIcon: '💡',
    guidanceTitle: 'Key Insight',
    guidanceTitleKo: '핵심 조언',
    guidanceFooter: 'Take action on this advice',
    guidanceFooterKo: '이 조언을 실천해보세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Action Plan',
    affirmationTitleKo: '실천 계획',
  },
  'love-relationships': {
    guidanceIcon: '💡',
    guidanceTitle: 'Relationship Advice',
    guidanceTitleKo: '관계 조언',
    guidanceFooter: 'Apply this to your relationship',
    guidanceFooterKo: '관계에 적용해보세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Next Step',
    affirmationTitleKo: '다음 단계',
  },
  'career-work': {
    guidanceIcon: '💡',
    guidanceTitle: 'Career Advice',
    guidanceTitleKo: '커리어 조언',
    guidanceFooter: 'Take these steps forward',
    guidanceFooterKo: '이 단계들을 실행하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Action Items',
    affirmationTitleKo: '실행 항목',
  },
  'money-finance': {
    guidanceIcon: '💡',
    guidanceTitle: 'Financial Advice',
    guidanceTitleKo: '재정 조언',
    guidanceFooter: 'Apply these money tips',
    guidanceFooterKo: '이 재정 팁을 활용하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Money Plan',
    affirmationTitleKo: '재정 계획',
  },
  'well-being-health': {
    guidanceIcon: '💡',
    guidanceTitle: 'Health Advice',
    guidanceTitleKo: '건강 조언',
    guidanceFooter: 'Take care of yourself',
    guidanceFooterKo: '자신을 돌보세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Wellness Plan',
    affirmationTitleKo: '건강 계획',
  },
  'spiritual-growth': {
    guidanceIcon: '💡',
    guidanceTitle: 'Growth Advice',
    guidanceTitleKo: '성장 조언',
    guidanceFooter: 'Practice these insights',
    guidanceFooterKo: '이 통찰을 실천하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Growth Plan',
    affirmationTitleKo: '성장 계획',
  },
  'decisions-crossroads': {
    guidanceIcon: '💡',
    guidanceTitle: 'Decision Advice',
    guidanceTitleKo: '결정 조언',
    guidanceFooter: 'Consider these factors',
    guidanceFooterKo: '이 요소들을 고려하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Decision Plan',
    affirmationTitleKo: '결정 계획',
  },
  'self-discovery': {
    guidanceIcon: '💡',
    guidanceTitle: 'Self Advice',
    guidanceTitleKo: '자기 이해 조언',
    guidanceFooter: 'Learn about yourself',
    guidanceFooterKo: '자신을 알아가세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Self Plan',
    affirmationTitleKo: '자기 계획',
  },
  'daily-reading': {
    guidanceIcon: '💡',
    guidanceTitle: 'Today\'s Advice',
    guidanceTitleKo: '오늘의 조언',
    guidanceFooter: 'Use this today',
    guidanceFooterKo: '오늘 활용하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Today\'s Plan',
    affirmationTitleKo: '오늘의 계획',
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

type GameState = 'loading' | 'color-select' | 'picking' | 'revealing' | 'interpreting' | 'results' | 'error';

export default function TarotReadingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { translate, language } = useI18n();
  const categoryName = params?.categoryName as string | undefined;
  const spreadId = params?.spreadId as string | undefined;
  const counselorId = searchParams?.get('counselor') || undefined;
  const counselor = counselorId ? getCounselorById(counselorId) : undefined;

  const [gameState, setGameState] = useState<GameState>('loading');
  const [spreadInfo, setSpreadInfo] = useState<Spread | null>(null);
  const [selectedDeckStyle, setSelectedDeckStyle] = useState<DeckStyle>('celestial');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  // Get question from URL params
  const questionFromUrl = searchParams?.get('question') || '';
  const [userTopic, setUserTopic] = useState<string>(questionFromUrl);
  const [selectionOrderMap, setSelectionOrderMap] = useState<Map<number, number>>(new Map());
  const selectionOrderRef = useRef<Map<number, number>>(new Map());
  const [readingResult, setReadingResult] = useState<ReadingResponse | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const detailedSectionRef = useRef<HTMLDivElement>(null);
  const [isSpreading, setIsSpreading] = useState(true); // Initial card spread animation

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

  // Stop spreading animation after cards are spread
  useEffect(() => {
    if (gameState === 'picking' && isSpreading) {
      const timer = setTimeout(() => {
        setIsSpreading(false);
      }, 800); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [gameState, isSpreading]);

  const handleColorSelect = (color: typeof CARD_COLORS[0]) => {
    setSelectedColor(color);
    setSelectedDeckStyle(color.id as DeckStyle);
  };

  const handleStartReading = () => {
    setGameState('picking');
    // Prefetch RAG context while user selects cards (non-blocking)
    apiFetch('/api/tarot/prefetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: categoryName, spreadId })
    }).catch(() => {}); // Silently ignore prefetch errors
  };

  const handleCardClick = (index: number) => {
    const currentMap = selectionOrderRef.current;
    console.warn('=== Card Click ===');
    console.warn('Clicked index:', index);
    console.warn('Current map size:', currentMap.size);
    console.warn('Current map entries:', Array.from(currentMap.entries()));

    if (gameState !== 'picking') {
      console.warn('Rejected: not in picking state');
      return;
    }
    if (currentMap.size >= (spreadInfo?.cardCount ?? 0)) {
      console.warn('Rejected: max cards reached');
      return;
    }
    if (currentMap.has(index)) {
      console.warn('Rejected: card already selected');
      return;
    }

    const newOrder = currentMap.size + 1;
    const newMap = new Map(currentMap).set(index, newOrder);
    selectionOrderRef.current = newMap;

    console.warn('New order:', newOrder);
    console.warn('New map entries:', Array.from(newMap.entries()));

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
      const response = await apiFetch('/api/tarot/interpret/stream', {
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
          language: language || 'ko',
          counselorId: counselor?.id,
          counselorStyle: counselor?.style
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
                    affirmation: '이 조언을 행동으로 옮기겠습니다.',
                    followup_questions: followupQuestions
                  });
                  // Clear streaming states to prevent duplicate display
                  setStreamingOverall('');
                  setStreamingCardInsights(new Map());
                  setStreamingGuidance('');
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
            affirmation: '이 조언을 행동으로 옮기겠습니다.',
            followup_questions: followupQuestions
          });
        }
        // Clear streaming states
        setStreamingOverall('');
        setStreamingCardInsights(new Map());
        setStreamingGuidance('');
        setIsStreaming(false);
        return;
      }

      // Fallback to non-streaming endpoint
      setIsStreaming(false);
      const fallbackResponse = await apiFetch('/api/tarot/interpret', {
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
          const response = await apiFetch('/api/tarot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: categoryName, spreadId, cardCount: targetCardCount, userTopic }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Tarot API error:', response.status, errorData);
            throw new Error(`Failed to fetch reading: ${errorData.error || response.statusText}`);
          }
          const data = await response.json();
          setReadingResult(data);

          // 즉시 기본 해석으로 결과 화면 표시
          const basicInterpretation: InterpretationResult = {
            overall_message: '',
            card_insights: data.drawnCards.map((dc: DrawnCard, idx: number) => ({
              position: data.spread.positions[idx]?.title || `Card ${idx + 1}`,
              card_name: dc.card.name,
              is_reversed: dc.isReversed,
              interpretation: dc.isReversed
                ? (language === 'ko' ? dc.card.reversed.meaningKo || dc.card.reversed.meaning : dc.card.reversed.meaning)
                : (language === 'ko' ? dc.card.upright.meaningKo || dc.card.upright.meaning : dc.card.upright.meaning)
            })),
            guidance: '',
            affirmation: '',
            fallback: true
          };
          setInterpretation(basicInterpretation);

          // 바로 결과 화면으로 전환 (카드 클릭해서 볼 수 있음)
          setTimeout(() => {
            setGameState('results');
            // 백그라운드에서 GPT 해석 가져오기
            fetchInterpretation(data);
          }, 1000);
        } catch (error) {
          console.error(error);
          setGameState('error');
        }
      };
      setTimeout(fetchReading, 500);
    }
  }, [selectedIndices, spreadInfo, categoryName, spreadId, fetchInterpretation, gameState, userTopic, language]);

  const handleReset = () => {
    router.push('/tarot');
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

  // 리딩 저장 핸들러
  const handleSaveReading = useCallback(() => {
    if (!readingResult || !spreadInfo || isSaved) return;

    try {
      const formattedReading = formatReadingForSave(
        userTopic,
        spreadInfo,
        readingResult.drawnCards,
        interpretation,
        categoryName || '',
        spreadId || '',
        selectedDeckStyle
      );

      saveReading(formattedReading);
      setIsSaved(true);
      setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!');

      // 3초 후 메시지 숨기기
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save reading:', error);
      setSaveMessage(language === 'ko' ? '저장 실패' : 'Save failed');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  }, [readingResult, spreadInfo, interpretation, userTopic, categoryName, spreadId, selectedDeckStyle, language, isSaved]);

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
            {/* User Question Display - at top */}
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
                <span className={styles.spreadName}>{language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}</span>
                <span className={styles.spreadCardCount}>{effectiveCardCount}{language === 'ko' ? '장' : ' cards'}</span>
              </div>
              <h1 className={styles.deckSelectTitle}>
                {language === 'ko' ? '덱 스타일 선택' : 'Choose Your Deck'}
              </h1>
              <p className={styles.deckSelectSubtitle}>
                {language === 'ko' ? '마음에 드는 카드 뒷면을 선택하세요' : 'Select the card back that resonates with you'}
              </p>
            </div>

            {/* Deck Grid */}
            <div className={styles.deckGrid}>
              {CARD_COLORS.map((deck) => (
                <button
                  key={deck.id}
                  className={`${styles.deckOption} ${selectedColor.id === deck.id ? styles.deckSelected : ''}`}
                  onClick={() => handleColorSelect(deck)}
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
                  <span className={styles.deckName}>
                    {language === 'ko' ? deck.nameKo : deck.name}
                  </span>
                  {selectedColor.id === deck.id && (
                    <div className={styles.deckCheckmark}>✓</div>
                  )}
                </button>
              ))}
            </div>

            {/* Start Button */}
            <button className={styles.startReadingButton} onClick={handleStartReading}>
              {language === 'ko' ? '카드 뽑기' : 'Draw Cards'} →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Interpreting state - with streaming UI
  if (gameState === 'interpreting') {
    // Skip streaming UI, just show loading
    if (false && isStreaming && (streamingOverall || streamingCardInsights.size > 0 || streamingGuidance)) {
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

  // Results state
  if (gameState === 'results' && readingResult) {
    const insight = interpretation;

    return (
      <div className={styles.resultsContainer}>
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
          <Link href="/" className={styles.homeButton} aria-label="Home">
            <span className={styles.homeIcon}>🏠</span>
            <span className={styles.homeLabel}>홈</span>
          </Link>
        </div>
        {/* Header */}
        <div className={styles.resultsHeader}>
          <h1 className={styles.resultsTitle}>{language === 'ko' ? readingResult.spread.titleKo || readingResult.spread.title : readingResult.spread.title}</h1>
          <p className={styles.resultsSubtitle}>
            {translate('tarot.results.subtitle', 'Card Interpretation')}
          </p>
          {userTopic && (
            <div className={styles.userTopicDisplay}>
              <span className={styles.topicIcon}>Q.</span>
              <span className={styles.topicText}>{userTopic}</span>
            </div>
          )}
        </div>

        {/* Overall Message or Loading Indicator */}
        {insight?.fallback ? (
          <div className={styles.loadingInsightBanner}>
            <div className={styles.loadingSpinner}></div>
            <span>{language === 'ko' ? '상세 해석 생성 중...' : 'Generating detailed reading...'}</span>
          </div>
        ) : insight?.overall_message ? (
          <div className={styles.overallMessage}>
            <div className={styles.messageIcon}>📝</div>
            <p className={styles.messageText}>{insight.overall_message}</p>
          </div>
        ) : null}

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
                    className={`${styles.resultCardSlot} ${styles.expanded}`}
                    style={{ '--card-index': index } as React.CSSProperties}
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

                      {/* Premium Insights (always shown) */}
                      {cardInsight && (
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
                                <p className={styles.animalMessage}>&quot;{cardInsight.spirit_animal.message}&quot;</p>
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

        {/* Guidance - Compact & Conditional */}
        {insight?.guidance && insight.guidance.trim() && (
          <div className={styles.guidanceBoxCompact}>
            <div className={styles.guidanceHeaderCompact}>
              <span className={styles.guidanceIconCompact}>💡</span>
              <span className={styles.guidanceTitleCompact}>
                {language === 'ko' ? '조언' : 'Advice'}
              </span>
            </div>
            <p className={styles.guidanceTextCompact}>{insight.guidance}</p>
          </div>
        )}

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
          <button
            onClick={handleSaveReading}
            className={`${styles.saveButton} ${isSaved ? styles.saved : ''}`}
            disabled={isSaved}
          >
            {isSaved ? '✓' : '💾'} {isSaved
              ? (language === 'ko' ? '저장됨' : 'Saved')
              : (language === 'ko' ? '저장하기' : 'Save Reading')
            }
          </button>
          {saveMessage && (
            <span className={styles.saveMessage}>{saveMessage}</span>
          )}
          <button onClick={handleReset} className={styles.resetButton}>
            {language === 'ko' ? '새로 읽기' : 'New Reading'}
          </button>
        </div>
      </div>
    );
  }

  // Card picking state
  return (
    <div className={styles.readingContainer}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>
      <div className={styles.instructions}>
        <h1 className={styles.instructionTitle}>{language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title}</h1>
        <div className={styles.instructionContent}>
          {gameState === 'revealing' && (
            <>
              <div className={styles.revealingOrb}></div>
              <p className={styles.revealingText}>
                ✨ {translate('tarot.reading.revealing', 'Selection Complete! Revealing your destiny...')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Top Right Controls - Progress and Redraw */}
      {gameState === 'picking' && (
        <div className={styles.topRightControls}>
          <div className={styles.progressBadge}>
            <span className={styles.progressLabel}>{language === 'ko' ? '선택' : 'Selected'}</span>
            <span className={styles.progressCount}>{selectedIndices.length} / {effectiveCardCount}</span>
          </div>
          {selectedIndices.length > 0 && (
            <button
              className={styles.redrawButton}
              onClick={() => {
                setSelectedIndices([]);
                setSelectionOrderMap(new Map());
                selectionOrderRef.current = new Map();
                setIsSpreading(true); // Trigger spread animation
              }}
            >
              {translate('tarot.reading.redraw', '다시 그리기')}
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
              className={`${styles.cardWrapper} ${isSelected ? styles.selected : ''} ${gameState === 'revealing' ? styles.revealing : ''} ${isSpreading ? styles.spreading : ''}`}
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
    </div>
  );
}
