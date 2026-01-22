/**
 * useLifePredictionState Hook
 *
 * Manages prediction-related state including question, event type, results, and errors.
 */

'use client';

import { useState, useCallback } from 'react';
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector';
import { TimingPeriod } from '@/components/life-prediction/ResultCards/TimingCard';

/**
 * Return type for useLifePredictionState hook
 */
export interface UseLifePredictionStateReturn {
  /** Current question being analyzed */
  currentQuestion: string;
  /** Set current question */
  setCurrentQuestion: (question: string) => void;
  /** Detected event type */
  currentEventType: EventType | null;
  /** Set current event type */
  setCurrentEventType: (eventType: EventType | null) => void;
  /** Prediction results */
  results: TimingPeriod[];
  /** Set prediction results */
  setResults: (results: TimingPeriod[]) => void;
  /** Error message */
  error: string | null;
  /** Set error message */
  setError: (error: string | null) => void;
  /** General advice from AI */
  generalAdvice: string;
  /** Set general advice */
  setGeneralAdvice: (advice: string) => void;
  /** Reset all state */
  resetAll: () => void;
}

/**
 * Hook to manage prediction-related state
 *
 * @returns Prediction state and setters
 *
 * @example
 * ```tsx
 * const {
 *   currentQuestion,
 *   setCurrentQuestion,
 *   results,
 *   setResults,
 *   resetAll
 * } = useLifePredictionState();
 * ```
 */
export function useLifePredictionState(): UseLifePredictionStateReturn {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentEventType, setCurrentEventType] = useState<EventType | null>(null);
  const [results, setResults] = useState<TimingPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generalAdvice, setGeneralAdvice] = useState<string>('');

  const resetAll = useCallback(() => {
    setCurrentQuestion('');
    setCurrentEventType(null);
    setResults([]);
    setError(null);
    setGeneralAdvice('');
  }, []);

  return {
    currentQuestion,
    setCurrentQuestion,
    currentEventType,
    setCurrentEventType,
    results,
    setResults,
    error,
    setError,
    generalAdvice,
    setGeneralAdvice,
    resetAll,
  };
}
