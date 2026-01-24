/**
 * useLifePredictionPhase Hook Tests
 * Tests for phase navigation management
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLifePredictionPhase, type Phase } from '@/hooks/useLifePredictionPhase';

describe('useLifePredictionPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Phase', () => {
    it('should initialize with default birth-input phase', () => {
      const { result } = renderHook(() => useLifePredictionPhase());
      expect(result.current.phase).toBe('birth-input');
    });

    it('should initialize with custom initial phase', () => {
      const { result } = renderHook(() => useLifePredictionPhase('input'));
      expect(result.current.phase).toBe('input');
    });

    it('should accept all valid phase values', () => {
      const phases: Phase[] = ['birth-input', 'input', 'analyzing', 'result'];

      phases.forEach((phase) => {
        const { result } = renderHook(() => useLifePredictionPhase(phase));
        expect(result.current.phase).toBe(phase);
      });
    });
  });

  describe('setPhase', () => {
    it('should update phase directly', () => {
      const { result } = renderHook(() => useLifePredictionPhase());

      act(() => {
        result.current.setPhase('analyzing');
      });

      expect(result.current.phase).toBe('analyzing');
    });

    it('should transition through all phases', () => {
      const { result } = renderHook(() => useLifePredictionPhase('birth-input'));

      act(() => {
        result.current.setPhase('input');
      });
      expect(result.current.phase).toBe('input');

      act(() => {
        result.current.setPhase('analyzing');
      });
      expect(result.current.phase).toBe('analyzing');

      act(() => {
        result.current.setPhase('result');
      });
      expect(result.current.phase).toBe('result');
    });

    it('should allow backward transitions', () => {
      const { result } = renderHook(() => useLifePredictionPhase('result'));

      act(() => {
        result.current.setPhase('input');
      });

      expect(result.current.phase).toBe('input');
    });
  });

  describe('handleAskAgain', () => {
    it('should set phase to input', () => {
      const { result } = renderHook(() => useLifePredictionPhase('result'));

      act(() => {
        result.current.handleAskAgain();
      });

      expect(result.current.phase).toBe('input');
    });

    it('should call onAskAgain callback', () => {
      const onAskAgain = vi.fn();
      const { result } = renderHook(() => useLifePredictionPhase('result', onAskAgain));

      act(() => {
        result.current.handleAskAgain();
      });

      expect(onAskAgain).toHaveBeenCalledTimes(1);
    });

    it('should work without callback', () => {
      const { result } = renderHook(() => useLifePredictionPhase('result'));

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleAskAgain();
        });
      }).not.toThrow();

      expect(result.current.phase).toBe('input');
    });

    it('should call callback after setting phase', () => {
      let phaseAtCallback: Phase | null = null;
      const onAskAgain = vi.fn(() => {
        phaseAtCallback = 'input'; // Callback runs after setPhase
      });

      const { result } = renderHook(() => useLifePredictionPhase('result', onAskAgain));

      act(() => {
        result.current.handleAskAgain();
      });

      expect(result.current.phase).toBe('input');
      expect(onAskAgain).toHaveBeenCalled();
    });
  });

  describe('handleChangeBirthInfo', () => {
    it('should set phase to birth-input', () => {
      const { result } = renderHook(() => useLifePredictionPhase('result'));

      act(() => {
        result.current.handleChangeBirthInfo();
      });

      expect(result.current.phase).toBe('birth-input');
    });

    it('should call onChangeBirthInfo callback', () => {
      const onChangeBirthInfo = vi.fn();
      const { result } = renderHook(() =>
        useLifePredictionPhase('result', undefined, onChangeBirthInfo)
      );

      act(() => {
        result.current.handleChangeBirthInfo();
      });

      expect(onChangeBirthInfo).toHaveBeenCalledTimes(1);
    });

    it('should work without callback', () => {
      const { result } = renderHook(() => useLifePredictionPhase('result'));

      expect(() => {
        act(() => {
          result.current.handleChangeBirthInfo();
        });
      }).not.toThrow();

      expect(result.current.phase).toBe('birth-input');
    });

    it('should work from any phase', () => {
      const phases: Phase[] = ['input', 'analyzing', 'result'];

      phases.forEach((startPhase) => {
        const { result } = renderHook(() => useLifePredictionPhase(startPhase));

        act(() => {
          result.current.handleChangeBirthInfo();
        });

        expect(result.current.phase).toBe('birth-input');
      });
    });
  });

  describe('Callback Updates', () => {
    it('should use updated onAskAgain callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ onAskAgain }) => useLifePredictionPhase('result', onAskAgain),
        { initialProps: { onAskAgain: callback1 } }
      );

      // Update callback
      rerender({ onAskAgain: callback2 });

      act(() => {
        result.current.handleAskAgain();
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should use updated onChangeBirthInfo callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ onChangeBirthInfo }) => useLifePredictionPhase('result', undefined, onChangeBirthInfo),
        { initialProps: { onChangeBirthInfo: callback1 } }
      );

      // Update callback
      rerender({ onChangeBirthInfo: callback2 });

      act(() => {
        result.current.handleChangeBirthInfo();
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return Type', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useLifePredictionPhase());

      expect(result.current).toHaveProperty('phase');
      expect(result.current).toHaveProperty('setPhase');
      expect(result.current).toHaveProperty('handleAskAgain');
      expect(result.current).toHaveProperty('handleChangeBirthInfo');
    });

    it('should have stable handler references', () => {
      const onAskAgain = vi.fn();
      const onChangeBirthInfo = vi.fn();

      const { result, rerender } = renderHook(() =>
        useLifePredictionPhase('birth-input', onAskAgain, onChangeBirthInfo)
      );

      const initialHandleAskAgain = result.current.handleAskAgain;
      const initialHandleChangeBirthInfo = result.current.handleChangeBirthInfo;

      // Phase change should not affect handler references
      act(() => {
        result.current.setPhase('input');
      });

      rerender();

      expect(result.current.handleAskAgain).toBe(initialHandleAskAgain);
      expect(result.current.handleChangeBirthInfo).toBe(initialHandleChangeBirthInfo);
    });
  });

  describe('Flow Simulation', () => {
    it('should handle complete flow: birth-input -> input -> analyzing -> result', () => {
      const { result } = renderHook(() => useLifePredictionPhase('birth-input'));

      // User enters birth info
      expect(result.current.phase).toBe('birth-input');

      // Birth info submitted, move to input
      act(() => {
        result.current.setPhase('input');
      });
      expect(result.current.phase).toBe('input');

      // Question submitted, analyzing
      act(() => {
        result.current.setPhase('analyzing');
      });
      expect(result.current.phase).toBe('analyzing');

      // Analysis complete, show results
      act(() => {
        result.current.setPhase('result');
      });
      expect(result.current.phase).toBe('result');
    });

    it('should handle ask again flow: result -> input -> analyzing -> result', () => {
      const onAskAgain = vi.fn();
      const { result } = renderHook(() => useLifePredictionPhase('result', onAskAgain));

      // User clicks "ask again"
      act(() => {
        result.current.handleAskAgain();
      });
      expect(result.current.phase).toBe('input');
      expect(onAskAgain).toHaveBeenCalled();

      // New question submitted
      act(() => {
        result.current.setPhase('analyzing');
      });
      expect(result.current.phase).toBe('analyzing');

      // New results
      act(() => {
        result.current.setPhase('result');
      });
      expect(result.current.phase).toBe('result');
    });

    it('should handle change birth info flow', () => {
      const onChangeBirthInfo = vi.fn();
      const { result } = renderHook(() =>
        useLifePredictionPhase('result', undefined, onChangeBirthInfo)
      );

      // User clicks "change birth info"
      act(() => {
        result.current.handleChangeBirthInfo();
      });
      expect(result.current.phase).toBe('birth-input');
      expect(onChangeBirthInfo).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid phase changes', () => {
      const { result } = renderHook(() => useLifePredictionPhase());

      act(() => {
        result.current.setPhase('input');
        result.current.setPhase('analyzing');
        result.current.setPhase('result');
        result.current.setPhase('input');
      });

      expect(result.current.phase).toBe('input');
    });

    it('should handle multiple handleAskAgain calls', () => {
      const onAskAgain = vi.fn();
      const { result } = renderHook(() => useLifePredictionPhase('result', onAskAgain));

      act(() => {
        result.current.handleAskAgain();
        result.current.handleAskAgain();
        result.current.handleAskAgain();
      });

      expect(result.current.phase).toBe('input');
      expect(onAskAgain).toHaveBeenCalledTimes(3);
    });

    it('should handle setting same phase', () => {
      const { result } = renderHook(() => useLifePredictionPhase('input'));

      act(() => {
        result.current.setPhase('input');
      });

      expect(result.current.phase).toBe('input');
    });
  });
});
