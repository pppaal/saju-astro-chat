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

// The modal reset its whole state every time it opened, so tapping the
// overlay (which closes it) mid-reading wiped everything. We persist the
// state while open and resume on reopen — but only the *safe* shapes: a
// finished result, or the typed concern. Mid-draw / interpreting states
// can't be resumed because the interpretation SSE stream is aborted on
// close, so re-opening them would hang on the spinner forever.
const INLINE_DRAFT_KEY = 'tarot:inline:draft'
const INLINE_DRAFT_MAX_AGE_MS = 60 * 60 * 1000 // 1h — a stale tool draft is noise

function readInlineDraft(): TarotState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(INLINE_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt?: number; state?: TarotState } | null
    if (!parsed?.state) return null
    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > INLINE_DRAFT_MAX_AGE_MS) {
      clearInlineDraft()
      return null
    }
    return parsed.state
  } catch {
    return null
  }
}

function writeInlineDraft(state: TarotState): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(INLINE_DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), state }))
  } catch {
    // quota / private mode — non-fatal
  }
}

function clearInlineDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(INLINE_DRAFT_KEY)
  } catch {
    // ignore
  }
}

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

  // Resume / reset when the modal opens.
  useEffect(() => {
    if (!isOpen) return
    const saved = readInlineDraft()
    // A finished reading is safe to fully restore (no live stream needed) —
    // covers "I read it, accidentally tapped outside, reopened".
    if (saved && saved.step === 'result' && saved.overallMessage.trim()) {
      setState({ ...initialState, ...saved })
      return
    }
    // Otherwise start fresh. The caller's current initialConcern wins (it may
    // have changed since last open), so we don't resume half-typed concerns —
    // only a finished result above is worth resuming, since mid-draw /
    // interpreting states can't be (their SSE stream is gone).
    setState({
      ...initialState,
      concern: initialConcern,
      selectedCategory: DEFAULT_TAROT_CATEGORY,
    })
  }, [isOpen, initialConcern])

  // Persist while open so an accidental close can be resumed. Skip the
  // 'interpreting' step (transient streaming churn we can't resume anyway)
  // and a pristine empty start.
  useEffect(() => {
    if (!isOpen) return
    if (state.step === 'interpreting') return
    if (state.step === 'concern' && !state.concern.trim()) {
      clearInlineDraft()
      return
    }
    writeInlineDraft(state)
  }, [isOpen, state])

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
      // Drop the persisted draft — called once a reading is consumed into the
      // chat (onComplete) or the user heads to the full tarot page, so a later
      // reopen starts fresh instead of resurrecting the old reading.
      clearDraft: () => clearInlineDraft(),

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
