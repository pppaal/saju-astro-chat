/**
 * Tests for useCardSelection hook
 * src/hooks/useCardSelection.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardSelection } from '@/hooks/useCardSelection';

describe('useCardSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return empty selection state', () => {
      const { result } = renderHook(() => useCardSelection(3));

      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.selectionOrderMap.size).toBe(0);
      expect(result.current.selectionOrderRef.current.size).toBe(0);
    });
  });

  describe('handleCardClick', () => {
    it('should select a card when in picking state', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(5, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([5]);
      expect(result.current.selectionOrderMap.get(5)).toBe(1);
    });

    it('should select multiple cards in order', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(2, 'picking');
        result.current.handleCardClick(7, 'picking');
        result.current.handleCardClick(4, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([2, 7, 4]);
      expect(result.current.selectionOrderMap.get(2)).toBe(1);
      expect(result.current.selectionOrderMap.get(7)).toBe(2);
      expect(result.current.selectionOrderMap.get(4)).toBe(3);
    });

    it('should not select card if not in picking state', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(5, 'idle');
      });

      expect(result.current.selectedIndices).toEqual([]);
    });

    it('should not select card if already selected', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(5, 'picking');
        result.current.handleCardClick(5, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([5]);
      expect(result.current.selectionOrderMap.size).toBe(1);
    });

    it('should not select more cards than cardCount', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(1, 'picking');
        result.current.handleCardClick(2, 'picking');
        result.current.handleCardClick(3, 'picking');
        result.current.handleCardClick(4, 'picking'); // Should be ignored
      });

      expect(result.current.selectedIndices).toEqual([1, 2, 3]);
      expect(result.current.selectionOrderMap.size).toBe(3);
    });

    it('should handle different game states', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(1, 'loading');
      });

      expect(result.current.selectedIndices).toEqual([]);

      act(() => {
        result.current.handleCardClick(2, 'revealing');
      });

      expect(result.current.selectedIndices).toEqual([]);

      act(() => {
        result.current.handleCardClick(3, 'complete');
      });

      expect(result.current.selectedIndices).toEqual([]);
    });

    it('should maintain ref and state sync', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(10, 'picking');
      });

      expect(result.current.selectionOrderRef.current.get(10)).toBe(1);
      expect(result.current.selectionOrderMap.get(10)).toBe(1);
    });
  });

  describe('resetSelection', () => {
    it('should clear all selection state', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(1, 'picking');
        result.current.handleCardClick(5, 'picking');
        result.current.handleCardClick(10, 'picking');
      });

      expect(result.current.selectedIndices).toHaveLength(3);

      act(() => {
        result.current.resetSelection();
      });

      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.selectionOrderMap.size).toBe(0);
      expect(result.current.selectionOrderRef.current.size).toBe(0);
    });

    it('should allow re-selection after reset', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(1, 'picking');
        result.current.handleCardClick(2, 'picking');
        result.current.handleCardClick(3, 'picking');
      });

      act(() => {
        result.current.resetSelection();
      });

      act(() => {
        result.current.handleCardClick(5, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([5]);
      expect(result.current.selectionOrderMap.get(5)).toBe(1);
    });
  });

  describe('different card counts', () => {
    it('should work with single card selection', () => {
      const { result } = renderHook(() => useCardSelection(1));

      act(() => {
        result.current.handleCardClick(3, 'picking');
        result.current.handleCardClick(5, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([3]);
    });

    it('should work with large card count', () => {
      const { result } = renderHook(() => useCardSelection(10));

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleCardClick(i, 'picking');
        });
      }

      expect(result.current.selectedIndices).toHaveLength(10);
    });
  });

  describe('useCallback stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useCardSelection(3));

      const initialHandleCardClick = result.current.handleCardClick;
      const initialResetSelection = result.current.resetSelection;

      rerender();

      expect(result.current.handleCardClick).toBe(initialHandleCardClick);
      expect(result.current.resetSelection).toBe(initialResetSelection);
    });

    it('should update handleCardClick when cardCount changes', () => {
      const { result, rerender } = renderHook(
        ({ cardCount }) => useCardSelection(cardCount),
        { initialProps: { cardCount: 3 } }
      );

      const initialHandleCardClick = result.current.handleCardClick;

      rerender({ cardCount: 5 });

      expect(result.current.handleCardClick).not.toBe(initialHandleCardClick);
    });
  });

  describe('edge cases', () => {
    it('should handle index 0', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(0, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([0]);
      expect(result.current.selectionOrderMap.get(0)).toBe(1);
    });

    it('should handle large indices', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(999, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([999]);
    });

    it('should handle rapid clicks on same card', () => {
      const { result } = renderHook(() => useCardSelection(3));

      act(() => {
        result.current.handleCardClick(5, 'picking');
        result.current.handleCardClick(5, 'picking');
        result.current.handleCardClick(5, 'picking');
      });

      expect(result.current.selectedIndices).toEqual([5]);
      expect(result.current.selectionOrderMap.size).toBe(1);
    });
  });
});
