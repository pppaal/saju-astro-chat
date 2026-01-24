'use client';

/**
 * useTarotInterpretation Hook
 * 타로 해석 가져오기 및 저장 로직
 */

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';
import { Spread, DrawnCard, DeckStyle, getCardImagePath } from '@/lib/Tarot/tarot.types';
import { getStoredBirthDate } from '@/lib/userProfile';
import { saveReading, formatReadingForSave } from '@/lib/Tarot/tarot-storage';
import { apiFetch } from '@/lib/api';
import { tarotLogger } from '@/lib/logger';
import type { InterpretationResult, ReadingResponse } from '../types';

interface UseTarotInterpretationParams {
  categoryName: string | undefined;
  spreadId: string | undefined;
  userTopic: string;
  selectedDeckStyle: DeckStyle;
}

interface UseTarotInterpretationReturn {
  isSaved: boolean;
  saveMessage: string;
  fetchInterpretation: (result: ReadingResponse) => Promise<InterpretationResult | null>;
  handleSaveReading: (
    readingResult: ReadingResponse | null,
    spreadInfo: Spread | null,
    interpretation: InterpretationResult | null
  ) => Promise<void>;
}

export function useTarotInterpretation({
  categoryName,
  spreadId,
  userTopic,
  selectedDeckStyle,
}: UseTarotInterpretationParams): UseTarotInterpretationReturn {
  const { data: session } = useSession();
  const { translate, language } = useI18n();
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const fetchInterpretation = useCallback(async (result: ReadingResponse): Promise<InterpretationResult | null> => {
    try {
      const response = await apiFetch('/api/tarot/interpret', {
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
          userQuestion: userTopic,
          language: language || 'ko',
          birthdate: getStoredBirthDate()
        })
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Interpretation failed');
    } catch (error) {
      tarotLogger.error('Failed to fetch interpretation', error instanceof Error ? error : undefined);
      // Fallback interpretation
      return {
        overall_message: translate('tarot.results.defaultMessage', 'The cards have revealed their wisdom to you.'),
        card_insights: result.drawnCards.map((dc, idx) => ({
          position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
          card_name: dc.card.name,
          is_reversed: dc.isReversed,
          interpretation: ''
        })),
        guidance: translate('tarot.results.defaultGuidance', 'Trust your intuition.'),
        affirmation: '카드의 지혜를 믿으세요.',
        fallback: true
      };
    }
  }, [categoryName, spreadId, language, translate, userTopic]);

  const handleSaveReading = useCallback(async (
    readingResult: ReadingResponse | null,
    spreadInfo: Spread | null,
    interpretation: InterpretationResult | null
  ) => {
    if (!readingResult || !spreadInfo || isSaved) return;

    try {
      const guidance = interpretation?.guidance;
      const guidanceText = Array.isArray(guidance)
        ? guidance.map(item => `${item.title}: ${item.detail}`).join('\n')
        : guidance;
      const saveInterpretation = interpretation
        ? {
            overall_message: interpretation.overall_message,
            guidance: guidanceText,
            card_insights: interpretation.card_insights,
          }
        : null;

      // Local storage save
      const formattedReading = formatReadingForSave(
        userTopic,
        spreadInfo,
        readingResult.drawnCards,
        saveInterpretation,
        categoryName || '',
        spreadId || '',
        selectedDeckStyle
      );
      saveReading(formattedReading);

      // Server API save
      if (session?.user) {
        await apiFetch('/api/tarot/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userTopic,
            theme: categoryName,
            spreadId: spreadId,
            spreadTitle: language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title,
            cards: readingResult.drawnCards.map((dc, idx) => ({
              cardId: dc.card.id,
              name: language === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
              image: getCardImagePath(dc.card.id, selectedDeckStyle),
              isReversed: dc.isReversed,
              position: language === 'ko'
                ? readingResult.spread.positions[idx]?.titleKo || readingResult.spread.positions[idx]?.title || `카드 ${idx + 1}`
                : readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
            })),
            overallMessage: interpretation?.overall_message || '',
            cardInsights: interpretation?.card_insights?.map(ci => ({
              position: ci.position,
              card_name: ci.card_name,
              is_reversed: ci.is_reversed,
              interpretation: ci.interpretation,
            })) || [],
            guidance: guidanceText || '',
            affirmation: interpretation?.affirmation || '',
            source: 'standalone',
            locale: language,
          }),
        });
      }

      setIsSaved(true);
      setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      tarotLogger.error('Failed to save reading', error instanceof Error ? error : undefined);
      setSaveMessage(language === 'ko' ? '저장 실패' : 'Save failed');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  }, [categoryName, spreadId, selectedDeckStyle, language, isSaved, session, userTopic]);

  return {
    isSaved,
    saveMessage,
    fetchInterpretation,
    handleSaveReading,
  };
}
