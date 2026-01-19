import { useState, useCallback } from 'react';

export function useCardReveal() {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const handleCardReveal = useCallback((index: number) => {
    const nextToReveal = revealedCards.length;
    if (index === nextToReveal && !revealedCards.includes(index)) {
      setRevealedCards(prev => [...prev, index]);
    }
  }, [revealedCards]);

  const toggleCardExpand = useCallback((index: number) => {
    setExpandedCard(prev => prev === index ? null : index);
  }, []);

  const isCardRevealed = useCallback((index: number) => {
    return revealedCards.includes(index);
  }, [revealedCards]);

  const canRevealCard = useCallback((index: number) => {
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
