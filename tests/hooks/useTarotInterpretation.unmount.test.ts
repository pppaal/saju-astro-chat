// tests/hooks/useTarotInterpretation.unmount.test.ts
// Regression: handleSaveReading scheduled 3 orphan `setTimeout(setSaveMessage(''), 3000)`
// without clearTimeout. If the user unmounted within that 3s window, the
// timer fired setSaveMessage('') on a torn-down tree. The fix tracks
// the timer in a ref and clears it on unmount AND clears any previous
// timer before scheduling a new one (so rapid saves don't stack timers).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTarotInterpretation } from '@/app/tarot/[categoryName]/[spreadId]/hooks/useTarotInterpretation'
import type {
  ReadingResponse,
  InterpretationResult,
} from '@/app/tarot/[categoryName]/[spreadId]/types'

// Mock dependencies that aren't relevant to the timer semantics under test.
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1' } } }),
}))
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ language: 'ko' }),
}))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (_url: string) => ({
    ok: true,
    status: 200,
    json: async () => ({ readingId: 'r-123' }),
  })),
}))
vi.mock('@/lib/logger', () => ({
  tarotLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/tarot/tarot-storage', () => ({
  saveReading: vi.fn(),
  formatReadingForSave: vi.fn(),
}))
vi.mock('@/lib/tarot/tarot-save-request', () => ({
  buildTarotSaveRequest: vi.fn(() => ({})),
  flattenTarotGuidance: vi.fn(() => ''),
}))

const baseSpread = {
  id: 'three-card',
  title: 'Three Card',
  cardCount: 3,
  positions: [{ title: 'Past' }, { title: 'Present' }, { title: 'Future' }],
} as never

const baseReading: ReadingResponse = {
  category: 'general',
  spread: baseSpread,
  drawnCards: [],
  questionContext: null,
} as never

const baseInterpretation: InterpretationResult = {
  overall_message: 'ok',
  card_insights: [],
  guidance: 'go',
  affirmation: '',
  fallback: false,
}

describe('useTarotInterpretation — unmount safety', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not fire the saveMessage clear timeout after unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result, unmount } = renderHook(() =>
      useTarotInterpretation({
        categoryName: 'general',
        spreadId: 'three-card',
        userTopic: 'q?',
        questionAnalysis: null,
        selectedDeckStyle: 'celestial' as never,
        personalizationOptions: { includeSaju: false, includeAstrology: false },
      })
    )

    // Trigger save; await the inner promise so the save banner is set
    // and the 3s clear-timer is scheduled.
    await act(async () => {
      await result.current.handleSaveReading(baseReading, baseSpread, baseInterpretation)
    })

    expect(result.current.saveMessage).toBe('저장되었습니다!')

    // Unmount well before the 3s clear timer fires.
    unmount()

    // Advance past the 3s window. Pre-fix, this would call
    // setSaveMessage('') on a torn-down tree (React warning).
    await act(async () => {
      vi.advanceTimersByTime(3500)
    })

    const stateUpdateWarnings = errorSpy.mock.calls.filter((call) => {
      const msg = String(call[0] || '')
      return msg.includes("Can't perform a React state update") || msg.includes('unmounted')
    })
    expect(stateUpdateWarnings).toEqual([])

    errorSpy.mockRestore()
  })
})
