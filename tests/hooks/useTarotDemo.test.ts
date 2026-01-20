import { renderHook, act } from '@testing-library/react';
import { useTarotDemo } from '@/hooks/useTarotDemo';

describe('useTarotDemo', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTarotDemo());

    expect(result.current.flippedCards).toEqual([false, false, false, false]);
    expect(result.current.selectedCards).toEqual([]);
    expect(result.current.isDeckSpread).toBe(false);
  });

  it('should draw 4 random cards', () => {
    const { result } = renderHook(() => useTarotDemo());

    act(() => {
      result.current.drawCards();
    });

    expect(result.current.selectedCards).toHaveLength(4);
    expect(result.current.isDeckSpread).toBe(true);
    expect(result.current.flippedCards).toEqual([false, false, false, false]);
  });

  it('should flip a card when clicked', () => {
    const { result } = renderHook(() => useTarotDemo());

    // First draw cards
    act(() => {
      result.current.drawCards();
    });

    // Then flip first card
    act(() => {
      result.current.flipCard(0);
    });

    expect(result.current.flippedCards[0]).toBe(true);
    expect(result.current.flippedCards[1]).toBe(false);
    expect(result.current.flippedCards[2]).toBe(false);
    expect(result.current.flippedCards[3]).toBe(false);
  });

  it('should toggle card flip state', () => {
    const { result } = renderHook(() => useTarotDemo());

    act(() => {
      result.current.drawCards();
    });

    // Flip card
    act(() => {
      result.current.flipCard(1);
    });
    expect(result.current.flippedCards[1]).toBe(true);

    // Flip back
    act(() => {
      result.current.flipCard(1);
    });
    expect(result.current.flippedCards[1]).toBe(false);
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useTarotDemo());

    // Draw and flip some cards
    act(() => {
      result.current.drawCards();
      result.current.flipCard(0);
      result.current.flipCard(1);
    });

    // Reset
    act(() => {
      result.current.resetTarot();
    });

    expect(result.current.flippedCards).toEqual([false, false, false, false]);
    expect(result.current.selectedCards).toEqual([]);
    expect(result.current.isDeckSpread).toBe(false);
  });

  it('should not flip cards if none are selected', () => {
    const { result } = renderHook(() => useTarotDemo());

    act(() => {
      result.current.flipCard(0);
    });

    // Should remain unchanged
    expect(result.current.flippedCards).toEqual([false, false, false, false]);
  });

  it('should draw unique cards (no duplicates)', () => {
    const { result } = renderHook(() => useTarotDemo());

    act(() => {
      result.current.drawCards();
    });

    const cardNames = result.current.selectedCards.map(card => card.name);
    const uniqueNames = new Set(cardNames);

    expect(uniqueNames.size).toBe(4); // All 4 cards should be unique
  });
});
