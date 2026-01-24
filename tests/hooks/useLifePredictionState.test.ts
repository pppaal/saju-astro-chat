/**
 * useLifePredictionState Hook Tests
 * Tests for prediction state management
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useLifePredictionState } from '@/hooks/useLifePredictionState';

describe('useLifePredictionState', () => {
  describe('Initial State', () => {
    it('should initialize with empty question', () => {
      const { result } = renderHook(() => useLifePredictionState());
      expect(result.current.currentQuestion).toBe('');
    });

    it('should initialize with null event type', () => {
      const { result } = renderHook(() => useLifePredictionState());
      expect(result.current.currentEventType).toBeNull();
    });

    it('should initialize with empty results array', () => {
      const { result } = renderHook(() => useLifePredictionState());
      expect(result.current.results).toEqual([]);
    });

    it('should initialize with null error', () => {
      const { result } = renderHook(() => useLifePredictionState());
      expect(result.current.error).toBeNull();
    });

    it('should initialize with empty general advice', () => {
      const { result } = renderHook(() => useLifePredictionState());
      expect(result.current.generalAdvice).toBe('');
    });
  });

  describe('Question State', () => {
    it('should update current question', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentQuestion('언제 결혼하면 좋을까요?');
      });

      expect(result.current.currentQuestion).toBe('언제 결혼하면 좋을까요?');
    });

    it('should handle empty question', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentQuestion('test question');
      });

      act(() => {
        result.current.setCurrentQuestion('');
      });

      expect(result.current.currentQuestion).toBe('');
    });

    it('should handle Korean and English questions', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentQuestion('When should I get married?');
      });
      expect(result.current.currentQuestion).toBe('When should I get married?');

      act(() => {
        result.current.setCurrentQuestion('이사하기 좋은 시기는?');
      });
      expect(result.current.currentQuestion).toBe('이사하기 좋은 시기는?');
    });
  });

  describe('Event Type State', () => {
    it('should update event type', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentEventType('marriage');
      });

      expect(result.current.currentEventType).toBe('marriage');
    });

    it('should handle all event types', () => {
      const { result } = renderHook(() => useLifePredictionState());
      const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

      eventTypes.forEach((eventType) => {
        act(() => {
          result.current.setCurrentEventType(eventType as any);
        });
        expect(result.current.currentEventType).toBe(eventType);
      });
    });

    it('should allow setting to null', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentEventType('career');
      });

      act(() => {
        result.current.setCurrentEventType(null);
      });

      expect(result.current.currentEventType).toBeNull();
    });
  });

  describe('Results State', () => {
    it('should update results', () => {
      const { result } = renderHook(() => useLifePredictionState());
      const mockResults = [
        {
          period: '2024년 상반기',
          score: 85,
          rating: 'excellent' as const,
          advice: '좋은 시기입니다',
        },
      ];

      act(() => {
        result.current.setResults(mockResults);
      });

      expect(result.current.results).toEqual(mockResults);
    });

    it('should handle multiple results', () => {
      const { result } = renderHook(() => useLifePredictionState());
      const mockResults = [
        { period: '2024년 1월', score: 75, rating: 'good' as const, advice: '괜찮습니다' },
        { period: '2024년 2월', score: 85, rating: 'excellent' as const, advice: '최적의 시기' },
        { period: '2024년 3월', score: 55, rating: 'caution' as const, advice: '주의 필요' },
      ];

      act(() => {
        result.current.setResults(mockResults);
      });

      expect(result.current.results).toHaveLength(3);
      expect(result.current.results[0].score).toBe(75);
      expect(result.current.results[1].score).toBe(85);
    });

    it('should replace existing results', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setResults([{ period: 'old', score: 50, rating: 'average' as const, advice: '' }]);
      });

      act(() => {
        result.current.setResults([{ period: 'new', score: 90, rating: 'excellent' as const, advice: '' }]);
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].period).toBe('new');
    });
  });

  describe('Error State', () => {
    it('should update error message', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setError('생년월일 정보가 필요합니다');
      });

      expect(result.current.error).toBe('생년월일 정보가 필요합니다');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setError('Error occurred');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('General Advice State', () => {
    it('should update general advice', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setGeneralAdvice('올해는 새로운 시작에 좋은 해입니다.');
      });

      expect(result.current.generalAdvice).toBe('올해는 새로운 시작에 좋은 해입니다.');
    });

    it('should handle long advice text', () => {
      const { result } = renderHook(() => useLifePredictionState());
      const longAdvice = '이것은 매우 긴 조언입니다. '.repeat(50);

      act(() => {
        result.current.setGeneralAdvice(longAdvice);
      });

      expect(result.current.generalAdvice).toBe(longAdvice);
    });
  });

  describe('Reset All', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useLifePredictionState());

      // Set various state values
      act(() => {
        result.current.setCurrentQuestion('결혼 시기');
        result.current.setCurrentEventType('marriage');
        result.current.setResults([{ period: '2024', score: 80, rating: 'good' as const, advice: '' }]);
        result.current.setError('Some error');
        result.current.setGeneralAdvice('Some advice');
      });

      // Verify state was set
      expect(result.current.currentQuestion).toBe('결혼 시기');
      expect(result.current.currentEventType).toBe('marriage');
      expect(result.current.results).toHaveLength(1);
      expect(result.current.error).toBe('Some error');
      expect(result.current.generalAdvice).toBe('Some advice');

      // Reset all
      act(() => {
        result.current.resetAll();
      });

      // Verify reset
      expect(result.current.currentQuestion).toBe('');
      expect(result.current.currentEventType).toBeNull();
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.generalAdvice).toBe('');
    });

    it('should be callable multiple times', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.resetAll();
        result.current.resetAll();
        result.current.resetAll();
      });

      expect(result.current.currentQuestion).toBe('');
    });
  });

  describe('State Independence', () => {
    it('should update question without affecting other state', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentEventType('career');
        result.current.setError('Previous error');
      });

      act(() => {
        result.current.setCurrentQuestion('새로운 질문');
      });

      expect(result.current.currentEventType).toBe('career');
      expect(result.current.error).toBe('Previous error');
    });

    it('should update results without affecting question', () => {
      const { result } = renderHook(() => useLifePredictionState());

      act(() => {
        result.current.setCurrentQuestion('질문입니다');
      });

      act(() => {
        result.current.setResults([{ period: '2024', score: 70, rating: 'good' as const, advice: '' }]);
      });

      expect(result.current.currentQuestion).toBe('질문입니다');
    });
  });

  describe('Return Type', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useLifePredictionState());

      expect(result.current).toHaveProperty('currentQuestion');
      expect(result.current).toHaveProperty('setCurrentQuestion');
      expect(result.current).toHaveProperty('currentEventType');
      expect(result.current).toHaveProperty('setCurrentEventType');
      expect(result.current).toHaveProperty('results');
      expect(result.current).toHaveProperty('setResults');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('setError');
      expect(result.current).toHaveProperty('generalAdvice');
      expect(result.current).toHaveProperty('setGeneralAdvice');
      expect(result.current).toHaveProperty('resetAll');
    });

    it('should have stable setter references', () => {
      const { result, rerender } = renderHook(() => useLifePredictionState());

      const initialSetQuestion = result.current.setCurrentQuestion;
      const initialResetAll = result.current.resetAll;

      rerender();

      expect(result.current.setCurrentQuestion).toBe(initialSetQuestion);
      // resetAll is memoized with useCallback
      expect(result.current.resetAll).toBe(initialResetAll);
    });
  });
});
