/**
 * useInlineTarotState - State management for InlineTarotModal
 *
 * Consolidates 19 useState hooks into a single manageable state object
 */

import { useState, useEffect, useMemo } from 'react'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import type { DrawnCard, Spread, CardInsight } from '@/lib/tarot/tarot.types'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'

export type Step = 'concern' | 'spread-select' | 'card-draw' | 'interpreting' | 'result'

export interface TarotState {
  // Flow state
  step: Step
  concern: string
  selectedSpread: Spread | null
  selectedCategory: string

  // Card state
  drawnCards: DrawnCard[]
  revealedCount: number
  isDrawing: boolean

  // Interpretation state
  overallMessage: string
  cardInsights: CardInsight[]
  guidance: string
  affirmation: string
  // True when the AI interpretation call failed (timeout/credits/network) so
  // the result view can surface a retry instead of silently showing blanks.
  interpretFailed: boolean

  // Save state
  isSaved: boolean
  isSaving: boolean

  // AI state
  isAnalyzing: boolean
  aiReason: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  suggestedSpreads: Spread[]
}

const initialState: TarotState = {
  step: 'concern',
  concern: '',
  selectedSpread: null,
  selectedCategory: '',
  drawnCards: [],
  revealedCount: 0,
  isDrawing: false,
  overallMessage: '',
  cardInsights: [],
  guidance: '',
  affirmation: '',
  interpretFailed: false,
  isSaved: false,
  isSaving: false,
  isAnalyzing: false,
  aiReason: '',
  questionAnalysis: null,
  suggestedSpreads: [],
}

const DEFAULT_TAROT_CATEGORY = 'general-insight'

interface UseInlineTarotStateOptions {
  isOpen: boolean
  initialConcern: string
}

export function useInlineTarotState({ isOpen, initialConcern }: UseInlineTarotStateOptions) {
  const [state, setState] = useState<TarotState>(() => ({
    ...initialState,
    concern: initialConcern,
    selectedCategory: DEFAULT_TAROT_CATEGORY,
  }))

  // Get recommended spreads based on the default tarot category
  const defaultRecommendedSpreads = useMemo(() => {
    const category = tarotThemes.find((t) => t.id === DEFAULT_TAROT_CATEGORY)
    if (!category) {
      return []
    }
    return [...category.spreads].sort((a, b) => a.cardCount - b.cardCount)
  }, [])

  const recommendedSpreads = useMemo(() => {
    if (state.suggestedSpreads.length > 0) {
      return state.suggestedSpreads
    }
    return defaultRecommendedSpreads
  }, [state.suggestedSpreads, defaultRecommendedSpreads])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState({
        ...initialState,
        concern: initialConcern,
        selectedCategory: DEFAULT_TAROT_CATEGORY,
      })
    }
  }, [isOpen, initialConcern])

  // Action creators
  const actions = useMemo(
    () => ({
      setStep: (step: Step) => setState((prev) => ({ ...prev, step })),
      setConcern: (concern: string) => setState((prev) => ({ ...prev, concern })),
      setSelectedSpread: (spread: Spread | null) =>
        setState((prev) => ({ ...prev, selectedSpread: spread })),
      setSelectedCategory: (category: string) =>
        setState((prev) => ({ ...prev, selectedCategory: category })),
      setDrawnCards: (cards: DrawnCard[]) => setState((prev) => ({ ...prev, drawnCards: cards })),
      incrementRevealedCount: () =>
        setState((prev) => ({ ...prev, revealedCount: prev.revealedCount + 1 })),
      setRevealedCount: (count: number) => setState((prev) => ({ ...prev, revealedCount: count })),
      setInterpretFailed: (interpretFailed: boolean) =>
        setState((prev) => ({ ...prev, interpretFailed })),
      setIsDrawing: (isDrawing: boolean) => setState((prev) => ({ ...prev, isDrawing })),
      setOverallMessage: (message: string | ((prev: string) => string)) =>
        setState((prev) => ({
          ...prev,
          overallMessage: typeof message === 'function' ? message(prev.overallMessage) : message,
        })),
      setCardInsights: (insights: CardInsight[]) =>
        setState((prev) => ({ ...prev, cardInsights: insights })),
      setGuidance: (guidance: string | ((prev: string) => string)) =>
        setState((prev) => ({
          ...prev,
          guidance: typeof guidance === 'function' ? guidance(prev.guidance) : guidance,
        })),
      setAffirmation: (affirmation: string | ((prev: string) => string)) =>
        setState((prev) => ({
          ...prev,
          affirmation:
            typeof affirmation === 'function' ? affirmation(prev.affirmation) : affirmation,
        })),
      setIsSaved: (isSaved: boolean) => setState((prev) => ({ ...prev, isSaved })),
      setIsSaving: (isSaving: boolean) => setState((prev) => ({ ...prev, isSaving })),
      setIsAnalyzing: (isAnalyzing: boolean) => setState((prev) => ({ ...prev, isAnalyzing })),
      setAiReason: (reason: string) => setState((prev) => ({ ...prev, aiReason: reason })),
      setQuestionAnalysis: (questionAnalysis: TarotQuestionAnalysisSnapshot | null) =>
        setState((prev) => ({ ...prev, questionAnalysis })),
      setSuggestedSpreads: (suggestedSpreads: Spread[]) =>
        setState((prev) => ({ ...prev, suggestedSpreads })),

      // Composite actions
      resetForDrawAgain: () =>
        setState((prev) => ({
          ...prev,
          drawnCards: [],
          revealedCount: 0,
          overallMessage: '',
          cardInsights: [],
          guidance: '',
          affirmation: '',
          interpretFailed: false,
          step: 'card-draw',
        })),

      selectSpreadAndProceed: (spread: Spread, reason?: string) =>
        setState((prev) => ({
          ...prev,
          selectedSpread: spread,
          aiReason: reason || '',
          step: 'card-draw',
        })),
    }),
    []
  )

  return {
    state,
    actions,
    recommendedSpreads,
  }
}

export type UseInlineTarotStateReturn = ReturnType<typeof useInlineTarotState>
