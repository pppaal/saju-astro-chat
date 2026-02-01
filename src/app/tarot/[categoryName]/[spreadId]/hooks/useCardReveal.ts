/**
 * Card Reveal Hook
 *
 * 카드 순차 공개 로직 관리
 */

import { useState, useCallback } from 'react';

export interface UseCardRevealReturn {
  revealedCards: number[];
  expandedCard: number | null;
  isCardRevealed: (index: number) => boolean;
  canRevealCard: (index: number) => boolean;
  handleCardReveal: (index: number) => void;
  toggleCardExpand: (index: number) => void;
}

export function useCardReveal(
  totalCards: number,
  onAllRevealed?: () => void
): UseCardRevealReturn {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const handleCardReveal = useCallback(
    (index: number) => {
      // Only allow revealing the next card in sequence
      const nextToReveal = revealedCards.length;
      if (index === nextToReveal && !revealedCards.includes(index)) {
        setRevealedCards(prev => {
          const newRevealed = [...prev, index];

          // Auto-scroll to details after last card is revealed
          if (newRevealed.length === totalCards && onAllRevealed) {
            setTimeout(() => {
              onAllRevealed();
            }, 800); // Wait for card reveal animation
          }

          return newRevealed;
        });
      }
    },
    [revealedCards, totalCards, onAllRevealed]
  );

  const toggleCardExpand = useCallback((index: number) => {
    setExpandedCard(prev => (prev === index ? null : index));
  }, []);

  const isCardRevealed = useCallback(
    (index: number) => revealedCards.includes(index),
    [revealedCards]
  );

  const canRevealCard = useCallback(
    (index: number) => index === revealedCards.length,
    [revealedCards]
  );

  return {
    revealedCards,
    expandedCard,
    isCardRevealed,
    canRevealCard,
    handleCardReveal,
    toggleCardExpand,
  };
}
