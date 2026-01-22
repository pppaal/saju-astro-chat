/**
 * Card Selection Hook
 *
 * 카드 선택 로직 관리
 */

import { useState, useRef, useCallback } from 'react';
import type { GameState } from '../constants/types';
import { tarotLogger } from '@/lib/logger';

export interface UseCardSelectionReturn {
  selectedIndices: number[];
  selectionOrderMap: Map<number, number>;
  handleCardClick: (index: number) => void;
  resetSelection: () => void;
}

export function useCardSelection(
  gameState: GameState,
  maxCards: number
): UseCardSelectionReturn {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectionOrderMap, setSelectionOrderMap] = useState<Map<number, number>>(new Map());
  const selectionOrderRef = useRef<Map<number, number>>(new Map());

  const handleCardClick = useCallback(
    (index: number) => {
      const currentMap = selectionOrderRef.current;
      tarotLogger.debug('=== Card Click ===');
      tarotLogger.debug('Card clicked', { index, mapSize: currentMap.size });

      if (gameState !== 'picking') {
        tarotLogger.debug('Rejected: not in picking state');
        return;
      }
      if (currentMap.size >= maxCards) {
        tarotLogger.debug('Rejected: max cards reached');
        return;
      }
      if (currentMap.has(index)) {
        tarotLogger.debug('Rejected: card already selected');
        return;
      }

      const newOrder = currentMap.size + 1;
      const newMap = new Map(currentMap).set(index, newOrder);
      selectionOrderRef.current = newMap;

      tarotLogger.debug('Card selected', { newOrder, mapSize: newMap.size });

      setSelectionOrderMap(newMap);
      setSelectedIndices(prev => [...prev, index]);
    },
    [gameState, maxCards]
  );

  const resetSelection = useCallback(() => {
    setSelectedIndices([]);
    setSelectionOrderMap(new Map());
    selectionOrderRef.current = new Map();
  }, []);

  return {
    selectedIndices,
    selectionOrderMap,
    handleCardClick,
    resetSelection,
  };
}
