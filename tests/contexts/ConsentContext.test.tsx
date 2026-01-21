/**
 * Tests for ConsentContext
 * src/contexts/ConsentContext.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ConsentProvider, useConsent } from '@/contexts/ConsentContext';
import React from 'react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ConsentProvider>{children}</ConsentProvider>
);

describe('ConsentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('ConsentProvider', () => {
    it('should provide initial pending status', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      expect(result.current.status).toBe('pending');
    });

    it('should load granted status from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('granted');

      const { result } = renderHook(() => useConsent(), { wrapper });

      // Wait for useEffect to run
      expect(localStorageMock.getItem).toHaveBeenCalledWith('destinypal-consent');
    });

    it('should load denied status from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('denied');

      const { result } = renderHook(() => useConsent(), { wrapper });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('destinypal-consent');
    });

    it('should ignore invalid stored values', () => {
      localStorageMock.getItem.mockReturnValue('invalid-status');

      const { result } = renderHook(() => useConsent(), { wrapper });

      expect(result.current.status).toBe('pending');
    });
  });

  describe('useConsent', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useConsent());
      }).toThrow('useConsent must be used within a ConsentProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('grant', () => {
    it('should set status to granted', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      act(() => {
        result.current.grant();
      });

      expect(result.current.status).toBe('granted');
    });

    it('should save granted status to localStorage', async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      act(() => {
        result.current.grant();
      });

      // Wait for the effect to run
      await vi.waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('destinypal-consent', 'granted');
      });
    });
  });

  describe('deny', () => {
    it('should set status to denied', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      act(() => {
        result.current.deny();
      });

      expect(result.current.status).toBe('denied');
    });

    it('should save denied status to localStorage', async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      act(() => {
        result.current.deny();
      });

      // Wait for the effect to run
      await vi.waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('destinypal-consent', 'denied');
      });
    });
  });

  describe('status transitions', () => {
    it('should allow changing from pending to granted', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      expect(result.current.status).toBe('pending');

      act(() => {
        result.current.grant();
      });

      expect(result.current.status).toBe('granted');
    });

    it('should allow changing from pending to denied', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      expect(result.current.status).toBe('pending');

      act(() => {
        result.current.deny();
      });

      expect(result.current.status).toBe('denied');
    });

    it('should allow changing from granted to denied', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      act(() => {
        result.current.grant();
      });

      expect(result.current.status).toBe('granted');

      act(() => {
        result.current.deny();
      });

      expect(result.current.status).toBe('denied');
    });

    it('should allow changing from denied to granted', () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      act(() => {
        result.current.deny();
      });

      expect(result.current.status).toBe('denied');

      act(() => {
        result.current.grant();
      });

      expect(result.current.status).toBe('granted');
    });
  });

  describe('value memoization', () => {
    it('should provide stable functions', () => {
      const { result, rerender } = renderHook(() => useConsent(), { wrapper });

      const grantFn = result.current.grant;
      const denyFn = result.current.deny;

      rerender();

      // Functions should be stable (memoized)
      expect(result.current.grant).toBe(grantFn);
      expect(result.current.deny).toBe(denyFn);
    });
  });
});
