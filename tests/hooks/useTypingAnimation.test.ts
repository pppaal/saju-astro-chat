import { vi, describe, it, expect, afterEach, afterAll } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';

// Mock setTimeout/clearTimeout
vi.useFakeTimers();

describe('useTypingAnimation', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty string', () => {
    const { result } = renderHook(() => useTypingAnimation(['Hello', 'World']));
    expect(result.current).toBe('');
  });

  it('should start typing after initial delay', () => {
    const { result } = renderHook(() => useTypingAnimation(['Hello'], 1000));

    // Fast-forward past initial delay and one character interval
    act(() => {
      vi.advanceTimersByTime(1000 + 80);
    });

    expect(result.current).toBe('He');
  });

  it('should type out the first text', () => {
    const { result } = renderHook(() => useTypingAnimation(['Hi']));

    // Skip initial delay and type both characters
    act(() => {
      vi.advanceTimersByTime(1000 + 80);
    });
    expect(result.current).toBe('Hi');
  });

  it('should delete text after pause', () => {
    const { result } = renderHook(() => useTypingAnimation(['Test']));

    // Type out completely and wait for pause before deleting
    act(() => {
      vi.advanceTimersByTime(1000 + 80 * 3 + 2000);
    });

    // Start deleting
    expect(result.current).toBe('Tes');
  });

  it('should cycle through multiple texts', () => {
    const texts = ['First', 'Second'];
    const { result } = renderHook(() => useTypingAnimation(texts));

    // Type first text
    act(() => {
      vi.advanceTimersByTime(1000 + 80 * 5); // initial + type "First"
    });
    expect(result.current).toBe('First');

    // Delete first text
    act(() => {
      vi.advanceTimersByTime(2000 + 30 * 5); // pause + delete
    });

    // Type second text
    act(() => {
      vi.advanceTimersByTime(500 + 80 * 6); // next delay + type "Second"
    });
    expect(result.current).toBe('Second');
  });

  it('should handle empty text array', () => {
    const { result } = renderHook(() => useTypingAnimation([]));

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe('');
  });

  it('should clean up timers on unmount', () => {
    const { unmount } = renderHook(() => useTypingAnimation(['Test']));

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should use custom initial delay', () => {
    const { result } = renderHook(() => useTypingAnimation(['Test'], 2000));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(''); // Still in initial delay

    act(() => {
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(80);
    });
    expect(result.current.length).toBeGreaterThan(0); // Now typing
  });
});
