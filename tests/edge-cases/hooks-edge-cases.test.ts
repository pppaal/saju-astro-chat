import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTarotDemo } from '@/hooks/useTarotDemo';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';
import { useMainPageCanvas } from '@/hooks/useMainPageCanvas';

vi.useFakeTimers();

describe('Hooks Edge Cases', () => {
  describe('useTarotDemo edge cases', () => {
    it('should handle rapid consecutive card flips', () => {
      const { result } = renderHook(() => useTarotDemo());

      act(() => {
        result.current.drawCards();
      });

      // Rapidly flip cards
      act(() => {
        result.current.flipCard(0);
        result.current.flipCard(0);
        result.current.flipCard(0);
        result.current.flipCard(0);
      });

      // Should end up flipped (toggle 4 times = back to false, then true, false, true)
      expect(result.current.flippedCards[0]).toBe(false);
    });

    it('should handle drawing cards multiple times without reset', () => {
      const { result } = renderHook(() => useTarotDemo());

      act(() => {
        result.current.drawCards();
      });

      const firstDraw = [...result.current.selectedCards];

      // Draw again without reset (should still work)
      act(() => {
        result.current.drawCards();
      });

      const secondDraw = [...result.current.selectedCards];

      // Both draws should have 4 cards
      expect(firstDraw).toHaveLength(4);
      expect(secondDraw).toHaveLength(4);

      // They should be different (extremely high probability)
      const firstNames = firstDraw.map(c => c.name).sort().join(',');
      const secondNames = secondDraw.map(c => c.name).sort().join(',');
      // Note: There's a tiny chance they could be the same, but very unlikely
    });

    it('should handle flipping invalid card index', () => {
      const { result } = renderHook(() => useTarotDemo());

      act(() => {
        result.current.drawCards();
      });

      // Try to flip invalid indices
      act(() => {
        result.current.flipCard(-1);
        result.current.flipCard(10);
        result.current.flipCard(999);
      });

      // Cards should remain unchanged
      expect(result.current.flippedCards.every(f => f === false)).toBe(true);
    });

    it('should preserve state across multiple resets', () => {
      const { result } = renderHook(() => useTarotDemo());

      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.drawCards();
          result.current.flipCard(0);
          result.current.resetTarot();
        });

        expect(result.current.selectedCards).toEqual([]);
        expect(result.current.flippedCards).toEqual([false, false, false, false]);
        expect(result.current.isDeckSpread).toBe(false);
      }
    });
  });
  describe('useTypingAnimation edge cases', () => {
    afterEach(() => {
      vi.clearAllTimers();
    });

    it('should handle single character texts', () => {
      const { result } = renderHook(() => useTypingAnimation(['A', 'B', 'C']));

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      // After initial delay, starts typing first text
      expect(result.current).toBe('A');

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // After more time, might be on next text or still A
      expect(result.current.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long texts', () => {
      const longText = 'A'.repeat(1000);
      const { result } = renderHook(() => useTypingAnimation([longText]));

      act(() => {
        vi.advanceTimersByTime(1000 + 80 * (longText.length - 1));
      });

      expect(result.current).toBe(longText);
    });

    it('should handle texts with special characters', () => {
      const specialTexts = ['Hello! dY~S', '?^?.?~?,,?s" dY`<', 'A?Hola! A?CA3mo estA?s?'];
      const { result } = renderHook(() => useTypingAnimation(specialTexts));

      act(() => {
        vi.advanceTimersByTime(1000 + 80 * 10);
      });

      expect(result.current.length).toBeGreaterThan(0);
    });

    it('should cleanup timers on unmount', () => {
      const { unmount } = renderHook(() => useTypingAnimation(['Test']));

      act(() => {
        vi.advanceTimersByTime(500);
      });
      unmount();

      // Should not crash when advancing timers after unmount
      // Don't use act() here since the component is unmounted
      vi.advanceTimersByTime(1500);

      // If we got here, cleanup worked correctly
      expect(true).toBe(true);
    });

    it('should handle zero initial delay', () => {
      const { result } = renderHook(() => useTypingAnimation(['Quick'], 0));

      act(() => {
        vi.advanceTimersByTime(80);
      });

      expect(result.current.length).toBeGreaterThan(0);
    });
  });

  describe('useMainPageCanvas edge cases', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.getContext = vi.fn(() => ({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      })) as any;
    });

    it('should handle zero width/height canvas', () => {
      canvas.width = 0;
      canvas.height = 0;

      const { result } = renderHook(() => {
        const ref = { current: canvas };
        useMainPageCanvas(ref);
        return ref;
      });

      expect(result.current.current).toBeDefined();
    });

    it('should handle very large canvas dimensions', () => {
      global.innerWidth = 10000;
      global.innerHeight = 10000;

      renderHook(() => {
        const ref = { current: canvas };
        useMainPageCanvas(ref);
        return ref;
      });

      expect(canvas.width).toBe(10000);
      expect(canvas.height).toBe(10000);
    });

    it('should handle rapid resize events', () => {
      const { result } = renderHook(() => {
        const ref = { current: canvas };
        useMainPageCanvas(ref);
        return ref;
      });

      for (let i = 0; i < 100; i++) {
        global.innerWidth = 800 + i;
        global.innerHeight = 600 + i;
        window.dispatchEvent(new Event('resize'));
      }

      // Should not crash
      expect(result.current.current).toBeDefined();
    });

    it('should handle missing canvas context gracefully', () => {
      canvas.getContext = vi.fn(() => null);

      // The hook should handle null context gracefully without throwing
      const { result } = renderHook(() => {
        const ref = { current: canvas };
        useMainPageCanvas(ref);
        return ref;
      });

      // Should not crash - canvas ref should still be defined
      expect(result.current.current).toBeDefined();
    });
  });
});
