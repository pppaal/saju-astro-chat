/**
 * Tests for CreditModalContext
 * src/contexts/CreditModalContext.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  CreditModalProvider,
  useCreditModal,
  shouldShowCreditModal,
} from '@/contexts/CreditModalContext';
import React from 'react';

// Mock CreditDepletedModal component
vi.mock('@/components/ui/CreditDepletedModal', () => ({
  default: vi.fn(() => null),
}));

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CreditModalProvider>{children}</CreditModalProvider>
);

describe('CreditModalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreditModalProvider', () => {
    it('should provide context to children', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      expect(result.current).toBeDefined();
      expect(typeof result.current.showDepleted).toBe('function');
      expect(typeof result.current.showLowCredits).toBe('function');
      expect(typeof result.current.checkAndShowModal).toBe('function');
    });
  });

  describe('useCreditModal', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCreditModal());
      }).toThrow('useCreditModal must be used within CreditModalProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('showDepleted', () => {
    it('should be callable', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      expect(() => {
        act(() => {
          result.current.showDepleted();
        });
      }).not.toThrow();
    });
  });

  describe('showLowCredits', () => {
    it('should be callable with remaining credits', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      expect(() => {
        act(() => {
          result.current.showLowCredits(2);
        });
      }).not.toThrow();
    });

    it('should accept different credit values', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      expect(() => {
        act(() => {
          result.current.showLowCredits(1);
        });
        act(() => {
          result.current.showLowCredits(5);
        });
      }).not.toThrow();
    });
  });

  describe('checkAndShowModal', () => {
    it('should return true and show depleted modal when credits are 0', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(0);
      });

      expect(shown).toBe(true);
    });

    it('should return true and show depleted modal when credits are negative', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(-1);
      });

      expect(shown).toBe(true);
    });

    it('should return true and show low credits modal when credits are at threshold', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(2);
      });

      expect(shown).toBe(true);
    });

    it('should return true for credits below threshold', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(1);
      });

      expect(shown).toBe(true);
    });

    it('should return false when credits are above threshold', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(3);
      });

      expect(shown).toBe(false);
    });

    it('should respect custom threshold', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(5, 5);
      });

      expect(shown).toBe(true);

      act(() => {
        shown = result.current.checkAndShowModal(6, 5);
      });

      expect(shown).toBe(false);
    });

    it('should use default threshold of 2', () => {
      const { result } = renderHook(() => useCreditModal(), { wrapper });

      let shown = false;
      act(() => {
        shown = result.current.checkAndShowModal(3);
      });

      expect(shown).toBe(false);

      act(() => {
        shown = result.current.checkAndShowModal(2);
      });

      expect(shown).toBe(true);
    });
  });
});

describe('shouldShowCreditModal', () => {
  it('should return show: true for 402 status', () => {
    const response = new Response(null, { status: 402 });
    const result = shouldShowCreditModal(response, {});

    expect(result.show).toBe(true);
    expect(result.type).toBe('depleted');
    expect(result.remaining).toBe(0);
  });

  it('should return show: true for depleted credits (0)', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { remainingCredits: 0 });

    expect(result.show).toBe(true);
    expect(result.type).toBe('depleted');
    expect(result.remaining).toBe(0);
  });

  it('should return show: true for negative credits', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { remainingCredits: -1 });

    expect(result.show).toBe(true);
    expect(result.type).toBe('depleted');
    expect(result.remaining).toBe(0);
  });

  it('should return show: true and type: low for credits <= 2', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { remainingCredits: 2 });

    expect(result.show).toBe(true);
    expect(result.type).toBe('low');
    expect(result.remaining).toBe(2);
  });

  it('should return show: true for credits = 1', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { remainingCredits: 1 });

    expect(result.show).toBe(true);
    expect(result.type).toBe('low');
    expect(result.remaining).toBe(1);
  });

  it('should return show: false for credits > 2', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { remainingCredits: 3 });

    expect(result.show).toBe(false);
  });

  it('should return show: false when no remainingCredits in data', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { success: true });

    expect(result.show).toBe(false);
  });

  it('should handle null data', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, null);

    expect(result.show).toBe(false);
  });

  it('should handle array data', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, [1, 2, 3]);

    expect(result.show).toBe(false);
  });

  it('should handle undefined data', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, undefined);

    expect(result.show).toBe(false);
  });

  it('should handle non-numeric remainingCredits', () => {
    const response = new Response(null, { status: 200 });
    const result = shouldShowCreditModal(response, { remainingCredits: 'many' });

    expect(result.show).toBe(false);
  });

  it('should prioritize 402 status over data', () => {
    const response = new Response(null, { status: 402 });
    const result = shouldShowCreditModal(response, { remainingCredits: 10 });

    expect(result.show).toBe(true);
    expect(result.type).toBe('depleted');
  });
});
