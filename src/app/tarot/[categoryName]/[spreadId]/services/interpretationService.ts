/**
 * Interpretation Service
 *
 * AI 해석 fetching 로직
 */

import { apiFetch } from '@/lib/api';
import { getStoredBirthDate } from '@/lib/userProfile';
import { tarotLogger } from '@/lib/logger';
import type { ReadingResponse, InterpretationResult } from '../constants/types';

export interface FetchInterpretationInput {
  categoryId: string | undefined;
  spreadId: string | undefined;
  result: ReadingResponse;
  userQuestion: string;
  language: string;
  translate: (key: string, fallback: string) => string;
}

/**
 * AI 해석 가져오기 (비스트리밍)
 */
export async function fetchInterpretation(
  input: FetchInterpretationInput
): Promise<InterpretationResult> {
  const { categoryId, spreadId, result, userQuestion, language, translate } = input;

  try {
    const response = await apiFetch('/api/tarot/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId,
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
            keywordsKo: meaning.keywordsKo,
          };
        }),
        userQuestion,
        language: language || 'ko',
        birthdate: getStoredBirthDate(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error('Interpretation failed');
  } catch (error) {
    tarotLogger.error('Failed to fetch interpretation', error instanceof Error ? error : undefined);

    // Fallback interpretation
    return createFallbackInterpretation(result, translate);
  }
}

/**
 * 기본 해석 생성 (AI 실패 시)
 */
export function createFallbackInterpretation(
  result: ReadingResponse,
  translate: (key: string, fallback: string) => string
): InterpretationResult {
  return {
    overall_message: translate('tarot.results.defaultMessage', 'The cards have revealed their wisdom to you.'),
    card_insights: result.drawnCards.map((dc, idx) => ({
      position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
      card_name: dc.card.name,
      is_reversed: dc.isReversed,
      interpretation: '',
    })),
    guidance: translate('tarot.results.defaultGuidance', 'Trust your intuition.'),
    affirmation: '카드의 지혜를 믿으세요.',
    fallback: true,
  };
}

/**
 * 기본 해석 (로딩 중)
 */
export function createBasicInterpretation(result: ReadingResponse): InterpretationResult {
  return {
    overall_message: '',
    card_insights: result.drawnCards.map((dc, idx) => ({
      position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
      card_name: dc.card.name,
      is_reversed: dc.isReversed,
      interpretation: '',
    })),
    guidance: '',
    affirmation: '',
    fallback: true,
  };
}
