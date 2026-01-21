import { renderHook, act } from '@testing-library/react';
import { useCardReveal } from '@/hooks/useCardReveal';

describe('useCardReveal', () => {
  describe('Initial state', () => {
    it('should start with no revealed cards', () => {
      const { result } = renderHook(() => useCardReveal());

      expect(result.current.revealedCards).toEqual([]);
      expect(result.current.expandedCard).toBeNull();
    });

    it('should have all utility functions available', () => {
      const { result } = renderHook(() => useCardReveal());

      expect(typeof result.current.handleCardReveal).toBe('function');
      expect(typeof result.current.toggleCardExpand).toBe('function');
      expect(typeof result.current.isCardRevealed).toBe('function');
      expect(typeof result.current.canRevealCard).toBe('function');
    });
  });

  describe('Card reveal logic', () => {
    it('should reveal first card (index 0)', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(0);
      });

      expect(result.current.revealedCards).toEqual([0]);
    });

    it('should reveal cards in sequence', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(0);
      });
      expect(result.current.revealedCards).toEqual([0]);

      act(() => {
        result.current.handleCardReveal(1);
      });
      expect(result.current.revealedCards).toEqual([0, 1]);

      act(() => {
        result.current.handleCardReveal(2);
      });
      expect(result.current.revealedCards).toEqual([0, 1, 2]);
    });

    it('should not reveal cards out of sequence', () => {
      const { result } = renderHook(() => useCardReveal());

      // Try to reveal card 2 without revealing 0 and 1 first
      act(() => {
        result.current.handleCardReveal(2);
      });

      expect(result.current.revealedCards).toEqual([]);
    });

    it('should not reveal the same card twice', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(0);
      });
      expect(result.current.revealedCards).toEqual([0]);

      // Try to reveal card 0 again
      act(() => {
        result.current.handleCardReveal(0);
      });
      expect(result.current.revealedCards).toEqual([0]);
    });

    it('should enforce sequential reveal order', () => {
      const { result } = renderHook(() => useCardReveal());

      // Reveal in wrong order
      act(() => {
        result.current.handleCardReveal(1);
        result.current.handleCardReveal(0);
        result.current.handleCardReveal(2);
      });

      // Only card 0 should be revealed (first in sequence)
      expect(result.current.revealedCards).toEqual([0]);
    });
  });

  describe('isCardRevealed', () => {
    it('should return false for unrevealed cards', () => {
      const { result } = renderHook(() => useCardReveal());

      expect(result.current.isCardRevealed(0)).toBe(false);
      expect(result.current.isCardRevealed(1)).toBe(false);
      expect(result.current.isCardRevealed(2)).toBe(false);
    });

    it('should return true for revealed cards', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(0);
        result.current.handleCardReveal(1);
      });

      expect(result.current.isCardRevealed(0)).toBe(true);
      expect(result.current.isCardRevealed(1)).toBe(true);
      expect(result.current.isCardRevealed(2)).toBe(false);
    });
  });

  describe('canRevealCard', () => {
    it('should return true only for the next card in sequence', () => {
      const { result } = renderHook(() => useCardReveal());

      expect(result.current.canRevealCard(0)).toBe(true);
      expect(result.current.canRevealCard(1)).toBe(false);
      expect(result.current.canRevealCard(2)).toBe(false);

      act(() => {
        result.current.handleCardReveal(0);
      });

      expect(result.current.canRevealCard(0)).toBe(false);
      expect(result.current.canRevealCard(1)).toBe(true);
      expect(result.current.canRevealCard(2)).toBe(false);

      act(() => {
        result.current.handleCardReveal(1);
      });

      expect(result.current.canRevealCard(0)).toBe(false);
      expect(result.current.canRevealCard(1)).toBe(false);
      expect(result.current.canRevealCard(2)).toBe(true);
    });

    it('should handle large indices', () => {
      const { result } = renderHook(() => useCardReveal());

      expect(result.current.canRevealCard(100)).toBe(false);

      // Reveal many cards
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.handleCardReveal(i);
        }
      });

      expect(result.current.canRevealCard(100)).toBe(true);
      expect(result.current.canRevealCard(101)).toBe(false);
    });
  });

  describe('Card expansion', () => {
    it('should expand a card', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.toggleCardExpand(0);
      });

      expect(result.current.expandedCard).toBe(0);
    });

    it('should collapse an expanded card', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.toggleCardExpand(0);
      });
      expect(result.current.expandedCard).toBe(0);

      act(() => {
        result.current.toggleCardExpand(0);
      });
      expect(result.current.expandedCard).toBeNull();
    });

    it('should switch expanded card', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.toggleCardExpand(0);
      });
      expect(result.current.expandedCard).toBe(0);

      act(() => {
        result.current.toggleCardExpand(1);
      });
      expect(result.current.expandedCard).toBe(1);
    });

    it('should allow expanding unrevealed cards', () => {
      const { result } = renderHook(() => useCardReveal());

      // No cards revealed, but can still expand
      act(() => {
        result.current.toggleCardExpand(5);
      });

      expect(result.current.expandedCard).toBe(5);
    });

    it('should handle rapid toggle', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.toggleCardExpand(0);
        result.current.toggleCardExpand(0);
        result.current.toggleCardExpand(0);
      });

      expect(result.current.expandedCard).toBe(0);
    });
  });

  describe('Multiple cards scenario', () => {
    it('should handle revealing all cards in a 3-card spread', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(0);
        result.current.handleCardReveal(1);
        result.current.handleCardReveal(2);
      });

      expect(result.current.revealedCards).toEqual([0, 1, 2]);
      expect(result.current.isCardRevealed(0)).toBe(true);
      expect(result.current.isCardRevealed(1)).toBe(true);
      expect(result.current.isCardRevealed(2)).toBe(true);
      expect(result.current.canRevealCard(3)).toBe(true);
    });

    it('should handle revealing all cards in a 10-card spread', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.handleCardReveal(i);
        }
      });

      expect(result.current.revealedCards).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(result.current.revealedCards.length).toBe(10);
    });
  });

  describe('useCallback stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useCardReveal());

      const initialHandleCardReveal = result.current.handleCardReveal;
      const initialToggleCardExpand = result.current.toggleCardExpand;
      const initialIsCardRevealed = result.current.isCardRevealed;
      const initialCanRevealCard = result.current.canRevealCard;

      rerender();

      expect(result.current.handleCardReveal).toBe(initialHandleCardReveal);
      expect(result.current.toggleCardExpand).toBe(initialToggleCardExpand);
      expect(result.current.isCardRevealed).toBe(initialIsCardRevealed);
      expect(result.current.canRevealCard).toBe(initialCanRevealCard);
    });

    it('should update function references when state changes', () => {
      const { result } = renderHook(() => useCardReveal());

      const initialHandleCardReveal = result.current.handleCardReveal;

      act(() => {
        result.current.handleCardReveal(0);
      });

      // Function reference should change because revealedCards changed
      expect(result.current.handleCardReveal).not.toBe(initialHandleCardReveal);
    });
  });

  describe('Edge cases', () => {
    it('should handle negative indices', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(-1);
      });

      expect(result.current.revealedCards).toEqual([]);
      expect(result.current.canRevealCard(-1)).toBe(false);
    });

    it('should handle very large indices', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(1000);
      });

      expect(result.current.revealedCards).toEqual([]);
      expect(result.current.canRevealCard(1000)).toBe(false);
    });

    it('should handle decimal indices', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(1.5 as any);
      });

      // Should not reveal (non-integer index)
      expect(result.current.revealedCards).toEqual([]);
    });

    it('should handle NaN index', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(NaN as any);
      });

      expect(result.current.revealedCards).toEqual([]);
    });

    it('should handle revealing same index multiple times rapidly', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.handleCardReveal(0);
        }
      });

      expect(result.current.revealedCards).toEqual([0]);
    });
  });

  describe('Complex interaction scenarios', () => {
    it('should handle reveal and expand together', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.handleCardReveal(0);
        result.current.toggleCardExpand(0);
      });

      expect(result.current.revealedCards).toEqual([0]);
      expect(result.current.expandedCard).toBe(0);
      expect(result.current.isCardRevealed(0)).toBe(true);
    });

    it('should expand then reveal different cards', () => {
      const { result } = renderHook(() => useCardReveal());

      act(() => {
        result.current.toggleCardExpand(2);
        result.current.handleCardReveal(0);
        result.current.handleCardReveal(1);
      });

      expect(result.current.revealedCards).toEqual([0, 1]);
      expect(result.current.expandedCard).toBe(2);
    });

    it('should handle complete card reading flow', () => {
      const { result } = renderHook(() => useCardReveal());

      // User reveals first card
      act(() => {
        result.current.handleCardReveal(0);
      });

      // User expands first card to read it
      act(() => {
        result.current.toggleCardExpand(0);
      });
      expect(result.current.expandedCard).toBe(0);

      // User collapses and reveals second card
      act(() => {
        result.current.toggleCardExpand(0);
        result.current.handleCardReveal(1);
      });
      expect(result.current.expandedCard).toBeNull();
      expect(result.current.revealedCards).toEqual([0, 1]);

      // User expands second card
      act(() => {
        result.current.toggleCardExpand(1);
      });
      expect(result.current.expandedCard).toBe(1);

      // User switches to view first card again
      act(() => {
        result.current.toggleCardExpand(0);
      });
      expect(result.current.expandedCard).toBe(0);
    });
  });

  describe('State isolation', () => {
    it('should maintain separate state for multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useCardReveal());
      const { result: result2 } = renderHook(() => useCardReveal());

      act(() => {
        result1.current.handleCardReveal(0);
        result2.current.handleCardReveal(0);
        result2.current.handleCardReveal(1);
      });

      expect(result1.current.revealedCards).toEqual([0]);
      expect(result2.current.revealedCards).toEqual([0, 1]);
    });
  });
});
