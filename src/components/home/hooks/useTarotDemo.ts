/**
 * Tarot Demo Hook
 *
 * 타로 카드 데모 상태 관리
 */

import { useReducer, useCallback } from 'react';
import type { TarotCard } from '@/data/home';

export interface TarotState {
  flippedCards: boolean[];
  selectedCards: TarotCard[];
  usedCardIndices: Set<number>;
  isDeckSpread: boolean;
}

export type TarotAction =
  | { type: 'FLIP_CARD'; index: number }
  | { type: 'DRAW_ALL_CARDS'; cards: TarotCard[]; usedIndices: number[] }
  | { type: 'RESET' };

const initialTarotState: TarotState = {
  flippedCards: [false, false, false, false],
  selectedCards: [],
  usedCardIndices: new Set(),
  isDeckSpread: false,
};

function tarotReducer(state: TarotState, action: TarotAction): TarotState {
  switch (action.type) {
    case 'FLIP_CARD': {
      if (state.selectedCards.length === 0) {return state;}
      const newFlipped = [...state.flippedCards];
      newFlipped[action.index] = !newFlipped[action.index];
      return { ...state, flippedCards: newFlipped };
    }
    case 'DRAW_ALL_CARDS': {
      return {
        ...state,
        selectedCards: action.cards,
        usedCardIndices: new Set(action.usedIndices),
        flippedCards: [false, false, false, false],
        isDeckSpread: true,
      };
    }
    case 'RESET':
      return initialTarotState;
    default:
      return state;
  }
}

export function useTarotDemo(tarotDeck: TarotCard[]) {
  const [tarotState, dispatchTarot] = useReducer(tarotReducer, initialTarotState);
  const { flippedCards, selectedCards, isDeckSpread } = tarotState;

  // Fisher-Yates shuffle
  const fisherYatesShuffle = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const handleCardClick = useCallback(
    (index: number) => {
      if (selectedCards.length > 0) {
        dispatchTarot({ type: 'FLIP_CARD', index });
      }
    },
    [selectedCards.length]
  );

  const handleDeckClick = useCallback(() => {
    if (isDeckSpread) {
      dispatchTarot({ type: 'RESET' });
    } else {
      const indices = Array.from({ length: tarotDeck.length }, (_, i) => i);
      const shuffled = fisherYatesShuffle(indices);
      const selectedIndices = shuffled.slice(0, 4);
      const cards = selectedIndices.map(i => tarotDeck[i]);
      dispatchTarot({ type: 'DRAW_ALL_CARDS', cards, usedIndices: selectedIndices });
    }
  }, [isDeckSpread, fisherYatesShuffle, tarotDeck]);

  return {
    flippedCards,
    selectedCards,
    isDeckSpread,
    handleCardClick,
    handleDeckClick,
  };
}
