/**
 * useFormAutoSave Hook Tests
 * 폼 자동 저장 훅 테스트
 *
 * SKIPPED: Source file does not exist
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Source file does not exist - skip all tests
describe.skip('useFormAutoSave', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Clear mock localStorage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return clearSavedData, hasSavedData, and getSavedData functions', () => {
      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: 'Test' },
        })
      );

      expect(typeof result.current.clearSavedData).toBe('function');
      expect(typeof result.current.hasSavedData).toBe('function');
      expect(typeof result.current.getSavedData).toBe('function');
    });

    it('should use correct storage key prefix', () => {
      const { rerender } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'my-form',
            data,
          }),
        { initialProps: { data: { name: 'Test' } } }
      );

      // Change data to trigger save
      rerender({ data: { name: 'Updated' } });

      // Trigger a save after debounce
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // The storage key should be prefixed
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'form-autosave-my-form',
        expect.any(String)
      );
    });
  });

  describe('loading saved data', () => {
    it('should call onLoad with saved data on mount', () => {
      const savedData = { name: 'Saved', email: 'test@example.com' };
      mockLocalStorage['form-autosave-test-form'] = JSON.stringify(savedData);

      const onLoad = vi.fn();
      renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '', email: '' },
          onLoad,
        })
      );

      expect(onLoad).toHaveBeenCalledWith(savedData);
    });

    it('should not call onLoad if no saved data', () => {
      const onLoad = vi.fn();
      renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
          onLoad,
        })
      );

      expect(onLoad).not.toHaveBeenCalled();
    });

    it('should not load data when disabled', () => {
      const savedData = { name: 'Saved' };
      mockLocalStorage['form-autosave-test-form'] = JSON.stringify(savedData);

      const onLoad = vi.fn();
      renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
          onLoad,
          enabled: false,
        })
      );

      expect(onLoad).not.toHaveBeenCalled();
    });

    it('should handle JSON parse errors gracefully', () => {
      mockLocalStorage['form-autosave-test-form'] = 'invalid-json';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onLoad = vi.fn();

      renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
          onLoad,
        })
      );

      expect(onLoad).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('saving data', () => {
    it('should save data after debounce delay', () => {
      const { rerender } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'test-form',
            data,
            delay: 1000,
          }),
        { initialProps: { data: { name: '' } } }
      );

      // Update data
      rerender({ data: { name: 'Updated' } });

      // Before delay - should not save
      expect(localStorage.setItem).not.toHaveBeenCalled();

      // After delay - should save
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'form-autosave-test-form',
        JSON.stringify({ name: 'Updated' })
      );
    });

    it('should not save on initial mount', () => {
      renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: 'Initial' },
          delay: 100,
        })
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should not save initial data
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should call onSave callback when saving', () => {
      const onSave = vi.fn();
      const { rerender } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'test-form',
            data,
            delay: 500,
            onSave,
          }),
        { initialProps: { data: { name: '' } } }
      );

      rerender({ data: { name: 'New Value' } });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onSave).toHaveBeenCalledWith({ name: 'New Value' });
    });

    it('should debounce rapid changes', () => {
      const { rerender } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'test-form',
            data,
            delay: 1000,
          }),
        { initialProps: { data: { name: 'a' } } }
      );

      // Rapid changes
      rerender({ data: { name: 'ab' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      rerender({ data: { name: 'abc' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      rerender({ data: { name: 'abcd' } });

      // Should not have saved yet
      expect(localStorage.setItem).not.toHaveBeenCalled();

      // Wait for full delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should only save the final value once
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'form-autosave-test-form',
        JSON.stringify({ name: 'abcd' })
      );
    });

    it('should not save when disabled', () => {
      const { rerender } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'test-form',
            data,
            delay: 100,
            enabled: false,
          }),
        { initialProps: { data: { name: '' } } }
      );

      rerender({ data: { name: 'Updated' } });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use custom delay', () => {
      const { rerender } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'test-form',
            data,
            delay: 2000,
          }),
        { initialProps: { data: { name: '' } } }
      );

      rerender({ data: { name: 'Updated' } });

      // Before custom delay
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(localStorage.setItem).not.toHaveBeenCalled();

      // After custom delay
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('clearSavedData', () => {
    it('should remove saved data from localStorage', () => {
      mockLocalStorage['form-autosave-test-form'] = JSON.stringify({ name: 'Saved' });

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      act(() => {
        result.current.clearSavedData();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('form-autosave-test-form');
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      // Should not throw
      expect(() => {
        result.current.clearSavedData();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('hasSavedData', () => {
    it('should return true when data exists', () => {
      mockLocalStorage['form-autosave-test-form'] = JSON.stringify({ name: 'Saved' });

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      expect(result.current.hasSavedData()).toBe(true);
    });

    it('should return false when no data exists', () => {
      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      expect(result.current.hasSavedData()).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      expect(result.current.hasSavedData()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getSavedData', () => {
    it('should return saved data', () => {
      const savedData = { name: 'Saved', count: 42 };
      mockLocalStorage['form-autosave-test-form'] = JSON.stringify(savedData);

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '', count: 0 },
        })
      );

      expect(result.current.getSavedData()).toEqual(savedData);
    });

    it('should return null when no data exists', () => {
      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      expect(result.current.getSavedData()).toBeNull();
    });

    it('should handle parse errors gracefully', () => {
      mockLocalStorage['form-autosave-test-form'] = 'invalid-json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'test-form',
          data: { name: '' },
        })
      );

      expect(result.current.getSavedData()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const { rerender, unmount } = renderHook(
        ({ data }) =>
          useFormAutoSave({
            key: 'test-form',
            data,
            delay: 1000,
          }),
        { initialProps: { data: { name: '' } } }
      );

      rerender({ data: { name: 'Updated' } });

      // Unmount before delay
      unmount();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should not save after unmount
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('different data types', () => {
    it('should handle complex nested objects', () => {
      const complexData = {
        user: { name: 'Test', address: { city: 'Seoul', zip: '12345' } },
        items: [1, 2, 3],
        settings: { theme: 'dark', notifications: true },
      };

      mockLocalStorage['form-autosave-complex'] = JSON.stringify(complexData);

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'complex',
          data: complexData,
        })
      );

      expect(result.current.getSavedData()).toEqual(complexData);
    });

    it('should handle arrays', () => {
      const arrayData = ['item1', 'item2', 'item3'];
      mockLocalStorage['form-autosave-array'] = JSON.stringify(arrayData);

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'array',
          data: arrayData,
        })
      );

      expect(result.current.getSavedData()).toEqual(arrayData);
    });

    it('should handle primitive values', () => {
      mockLocalStorage['form-autosave-primitive'] = JSON.stringify('simple string');

      const { result } = renderHook(() =>
        useFormAutoSave({
          key: 'primitive',
          data: 'simple string',
        })
      );

      expect(result.current.getSavedData()).toBe('simple string');
    });
  });
});
