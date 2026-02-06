/**
 * useLifePredictionFlow Hook
 *
 * Unified hook that combines phase navigation and prediction state management.
 * Consolidates useLifePredictionPhase and useLifePredictionState into one hook.
 *
 * Previously split across:
 * - useLifePredictionPhase.ts (~69 lines)
 * - useLifePredictionState.ts (~86 lines)
 *
 * Total: ~155 lines → ~120 lines (unified, more cohesive)
 */

'use client'

import { useState, useCallback, useMemo } from 'react'

// ============ Types ============

/**
 * Available phases in the life prediction flow
 */
export type PredictionPhase = 'birth-input' | 'input' | 'analyzing' | 'result'

/**
 * Event types for life prediction
 */
export type PredictionEventType =
  | 'career'
  | 'love'
  | 'money'
  | 'health'
  | 'travel'
  | 'education'
  | 'family'
  | 'general'

/**
 * Timing period result
 */
export interface TimingPeriod {
  period: string
  score: number
  description: string
  recommendation?: string
}

/**
 * Complete prediction state
 */
export interface PredictionState {
  question: string
  eventType: PredictionEventType | null
  results: TimingPeriod[]
  generalAdvice: string
  error: string | null
}

/**
 * Hook options
 */
export interface UseLifePredictionFlowOptions {
  /** Initial phase (default: 'birth-input') */
  initialPhase?: PredictionPhase
  /** Callback when user asks another question */
  onAskAgain?: () => void
  /** Callback when user changes birth info */
  onChangeBirthInfo?: () => void
  /** Callback when analysis starts */
  onAnalyzeStart?: () => void
  /** Callback when results are ready */
  onResultsReady?: (results: TimingPeriod[]) => void
}

/**
 * Hook return type
 */
export interface UseLifePredictionFlowReturn {
  // Phase management
  phase: PredictionPhase
  setPhase: (phase: PredictionPhase) => void
  isPhase: (phase: PredictionPhase) => boolean

  // Prediction state
  question: string
  setQuestion: (question: string) => void
  eventType: PredictionEventType | null
  setEventType: (eventType: PredictionEventType | null) => void
  results: TimingPeriod[]
  setResults: (results: TimingPeriod[]) => void
  generalAdvice: string
  setGeneralAdvice: (advice: string) => void
  error: string | null
  setError: (error: string | null) => void

  // Navigation actions
  handleAskAgain: () => void
  handleChangeBirthInfo: () => void
  startAnalysis: (question: string, eventType?: PredictionEventType) => void
  completeAnalysis: (results: TimingPeriod[], advice?: string) => void
  failAnalysis: (errorMessage: string) => void

  // State checks
  hasResults: boolean
  hasError: boolean
  isAnalyzing: boolean

  // Reset
  resetPrediction: () => void
  resetAll: () => void
}

// ============ Initial State ============

const initialPredictionState: PredictionState = {
  question: '',
  eventType: null,
  results: [],
  generalAdvice: '',
  error: null,
}

// ============ Main Hook ============

/**
 * Unified hook for life prediction flow management
 *
 * @example
 * ```tsx
 * const {
 *   phase,
 *   question,
 *   results,
 *   startAnalysis,
 *   completeAnalysis,
 *   handleAskAgain,
 * } = useLifePredictionFlow({
 *   onResultsReady: (results) => console.log('Got results:', results),
 * });
 *
 * // Start analysis
 * startAnalysis('When should I change jobs?', 'career');
 *
 * // Complete with results
 * completeAnalysis(timingResults, 'Focus on spring months...');
 * ```
 */
export function useLifePredictionFlow(
  options: UseLifePredictionFlowOptions = {}
): UseLifePredictionFlowReturn {
  const {
    initialPhase = 'birth-input',
    onAskAgain,
    onChangeBirthInfo,
    onAnalyzeStart,
    onResultsReady,
  } = options

  // Phase state
  const [phase, setPhase] = useState<PredictionPhase>(initialPhase)

  // Prediction state
  const [state, setState] = useState<PredictionState>(initialPredictionState)

  // Phase check helper
  const isPhase = useCallback(
    (checkPhase: PredictionPhase) => phase === checkPhase,
    [phase]
  )

  // Individual setters
  const setQuestion = useCallback((question: string) => {
    setState((prev) => ({ ...prev, question }))
  }, [])

  const setEventType = useCallback((eventType: PredictionEventType | null) => {
    setState((prev) => ({ ...prev, eventType }))
  }, [])

  const setResults = useCallback((results: TimingPeriod[]) => {
    setState((prev) => ({ ...prev, results }))
  }, [])

  const setGeneralAdvice = useCallback((generalAdvice: string) => {
    setState((prev) => ({ ...prev, generalAdvice }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  // Navigation actions
  const handleAskAgain = useCallback(() => {
    setState((prev) => ({
      ...prev,
      question: '',
      results: [],
      generalAdvice: '',
      error: null,
    }))
    setPhase('input')
    onAskAgain?.()
  }, [onAskAgain])

  const handleChangeBirthInfo = useCallback(() => {
    setState(initialPredictionState)
    setPhase('birth-input')
    onChangeBirthInfo?.()
  }, [onChangeBirthInfo])

  // Analysis flow actions
  const startAnalysis = useCallback(
    (question: string, eventType?: PredictionEventType) => {
      setState((prev) => ({
        ...prev,
        question,
        eventType: eventType || null,
        error: null,
      }))
      setPhase('analyzing')
      onAnalyzeStart?.()
    },
    [onAnalyzeStart]
  )

  const completeAnalysis = useCallback(
    (results: TimingPeriod[], advice?: string) => {
      setState((prev) => ({
        ...prev,
        results,
        generalAdvice: advice || '',
        error: null,
      }))
      setPhase('result')
      onResultsReady?.(results)
    },
    [onResultsReady]
  )

  const failAnalysis = useCallback((errorMessage: string) => {
    setState((prev) => ({
      ...prev,
      error: errorMessage,
      results: [],
    }))
    setPhase('input')
  }, [])

  // Reset functions
  const resetPrediction = useCallback(() => {
    setState((prev) => ({
      ...prev,
      question: '',
      results: [],
      generalAdvice: '',
      error: null,
    }))
  }, [])

  const resetAll = useCallback(() => {
    setState(initialPredictionState)
    setPhase('birth-input')
  }, [])

  // Computed state
  const computed = useMemo(
    () => ({
      hasResults: state.results.length > 0,
      hasError: state.error !== null,
      isAnalyzing: phase === 'analyzing',
    }),
    [state.results.length, state.error, phase]
  )

  return {
    // Phase management
    phase,
    setPhase,
    isPhase,

    // Prediction state
    question: state.question,
    setQuestion,
    eventType: state.eventType,
    setEventType,
    results: state.results,
    setResults,
    generalAdvice: state.generalAdvice,
    setGeneralAdvice,
    error: state.error,
    setError,

    // Navigation actions
    handleAskAgain,
    handleChangeBirthInfo,
    startAnalysis,
    completeAnalysis,
    failAnalysis,

    // State checks
    ...computed,

    // Reset
    resetPrediction,
    resetAll,
  }
}

// ============ Re-exports for Backward Compatibility ============

// These allow gradual migration from old hooks
export type Phase = PredictionPhase
export type EventType = PredictionEventType
