/**
 * useInlineTarotState - State management for InlineTarotModal
 *
 * Consolidates useState hooks into a single manageable state object.
 * AI 자동 추천(question-engine-v2 기반) 흐름은 제거됨 — 사용자가 직접
 * 스프레드 선택하는 단일 경로만 남김.
 */

import { useState, useEffect, useMemo } from 'react'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import type { DrawnCard, Spread, CardInsight } from '@/lib/tarot/tarot.types'

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
  /** 자동 저장 후 서버가 부여한 reading row id. clarifier / followup 채팅
   *  PATCH 호출 시 사용. null 이면 미저장 (게스트/저장 실패). */
  readingId: string | null
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
  readingId: null,
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

  // 카테고리 내 모든 스프레드 (1·2·3·5·7장) — 카드 수 오름차순.
  // 항상 전체 노출 (AI 추천으로 좁히지 않음).
  const recommendedSpreads = useMemo(() => {
    const category = tarotThemes.find((t) => t.id === DEFAULT_TAROT_CATEGORY)
    if (!category) {
      return []
    }
    return [...category.spreads].sort((a, b) => a.cardCount - b.cardCount)
  }, [])

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
      setReadingId: (readingId: string | null) => setState((prev) => ({ ...prev, readingId })),

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
