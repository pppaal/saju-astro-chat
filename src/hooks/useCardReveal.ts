import { useState, useCallback } from 'react';

export function useCardReveal() {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const handleCardReveal = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0) {return;}
    setRevealedCards(prev => {
      const nextToReveal = prev.length;
      if (index !== nextToReveal || prev.includes(index)) {
        return prev;
      }
      return [...prev, index];
    });
  }, []);

  const toggleCardExpand = useCallback((index: number) => {
    setExpandedCard(prev => prev === index ? null : index);
  }, []);

  const isCardRevealed = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0) {return false;}
    return revealedCards.includes(index);
  }, [revealedCards]);

  const canRevealCard = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0) {return false;}
    return index === revealedCards.length;
  }, [revealedCards]);

  return {
    revealedCards,
    expandedCard,
    handleCardReveal,
    toggleCardExpand,
    isCardRevealed,
    canRevealCard,
  };
}
