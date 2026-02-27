import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuestionAnalysis } from '@/app/tarot/hooks/useQuestionAnalysis'
import { apiFetch } from '@/lib/api'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  tarotLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/Tarot/tarot-recommend', () => ({
  checkDangerousQuestion: vi.fn(() => ({ isDangerous: false })),
}))

describe('useQuestionAnalysis', () => {
  const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>
  const getQuickRecommendation = vi.fn((question: string) => ({
    path: `/tarot/general-insight/quick-reading?question=${encodeURIComponent(question)}`,
    cardCount: 1,
    spreadTitle: 'ë¹ ë¥¸ ë¦¬ë”©',
    isKeywordMatch: false,
  }))

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  it('records auth_failed fallback reason when analyze endpoint returns 401', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: 'ë‚´ê°€ ê°€ì§„ ìˆ¨ì€ ê°•ì ì€?',
        language: 'ko',
        isKo: true,
        getQuickRecommendation,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.fallbackReason).toBe('auth_failed')
    })
  })

  it('uses server fallback reason when response is 200 with source=fallback', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        isDangerous: false,
        themeId: 'general-insight',
        spreadId: 'quick-reading',
        spreadTitle: 'ë¹ ë¥¸ ë¦¬ë”©',
        cardCount: 1,
        userFriendlyExplanation: 'ê¸°ë³¸ ìŠ¤í”„ë ˆë“œë¡œ ì—°ê²°í–ˆì–´ìš”',
        path: '/tarot/general-insight/quick-reading?question=test',
        source: 'fallback',
        fallback_reason: 'parse_failed',
      }),
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: 'í…ŒìŠ¤íŠ¸ ì§ˆë¬¸ìž…ë‹ˆë‹¤',
        language: 'ko',
        isKo: true,
        getQuickRecommendation,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.fallbackReason).toBe('parse_failed')
    })
  })

  it('uses quick fallback path on start-reading analyze failure (401)', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    const { result } = renderHook(() =>
      useQuestionAnalysis({
        question: 'ì§ˆë¬¸',
        language: 'ko',
        isKo: true,
        getQuickRecommendation,
      })
    )

    await act(async () => {
      await result.current.handleStartReading()
    })

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(
      '/tarot/general-insight/quick-reading?question=%EC%A7%88%EB%AC%B8'
    )
    expect(result.current.fallbackReason).toBe('auth_failed')
  })
})
