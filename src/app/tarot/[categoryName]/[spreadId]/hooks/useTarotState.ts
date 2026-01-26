/**
 * Tarot State Management Hook
 *
 * 타로 리딩의 핵심 상태 관리
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data';
import type { Spread, DeckStyle } from '@/lib/Tarot/tarot.types';
import type { GameState, InterpretationResult, ReadingResponse } from '../constants/types';
import { DECK_STYLES, DECK_STYLE_INFO } from '@/lib/Tarot/tarot.types';

// Card back color options
export const CARD_COLORS = DECK_STYLES.map(style => ({
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

export interface UseTarotStateReturn {
  // State
  gameState: GameState;
  spreadInfo: Spread | null;
  selectedDeckStyle: DeckStyle;
  selectedColor: typeof CARD_COLORS[0];
  userTopic: string;
  readingResult: ReadingResponse | null;
  interpretation: InterpretationResult | null;
  isSpreading: boolean;

  // Actions
  setGameState: (state: GameState) => void;
  setSelectedDeckStyle: (style: DeckStyle) => void;
  setSelectedColor: (color: typeof CARD_COLORS[0]) => void;
  setUserTopic: (topic: string) => void;
  setReadingResult: (result: ReadingResponse | null) => void;
  setInterpretation: (interp: InterpretationResult | null) => void;
  setIsSpreading: (spreading: boolean) => void;
}

export function useTarotState(
  categoryName: string | undefined,
  spreadId: string | undefined
): UseTarotStateReturn {
  const searchParams = useSearchParams();
  const questionFromUrl = searchParams?.get('question') || '';

  const [gameState, setGameState] = useState<GameState>('loading');
  const [spreadInfo, setSpreadInfo] = useState<Spread | null>(null);
  const [selectedDeckStyle, setSelectedDeckStyle] = useState<DeckStyle>('celestial');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [userTopic, setUserTopic] = useState<string>(questionFromUrl);
  const [readingResult, setReadingResult] = useState<ReadingResponse | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [isSpreading, setIsSpreading] = useState(false);

  // Load spread info on mount
  useEffect(() => {
    if (!categoryName || !spreadId) {return;}
    if (spreadInfo?.id === spreadId) {return;}

    const theme = tarotThemes.find(t => t.id === categoryName);
    const spread = theme?.spreads.find(s => s.id === spreadId);

    if (spread) {
      setSpreadInfo(spread);
      setGameState('color-select');
    } else {
      setGameState('error');
    }
  }, [categoryName, spreadId, spreadInfo?.id]);

  // Stop spreading animation after cards are spread
  useEffect(() => {
    if (gameState === 'picking' && isSpreading) {
      const timer = setTimeout(() => {
        setIsSpreading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState, isSpreading]);

  return {
    gameState,
    spreadInfo,
    selectedDeckStyle,
    selectedColor,
    userTopic,
    readingResult,
    interpretation,
    isSpreading,
    setGameState,
    setSelectedDeckStyle,
    setSelectedColor,
    setUserTopic,
    setReadingResult,
    setInterpretation,
    setIsSpreading,
  };
}
