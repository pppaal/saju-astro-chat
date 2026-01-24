/**
 * useInlineTarotAPI - API calls for InlineTarotModal
 *
 * Handles all API interactions: analyze question, draw cards, interpret, save
 */

import { useCallback, useRef } from 'react';
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data';
import type { DrawnCard, Spread, CardInsight } from '@/lib/Tarot/tarot.types';
import { logger } from '@/lib/logger';
import type { UseInlineTarotStateReturn, Step } from './useInlineTarotState';

type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru';

interface Profile {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  city?: string;
  gender?: string;
}

interface UseInlineTarotAPIOptions {
  stateManager: UseInlineTarotStateReturn;
  lang: LangKey;
  profile: Profile;
}

export function useInlineTarotAPI({ stateManager, lang, profile }: UseInlineTarotAPIOptions) {
  const { state, actions, recommendedSpreads, themeToCategory } = stateManager;
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI auto-select spread based on question
  const analyzeQuestion = useCallback(async () => {
    if (!state.concern.trim()) return;

    actions.setIsAnalyzing(true);
    try {
      const res = await fetch('/api/tarot/analyze-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify({
          question: state.concern,
          language: lang,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze question');
      }

      const data = await res.json();

      // Handle dangerous questions
      if (data.isDangerous) {
        alert(data.message);
        actions.setIsAnalyzing(false);
        return;
      }

      const selectedId = data.spreadId;
      const reason = data.reason || data.userFriendlyExplanation || '';

      // Find the spread
      let spread = recommendedSpreads.find((s) => s.id === selectedId);

      if (!spread && recommendedSpreads.length > 0) {
        // Try different category if AI suggested one
        if (data.themeId && data.themeId !== state.selectedCategory) {
          const newCategory = tarotThemes.find((t) => t.id === data.themeId);
          if (newCategory) {
            spread = newCategory.spreads.find((s) => s.id === selectedId);
            if (spread) {
              actions.setSelectedCategory(data.themeId);
            }
          }
        }

        // Fallback to first recommended
        if (!spread) {
          spread = recommendedSpreads[0];
        }
      }

      if (spread) {
        actions.selectSpreadAndProceed(spread, reason);
      } else {
        actions.setStep('spread-select');
      }
    } catch (err) {
      logger.error('[InlineTarot] auto-select error:', err);
      actions.setStep('spread-select');
    } finally {
      actions.setIsAnalyzing(false);
    }
  }, [state.concern, state.selectedCategory, lang, recommendedSpreads, actions]);

  // Draw cards from API
  const drawCards = useCallback(async () => {
    if (!state.selectedSpread) return;

    actions.setIsDrawing(true);
    try {
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify({
          categoryId: state.selectedCategory,
          spreadId: state.selectedSpread.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('[InlineTarot] API error:', { status: res.status, errorData });
        throw new Error(`Failed to draw cards: ${res.status}`);
      }

      const data = await res.json();
      actions.setDrawnCards(data.drawnCards);

      // Animate card reveals
      for (let i = 0; i < data.drawnCards.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        actions.incrementRevealedCount();
      }

      // Start interpretation
      actions.setStep('interpreting');
      await fetchInterpretation(data.drawnCards);
    } catch (err) {
      logger.error('[InlineTarot] draw error:', err);
    } finally {
      actions.setIsDrawing(false);
    }
  }, [state.selectedSpread, state.selectedCategory, actions]);

  // Fetch streaming interpretation
  const fetchInterpretation = useCallback(async (cards: DrawnCard[]) => {
    const { selectedSpread } = state;
    if (!selectedSpread) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const payload = {
      categoryId: state.selectedCategory,
      spreadId: selectedSpread.id,
      spreadTitle: lang === 'ko' ? selectedSpread.titleKo || selectedSpread.title : selectedSpread.title,
      cards: cards.map((dc, idx) => ({
        name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
        isReversed: dc.isReversed,
        position: lang === 'ko'
          ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
          : selectedSpread.positions[idx]?.title,
        meaning: dc.isReversed
          ? (lang === 'ko' ? dc.card.reversed.meaningKo || dc.card.reversed.meaning : dc.card.reversed.meaning)
          : (lang === 'ko' ? dc.card.upright.meaningKo || dc.card.upright.meaning : dc.card.upright.meaning),
        keywords: dc.isReversed
          ? (lang === 'ko' ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords : dc.card.reversed.keywords)
          : (lang === 'ko' ? dc.card.upright.keywordsKo || dc.card.upright.keywords : dc.card.upright.keywords),
      })),
      language: lang,
      userQuestion: state.concern,
      birthdate: profile.birthDate,
    };

    try {
      const res = await fetch('/api/tarot/interpret/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const tempInsights: CardInsight[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);

            if (parsed.section === 'overall_message') {
              actions.setOverallMessage((prev: string) => prev + (parsed.content || ''));
            } else if (parsed.section === 'card_insight') {
              const idx = parsed.index ?? 0;
              if (!tempInsights[idx]) {
                tempInsights[idx] = {
                  position: selectedSpread.positions[idx]?.title || '',
                  card_name: cards[idx]?.card.name || '',
                  is_reversed: cards[idx]?.isReversed || false,
                  interpretation: '',
                };
              }
              tempInsights[idx].interpretation += parsed.content || '';
              actions.setCardInsights([...tempInsights]);

              if (parsed.extras) {
                Object.assign(tempInsights[idx], parsed.extras);
                actions.setCardInsights([...tempInsights]);
              }
            } else if (parsed.section === 'guidance') {
              actions.setGuidance((prev: string) => prev + (parsed.content || ''));
            } else if (parsed.section === 'affirmation') {
              actions.setAffirmation((prev: string) => prev + (parsed.content || ''));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      actions.setStep('result');
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        logger.error('[InlineTarot] interpret error:', err);
      }
      actions.setStep('result');
    }
  }, [state.selectedSpread, state.selectedCategory, state.concern, lang, profile.birthDate, actions]);

  // Save tarot reading to database
  const saveReading = useCallback(async () => {
    const { selectedSpread, drawnCards, overallMessage, cardInsights, guidance, affirmation, isSaving, isSaved, concern, selectedCategory } = state;
    if (isSaving || isSaved || !selectedSpread) return;

    actions.setIsSaving(true);
    try {
      const res = await fetch('/api/tarot/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: concern,
          theme: selectedCategory,
          spreadId: selectedSpread.id,
          spreadTitle: lang === 'ko' ? selectedSpread.titleKo || selectedSpread.title : selectedSpread.title,
          cards: drawnCards.map((dc, idx) => ({
            cardId: dc.card.id,
            name: lang === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
            image: dc.card.image,
            isReversed: dc.isReversed,
            position: lang === 'ko'
              ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
              : selectedSpread.positions[idx]?.title,
          })),
          overallMessage,
          cardInsights,
          guidance,
          affirmation,
          source: 'counselor',
          locale: lang,
        }),
      });

      if (res.ok) {
        actions.setIsSaved(true);
      } else {
        const err = await res.json().catch(() => ({}));
        logger.error('[InlineTarot] save error:', err);
      }
    } catch (err) {
      logger.error('[InlineTarot] save error:', err);
    } finally {
      actions.setIsSaving(false);
    }
  }, [state, lang, actions]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    analyzeQuestion,
    drawCards,
    saveReading,
    cleanup,
  };
}

export type UseInlineTarotAPIReturn = ReturnType<typeof useInlineTarotAPI>;
