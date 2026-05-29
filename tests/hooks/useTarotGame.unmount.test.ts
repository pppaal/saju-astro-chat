// tests/hooks/useTarotGame.unmount.test.ts
// Regression: fetchReading inside the cards-complete effect issued a
// fetch with no AbortController and a 1s setTimeout(setGameState('results'))
// with no cleanup. Unmounting mid-reading therefore (a) left the request
// running and (b) fired setGameState on a torn-down tree. The fix wires
// a component-level AbortController + tracks the transition timer in a
// ref so unmount aborts both.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock heavy dependencies. We never let the hook reach a real network
// boundary — the abort behavior is exercised on the apiFetch mock.
vi.mock('next/navigation', () => ({
  useParams: () => ({ categoryName: 'general', spreadId: 'three-card' }),
  useSearchParams: () => ({ get: () => null }),
}))
vi.mock('@/lib/tarot/tarot-spreads-data', () => ({
  tarotThemes: [
    {
      id: 'general',
      spreads: [{ id: 'three-card', title: 'Three Card', cardCount: 3, positions: [{}, {}, {}] }],
    },
  ],
}))
vi.mock('@/lib/tarot/tarot-storage', () => ({
  loadReadingRestorePayload: () => null,
}))
vi.mock('@/lib/tarot/questionFlow', () => ({
  loadQuestionAnalysisSnapshot: () => null,
}))
vi.mock('@/lib/tarot/findCardByName', () => ({
  findCardBySavedName: () => ({}),
}))
vi.mock('@/lib/logger', () => ({
  tarotLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/contexts/CreditModalContext', () => ({
  useCreditModal: () => ({
    showDepleted: vi.fn(),
    showLowCredits: vi.fn(),
    checkAndShowModal: vi.fn(),
  }),
}))
vi.mock('../../../utils/errorHandling', () => ({
  classifyTarotDrawError: () => ({}),
}))

let abortedSignals = 0
let resolveFetch: ((value: unknown) => void) | null = null

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn((_url: string, init?: RequestInit) => {
    const signal = init?.signal
    return new Promise((resolve, reject) => {
      resolveFetch = resolve as (value: unknown) => void
      if (signal) {
        signal.addEventListener('abort', () => {
          abortedSignals += 1
          const err = new Error('aborted')
          ;(err as Error & { name: string }).name = 'AbortError'
          reject(err)
        })
      }
    })
  }),
}))

import { useTarotGame } from '@/app/tarot/[categoryName]/[spreadId]/hooks/useTarotGame'

describe('useTarotGame — unmount safety', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    abortedSignals = 0
    resolveFetch = null
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('aborts the in-flight reading fetch on unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result, unmount } = renderHook(() => useTarotGame())

    // Drive the state machine to picking, then click 3 cards to trigger
    // the auto-fetch effect. The effect is debounced via a 500ms
    // setTimeout(fetchReading), so we also advance past that.
    act(() => {
      result.current.handleColorSelect({ id: 'celestial', name: 'celestial' } as never)
      result.current.handleStartReading()
    })
    // Stop spreading animation (800ms guard).
    act(() => {
      vi.advanceTimersByTime(900)
    })

    act(() => {
      result.current.handleCardClick(0)
      result.current.handleCardClick(1)
      result.current.handleCardClick(2)
    })

    // The 500ms debounce → fetchReading → apiFetch.
    await act(async () => {
      vi.advanceTimersByTime(600)
      await Promise.resolve()
    })

    // fetch is now in-flight.
    expect(typeof resolveFetch).toBe('function')

    // Tear down — should abort the signal.
    unmount()
    expect(abortedSignals).toBeGreaterThanOrEqual(1)

    // No state-update-after-unmount warnings.
    const stateUpdateWarnings = errorSpy.mock.calls.filter((call) => {
      const msg = String(call[0] || '')
      return msg.includes("Can't perform a React state update") || msg.includes('unmounted')
    })
    expect(stateUpdateWarnings).toEqual([])

    errorSpy.mockRestore()
  })
})
