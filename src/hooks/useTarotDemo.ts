import { useReducer, useCallback } from 'react';
import { TAROT_DECK, type TarotCard } from '@/data/home';

type TarotState = {
  flippedCards: boolean[];
  selectedCards: TarotCard[];
  usedCardIndices: Set<number>;
  isDeckSpread: boolean;
};

type TarotAction =
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
      if (state.selectedCards.length === 0) return state;
      if (action.index < 0 || action.index >= state.flippedCards.length) return state;
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

export function useTarotDemo() {
  const [tarotState, dispatchTarot] = useReducer(tarotReducer, initialTarotState);

  const flipCard = (index: number) => {
    dispatchTarot({ type: 'FLIP_CARD', index });
  };

  const drawCards = useCallback(() => {
    // Select 4 random unique cards from the deck
    const indices: number[] = [];
    const cards: TarotCard[] = [];
    while (indices.length < 4) {
      const randomIndex = Math.floor(Math.random() * TAROT_DECK.length);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
        cards.push(TAROT_DECK[randomIndex]);
      }
    }
    dispatchTarot({ type: 'DRAW_ALL_CARDS', cards, usedIndices: indices });
  }, []);

  const resetTarot = () => {
    dispatchTarot({ type: 'RESET' });
  };

  return {
    flippedCards: tarotState.flippedCards,
    selectedCards: tarotState.selectedCards,
    usedCardIndices: tarotState.usedCardIndices,
    isDeckSpread: tarotState.isDeckSpread,
    flipCard,
    drawCards,
    resetTarot,
  };
}
