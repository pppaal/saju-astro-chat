import { useState, useRef, useCallback } from 'react';

export function useCardSelection(cardCount: number) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectionOrderMap, setSelectionOrderMap] = useState<Map<number, number>>(new Map());
  const selectionOrderRef = useRef<Map<number, number>>(new Map());

  const handleCardClick = useCallback((index: number, gameState: string) => {
    const currentMap = selectionOrderRef.current;

    if (gameState !== 'picking') {return;}
    if (currentMap.size >= cardCount) {return;}
    if (currentMap.has(index)) {return;}

    const newOrder = currentMap.size + 1;
    const newMap = new Map(currentMap).set(index, newOrder);
    selectionOrderRef.current = newMap;

    setSelectionOrderMap(newMap);
    setSelectedIndices((prev) => [...prev, index]);
  }, [cardCount]);

  const resetSelection = useCallback(() => {
    setSelectedIndices([]);
    setSelectionOrderMap(new Map());
    selectionOrderRef.current = new Map();
  }, []);

  return {
    selectedIndices,
    selectionOrderMap,
    selectionOrderRef,
    handleCardClick,
    resetSelection,
  };
}
