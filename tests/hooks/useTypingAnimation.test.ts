import { renderHook, waitFor } from '@testing-library/react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';

// Mock setTimeout/clearTimeout
jest.useFakeTimers();

describe('useTypingAnimation', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with empty string', () => {
    const { result } = renderHook(() => useTypingAnimation(['Hello', 'World']));
    expect(result.current).toBe('');
  });

  it('should start typing after initial delay', () => {
    const { result } = renderHook(() => useTypingAnimation(['Hello'], 1000));

    // Fast-forward past initial delay
    jest.advanceTimersByTime(1000);

    expect(result.current).toBe('');

    // Start typing
    jest.advanceTimersByTime(80);
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should type out the first text', () => {
    const { result } = renderHook(() => useTypingAnimation(['Hi']));

    // Skip initial delay and type
    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(80); // H
    expect(result.current).toBe('H');

    jest.advanceTimersByTime(80); // i
    expect(result.current).toBe('Hi');
  });

  it('should delete text after pause', () => {
    const { result } = renderHook(() => useTypingAnimation(['Test']));

    // Type out completely
    jest.advanceTimersByTime(1000); // initial delay
    jest.advanceTimersByTime(80 * 4); // type "Test"
    expect(result.current).toBe('Test');

    // Wait for pause before deleting
    jest.advanceTimersByTime(2000);

    // Start deleting
    jest.advanceTimersByTime(30);
    expect(result.current).toBe('Tes');
  });

  it('should cycle through multiple texts', () => {
    const texts = ['First', 'Second'];
    const { result } = renderHook(() => useTypingAnimation(texts));

    // Type first text
    jest.advanceTimersByTime(1000 + 80 * 5); // initial + type "First"
    expect(result.current).toBe('First');

    // Delete first text
    jest.advanceTimersByTime(2000 + 30 * 5); // pause + delete

    // Type second text
    jest.advanceTimersByTime(500 + 80 * 6); // next delay + type "Second"
    expect(result.current).toBe('Second');
  });

  it('should handle empty text array', () => {
    const { result } = renderHook(() => useTypingAnimation([]));

    jest.advanceTimersByTime(5000);
    expect(result.current).toBe('');
  });

  it('should clean up timers on unmount', () => {
    const { unmount } = renderHook(() => useTypingAnimation(['Test']));

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should use custom initial delay', () => {
    const { result } = renderHook(() => useTypingAnimation(['Test'], 2000));

    jest.advanceTimersByTime(1000);
    expect(result.current).toBe(''); // Still in initial delay

    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(80);
    expect(result.current.length).toBeGreaterThan(0); // Now typing
  });
});
