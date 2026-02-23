/**
 * Reading Service
 *
 * 타로 리딩 요청 및 저장 로직
 */

import { apiFetch } from '@/lib/api';
import { saveReading, formatReadingForSave } from '@/lib/Tarot/tarot-storage';
import { getCardImagePath } from '@/lib/Tarot/tarot.types';
import { tarotLogger } from '@/lib/logger';
import type { ReadingResponse, InterpretationResult } from '../constants/types';
import type { Spread, DeckStyle } from '@/lib/Tarot/tarot.types';
import type { Session } from 'next-auth';

export interface FetchReadingInput {
  categoryId: string | undefined;
  spreadId: string | undefined;
  cardCount: number;
  userTopic: string;
}

/**
 * 타로 리딩 가져오기
 */
export async function fetchReading(input: FetchReadingInput): Promise<ReadingResponse> {
  const { categoryId, spreadId, cardCount, userTopic } = input;

  const response = await apiFetch('/api/tarot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryId, spreadId, cardCount, userTopic }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    tarotLogger.error('Tarot API error', { status: response.status, errorData });
    throw new Error(`Failed to fetch reading: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

/**
 * RAG 컨텍스트 프리페치 (비차단)
 */
export async function prefetchRAGContext(categoryId: string | undefined, spreadId: string | undefined) {
  try {
    await apiFetch('/api/tarot/prefetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, spreadId }),
    });
  } catch {
    // Silently ignore prefetch errors
  }
}

export interface SaveReadingInput {
  userTopic: string;
  spreadInfo: Spread;
  readingResult: ReadingResponse;
  interpretation: InterpretationResult | null;
  categoryName: string;
  spreadId: string;
  selectedDeckStyle: DeckStyle;
  language: string;
  session: Session | null;
}

/**
 * 리딩 저장 (로컬 + 서버)
 */
export async function saveReadingToStorage(input: SaveReadingInput): Promise<void> {
  const {
    userTopic,
    spreadInfo,
    readingResult,
    interpretation,
    categoryName,
    spreadId,
    selectedDeckStyle,
    language,
    session,
  } = input;

  // Guidance 텍스트 변환
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

  // 로컬 스토리지 저장
  const formattedReading = formatReadingForSave(
    userTopic,
    spreadInfo,
    readingResult.drawnCards,
    saveInterpretation,
    categoryName,
    spreadId,
    selectedDeckStyle
  );
  saveReading(formattedReading);

  // 서버 저장 (로그인 사용자만)
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
          cardId: String(dc.card.id),
          name: language === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
          image: getCardImagePath(dc.card.id, selectedDeckStyle),
          isReversed: dc.isReversed,
          position:
            language === 'ko'
              ? readingResult.spread.positions[idx]?.titleKo ||
                readingResult.spread.positions[idx]?.title ||
                `카드 ${idx + 1}`
              : readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
        })),
        overallMessage: interpretation?.overall_message || '',
        cardInsights:
          interpretation?.card_insights?.map(ci => ({
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
}
